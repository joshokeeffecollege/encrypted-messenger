import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import SQLiteStore from "connect-sqlite3";
import { router } from "./routes/auth.js";
import { inboxRouter } from "./routes/inbox.js";
dotenv.config();
const app = express();
const SessionStore = SQLiteStore(session);
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
// Session
app.use(session({
    store: new SessionStore({
        db: "sessions.db",
        dir: "./prisma", // store sessions with database
    }),
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: false,
        sameSite: "lax",
    },
}));
// ROUTES
// api health check
app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
});
// auth routes
app.use("/auth", router);
// messaging routes
app.use("/inbox", inboxRouter);
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
