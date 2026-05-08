import { Router } from "express";
import { getPublicKeys } from "../keys/key-service.js";
import {
  getActorDocument,
  getWebFingerDocument,
  saveIncomingFederatedMessage,
  verifySignedRequest,
  type EncryptedChatActivity,
} from "./federation-service.js";
import { getLocalHandle } from "../app/config.js";

export const webFingerRoutes = Router();
export const federationRoutes = Router();

webFingerRoutes.get("/webfinger", async (req, res) => {
  const resource = typeof req.query.resource === "string" ? req.query.resource : "";
  const match = resource.match(/^acct:([^@]+)@(.+)$/);

  if (!match) {
    return res.status(400).json({ error: "Invalid WebFinger resource" });
  }

  const username = match[1];
  const webFinger = await getWebFingerDocument(username);

  if (!webFinger || webFinger.subject !== `acct:${getLocalHandle(username)}`) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json(webFinger);
});

federationRoutes.get("/users/:username", async (req, res) => {
  const actor = await getActorDocument(req.params.username);

  if (!actor) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json(actor);
});

federationRoutes.get("/users/:username/keys", async (req, res) => {
  const bundle = await getPublicKeys(req.params.username);

  if (!bundle) {
    return res.status(404).json({ error: "User or key bundle not found" });
  }

  return res.json({
    ...bundle,
    username: getLocalHandle(req.params.username),
  });
});

federationRoutes.post("/users/:username/inbox", async (req, res) => {
  try {
    const rawBody =
      (req as typeof req & { rawBody?: string }).rawBody ??
      JSON.stringify(req.body ?? {});
    const actor = await verifySignedRequest(
      rawBody,
      `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      req.method,
      {
        date: req.get("date") ?? undefined,
        digest: req.get("digest") ?? undefined,
        signature: req.get("signature") ?? undefined,
      },
    );
    const activity = req.body as EncryptedChatActivity;

    if (activity.actor !== actor.id) {
      return res.status(400).json({ error: "Activity actor does not match signature" });
    }

    await saveIncomingFederatedMessage(req.params.username, activity);
    return res.status(202).json({ accepted: true });
  } catch (error: any) {
    console.error("Federation inbox error", error);
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Invalid federated message",
    });
  }
});
