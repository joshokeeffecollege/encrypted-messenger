import { Router } from "express";
import {
  getUserMessages,
  saveEncryptedMessage,
  type EncryptedMessageType,
} from "./chat-service.js";

export const messageRoutes = Router();

function isEncryptedMessageType(value: unknown): value is EncryptedMessageType {
  return value === "prekey" || value === "signal";
}

function previewCiphertext(value: string, maxLength = 80): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

messageRoutes.post("/send", async (req, res) => {
  if (!req.session?.userId) {
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
      error:
        "recipientUsername, type, ciphertext, and header.version are required",
    });
  }

  // The server stores ciphertext only. It never sees the real message text.
  console.log("Encrypted message received by server", {
    fromUserId: req.session.userId,
    toUsername: recipientUsername,
    type,
    header,
    ciphertextPreview: previewCiphertext(ciphertext),
    ciphertextLength: ciphertext.length,
    plaintextVisibleToServer: false,
  });

  try {
    const message = await saveEncryptedMessage(
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

    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    console.error("Error in /inbox/send", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

messageRoutes.get("/", async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const messages = await getUserMessages(req.session.userId);

    console.log("Encrypted inbox fetched", {
      forUserId: req.session.userId,
      messageCount: messages.length,
      sample: messages.slice(0, 3).map((message) => ({
        id: message.id,
        type: message.type,
        from: message.senderUsername,
        to: message.recipientUsername,
        ciphertextLength: message.ciphertext.length,
        plaintextVisibleToServer: false,
      })),
    });

    return res.json(messages);
  } catch (error: any) {
    console.error("Error in /inbox", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
