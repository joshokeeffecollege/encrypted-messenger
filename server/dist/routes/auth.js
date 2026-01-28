import { createRequire as _createRequire } from "module";
const __require = _createRequire(import.meta.url);
const express = __require("express");
import { loginUser, registerUser } from "../services/authService.js";
export const router = express.Router();
// register
router.post("/register", async (req, res) => {
    const { username, password } = req.body;
    // input validation
    if (!username || !password) {
        return res.status(400).send("Username and password is required");
    }
    try {
        const user = await registerUser(username, password);
        req.session.userId = user.id;
        return res.status(201).json(user);
    }
    catch (error) {
        if (error.code === "Username already exists") {
            return res.status(409).json({ error: "Username already exists" });
        }
        console.log("Registration error: " + error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send("Username and password is required");
    }
    try {
        const user = await loginUser(username, password);
        req.session.userId = user.id;
        return res.status(200).json(user);
    }
    catch (error) {
        if (error.message === "Invalid credentials") {
            return res.status(401).send("Invalid credentials");
        }
        console.log("Login error: " + error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
// logout
router.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                error: "Could not log out",
            });
        }
        res.clearCookie("connect.sid");
        return res.status(200).json({ message: "Logged out successfully" });
    });
});
// check if user is authenticated
router.get("/me", async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({
            error: "Not autenticated",
        });
    }
    try {
        // get yser from database
        const { prisma } = await import("../db/prisma.js");
        const user = await prisma.user.findUnique({
            where: { id: req.session.userId },
        });
        if (!user) {
            return res.status(404).json({
                error: "User not found",
            });
        }
        return res.status(200).json({
            id: user.id,
            username: user.username,
            createdAt: user.createdAt,
        });
    }
    catch (error) {
        console.log("Get user error: " + error);
        return res.status(500).json({
            error: "internal server error",
        });
    }
});
