require("dotenv").config({ path: "./.env" });

const Database = require("better-sqlite3");
const { Client } = require("pg");

const sqlite = new Database("./afrimarket.db", {
  readonly: true,
});

const pg = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT),
  database: process.env.SUPABASE_DB_NAME,
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

async function insertRows(table, columns, conflictColumn) {
  const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();

  for (const row of rows) {
    const values = columns.map((column) => row[column]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");

    await pg.query(
      `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")})
       VALUES (${placeholders})
       ON CONFLICT ("${conflictColumn}") DO NOTHING`,
      values
    );
  }

  console.log(`${table}: ${rows.length} source records processed`);
}

async function main() {
  try {
    await pg.connect();

    await pg.query("BEGIN");

    await insertRows(
      "customers",
      ["id", "name", "email", "password", "created_at"],
      "id"
    );

    await insertRows(
      "sellers",
      ["email", "business_name", "name", "phone", "password", "created_at"],
      "email"
    );

    await insertRows(
      "products",
      [
        "id",
        "seller_email",
        "name",
        "description",
        "price",
        "quantity",
        "category",
        "image",
        "created_at",
      ],
      "id"
    );

    await insertRows(
      "support_messages",
      ["id", "conversation_id", "text", "sender", "created_at"],
      "id"
    );

    await insertRows(
      "orders",
      [
        "id",
        "reference",
        "customer_email",
        "items_json",
        "delivery_info_json",
        "total",
        "status",
        "tracking_status",
        "date",
      ],
      "id"
    );

    await insertRows(
      "reviews",
      [
        "id",
        "product_name",
        "customer_email",
        "rating",
        "text",
        "created_at",
      ],
      "id"
    );

    await insertRows(
      "notifications",
      ["id", "user_email", "reference", "message", "date", "is_read"],
      "id"
    );

    await pg.query("COMMIT");

    console.log("MIGRATION_COMPLETED");
  } catch (error) {
    await pg.query("ROLLBACK").catch(() => {});
    console.log("MIGRATION_FAILED");
    console.log(error.message);
  } finally {
    sqlite.close();
    await pg.end().catch(() => {});
  }
}

main();