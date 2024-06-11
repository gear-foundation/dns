module.exports = class Data1718105861573 {
    name = 'Data1718105861573'

    async up(db) {
        await db.query(`CREATE TABLE "program" ("id" character varying NOT NULL, "name" text NOT NULL, "address" text NOT NULL, "created_by" text NOT NULL, "history" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL, "dns_id" character varying, CONSTRAINT "PK_3bade5945afbafefdd26a3a29fb" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_ce0a5b4818449c2e5e1e597850" ON "program" ("dns_id") `)
        await db.query(`CREATE INDEX "IDX_dae6ca917077c2573e75bff7a9" ON "program" ("created_at") `)
        await db.query(`CREATE INDEX "IDX_23613cc44621ea12cc561aa38e" ON "program" ("updated_at") `)
        await db.query(`CREATE TABLE "event" ("id" character varying NOT NULL, "type" text NOT NULL, "raw" text NOT NULL, "block_number" integer NOT NULL, "tx_hash" text NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "dns_id" character varying, CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_aee9a7135ea97761ba7ffa2e98" ON "event" ("dns_id") `)
        await db.query(`CREATE TABLE "dns" ("id" character varying NOT NULL, "address" text NOT NULL, "admins" text array NOT NULL, CONSTRAINT "PK_aaaf9fa5f8386fc9875d017d546" PRIMARY KEY ("id"))`)
        await db.query(`ALTER TABLE "program" ADD CONSTRAINT "FK_ce0a5b4818449c2e5e1e597850a" FOREIGN KEY ("dns_id") REFERENCES "dns"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
        await db.query(`ALTER TABLE "event" ADD CONSTRAINT "FK_aee9a7135ea97761ba7ffa2e98a" FOREIGN KEY ("dns_id") REFERENCES "dns"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`)
    }

    async down(db) {
        await db.query(`DROP TABLE "program"`)
        await db.query(`DROP INDEX "public"."IDX_ce0a5b4818449c2e5e1e597850"`)
        await db.query(`DROP INDEX "public"."IDX_dae6ca917077c2573e75bff7a9"`)
        await db.query(`DROP INDEX "public"."IDX_23613cc44621ea12cc561aa38e"`)
        await db.query(`DROP TABLE "event"`)
        await db.query(`DROP INDEX "public"."IDX_aee9a7135ea97761ba7ffa2e98"`)
        await db.query(`DROP TABLE "dns"`)
        await db.query(`ALTER TABLE "program" DROP CONSTRAINT "FK_ce0a5b4818449c2e5e1e597850a"`)
        await db.query(`ALTER TABLE "event" DROP CONSTRAINT "FK_aee9a7135ea97761ba7ffa2e98a"`)
    }
}
