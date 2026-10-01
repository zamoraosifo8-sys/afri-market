const Database = require("better-sqlite3");
const path = require("node:path");

const db = new Database(path.join(__dirname, "afrimarket.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sellers (
    email TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    seller_email TEXT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    image TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    total REAL NOT NULL,
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
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_email TEXT,
    reference TEXT,
    message TEXT NOT NULL,
    date TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0
  );
`);

const supportMessageColumns = db.pragma("table_info(support_messages)");

if (!supportMessageColumns.some((column) => column.name === "conversation_id")) {
  db.exec(
    "ALTER TABLE support_messages ADD COLUMN conversation_id TEXT NOT NULL DEFAULT 'legacy'"
  );
}

module.exports = db;