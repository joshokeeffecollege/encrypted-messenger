import argon2 from 'argon2';
import { prisma } from "../db/prisma.js";
// register new user with hashed password
export async function registerUser(username, password) {
    // check if user exists
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
        throw new Error(`Username already exists`);
    }
    // hash password with Argon2
    const passwordHash = await argon2.hash(password);
    // stores user in db
    const user = await prisma.user.create({
        data: {
            username,
            password: passwordHash,
        },
    });
    // return safe public fields
    return {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
    };
}
export async function loginUser(username, password) {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
        throw new Error("Invalid credentials");
    }
    // compare plaintext password with stored Argon2 hash
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
        throw new Error("Invalid credentials");
    }
    return {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
    };
}
