CREATE UNIQUE INDEX "redemption_records_user_code_unique" ON "redemption_records" USING btree ("user_id", "code");
