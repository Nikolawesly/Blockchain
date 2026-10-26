const mongoose = require("mongoose");

let isMongoConnected = false;
const memoryStore = {
  users: [],
  claimMetadata: [],
  auditLogs: []
};

async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/insurechain";
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    isMongoConnected = true;
    console.log(`[MongoDB] Connected successfully to ${uri}`);
  } catch (err) {
    isMongoConnected = false;
    console.warn(`[MongoDB Warning] Could not connect to MongoDB server: ${err.message}`);
    console.log(`[MongoDB Fallback] Operating in Resilient In-Memory Database Mode for demo/offline resilience.`);
  }
}

function getStoreStatus() {
  return {
    isMongoConnected,
    mode: isMongoConnected ? "MongoDB" : "InMemoryFallback",
    recordCounts: {
      users: memoryStore.users.length,
      claims: memoryStore.claimMetadata.length,
    }
  };
}

module.exports = {
  connectDB,
  isMongoConnected: () => isMongoConnected,
  memoryStore,
  getStoreStatus
};
