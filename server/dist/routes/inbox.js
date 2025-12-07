import { Router } from 'express';
import { getInbox, sendMessage } from "../services/messageService.js";
export const inboxRouter = Router();
// inbox send message logic
inboxRouter.post('/send', async (req, res) => {
    const { senderId, recipientUsername, content } = req.body;
    if (!senderId || !recipientUsername || !content) {
        return res.status(400).json({
            error: "senderId, recipientUsername, and content are required",
        });
    }
    try {
        const message = await sendMessage(senderId, recipientUsername, content);
        return res.status(200).json(message);
    }
    catch (error) {
        if (error.message === "Sender not found") {
            return res.status(400).json({
                error: "Sender not found",
            });
        }
        if (error.message === "Recipient not found") {
            return res.status(400).json({
                error: "Recipient not found",
            });
        }
        console.error("Error in /inbox/send", error);
        return res.status(500).json({
            error: "Internal Server Error",
        });
    }
});
// get all users messages
inboxRouter.get('/', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({
            error: "userId is required",
        });
    }
    try {
        const messages = await getInbox(userId);
        return res.json(messages);
    }
    catch (error) {
        console.error("Error in /getInbox", error);
        return res.status(500).json({ error: "Internal Server Error", });
    }
});
