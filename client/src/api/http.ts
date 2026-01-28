const API_BASE = "http://localhost:5001";

// Generic GET helper
export async function apiGet<T = any>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
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
  const response = await fetch(`${API_BASE}${path}`, {
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
