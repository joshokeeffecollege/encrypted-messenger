import { Router } from "express";
import {
  getPublicKeys,
  savePublicKeys,
  type PublicKeyBundleInput,
} from "./key-service.js";
import {
  getLocalOrRemoteKeys,
  isRemoteChatHandle,
} from "../federation/federation-service.js";
import { getLocalUsername } from "../app/config.js";
import { shortText, getLoggedInUserId } from "../shared/http-response.js";

export const keyRoutes = Router();

function isValidKeyBundleInput(input: unknown): input is PublicKeyBundleInput {
  // quick check that the bundle shape looks right
  if (!input || typeof input !== "object") {
    return false;
  }

  const bundle = input as {
    registrationId?: unknown;
    identityKey?: unknown;
    signedPreKey?: {
      id?: unknown;
      publicKey?: unknown;
      signature?: unknown;
    };
    kyberPreKey?: {
      id?: unknown;
      publicKey?: unknown;
      signature?: unknown;
    };
    preKeys?: Array<{
      id?: unknown;
      publicKey?: unknown;
    }>;
  };

  return (
    typeof bundle.registrationId === "number" &&
    typeof bundle.identityKey === "string" &&
    !!bundle.signedPreKey &&
    typeof bundle.signedPreKey.id === "number" &&
    typeof bundle.signedPreKey.publicKey === "string" &&
    typeof bundle.signedPreKey.signature === "string" &&
    !!bundle.kyberPreKey &&
    typeof bundle.kyberPreKey.id === "number" &&
    typeof bundle.kyberPreKey.publicKey === "string" &&
    typeof bundle.kyberPreKey.signature === "string" &&
    Array.isArray(bundle.preKeys) &&
    bundle.preKeys.every(
      (preKey) =>
        typeof preKey.id === "number" && typeof preKey.publicKey === "string",
    )
  );
}

keyRoutes.post("/bundle", async (req, res) => {
  // save this users public keys
  const userId = getLoggedInUserId(req, res);

  if (!userId) {
    return;
  }

  const body = req.body;

  if (!isValidKeyBundleInput(body)) {
    return res.status(400).json({ error: "Invalid key bundle input" });
  }

  console.log("Public key bundle uploaded", {
    userId,
    registrationId: body.registrationId,
    identityKeyPreview: shortText(body.identityKey),
    signedPreKeyId: body.signedPreKey.id,
    signedPreKeyPreview: shortText(body.signedPreKey.publicKey),
    kyberPreKeyId: body.kyberPreKey.id,
    kyberPreKeyPreview: shortText(body.kyberPreKey.publicKey),
    preKeyCount: body.preKeys.length,
    firstPreKeyId: body.preKeys[0]?.id ?? null,
  });

  try {
    await savePublicKeys(userId, body);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error saving key bundle:", error);
    return res.status(500).json({ error: "Failed to save key bundle" });
  }
});

keyRoutes.get("/:username", async (req, res) => {
  // get keys for local or remote user
  const userId = getLoggedInUserId(req, res);

  if (!userId) {
    return;
  }

  const username = req.params.username;

  try {
    const localUsername = getLocalUsername(username) ?? username;
    const bundle = isRemoteChatHandle(username)
      ? await getLocalOrRemoteKeys(username)
      : await getPublicKeys(localUsername);

    if (!bundle) {
      return res.status(404).json({ error: "User or key bundle not found" });
    }

    console.log("Public key bundle fetched", {
      requestedByUserId: userId,
      forUsername: username,
      registrationId: bundle.registrationId,
      signedPreKeyId: bundle.signedPreKey.id,
      kyberPreKeyId: bundle.kyberPreKey.id,
      preKeyCount: bundle.preKeys.length,
    });

    return res.status(200).json(bundle);
  } catch (error) {
    console.error("Error retrieving key bundle:", error);
    return res.status(500).json({ error: "Failed to retrieve key bundle" });
  }
});
