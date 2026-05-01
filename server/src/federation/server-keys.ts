import fs from "node:fs/promises";
import path from "node:path";
import { createPrivateKey, createPublicKey, generateKeyPairSync } from "node:crypto";
 
function getKeysFolder() {
  const serverDataDir = process.env.SERVER_DATA_DIR || "./prisma/server-data";
  return path.resolve(process.cwd(), serverDataDir, "federation");
}

function getPrivateKeyPath() {
  return path.join(getKeysFolder(), "server-private.pem");
}

function getPublicKeyPath() {
  return path.join(getKeysFolder(), "server-public.pem");
}

async function readText(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeKeys(privateKeyPem: string, publicKeyPem: string) {
  await fs.mkdir(getKeysFolder(), { recursive: true });
  await fs.writeFile(getPrivateKeyPath(), privateKeyPem, "utf8");
  await fs.writeFile(getPublicKeyPath(), publicKeyPem, "utf8");
}

export async function getServerKeys() {
  const savedPrivateKey = await readText(getPrivateKeyPath());
  const savedPublicKey = await readText(getPublicKeyPath());

  if (savedPrivateKey && savedPublicKey) {
    return {
      privateKeyPem: savedPrivateKey,
      publicKeyPem: savedPublicKey,
    };
  }

  const generated = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
  });

  await writeKeys(generated.privateKey, generated.publicKey);

  return {
    privateKeyPem: generated.privateKey,
    publicKeyPem: generated.publicKey,
  };
}

export async function getServerSigner() {
  const { privateKeyPem } = await getServerKeys();
  return createPrivateKey(privateKeyPem);
}

export function makePublicKeyFromPem(publicKeyPem: string) {
  return createPublicKey(publicKeyPem);
}
