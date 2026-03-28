ALTER TABLE "User"
  ADD COLUMN "email" TEXT;

ALTER TABLE "User"
  ALTER COLUMN "phone" DROP NOT NULL;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
