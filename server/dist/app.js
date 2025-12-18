import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { router } from "./routes/auth.js";
import { inboxRouter } from "./routes/inbox.js";
dotenv.config();
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

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
