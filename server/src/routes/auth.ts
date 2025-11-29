import express = require("express");
import {loginUser, registerUser} from "../services/authService.js";

export const router = express.Router();

// register
router.post('/register', async (req, res) => {
    const {username, password} = req.body as {
        username?: string;
        password?: string,
    };

    // input validation
    if (!username || !password) {
        return res.status(400).send("Username and password is required");
    }

    try {
        const user = await registerUser(username, password);
        return res.status(201).json(user);
    } catch (error) {
        console.log(error);
    }
});

// login
router.post('/login', async (req, res) => {
    const {username, password} = req.body as {
        username?: string;
        password?: string,
    };

    if (!username || !password) {
        return res.status(400).send("Username and password is required");
    }

    try {
        const user = await loginUser(username, password);
        return res.status(201).json(user);
    } catch (error: any) {
        if (error.message === "Invalid credentials") {
            return res.status(401).send("Invalid credentials");
        }
        console.log(error);
    }
})