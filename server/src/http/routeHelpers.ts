import type { Request, Response } from "express";

interface KnownErrorResponse {
  status: number;
  body: string | { error: string };
}

export function requireSession(req: Request, res: Response) {
  // Many routes need the session middleware, so this helper checks it once.
  if (!req.session) {
    res.status(500).json({ error: "Session middleware unavailable" });
    return null;
  }

  return req.session;
}

export function getLoggedInUserId(req: Request, res: Response) {
  // This is the common auth gate for routes that only work when logged in.
  const session = requireSession(req, res);

  if (!session) {
    return null;
  }

  if (!session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }

  return session.userId;
}

export function shortText(value: string, maxLength = 40) {
  // Logs should show a short preview instead of the full value.
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
  // Route files pass in expected business errors and this helper turns them into responses.
  if (error instanceof Error && knownErrors[error.message]) {
    const response = knownErrors[error.message];

    if (typeof response.body === "string") {
      return res.status(response.status).send(response.body);
    }

    return res.status(response.status).json(response.body);
  }

  if (typeof fallback.body === "string") {
    return res.status(fallback.status).send(fallback.body);
  }

  return res.status(fallback.status).json(fallback.body);
}
