import { prisma } from "../db/prisma.js";

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
}

interface StoredMessageHeader extends EncryptedMessageHeader {
  type: EncryptedMessageType;
}

function parseStoredHeader(headerJson: string): StoredMessageHeader {
  const parsed = JSON.parse(headerJson) as Partial<StoredMessageHeader>;

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

export async function sendEncryptedMessage(
  senderId: string,
  recipientUsername: string,
  input: SendEncryptedMessageInput,
): Promise<EncryptedMessage> {
  const sender = await prisma.user.findUnique({ where: { id: senderId } });

  if (!sender) {
    throw new Error("Sender not found");
  }

  const recipient = await prisma.user.findUnique({
    where: { username: recipientUsername },
  });

  if (!recipient) {
    throw new Error("Recipient not found");
  }

  const headerJson = JSON.stringify({
    type: input.type,
    ...input.header,
  });

  const message = await prisma.message.create({
    data: {
      senderId: sender.id,
      recipientId: recipient.id,
      ciphertext: input.ciphertext,
      headerJson,
    },
    include: {
      sender: true,
      recipient: true,
    },
  });

  const header = parseStoredHeader(message.headerJson);

  return {
    id: message.id,
    senderId: message.senderId,
    recipientId: message.recipientId,
    senderUsername: message.sender.username,
    recipientUsername: message.recipient.username,
    type: header.type,
    ciphertext: message.ciphertext,
    header: {
      version: header.version,
      senderRegistrationId: header.senderRegistrationId,
      recipientRegistrationId: header.recipientRegistrationId,
    },
    createdAt: message.createdAt,
    deliveredAt: message.deliveredAt,
  };
}

export async function getInbox(userId: string): Promise<EncryptedMessage[]> {
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ recipientId: userId }, { senderId: userId }],
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: true,
      recipient: true,
    },
  });

  return messages.map((message) => {
    const header = parseStoredHeader(message.headerJson);

    return {
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      senderUsername: message.sender.username,
      recipientUsername: message.recipient.username,
      type: header.type,
      ciphertext: message.ciphertext,
      header: {
        version: header.version,
        senderRegistrationId: header.senderRegistrationId,
        recipientRegistrationId: header.recipientRegistrationId,
      },
      createdAt: message.createdAt,
      deliveredAt: message.deliveredAt,
    };
  });
}
