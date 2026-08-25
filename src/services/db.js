const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.DB;

const client = new MongoClient(uri);

const db = client.db("crm");

async function ensureIndexes() {
  try {
    await Promise.all([
      db.collection("clients").createIndex({ number: 1 }),
      db.collection("clients").createIndex({ exactDate: -1 }),
      db.collection("clients").createIndex({ status: 1 }),
      db.collection("clients").createIndex({ assigned_to: 1 }),
      db.collection("events").createIndex({ clientID: 1 }),
      db.collection("events").createIndex({ request_Date: -1 }),
      db.collection("events").createIndex({ exactDate: -1 }),
      db.collection("suppliers").createIndex({ exactDate: 1 }),
      db.collection("suppliers").createIndex({ instaHandle: 1 }),
      db.collection("suppliers").createIndex({ number: 1 }),
      db.collection("employees").createIndex({ name: 1 }),
      db.collection("employees").createIndex({ exactDate: 1 }),
      db.collection("channels").createIndex({ name: 1 }),
      db.collection("channels").createIndex({ exactDate: 1 }),
      db.collection("logs").createIndex({ exactDate: -1 }),
    ]);
    console.log("✅ MongoDB indexes ready");
  } catch (error) {
    console.error("⚠️ Index creation warning:", error.message);
  }
}

async function connectDB() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");
    await ensureIndexes();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
}

module.exports = { connectDB, db };
