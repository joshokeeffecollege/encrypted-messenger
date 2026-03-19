-- CreateTable
CREATE TABLE "UserKeyBundle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "registrationId" INTEGER NOT NULL,
    "identityKey" TEXT NOT NULL,
    "signedPreKeyId" INTEGER NOT NULL,
    "signedPreKeyPublic" TEXT NOT NULL,
    "signedPreKeySignature" TEXT NOT NULL,
    "preKeysJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserKeyBundle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserKeyBundle_userId_key" ON "UserKeyBundle"("userId");
