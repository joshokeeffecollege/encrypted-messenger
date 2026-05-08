import type { User } from "@prisma/client";
import { prisma } from "../app/database.js";
import {
  isRemoteChatHandle,
  sendRemoteEncryptedMessage,
} from "../federation/federation-service.js";
import { getLocalUsername } from "../app/config.js";
import {
  makeHeaderJson,
  messageInclude,
  toEncryptedMessage,
  type EncryptedMessage,
  type SendEncryptedMessageInput,
} from "./message-types.js";

async function saveLocalMessage(
  sender: User,
  recipientUsername: string,
  input: SendEncryptedMessageInput,
) {
  // local means both users are on this server
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
  // remote means save it here then send it out
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
    const updateData = {
      recipientRemoteAccountId: delivery.remoteAccount.id,
      deliveryStatus: "delivered",
      deliveredAt: new Date(),
      federationMessageId:
        !matchingActivityMessage ||
        matchingActivityMessage.id === savedMessage.id
          ? delivery.activityId
          : undefined,
    };

    if (
      matchingActivityMessage &&
      matchingActivityMessage.id !== savedMessage.id
    ) {
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
  } catch (error) {
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

export async function saveMessage(
  senderId: string,
  recipientUsername: string,
  input: SendEncryptedMessageInput,
): Promise<EncryptedMessage> {
  // local or remote path
  const sender = await prisma.user.findUnique({ where: { id: senderId } });

  if (!sender) {
    throw new Error("Sender not found");
  }

  if (isRemoteChatHandle(recipientUsername)) {
    return saveRemoteMessage(sender, recipientUsername, input);
  }

  return saveLocalMessage(sender, recipientUsername, input);
}
