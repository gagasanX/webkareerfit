-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "image" TEXT,
    "bio" TEXT,
    "skills" TEXT,
    "education" TEXT,
    "experience" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isAffiliate" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "affiliateCode" TEXT,
    "referredBy" TEXT
);
INSERT INTO "new_User" ("affiliateCode", "bio", "createdAt", "education", "email", "experience", "id", "image", "isAdmin", "isAffiliate", "name", "password", "phone", "referredBy", "skills", "updatedAt") SELECT "affiliateCode", "bio", "createdAt", "education", "email", "experience", "id", "image", "isAdmin", "isAffiliate", "name", "password", "phone", "referredBy", "skills", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_affiliateCode_key" ON "User"("affiliateCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
