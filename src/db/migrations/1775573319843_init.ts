import { Kysely, sql } from "kysely";
import { Database } from "../database.types";

export async function up(db: Kysely<Database>): Promise<void> {
  await sql`create extension if not exists pgcrypto`.execute(db);

  await db.schema
    .createTable("repositories")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("owner", "varchar(255)", (col) => col.notNull())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("full_name", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("last_seen_tag", "varchar(255)")
    .addColumn("last_checked_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createTable("subscriptions")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn("email", "varchar(320)", (col) => col.notNull())
    .addColumn("repository_id", "uuid", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull())
    .addColumn("confirm_token_hash", "varchar(255)")
    .addColumn("unsubscribe_token_hash", "varchar(255)", (col) => col.notNull())
    .addColumn("confirmed_at", "timestamptz")
    .addColumn("unsubscribed_at", "timestamptz")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addForeignKeyConstraint(
      "subscriptions_repository_id_fk",
      ["repository_id"],
      "repositories",
      ["id"],
      (cb) => cb.onDelete("cascade").onUpdate("cascade"),
    )
    .addCheckConstraint(
      "subscriptions_status_check",
      sql`status in ('pending', 'active', 'unsubscribed')`,
    )
    .execute();

  await db.schema
    .createIndex("repositories_owner_name_idx")
    .on("repositories")
    .columns(["owner", "name"])
    .execute();

  await db.schema
    .createIndex("subscriptions_email_idx")
    .on("subscriptions")
    .column("email")
    .execute();

  await db.schema
    .createIndex("subscriptions_status_idx")
    .on("subscriptions")
    .column("status")
    .execute();

  await db.schema
    .createIndex("subscriptions_repository_id_idx")
    .on("subscriptions")
    .column("repository_id")
    .execute();

  await db.schema
    .createIndex("subscriptions_repository_id_status_idx")
    .on("subscriptions")
    .columns(["repository_id", "status"])
    .execute();

  await db.schema
    .createIndex("subscriptions_email_status_idx")
    .on("subscriptions")
    .columns(["email", "status"])
    .execute();

  await db.schema
    .createIndex("subscriptions_confirm_token_hash_idx")
    .on("subscriptions")
    .column("confirm_token_hash")
    .execute();

  await db.schema
    .createIndex("subscriptions_unsubscribe_token_hash_idx")
    .on("subscriptions")
    .column("unsubscribe_token_hash")
    .execute();

  await db.schema
    .createIndex("subscriptions_email_repository_id_unique_idx")
    .on("subscriptions")
    .columns(["email", "repository_id"])
    .unique()
    .execute();
}

export async function down(db: Kysely<Database>): Promise<void> {
  await db.schema
    .dropIndex("subscriptions_email_repository_id_unique_idx")
    .ifExists()
    .execute();

  await db.schema
    .dropIndex("subscriptions_unsubscribe_token_hash_idx")
    .ifExists()
    .execute();

  await db.schema
    .dropIndex("subscriptions_confirm_token_hash_idx")
    .ifExists()
    .execute();

  await db.schema
    .dropIndex("subscriptions_email_status_idx")
    .ifExists()
    .execute();

  await db.schema
    .dropIndex("subscriptions_repository_id_status_idx")
    .ifExists()
    .execute();

  await db.schema
    .dropIndex("subscriptions_repository_id_idx")
    .ifExists()
    .execute();

  await db.schema.dropIndex("subscriptions_status_idx").ifExists().execute();

  await db.schema.dropIndex("subscriptions_email_idx").ifExists().execute();

  await db.schema.dropIndex("repositories_owner_name_idx").ifExists().execute();

  await db.schema.dropTable("subscriptions").ifExists().execute();
  await db.schema.dropTable("repositories").ifExists().execute();
}
