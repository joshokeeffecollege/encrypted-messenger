import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import FileStoreFactory from "session-file-store";
import { authRoutes } from "../auth/auth-routes.js";
import { messageRoutes } from "../chat/chat-routes.js";
import { keyRoutes } from "../keys/key-routes.js";
import {
  federationRoutes,
  webFingerRoutes,
} from "../federation/federation-routes.js";
import "./session-data.js";

dotenv.config();

export function createApp() {
  // this puts the express app together
  const app = express();
  const FileStore = FileStoreFactory(session);
  const serverDataDir = process.env.SERVER_DATA_DIR || "./prisma/server-data";

  app.use(
    express.json({
      // keep the raw body too for federation checks
      type: ["application/json", "application/activity+json"],
      verify(req, _res, buffer) {
        (req as express.Request).rawBody = buffer.toString("utf8");
      },
    }),
  );

  app.use(
    cors({
      // only allow local dev client urls here
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }

        const isLocalDevOrigin =
          /^http:\/\/localhost:\d+$/.test(origin) ||
          /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

        if (isLocalDevOrigin) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS blocked origin: ${origin}`));
      },
      credentials: true,
    }),
  );

  app.use(
    session({
      // keep login session data on the server
      store: new FileStore({
        path: `${serverDataDir}/sessions`,
        ttl: 7 * 24 * 60 * 60,
        logFn: () => {},
      }),
      secret: process.env.SESSION_SECRET || "dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    }),
  );

  app.get("/", (_req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // these are the main route groups
  app.use("/.well-known", webFingerRoutes);
  app.use("/auth", authRoutes);
  app.use("/inbox", messageRoutes);
  app.use("/keys", keyRoutes);
  app.use("/federation", federationRoutes);

  return app;
}
