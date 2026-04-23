import { Router } from "express";
import {
  getInbox,
  sendEncryptedMessage,
  type EncryptedMessageType,
} from "../services/messageService.js";

export const inboxRouter = Router();

function isEncryptedMessageType(value: unknown): value is EncryptedMessageType {
  return value === "prekey" || value === "signal";
}

inboxRouter.post("/send", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { recipientUsername, type, ciphertext, header } = req.body as {
    recipientUsername?: string;
    type?: unknown;
    ciphertext?: string;
    header?: {
      version?: number;
      senderRegistrationId?: number;
      recipientRegistrationId?: number;
    };
  };

  if (
    !recipientUsername ||
    !ciphertext ||
    !isEncryptedMessageType(type) ||
    !header ||
    header.version !== 1
  ) {
    return res.status(400).json({
      error: "recipientUsername, type, ciphertext, and header.version are required",
    });
  }

  try {
    const message = await sendEncryptedMessage(
      req.session.userId,
      recipientUsername,
      {
        type,
        ciphertext,
        header: {
          version: 1,
          senderRegistrationId: header.senderRegistrationId,
          recipientRegistrationId: header.recipientRegistrationId,
        },
      },
    );

    return res.status(200).json(message);
  } catch (error: any) {
    if (error.message === "Sender not found") {
      return res.status(400).json({ error: "Sender not found" });
    }

    if (error.message === "Recipient not found") {
      return res.status(400).json({ error: "Recipient not found" });
    }

    console.error("Error in /inbox/send", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

inboxRouter.get("/", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const messages = await getInbox(req.session.userId);
    return res.json(messages);
  } catch (error: any) {
    console.error("Error in /inbox", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
