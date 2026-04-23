/*
  Warnings:

  - Added the required column `kyberPreKeyId` to the `UserKeyBundle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kyberPreKeyPublic` to the `UserKeyBundle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kyberPreKeySignature` to the `UserKeyBundle` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserKeyBundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "identityKey" TEXT NOT NULL,
    "signedPreKeyId" INTEGER NOT NULL,
    "signedPreKeyPublic" TEXT NOT NULL,
    "signedPreKeySignature" TEXT NOT NULL,
    "kyberPreKeyId" INTEGER NOT NULL,
    "kyberPreKeyPublic" TEXT NOT NULL,
    "kyberPreKeySignature" TEXT NOT NULL,
    "preKeysJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserKeyBundle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserKeyBundle" ("createdAt", "id", "identityKey", "preKeysJson", "registrationId", "signedPreKeyId", "signedPreKeyPublic", "signedPreKeySignature", "updatedAt", "userId") SELECT "createdAt", "id", "identityKey", "preKeysJson", "registrationId", "signedPreKeyId", "signedPreKeyPublic", "signedPreKeySignature", "updatedAt", "userId" FROM "UserKeyBundle";
DROP TABLE "UserKeyBundle";
ALTER TABLE "new_UserKeyBundle" RENAME TO "UserKeyBundle";
CREATE UNIQUE INDEX "UserKeyBundle_userId_key" ON "UserKeyBundle"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
