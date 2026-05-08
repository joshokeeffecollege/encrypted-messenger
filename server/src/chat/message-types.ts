import { Prisma } from "@prisma/client";

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

export const messageInclude = {
  senderUser: true,
  recipientUser: true,
  senderRemoteAccount: true,
  recipientRemoteAccount: true,
} satisfies Prisma.MessageInclude;

type SavedMessage = Prisma.MessageGetPayload<{
  include: typeof messageInclude;
}>;

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

export function makeHeaderJson(input: SendEncryptedMessageInput) {
  return JSON.stringify({
    type: input.type,
    ...input.header,
  });
}

export function toEncryptedMessage(message: SavedMessage): EncryptedMessage {
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
