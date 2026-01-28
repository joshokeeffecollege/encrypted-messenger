import { prisma } from "../db/prisma.js";
// messages sent between users, addressed by recipient username
// does not yet contain encryption
export async function sendMessage(senderId, recipientUsername, content) {
    // look up sender
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    // if sender can't be found
    if (!sender) {
        throw new Error("Sender not found");
    }
    // look up recipient by username
    const recipient = await prisma.user.findUnique({
        where: { username: recipientUsername },
    });
    // if recipient isn't found
    if (!recipient) {
        throw new Error("Recipient not found");
    }
    // later this will hold ratchet and session info
    const header = {
        version: 1,
        note: "signal header will go here later",
    };
    const message = await prisma.message.create({
        data: {
            senderId: sender.id,
            recipientId: recipient.id,
            ciphertext: content, // plaintext for now
            headerJson: JSON.stringify(header),
        },
        include: {
            sender: true,
            recipient: true,
        },
    });
    return {
        id: message.id,
        senderId: message.senderId,
        recipientId: message.recipientId,
        senderUsername: message.sender.username,
        recipientUsername: message.recipient.username,
        content: message.ciphertext,
        header: JSON.parse(message.headerJson),
        createdAt: message.createdAt,
        deliveredAt: message.deliveredAt,
    };
}
// get all messages for user
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
    return messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        senderUsername: m.sender.username,
        recipientUsername: m.recipient.username,
        content: m.ciphertext,
        header: JSON.parse(m.headerJson),
        createdAt: m.createdAt,
        deliveredAt: m.deliveredAt,
    }));
}
