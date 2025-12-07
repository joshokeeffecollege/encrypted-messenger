import { createRequire as _createRequire } from "module";
const __require = _createRequire(import.meta.url);
const express = __require("express");
import { loginUser, registerUser } from "../services/authService.js";
export const router = express.Router();
// register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    // input validation
    if (!username || !password) {
        return res.status(400).send("Username and password is required");
    }
    try {
        const user = await registerUser(username, password);
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
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send("Username and password is required");
    }
    try {
        const user = await loginUser(username, password);
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
