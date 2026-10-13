
const pool = require("./db");

async function testDatabase() {
  try {
    const [rows] = await pool.query("SELECT 1 AS result");
    console.log("MySQL connected successfully!", rows[0]);
  } catch (error) {
    console.error("MySQL connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
