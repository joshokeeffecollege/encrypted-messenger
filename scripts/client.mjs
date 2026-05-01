import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const clientDir = path.join(repoRoot, "client");

function getArgValue(flagName) {
  const index = process.argv.indexOf(flagName);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(startPort = 5173, maxPort = 5199) {
  for (let port = startPort; port <= maxPort; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(
    `No free renderer port found between ${startPort} and ${maxPort}.`,
  );
}

function waitForPort(port, host = "127.0.0.1", timeoutMs = 20000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ port, host });

      socket.once("connect", () => {
        socket.end();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();

        if (Date.now() - startedAt >= timeoutMs) {
          reject(
            new Error(
              `Timed out waiting for renderer on http://${host}:${port}.`,
            ),
          );
          return;
        }

        setTimeout(attempt, 250);
      });
    };

    attempt();
  });
}

function createManagedChild(command, args, options) {
  const child = spawn(command, args, options);

  child.on("error", (error) => {
    console.error(error);
  });

  return child;
}

const serverUrl =
  getArgValue("--server-url") ??
  process.env.SERVER_BASE_URL ??
  "";

const port = await findAvailablePort();
const partition =
  getArgValue("--partition") ?? `messenger-${port}`;
const title =
  getArgValue("--title") ??
  (getArgValue("--partition")
    ? `Encrypted Messenger (${partition})`
    : "Encrypted Messenger");

console.log(`Starting renderer on http://127.0.0.1:${port}`);
console.log(`Using Electron partition "${partition}"`);
if (serverUrl) {
  console.log(`Using server ${serverUrl}`);
} else {
  console.log("No server selected yet. Choose one on the login screen.");
}

const vite = createManagedChild(
  "npm",
  [
    "run",
    "dev",
    "--",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  {
    cwd: clientDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

let electron = null;
let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (electron && !electron.killed) {
    electron.kill("SIGTERM");
  }

  if (!vite.killed) {
    vite.kill("SIGTERM");
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 100);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

vite.once("exit", (code, signal) => {
  if (!shuttingDown) {
    if (signal) {
      console.error(`Renderer exited with signal ${signal}`);
    }

    shutdown(code ?? 1);
  }
});

try {
  await waitForPort(port);

  const electronArgs = [
    "electron",
    ".",
    "--partition",
    partition,
    "--title",
    title,
    "--renderer-port",
    String(port),
  ];

  if (serverUrl) {
    electronArgs.push("--server-url", serverUrl);
  }

  electron = createManagedChild("npx", electronArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  electron.once("exit", (code, signal) => {
    if (!shuttingDown) {
      if (signal) {
        console.error(`Electron exited with signal ${signal}`);
      }

      shutdown(code ?? 0);
    }
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  shutdown(1);
}
