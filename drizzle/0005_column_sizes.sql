ALTER TABLE "column" ADD COLUMN "size" integer;
--> statement-breakpoint
UPDATE "column"
SET "size" = CASE
  WHEN lower("name") = 'notes' THEN 260
  WHEN lower("name") = 'assignee' THEN 160
  WHEN lower("name") = 'status' THEN 140
  WHEN lower("name") = 'attachments' THEN 140
  WHEN lower("name") = 'name' THEN 220
  WHEN "type" = 'number' THEN 160
  ELSE 220
END;
--> statement-breakpoint
ALTER TABLE "column" ALTER COLUMN "size" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "column" ALTER COLUMN "size" SET DEFAULT 220;
