import { prisma } from "../app/database.js";
import {
  messageInclude,
  toEncryptedMessage,
  type EncryptedMessage,
} from "./message-types.js";

export async function getUserMessages(userId: string): Promise<EncryptedMessage[]> {
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ recipientUserId: userId }, { senderUserId: userId }],
    },
    orderBy: { createdAt: "asc" },
    include: messageInclude,
  });

  return messages.map(toEncryptedMessage);
}
