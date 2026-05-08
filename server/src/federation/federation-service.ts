import { createHash, createSign, createVerify } from "node:crypto";
import { prisma } from "../app/database.js";
import {
  getPublicKeys,
  type PublicKeyBundleResponse,
} from "../keys/key-service.js";
import {
  getActivityUrl,
  getActorUrl,
  getInboxUrl,
  getKeyBundleUrl,
  getLocalHandle,
  getServerBaseUrl,
  getServerHost,
  isRemoteChatHandle as isRemoteHandleFromConfig,
  parseHandle,
} from "../app/config.js";
import { getServerKeys, makePublicKeyFromPem } from "./server-keys.js";

export interface RemoteActor {
  id: string;
  type: "Person";
  preferredUsername: string;
  inbox: string;
  publicKey: {
    id: string;
    owner: string;
    publicKeyPem: string;
  };
  keyBundle: string;
}

export interface EncryptedChatActivity {
  "@context": string[];
  id: string;
  type: "Create";
  actor: string;
  to: string[];
  object: {
    id: string;
    type: "EncryptedMessage";
    sender: string;
    recipient: string;
    ciphertext: string;
    messageType: "prekey" | "signal";
    header: {
      version: 1;
      senderRegistrationId?: number;
      recipientRegistrationId?: number;
    };
    published: string;
  };
}

// this file does server to server chat stuff
// it works a bit like mastodon but message text stays encrypted

function getRemoteBaseUrl(domain: string) {
  // local test servers use http but normal ones use https
  if (domain.startsWith("127.0.0.1") || domain.startsWith("localhost")) {
    return `http://${domain}`;
  }

  return `https://${domain}`;
}

async function fetchJson(url: string, init?: RequestInit) {
  // fetch json from another server
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept:
        "application/activity+json, application/json, application/jrd+json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? `Request failed for ${url}`);
  }

  return data;
}

function getHandleFromActor(actor: RemoteActor) {
  // turn the actor url and username into user@server
  const actorUrl = new URL(actor.id);
  return `${actor.preferredUsername}@${actorUrl.host}`;
}

async function saveRemoteAccount(actor: RemoteActor) {
  // save what we learned about the remote user
  const handle = getHandleFromActor(actor);
  const parsed = parseHandle(handle);

  if (!parsed) {
    throw new Error("Invalid remote actor handle");
  }

  return prisma.remoteAccount.upsert({
    where: { handle },
    update: {
      username: parsed.username,
      domain: parsed.domain,
      actorUrl: actor.id,
      inboxUrl: actor.inbox,
      serverPublicKeyId: actor.publicKey.id,
      serverPublicKeyPem: actor.publicKey.publicKeyPem,
      keyBundleUrl: actor.keyBundle,
    },
    create: {
      handle,
      username: parsed.username,
      domain: parsed.domain,
      actorUrl: actor.id,
      inboxUrl: actor.inbox,
      serverPublicKeyId: actor.publicKey.id,
      serverPublicKeyPem: actor.publicKey.publicKeyPem,
      keyBundleUrl: actor.keyBundle,
    },
  });
}

export async function getWebFingerDocument(username: string) {
  // this is the small lookup doc for one local user
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    return null;
  }

  return {
    subject: `acct:${getLocalHandle(username)}`,
    links: [
      {
        rel: "self",
        type: "application/activity+json",
        href: getActorUrl(username),
      },
    ],
  };
}

export async function getActorDocument(
  username: string,
): Promise<RemoteActor | null> {
  // this is the activitypub style profile for one local user
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    return null;
  }

  const actorUrl = getActorUrl(username);
  const { publicKeyPem } = await getServerKeys();

  return {
    id: actorUrl,
    type: "Person",
    preferredUsername: username,
    inbox: getInboxUrl(username),
    publicKey: {
      id: `${actorUrl}#main-key`,
      owner: actorUrl,
      publicKeyPem,
    },
    keyBundle: getKeyBundleUrl(username),
  };
}

export async function resolveRemoteAccount(handleText: string) {
  // find a remote user by doing webfinger then actor fetch
  const parsed = parseHandle(handleText);

  if (!parsed) {
    throw new Error("That username is not in the form user@server");
  }

  if (parsed.domain === getServerHost()) {
    throw new Error("That handle belongs to this server");
  }

  const webFingerUrl =
    // first ask the remote server where that user profile lives
    `${getRemoteBaseUrl(parsed.domain)}/.well-known/webfinger?resource=` +
    encodeURIComponent(`acct:${parsed.handle}`);
  const webFinger = await fetchJson(webFingerUrl);
  const selfLink = Array.isArray(webFinger?.links)
    ? webFinger.links.find(
        (link: any) =>
          link?.rel === "self" &&
          typeof link?.href === "string" &&
          typeof link?.type === "string" &&
          link.type.includes("activity"),
      )
    : null;

  if (!selfLink?.href) {
    throw new Error("That server did not return a valid chat profile");
  }

  const actor = (await fetchJson(selfLink.href)) as RemoteActor;

  if (!actor?.inbox || !actor?.keyBundle || !actor?.publicKey?.publicKeyPem) {
    throw new Error("That server did not return a valid chat profile");
  }

  return saveRemoteAccount(actor);
}

export async function fetchRemoteKeys(handleText: string) {
  // after finding the remote user get their chat keys too
  const remoteAccount = await resolveRemoteAccount(handleText);
  const data = (await fetchJson(
    remoteAccount.keyBundleUrl,
  )) as PublicKeyBundleResponse;

  return {
    ...data,
    username: remoteAccount.handle,
  };
}

function makeDigest(text: string) {
  // digest lets the other server check body integrity
  const hash = createHash("sha256").update(text, "utf8").digest("base64");
  return `SHA-256=${hash}`;
}

function buildSignatureText(
  method: string,
  requestUrl: string,
  date: string,
  digest: string,
) {
  // this is the exact text that gets signed and checked
  const url = new URL(requestUrl);

  return [
    `(request-target): ${method.toLowerCase()} ${url.pathname}`,
    `host: ${url.host}`,
    `date: ${date}`,
    `digest: ${digest}`,
  ].join("\n");
}

function readSignatureParts(signatureHeader: string) {
  // break the signature header into easy key value parts
  const parts: Record<string, string> = {};

  for (const piece of signatureHeader.split(",")) {
    const [rawKey, rawValue] = piece.split("=");

    if (!rawKey || !rawValue) {
      continue;
    }

    parts[rawKey.trim()] = rawValue.trim().replace(/^"|"$/g, "");
  }

  return parts;
}

export async function sendRemoteEncryptedMessage(
  senderUsername: string,
  recipientHandle: string,
  encryptedMessage: {
    id: string;
    createdAt: Date;
    ciphertext: string;
    type: "prekey" | "signal";
    header: {
      version: 1;
      senderRegistrationId?: number;
      recipientRegistrationId?: number;
    };
  },
) {
  // build the outgoing activity object for the remote inbox
  const remoteAccount = await resolveRemoteAccount(recipientHandle);
  // actor url is our local sender identity on the network
  const actorUrl = getActorUrl(senderUsername);
  const recipientActorUrl = remoteAccount.actorUrl;
  const activity: EncryptedChatActivity = {
    "@context": ["https://www.w3.org/ns/activitystreams"],
    id: getActivityUrl(encryptedMessage.id),
    type: "Create",
    actor: actorUrl,
    to: [recipientActorUrl],
    object: {
      id: encryptedMessage.id,
      type: "EncryptedMessage",
      sender: getLocalHandle(senderUsername),
      recipient: remoteAccount.handle,
      ciphertext: encryptedMessage.ciphertext,
      messageType: encryptedMessage.type,
      header: encryptedMessage.header,
      published: encryptedMessage.createdAt.toISOString(),
    },
  };
  const body = JSON.stringify(activity);
  // sign the body like a normal federation request
  const date = new Date().toUTCString();
  const digest = makeDigest(body);
  const signatureText = buildSignatureText(
    "post",
    remoteAccount.inboxUrl,
    date,
    digest,
  );
  const signer = createSign("RSA-SHA256");
  signer.update(signatureText);
  signer.end();
  const { privateKeyPem } = await getServerKeys();
  const signature = signer.sign(privateKeyPem).toString("base64");
  const signatureHeader = `keyId="${actorUrl}#main-key",headers="(request-target) host date digest",signature="${signature}"`;
  const response = await fetch(remoteAccount.inboxUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/activity+json",
      Date: date,
      Digest: digest,
      Signature: signatureHeader,
    },
    body,
  });

  if (!response.ok) {
    // bubble up the remote server error text if it sent one
    const text = await response.text();
    throw new Error(text || "Remote server rejected encrypted message");
  }

  return {
    // give back the saved remote info and activity id
    activityId: activity.id,
    remoteAccount,
  };
}

async function getActorFromKeyId(keyId: string) {
  // load the remote actor again so we can trust the public key
  const actorUrl = keyId.replace(/#main-key$/, "");
  const actor = (await fetchJson(actorUrl)) as RemoteActor;

  if (!actor?.publicKey?.publicKeyPem || actor.publicKey.id !== keyId) {
    throw new Error("Remote actor key does not match the signature");
  }

  await saveRemoteAccount(actor);
  return actor;
}

export async function verifySignedRequest(
  rawBody: string,
  requestUrl: string,
  method: string,
  headers: {
    date?: string;
    digest?: string;
    signature?: string;
  },
) {
  // incoming federation posts must be signed
  if (!headers.signature || !headers.date || !headers.digest) {
    throw new Error("Missing signed federation headers");
  }

  const sentAt = new Date(headers.date).getTime();

  if (
    !Number.isFinite(sentAt) ||
    Math.abs(Date.now() - sentAt) > 12 * 60 * 60 * 1000
  ) {
    // old signed requests should not be accepted
    throw new Error("Signed request is too old");
  }

  const expectedDigest = makeDigest(rawBody);

  if (expectedDigest !== headers.digest) {
    // body changed so reject it
    throw new Error("Request digest does not match the body");
  }

  const signatureParts = readSignatureParts(headers.signature);

  if (!signatureParts.keyId || !signatureParts.signature) {
    // need both the key id and the actual signature
    throw new Error("Signature header is missing key information");
  }

  const actor = await getActorFromKeyId(signatureParts.keyId);
  // rebuild the signed text exactly the same way
  const signatureText = buildSignatureText(
    method,
    requestUrl,
    headers.date,
    headers.digest,
  );
  const verifier = createVerify("RSA-SHA256");
  verifier.update(signatureText);
  verifier.end();
  const isValid = verifier.verify(
    makePublicKeyFromPem(actor.publicKey.publicKeyPem),
    Buffer.from(signatureParts.signature, "base64"),
  );

  if (!isValid) {
    // final signature check failed
    throw new Error("Signature check failed");
  }

  return actor;
}

export async function saveIncomingFederatedMessage(
  localUsername: string,
  activity: EncryptedChatActivity,
) {
  // this saves one incoming remote message in the local db
  if (
    activity.type !== "Create" ||
    activity.object?.type !== "EncryptedMessage"
  ) {
    throw new Error("Unsupported federation activity");
  }

  const localUser = await prisma.user.findUnique({
    where: { username: localUsername },
  });

  if (!localUser) {
    throw new Error("Recipient not found");
  }

  if (activity.object.recipient !== getLocalHandle(localUsername)) {
    // make sure the message really belongs in this inbox
    throw new Error("Message recipient does not match this inbox");
  }

  const parsedSender = parseHandle(activity.object.sender);

  if (!parsedSender || parsedSender.domain === getServerHost()) {
    throw new Error(
      "Incoming federated message must come from a remote handle",
    );
  }

  const actor = await getActorFromKeyId(`${activity.actor}#main-key`);
  // save sender info and ignore duplicates if we already stored it
  const remoteAccount = await saveRemoteAccount(actor);
  const savedHeader = JSON.stringify({
    type: activity.object.messageType,
    ...activity.object.header,
  });
  const existingMessage = await prisma.message.findUnique({
    where: { federationMessageId: activity.id },
  });

  if (existingMessage) {
    // same remote activity should not be saved twice
    return existingMessage;
  }

  return prisma.message.create({
    data: {
      federationMessageId: activity.id,
      senderRemoteAccountId: remoteAccount.id,
      recipientUserId: localUser.id,
      senderHandle: remoteAccount.handle,
      recipientHandle: localUsername,
      remoteServer: remoteAccount.domain,
      receivedViaFederation: true,
      deliveryStatus: "delivered",
      ciphertext: activity.object.ciphertext,
      headerJson: savedHeader,
      deliveredAt: new Date(),
    },
  });
}

export function isRemoteChatHandle(value: string) {
  // just re export the config helper from here too
  return isRemoteHandleFromConfig(value);
}

export async function getLocalOrRemoteKeys(nameOrHandle: string) {
  // local users read from db and remote users fetch over federation
  if (!isRemoteChatHandle(nameOrHandle)) {
    return getPublicKeys(nameOrHandle);
  }

  return fetchRemoteKeys(nameOrHandle);
}

export async function checkChatHandle(nameOrHandle: string) {
  // this helps the app search for local or remote chat targets
  const trimmed = nameOrHandle.trim().replace(/^@/, "");

  if (!trimmed) {
    throw new Error("Enter a username first");
  }

  if (!isRemoteChatHandle(trimmed)) {
    // local search just checks this server db
    const localKeys = await getPublicKeys(trimmed);

    if (!localKeys) {
      throw new Error(
        `No account named ${trimmed} is ready on this server yet.`,
      );
    }

    return {
      found: true,
      handle: getLocalHandle(trimmed),
      username: trimmed,
      isRemote: false,
    };
  }

  const remoteKeys = await fetchRemoteKeys(trimmed);

  return {
    // remote search gives back the full remote handle
    found: true,
    handle: remoteKeys.username,
    username: remoteKeys.username,
    isRemote: true,
  };
}
