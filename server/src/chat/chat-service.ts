import { Prisma, type User } from "@prisma/client";
import { prisma } from "../db/database.js";
import {
  looksLikeRemoteHandle,
  sendRemoteEncryptedMessage,
} from "../federation/federation-service.js";
import { getLocalHandle, getLocalUsername } from "../config/server-config.js";

export type EncryptedMessageType = "prekey" | "signal";

export interface EncryptedMessageHeader {
  version: 1;
  senderRegistrationId?: number;
  recipientRegistrationId?: number;
}

export interface SendEncryptedMessageInput {
  type: EncryptedMessageType;
  ciphertext: string;
  header: EncryptedMessageHeader;
}

export interface EncryptedMessage {
  id: string;
  senderId: string;
  recipientId: string;
  senderUsername: string;
  recipientUsername: string;
  type: EncryptedMessageType;
  ciphertext: string;
  header: EncryptedMessageHeader;
  createdAt: Date;
  deliveredAt: Date | null;
  deliveryStatus: string;
}

interface SavedMessageHeader extends EncryptedMessageHeader {
  type: EncryptedMessageType;
}

const messageInclude = {
  senderUser: true,
  recipientUser: true,
  senderRemoteAccount: true,
  recipientRemoteAccount: true,
} satisfies Prisma.MessageInclude;

type SavedMessage = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

// This is the main chat file on the server side.
// The server stores ciphertext only, never the real mesage text.

function readSavedHeader(headerJson: string): SavedMessageHeader {
  const parsed = JSON.parse(headerJson) as Partial<SavedMessageHeader>;

  if (
    parsed.version !== 1 ||
    (parsed.type !== "prekey" && parsed.type !== "signal")
  ) {
    throw new Error("Invalid message header");
  }

  return {
    type: parsed.type,
    version: 1,
    senderRegistrationId: parsed.senderRegistrationId,
    recipientRegistrationId: parsed.recipientRegistrationId,
  };
}

function makeHeaderJson(input: SendEncryptedMessageInput) {
  return JSON.stringify({
    type: input.type,
    ...input.header,
  });
}

function toEncryptedMessage(message: SavedMessage): EncryptedMessage {
  const header = readSavedHeader(message.headerJson);

  return {
    id: message.id,
    senderId: message.senderUserId ?? message.senderRemoteAccountId ?? "",
    recipientId:
      message.recipientUserId ?? message.recipientRemoteAccountId ?? "",
    senderUsername:
      message.senderRemoteAccount?.handle ??
      message.senderUser?.username ??
      message.senderHandle,
    recipientUsername:
      message.recipientRemoteAccount?.handle ??
      message.recipientUser?.username ??
      message.recipientHandle,
    type: header.type,
    ciphertext: message.ciphertext,
    header: {
      version: header.version,
      senderRegistrationId: header.senderRegistrationId,
      recipientRegistrationId: header.recipientRegistrationId,
    },
    createdAt: message.createdAt,
    deliveredAt: message.deliveredAt,
    deliveryStatus: message.deliveryStatus,
  };
}

async function saveLocalMessage(
  sender: User,
  recipientUsername: string,
  input: SendEncryptedMessageInput,
) {
  const localUsername = getLocalUsername(recipientUsername);

  if (!localUsername) {
    throw new Error("Recipient not found");
  }

  const recipient = await prisma.user.findUnique({
    where: { username: localUsername },
  });

  if (!recipient) {
    throw new Error("Recipient not found");
  }

  const message = await prisma.message.create({
    data: {
      senderUserId: sender.id,
      recipientUserId: recipient.id,
      senderHandle: sender.username,
      recipientHandle: recipient.username,
      deliveryStatus: "delivered",
      ciphertext: input.ciphertext,
      headerJson: makeHeaderJson(input),
      deliveredAt: new Date(),
    },
    include: messageInclude,
  });

  return toEncryptedMessage(message);
}

async function saveRemoteMessage(
  sender: User,
  recipientHandle: string,
  input: SendEncryptedMessageInput,
) {
  const savedMessage = await prisma.message.create({
    data: {
      senderUserId: sender.id,
      senderHandle: sender.username,
      recipientHandle,
      remoteServer: recipientHandle.split("@").slice(1).join("@"),
      deliveryStatus: "pending",
      ciphertext: input.ciphertext,
      headerJson: makeHeaderJson(input),
    },
    include: messageInclude,
  });

  try {
    const delivery = await sendRemoteEncryptedMessage(
      sender.username,
      recipientHandle,
      {
        id: savedMessage.id,
        createdAt: savedMessage.createdAt,
        ciphertext: savedMessage.ciphertext,
        type: input.type,
        header: input.header,
      },
    );
    const matchingActivityMessage = await prisma.message.findUnique({
      where: { federationMessageId: delivery.activityId },
    });
    const updateData: Prisma.MessageUncheckedUpdateInput = {
      recipientRemoteAccountId: delivery.remoteAccount.id,
      deliveryStatus: "delivered",
      deliveredAt: new Date(),
    };

    // Older test runs can leave a duplicate activity id behind.
    // The sender copy still works fine without saving that id again.
    if (!matchingActivityMessage || matchingActivityMessage.id === savedMessage.id) {
      updateData.federationMessageId = delivery.activityId;
    } else {
      console.warn("Skipping duplicate federation activity id on sender copy", {
        messageId: savedMessage.id,
        activityId: delivery.activityId,
        existingMessageId: matchingActivityMessage.id,
      });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: savedMessage.id },
      data: updateData,
      include: messageInclude,
    });

    return toEncryptedMessage(updatedMessage);
  } catch (error: any) {
    await prisma.message.update({
      where: { id: savedMessage.id },
      data: {
        deliveryStatus: "failed",
      },
    });

    throw new Error(
      error instanceof Error
        ? error.message
        : "Could not deliver the message to the remote server",
    );
  }
}

export async function saveEncryptedMessage(
  senderId: string,
  recipientUsername: string,
  input: SendEncryptedMessageInput,
): Promise<EncryptedMessage> {
  const sender = await prisma.user.findUnique({ where: { id: senderId } });

  if (!sender) {
    throw new Error("Sender not found");
  }

  if (looksLikeRemoteHandle(recipientUsername)) {
    return saveRemoteMessage(sender, recipientUsername, input);
  }

  return saveLocalMessage(sender, recipientUsername, input);
}

export async function getUserMessages(
  userId: string,
): Promise<EncryptedMessage[]> {
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ recipientUserId: userId }, { senderUserId: userId }],
    },
    orderBy: { createdAt: "asc" },
    include: messageInclude,
  });

  return messages.map(toEncryptedMessage);
}
