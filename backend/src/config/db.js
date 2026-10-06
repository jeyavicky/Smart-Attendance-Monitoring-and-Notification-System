const mongoose = require('mongoose');

let memoryServerInstance = null;

/**
 * Connect to MongoDB database
 * Tries configured MONGO_URI first; if unreachable and in development,
 * seamlessly starts an in-memory MongoDB instance so development is frictionless.
 */
const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_attendance';
  const mongooseOptions = {
    serverSelectionTimeoutMS: 3000,
  };

  try {
    console.log(`[DB] Attempting connection to MongoDB at: ${uri}`);
    const conn = await mongoose.connect(uri, mongooseOptions);
    console.log(`[DB] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (primaryErr) {
    console.warn(`[DB] Primary connection to ${uri} failed: ${primaryErr.message}`);

    // If in development or testing and primary connection failed, try MongoMemoryServer
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.log('[DB] Initializing in-memory MongoDB instance for development...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServerInstance = await MongoMemoryServer.create();
        const memUri = memoryServerInstance.getUri();
        const conn = await mongoose.connect(memUri);
        console.log(`[DB] In-Memory MongoDB connected successfully at: ${memUri}`);
        return conn;
      } catch (fallbackErr) {
        console.error('[DB] In-Memory MongoDB fallback failed:', fallbackErr.message);
        throw fallbackErr;
      }
    } else {
      throw primaryErr;
    }
  }
};

/**
 * Disconnect from MongoDB database and clean up resources
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
      memoryServerInstance = null;
    }
    console.log('[DB] MongoDB disconnected successfully.');
  } catch (err) {
    console.error('[DB] Error during disconnection:', err.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
