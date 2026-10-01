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

const sql = `
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sellers (
  email TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  seller_email TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL DEFAULT 'legacy',
  text TEXT NOT NULL,
  sender TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  customer_email TEXT,
  items_json TEXT NOT NULL,
  delivery_info_json TEXT,
  total DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL,
  tracking_status TEXT NOT NULL,
  date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  customer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_email TEXT,
  reference TEXT,
  message TEXT NOT NULL,
  date TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0
);
`;

async function main() {
  try {
    await client.connect();
    await client.query(sql);
    console.log("SUPABASE_TABLES_CREATED");
  } catch (error) {
    console.log("SUPABASE_TABLE_CREATION_FAILED");
    console.log(error.message);
  } finally {
    await client.end();
  }
}

main();