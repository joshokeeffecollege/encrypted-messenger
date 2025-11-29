export const API_BASE = "http://localhost:5000";

// helper for GET requests
export async function apiGet<T>(path: string, token?: string): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`GET ${path} failed with status ${response.status}`);
    }

    return (await response.json()) as T;
}

// helper for POST requests
export async function apiPost<T>(
    path: string,
    data: unknown,
    token?: string
): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        body: JSON.stringify(data),
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error(`POST ${path} failed with status ${response.status}`);
    }

    return (await response.json()) as T;
}
