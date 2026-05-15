ALTER TABLE "report_executions" ALTER COLUMN "output" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "effort" text DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "report_execution_id" uuid;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "custom_prompt" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "integrations" text[];--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "is_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_report_execution_id_report_executions_id_fk" FOREIGN KEY ("report_execution_id") REFERENCES "public"."report_executions"("id") ON DELETE set null ON UPDATE no action;