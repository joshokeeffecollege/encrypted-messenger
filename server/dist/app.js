import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { router } from "./routes/auth.js";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
// ROUTES
// api health check
app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Server is running" });
});
app.use("/auth", router);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
