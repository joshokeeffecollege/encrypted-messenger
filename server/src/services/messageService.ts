import {prisma} from "../db/prisma.js"

export interface Message {
    id: string;
    senderId: string;
    recipientId: string;
    senderUsername: string;
    recipientUsername: string;
    content: string; // currently stored in ciphertext field
    header: unknown;
    createdAt: Date;
    deliveredAt: Date | null;
}

// messages sent between users, addressed by recipient username
// does not yet contain encryption
export async function sendMessage(
    senderId: string,
    recipientUsername: string,
    content: string
): Promise<Message> {
    // look up sender
    const sender = await prisma.user.findUnique({where: {id: senderId}});
    if (!sender) {
        throw new Error("Sender not found");
    }

    // look up recipient by username
    const recipient = await prisma.user.findUnique({
        where: {username: recipientUsername},
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
            ciphertext: content,                    // plaintext for now
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
export async function getInbox(userId: string): Promise<Message[]> {
    const messages = await prisma.message.findMany({
        where: {recipientId: userId},
        orderBy: {createdAt: "asc"},
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