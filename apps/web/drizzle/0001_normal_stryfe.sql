CREATE TABLE "accountPreference" (
	"userId" text PRIMARY KEY NOT NULL,
	"lastOpenDiagramId" text,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accountPreference" ADD CONSTRAINT "accountPreference_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;