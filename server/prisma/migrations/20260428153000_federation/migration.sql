-- CreateTable
CREATE TABLE "RemoteAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "handle" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "actorUrl" TEXT NOT NULL,
    "inboxUrl" TEXT NOT NULL,
    "serverPublicKeyId" TEXT NOT NULL,
    "serverPublicKeyPem" TEXT NOT NULL,
    "keyBundleUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "senderUserId" TEXT,
    "senderRemoteAccountId" TEXT,
    "recipientUserId" TEXT,
    "recipientRemoteAccountId" TEXT,
    "senderHandle" TEXT NOT NULL,
    "recipientHandle" TEXT NOT NULL,
    "remoteServer" TEXT,
    "federationMessageId" TEXT,
    "receivedViaFederation" BOOLEAN NOT NULL DEFAULT false,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'delivered',
    "ciphertext" TEXT NOT NULL,
    "headerJson" TEXT NOT NULL,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_senderRemoteAccountId_fkey" FOREIGN KEY ("senderRemoteAccountId") REFERENCES "RemoteAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_recipientRemoteAccountId_fkey" FOREIGN KEY ("recipientRemoteAccountId") REFERENCES "RemoteAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Message" (
    "id",
    "senderUserId",
    "recipientUserId",
    "senderHandle",
    "recipientHandle",
    "deliveryStatus",
    "ciphertext",
    "headerJson",
    "deliveredAt",
    "createdAt"
)
SELECT
    "Message"."id",
    "Message"."senderId",
    "Message"."recipientId",
    COALESCE("Sender"."username", ""),
    COALESCE("Recipient"."username", ""),
    'delivered',
    "Message"."ciphertext",
    "Message"."headerJson",
    "Message"."deliveredAt",
    "Message"."createdAt"
FROM "Message"
LEFT JOIN "User" AS "Sender" ON "Sender"."id" = "Message"."senderId"
LEFT JOIN "User" AS "Recipient" ON "Recipient"."id" = "Message"."recipientId";

DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";

CREATE UNIQUE INDEX "Message_federationMessageId_key" ON "Message"("federationMessageId");
CREATE INDEX "Message_senderUserId_idx" ON "Message"("senderUserId");
CREATE INDEX "Message_recipientUserId_idx" ON "Message"("recipientUserId");
CREATE INDEX "Message_senderRemoteAccountId_idx" ON "Message"("senderRemoteAccountId");
CREATE INDEX "Message_recipientRemoteAccountId_idx" ON "Message"("recipientRemoteAccountId");
CREATE INDEX "Message_senderHandle_idx" ON "Message"("senderHandle");
CREATE INDEX "Message_recipientHandle_idx" ON "Message"("recipientHandle");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE UNIQUE INDEX "RemoteAccount_handle_key" ON "RemoteAccount"("handle");
CREATE UNIQUE INDEX "RemoteAccount_actorUrl_key" ON "RemoteAccount"("actorUrl");
