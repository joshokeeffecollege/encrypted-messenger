function readSavedServerUrl() {
  if (typeof localStorage === "undefined") {
    return "";
  }

  return localStorage.getItem("chat-server-url") || "";
}

function readDesktopServerUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.desktop?.serverUrl || "";
}

let serverUrl = readSavedServerUrl() || readDesktopServerUrl() || "";

export function cleanServerUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function setServerUrl(value: string) {
  serverUrl = cleanServerUrl(value);

  if (serverUrl) {
    localStorage.setItem("chat-server-url", serverUrl);
    return;
  }

  localStorage.removeItem("chat-server-url");
}

export function getServerUrl() {
  return serverUrl;
}

function getApiBase() {
  if (!serverUrl) {
    throw new Error("Enter a server address first.");
  }

  return serverUrl;
}

// simple get helper for the server
export async function apiGet<T = any>(path: string): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`HTTP GET error ${response.status}`);
  }

  return response.json();
}

// simple post helper for the server
export async function apiPost<T = any>(path: string, data?: any): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data ?? {}),
  });

  if (!response.ok) {
    throw new Error("Invalid credentials");
  }

  return response.json();
}

export const api = {
  get: apiGet,
  post: apiPost,
};
