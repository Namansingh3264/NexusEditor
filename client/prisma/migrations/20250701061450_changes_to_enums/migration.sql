/*
  Warnings:

  - The values [COMMENTER] on the enum `Permission` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Permission_new" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
ALTER TABLE "document_permissions" ALTER COLUMN "permission_level" TYPE "Permission_new" USING ("permission_level"::text::"Permission_new");
ALTER TYPE "Permission" RENAME TO "Permission_old";
ALTER TYPE "Permission_new" RENAME TO "Permission";
DROP TYPE "Permission_old";
COMMIT;
