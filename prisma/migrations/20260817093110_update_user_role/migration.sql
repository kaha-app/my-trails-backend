/*
  Warnings:

  - The values [super_admin,editor,guide,customer] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- First add the new enum values to the existing type
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'user';

-- Update existing records to valid values
UPDATE "User" SET role = 'admin' WHERE role = 'super_admin';
UPDATE "User" SET role = 'admin' WHERE role = 'editor';  
UPDATE "User" SET role = 'user' WHERE role = 'customer';
UPDATE "User" SET role = 'user' WHERE role = 'guide';

-- Now remove old values by creating new enum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('admin', 'user');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';
COMMIT;
