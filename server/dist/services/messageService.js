import { prisma } from "../db/prisma.js";
function parseStoredHeader(headerJson) {
    const parsed = JSON.parse(headerJson);
    if (parsed.version !== 1 ||
        (parsed.type !== "prekey" && parsed.type !== "signal")) {
        throw new Error("Invalid message header");
    }
    return {
        type: parsed.type,
        version: 1,
        senderRegistrationId: parsed.senderRegistrationId,
        recipientRegistrationId: parsed.recipientRegistrationId,
    };
}
export async function sendEncryptedMessage(senderId, recipientUsername, input) {
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
export async function getInbox(userId) {
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
