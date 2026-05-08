function getArgValue(flagName) {
  const index = process.argv.indexOf(flagName);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

export function cleanServerUrl(value) {
  return value.trim().replace(/\/+$/, "");
}

export function getPartitionName() {
  return getArgValue("--partition") ?? "messenger-default";
}

export function getWindowTitle() {
  return (
    getArgValue("--title") ?? `Encrypted Messenger (${getPartitionName()})`
  );
}

export function getRendererPort() {
  return getArgValue("--renderer-port") ?? "5173";
}

export function getRendererUrl() {
  return `http://127.0.0.1:${getRendererPort()}`;
}

export function getServerBaseUrl() {
  return (
    getArgValue("--server-url") ??
    process.env.SERVER_BASE_URL ??
    "http://127.0.0.1:5001"
  );
}
