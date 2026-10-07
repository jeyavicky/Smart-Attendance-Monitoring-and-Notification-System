const mongoose = require('mongoose');

/**
 * Connect to MongoDB database.
 *
 * Normal runtime always connects to the configured MONGO_URI (real MongoDB).
 * No in-memory fallback is provided for development runtime — if MongoDB is
 * unavailable the error is thrown immediately so the problem is visible.
 *
 * Isolated test suites that need an ephemeral database should create their
 * own MongoMemoryServer instance independently and NOT rely on this function.
 */
const connectDB = async () => {
  const uri =
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_attendance';

  console.log(`[DB] Connecting to MongoDB: ${uri}`);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[DB] MongoDB connected`);
    console.log(`[DB] Host    : ${conn.connection.host}`);
    console.log(`[DB] Database: ${conn.connection.name}`);

    return conn;
  } catch (error) {
    console.error(`[DB] MongoDB connection FAILED: ${error.message}`);
    console.error('[DB] Ensure the MongoDB service is running and MONGO_URI is correct.');
    throw error; // propagate — do NOT fall back to in-memory
  }
};

/**
 * Disconnect from MongoDB.
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('[DB] MongoDB disconnected successfully.');
  } catch (err) {
    console.error('[DB] Error during disconnection:', err.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
