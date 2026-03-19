import { Router } from "express";
import {
  getUserKeyBundleByUsername,
  saveUserKeyBundle,
  type PublicKeyBundleInput,
} from "../services/keyService.js";

export const keysRouter = Router();

// Validate the shape of the uploaded public bundle.
function isValidKeyBundleInput(input: any): input is PublicKeyBundleInput {
  return (
    input &&
    typeof input.registrationId === "number" &&
    typeof input.identityKey === "string" &&
    input.signedPreKey &&
    typeof input.signedPreKey.id === "number" &&
    typeof input.signedPreKey.publicKey === "string" &&
    typeof input.signedPreKey.signature === "string" &&
    Array.isArray(input.preKeys) &&
    input.preKeys.every(
      (preKey: any) =>
        typeof preKey.id === "number" && typeof preKey.publicKey === "string",
    )
  );
}

keysRouter.post("/bundle", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const body = req.body;

  if (!isValidKeyBundleInput(body)) {
    return res.status(400).json({ error: "Invalid key bundle input" });
  }

  try {
    await saveUserKeyBundle(req.session.userId, body);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error saving key bundle:", error);
    return res.status(500).json({ error: "Failed to save key bundle" });
  }
});

keysRouter.get("/:username", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const username = req.params.username;

  try {
    const bundle = await getUserKeyBundleByUsername(username);

    if (!bundle) {
      return res.status(404).json({ error: "User or key bundle not found" });
    }

    return res.status(200).json(bundle);
  } catch (error) {
    console.error("Error retrieving key bundle:", error);
    return res.status(500).json({ error: "Failed to retrieve key bundle" });
  }
});
