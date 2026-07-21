const { MongoClient } = require("mongodb");
require('dotenv').config();

const uri = process.env.DB;

const client = new MongoClient(uri);

const db = client.db("crm");

async function connectDB() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
    }
}

module.exports = { connectDB, db };