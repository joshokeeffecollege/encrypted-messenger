const savedServerUrl = localStorage.getItem("chat-server-url");

let serverUrl = savedServerUrl || window.desktop?.serverUrl || "";

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

// Generic GET helper
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

// Generic POST helper
export async function apiPost<T = any>(path: string, data?: any): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data ?? {}),
  });

  if (!response.ok) {
    throw new Error(`HTTP POST error ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: apiGet,
  post: apiPost,
};
