import type { Request, Response } from "express";

interface KnownErrorResponse {
  status: number;
  body: string | { error: string };
}

export function requireSession(req: Request, res: Response) {
  // make sure session middleware is there
  if (!req.session) {
    res.status(500).json({ error: "Session middleware unavailable" });
    return null;
  }

  return req.session;
}

export function getLoggedInUserId(req: Request, res: Response) {
  // this checks login on protected routes
  const session = requireSession(req, res);

  if (!session) {
    return null;
  }

  if (!session.userId) {
    // route needs a logged in user id in the session
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }

  return session.userId;
}

export function shortText(value: string, maxLength = 40) {
  // logs only need a short preview
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

export function sendErrorResponse(
  res: Response,
  error: unknown,
  knownErrors: Record<string, KnownErrorResponse>,
  fallback: KnownErrorResponse,
) {
  // turn known errors into http responses
  if (error instanceof Error && knownErrors[error.message]) {
    // known business errors get custom status codes
    const response = knownErrors[error.message];

    if (typeof response.body === "string") {
      return res.status(response.status).send(response.body);
    }

    return res.status(response.status).json(response.body);
  }

  if (typeof fallback.body === "string") {
    // some routes want plain text fallback errors
    return res.status(fallback.status).send(fallback.body);
  }

  // otherwise send the normal json fallback
  return res.status(fallback.status).json(fallback.body);
}
