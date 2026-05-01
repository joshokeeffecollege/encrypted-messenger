import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const serverDir = path.join(repoRoot, "server");

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen({
      port,
      host: "127.0.0.1",
      exclusive: true,
    });
  });
}

async function findAvailablePort(startPort = 5001, maxPort = 5099) {
  for (let port = startPort; port <= maxPort; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No free server port found between ${startPort} and ${maxPort}.`);
}

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${command} exited with code ${code}`));
        return;
      }

      resolve();
    });
  });
}

const port = await findAvailablePort();
const serverUrl = `http://127.0.0.1:${port}`;
const serverDataDir = `./prisma/server-${port}`;
const databaseUrl = `file:./dev-${port}.db`;
const childEnv = {
  ...process.env,
  PORT: String(port),
  PUBLIC_BASE_URL: serverUrl,
  SERVER_DATA_DIR: serverDataDir,
  DATABASE_URL: databaseUrl,
};

console.log(`Starting server on ${serverUrl}`);
console.log(`Database: ${databaseUrl}`);
console.log(`Server data: ${serverDataDir}`);

await runCommand(
  "npx",
  ["prisma", "migrate", "deploy", "--config", "prisma.config.ts"],
  {
    cwd: serverDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: childEnv,
  },
);

const child = spawn("npm", ["run", "dev"], {
  cwd: serverDir,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: childEnv,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
