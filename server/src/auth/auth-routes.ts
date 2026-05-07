import { Router } from "express";
import { loginUser, registerUser } from "./auth-service.js";
import { prisma } from "../db/database.js";
import {
  requireSession,
  getLoggedInUserId,
  sendErrorResponse,
} from "../http/routeHelpers.js";

export const authRoutes = Router();

// Small helper for usernames on one server.
export function isValidLocalUsername(username: string) {
  return !username.includes("@");
}

authRoutes.post("/register", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return res.status(400).send("Username and password is required");
  }

  if (!isValidLocalUsername(username)) {
    return res
      .status(400)
      .json({ error: "Usernames on this server cannot contain @" });
  }

  const session = requireSession(req, res);

  if (!session) {
    return;
  }

  try {
    const user = await registerUser(username, password);
    session.userId = user.id;

    console.log("User registered", {
      userId: user.id,
      username: user.username,
    });

    return res.status(201).json(user);
  } catch (error) {
    console.log("Registration error:", error);
    return sendErrorResponse(
      res,
      error,
      {
        "Username already exists": {
          status: 409,
          body: { error: "Username already exists" },
        },
      },
      {
        status: 500,
        body: { error: "Internal server error" },
      },
    );
  }
});

authRoutes.post("/login", async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    return res.status(400).send("Username and password is required");
  }

  const session = requireSession(req, res);

  if (!session) {
    return;
  }

  try {
    const user = await loginUser(username, password);
    session.userId = user.id;

    console.log("User logged in", {
      userId: user.id,
      username: user.username,
      note: "Client should now upload or reuse public key bundle",
    });

    return res.status(200).json(user);
  } catch (error) {
    console.log("Login error:", error);
    return sendErrorResponse(
      res,
      error,
      {
        "Invalid credentials": {
          status: 401,
          body: "Invalid credentials",
        },
      },
      {
        status: 500,
        body: { error: "Internal server error" },
      },
    );
  }
});

authRoutes.post("/logout", (req, res) => {
  const session = requireSession(req, res);

  if (!session) {
    return;
  }

  session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: "Could not log out",
      });
    }

    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully" });
  });
});

authRoutes.get("/me", async (req, res) => {
  const userId = getLoggedInUserId(req, res);

  if (!userId) {
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
  } catch (error) {
    console.log("Get user error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});
