const db = require("./server/SupabaseDatabase.cjs");
db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'support_messages' ORDER BY ordinal_position")
  .then(result => {
    console.log(result.rows);
    return db.close();
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
