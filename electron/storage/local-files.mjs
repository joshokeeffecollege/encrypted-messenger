import fs from "node:fs/promises";
import path from "node:path";
import { base64ToBytes, bytesToBase64, cleanId } from "../encryption/signal-utils.mjs";

function getUserFolder(rootDir, userId) {
  return path.join(rootDir, cleanId(userId));
}

function getSectionFolder(rootDir, userId, sectionName) {
  return path.join(getUserFolder(rootDir, userId), sectionName);
}

function getRecordPath(rootDir, userId, sectionName, itemId) {
  return path.join(
    getSectionFolder(rootDir, userId, sectionName),
    `${cleanId(itemId)}.txt`,
  );
}

async function makeFolder(folderPath) {
  await fs.mkdir(folderPath, { recursive: true });
}

export async function saveText(rootDir, userId, sectionName, itemId, value) {
  // each user gets their own local folder stuff
  await makeFolder(getSectionFolder(rootDir, userId, sectionName));
  await fs.writeFile(
    getRecordPath(rootDir, userId, sectionName, itemId),
    value,
    "utf8",
  );
}

export async function loadText(rootDir, userId, sectionName, itemId) {
  try {
    return await fs.readFile(
      getRecordPath(rootDir, userId, sectionName, itemId),
      "utf8",
    );
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function deleteText(rootDir, userId, sectionName, itemId) {
  try {
    await fs.unlink(getRecordPath(rootDir, userId, sectionName, itemId));
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }
}

export async function hasText(rootDir, userId, sectionName, itemId) {
  return (await loadText(rootDir, userId, sectionName, itemId)) !== null;
}

export async function saveRecord(rootDir, userId, sectionName, itemId, record) {
  await saveText(
    rootDir,
    userId,
    sectionName,
    itemId,
    bytesToBase64(record.serialize()),
  );
}

export async function loadRecordBytes(rootDir, userId, sectionName, itemId) {
  const value = await loadText(rootDir, userId, sectionName, itemId);
  return value ? base64ToBytes(value) : null;
}
