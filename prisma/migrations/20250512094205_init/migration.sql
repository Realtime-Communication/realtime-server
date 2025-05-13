/*
  Warnings:

  - The values [voice,video] on the enum `CallType` will be removed. If these variants are still used in the database, this will fail.
  - The values [sent,delivered,read] on the enum `MessageStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [text,image,file,video,call] on the enum `MessageType` will be removed. If these variants are still used in the database, this will fail.
  - The values [lead,member] on the enum `ParticipantType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `callStatus` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the `Device` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `call_status` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CallType_new" AS ENUM ('VOICE', 'VIDEOE');
ALTER TABLE "Message" ALTER COLUMN "call_type" TYPE "CallType_new" USING ("call_type"::text::"CallType_new");
ALTER TYPE "CallType" RENAME TO "CallType_old";
ALTER TYPE "CallType_new" RENAME TO "CallType";
DROP TYPE "CallType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MessageStatus_new" AS ENUM ('SENT', 'DELIVERED', 'READ');
ALTER TABLE "Message" ALTER COLUMN "status" TYPE "MessageStatus_new" USING ("status"::text::"MessageStatus_new");
ALTER TYPE "MessageStatus" RENAME TO "MessageStatus_old";
ALTER TYPE "MessageStatus_new" RENAME TO "MessageStatus";
DROP TYPE "MessageStatus_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "MessageType_new" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'VIDEO', 'CALL');
ALTER TABLE "Message" ALTER COLUMN "message_type" TYPE "MessageType_new" USING ("message_type"::text::"MessageType_new");
ALTER TYPE "MessageType" RENAME TO "MessageType_old";
ALTER TYPE "MessageType_new" RENAME TO "MessageType";
DROP TYPE "MessageType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ParticipantType_new" AS ENUM ('LEAD', 'MEMBER');
ALTER TABLE "Participant" ALTER COLUMN "type" TYPE "ParticipantType_new" USING ("type"::text::"ParticipantType_new");
ALTER TYPE "ParticipantType" RENAME TO "ParticipantType_old";
ALTER TYPE "ParticipantType_new" RENAME TO "ParticipantType";
DROP TYPE "ParticipantType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Access" DROP CONSTRAINT "Access_device_id_fkey";

-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_user_id_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "callStatus",
ADD COLUMN     "call_status" "CallStatus" NOT NULL;

-- DropTable
DROP TABLE "Device";
