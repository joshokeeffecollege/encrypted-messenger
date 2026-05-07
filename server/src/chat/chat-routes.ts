import { Router } from "express";
import {
  getUserMessages,
  saveEncryptedMessage,
  type EncryptedMessageType,
} from "./chat-service.js";
import {
  shortText,
  getLoggedInUserId,
  sendErrorResponse,
} from "../http/routeHelpers.js";

export const messageRoutes = Router();

function isEncryptedMessageType(value: unknown): value is EncryptedMessageType {
  return value === "prekey" || value === "signal";
}

messageRoutes.post("/send", async (req, res) => {
  const userId = getLoggedInUserId(req, res);

  if (!userId) {
    return;
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
    fromUserId: userId,
    toUsername: recipientUsername,
    type,
    header,
    ciphertextPreview: shortText(ciphertext, 80),
    ciphertextLength: ciphertext.length,
    plaintextVisibleToServer: false,
  });

  try {
    const message = await saveEncryptedMessage(userId, recipientUsername, {
      type,
      ciphertext,
      header: {
        version: 1,
        senderRegistrationId: header.senderRegistrationId,
        recipientRegistrationId: header.recipientRegistrationId,
      },
    });

    return res.status(200).json(message);
  } catch (error) {
    console.error("Error in /inbox/send", error);
    return sendErrorResponse(
      res,
      error,
      {
        "Sender not found": { status: 400, body: { error: "Sender not found" } },
        "Recipient not found": {
          status: 400,
          body: { error: "Recipient not found" },
        },
      },
      error instanceof Error
        ? { status: 400, body: { error: error.message } }
        : { status: 500, body: { error: "Internal Server Error" } },
    );
  }
});

messageRoutes.get("/", async (req, res) => {
  const userId = getLoggedInUserId(req, res);

  if (!userId) {
    return;
  }

  try {
    const messages = await getUserMessages(userId);

    console.log("Encrypted inbox fetched", {
      forUserId: userId,
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
