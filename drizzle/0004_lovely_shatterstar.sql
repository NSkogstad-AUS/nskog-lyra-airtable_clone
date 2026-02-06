CREATE TABLE "user_view_favorite" (
	"userId" uuid NOT NULL,
	"viewId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_view_favorite_userId_viewId_pk" PRIMARY KEY("userId","viewId")
);
--> statement-breakpoint
ALTER TABLE "view" ADD COLUMN "order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_view_favorite" ADD CONSTRAINT "user_view_favorite_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_view_favorite" ADD CONSTRAINT "user_view_favorite_viewId_view_id_fk" FOREIGN KEY ("viewId") REFERENCES "public"."view"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_view_favorite_userId_idx" ON "user_view_favorite" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "user_view_favorite_viewId_idx" ON "user_view_favorite" USING btree ("viewId");--> statement-breakpoint
CREATE INDEX "view_tableId_order_idx" ON "view" USING btree ("tableId","order");