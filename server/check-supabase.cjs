require("dotenv").config({ path: "./.env" });

const { Client } = require("pg");

const client = new Client({
  host: process.env.SUPABASE_DB_HOST,
  port: Number(process.env.SUPABASE_DB_PORT),
  database: process.env.SUPABASE_DB_NAME,
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});

client
  .connect()
  .then(() =>
    client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    )
  )
  .then((result) => {
    console.log(result.rows);
  })
  .catch((error) => {
    console.log("ERROR:", error.message);
  })
  .finally(() => client.end());