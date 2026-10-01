const Database = require("better-sqlite3");

const db = new Database("./afrimarket.db", {
  readonly: true,
});

const tables = [
  "customers",
  "sellers",
  "products",
  "orders",
  "reviews",
  "notifications",
  "support_messages",
];

for (const table of tables) {
  const result = db
    .prepare(`SELECT COUNT(*) AS total FROM "${table}"`)
    .get();

  console.log(`${table}: ${result.total} records`);
}

db.close();