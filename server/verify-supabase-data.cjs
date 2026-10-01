require("dotenv").config({ path: "./server/.env" });

const { Client } = require("pg");

const client = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT),
  database: process.env.SUPABASE_DB_NAME,
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

const tables = [
  "customers",
  "sellers",
  "products",
  "support_messages",
  "orders",
  "reviews",
  "notifications",
];

async function main() {
  try {
    await client.connect();

    for (const table of tables) {
      const result = await client.query(
        `SELECT COUNT(*) AS total FROM "${table}"`
      );

      console.log(`${table}: ${result.rows[0].total} records`);
    }

    console.log("SUPABASE_DATA_VERIFIED");
  } catch (error) {
    console.log("SUPABASE_VERIFICATION_FAILED");
    console.log(error.message);
  } finally {
    await client.end().catch(() => {});
  }
}

main();

