import "express-session";
import "express";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

declare module "express" {
  interface Request {
    rawBody?: string;
  }
}
