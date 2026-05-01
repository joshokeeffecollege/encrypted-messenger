import { createHash, createSign, createVerify } from "node:crypto";
import { prisma } from "../db/database.js";
import { getPublicKeys, type PublicKeyBundleResponse } from "../keys/key-service.js";
import {
  getActivityUrl,
  getActorUrl,
  getInboxUrl,
  getKeyBundleUrl,
  getLocalHandle,
  getServerBaseUrl,
  getServerHost,
  isRemoteHandle,
  parseHandle,
} from "../config/server-config.js";
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

// This file handles server-to-server chat.
// It follows the Mastodon style a bit, but our message body stays encrypted.

function getRemoteBaseUrl(domain: string) {
  if (domain.startsWith("127.0.0.1") || domain.startsWith("localhost")) {
    return `http://${domain}`;
  }

  return `https://${domain}`;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/activity+json, application/json, application/jrd+json",
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
  const actorUrl = new URL(actor.id);
  return `${actor.preferredUsername}@${actorUrl.host}`;
}

async function saveRemoteAccount(actor: RemoteActor) {
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

export async function getActorDocument(username: string): Promise<RemoteActor | null> {
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
  const parsed = parseHandle(handleText);

  if (!parsed) {
    throw new Error("That username is not in the form user@server");
  }

  if (parsed.domain === getServerHost()) {
    throw new Error("That handle belongs to this server");
  }

  const webFingerUrl =
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
  const hash = createHash("sha256").update(text, "utf8").digest("base64");
  return `SHA-256=${hash}`;
}

function buildSignatureText(
  method: string,
  requestUrl: string,
  date: string,
  digest: string,
) {
  const url = new URL(requestUrl);

  return [
    `(request-target): ${method.toLowerCase()} ${url.pathname}`,
    `host: ${url.host}`,
    `date: ${date}`,
    `digest: ${digest}`,
  ].join("\n");
}

function readSignatureParts(signatureHeader: string) {
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
  const remoteAccount = await resolveRemoteAccount(recipientHandle);
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
    const text = await response.text();
    throw new Error(text || "Remote server rejected encrypted message");
  }

  return {
    activityId: activity.id,
    remoteAccount,
  };
}

async function getActorFromKeyId(keyId: string) {
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
  if (!headers.signature || !headers.date || !headers.digest) {
    throw new Error("Missing signed federation headers");
  }

  const sentAt = new Date(headers.date).getTime();

  if (!Number.isFinite(sentAt) || Math.abs(Date.now() - sentAt) > 12 * 60 * 60 * 1000) {
    throw new Error("Signed request is too old");
  }

  const expectedDigest = makeDigest(rawBody);

  if (expectedDigest !== headers.digest) {
    throw new Error("Request digest does not match the body");
  }

  const signatureParts = readSignatureParts(headers.signature);

  if (!signatureParts.keyId || !signatureParts.signature) {
    throw new Error("Signature header is missing key information");
  }

  const actor = await getActorFromKeyId(signatureParts.keyId);
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
    throw new Error("Signature check failed");
  }

  return actor;
}

export async function saveIncomingFederatedMessage(
  localUsername: string,
  activity: EncryptedChatActivity,
) {
  if (activity.type !== "Create" || activity.object?.type !== "EncryptedMessage") {
    throw new Error("Unsupported federation activity");
  }

  const localUser = await prisma.user.findUnique({
    where: { username: localUsername },
  });

  if (!localUser) {
    throw new Error("Recipient not found");
  }

  if (activity.object.recipient !== getLocalHandle(localUsername)) {
    throw new Error("Message recipient does not match this inbox");
  }

  const parsedSender = parseHandle(activity.object.sender);

  if (!parsedSender || parsedSender.domain === getServerHost()) {
    throw new Error("Incoming federated message must come from a remote handle");
  }

  const actor = await getActorFromKeyId(`${activity.actor}#main-key`);
  const remoteAccount = await saveRemoteAccount(actor);
  const savedHeader = JSON.stringify({
    type: activity.object.messageType,
    ...activity.object.header,
  });
  const existingMessage = await prisma.message.findUnique({
    where: { federationMessageId: activity.id },
  });

  if (existingMessage) {
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

export function looksLikeRemoteHandle(value: string) {
  return isRemoteHandle(value);
}

export async function getLocalOrRemoteKeys(nameOrHandle: string) {
  if (!looksLikeRemoteHandle(nameOrHandle)) {
    return getPublicKeys(nameOrHandle);
  }

  return fetchRemoteKeys(nameOrHandle);
}

export async function checkChatHandle(nameOrHandle: string) {
  const trimmed = nameOrHandle.trim().replace(/^@/, "");

  if (!trimmed) {
    throw new Error("Enter a username first");
  }

  if (!looksLikeRemoteHandle(trimmed)) {
    const localKeys = await getPublicKeys(trimmed);

    if (!localKeys) {
      throw new Error(`No account named ${trimmed} is ready on this server yet.`);
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
    found: true,
    handle: remoteKeys.username,
    username: remoteKeys.username,
    isRemote: true,
  };
}
