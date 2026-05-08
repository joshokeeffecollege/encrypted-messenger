async function readJson(response) {
  // read json if there is any body
  const text = await response.text();

  if (!text) {
    return null;
  }

  return JSON.parse(text);
}

export function createServerFetch(windowState) {
  async function fetchFromServer(sender, pathName, options = {}) {
    // use this windows cookies when calling the server
    const serverBaseUrl = windowState.getWindowServerUrl(sender);
    const cookies = await sender.session.cookies.get({ url: serverBaseUrl });
    const cookieHeader = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    const headers = new Headers(options.headers ?? {});

    if (cookieHeader) {
      headers.set("Cookie", cookieHeader);
    }

    const response = await sender.session.fetch(`${serverBaseUrl}${pathName}`, {
      ...options,
      headers,
    });
    const data = await readJson(response);

    if (!response.ok) {
      // turn bad http into normal js errors
      const error = new Error(
        data?.error ?? `HTTP ${response.status} ${response.statusText}`,
      );

      error.status = response.status;
      throw error;
    }

    return data;
  }

  return {
    fetchFromServer,

    fetchForEvent(event, pathName, options = {}) {
      return fetchFromServer(event.sender, pathName, options);
    },

    isNotFoundError(error) {
      return error instanceof Error && "status" in error && error.status === 404;
    },

    getPeerKeys(event, peerUsername) {
      // get the other users public key bundle
      return fetchFromServer(
        event.sender,
        `/keys/${encodeURIComponent(peerUsername)}`,
      );
    },
  };
}
