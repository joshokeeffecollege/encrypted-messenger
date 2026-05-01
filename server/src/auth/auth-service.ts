import argon2 from "argon2";
import { prisma } from "../db/database.js";

export interface AuthUser {
  id: string;
  username: string;
  createdAt: Date;
}

export async function registerUser(
  username: string,
  password: string
): Promise<AuthUser> {
  const existingUser = await prisma.user.findUnique({ where: { username } });

  if (existingUser) {
    throw new Error(`Username already exists`);
  }

  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      username,
      password: passwordHash,
    },
  });

  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
  };
}

export async function loginUser(
  username: string,
  password: string
): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const passwordMatches = await argon2.verify(user.password, password);

  if (!passwordMatches) {
    throw new Error("Invalid credentials");
  }

  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
  };
}
