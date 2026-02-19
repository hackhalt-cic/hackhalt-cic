// Vercel serverless function wrapper for Express app
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('../server.js');

// Cache connection for Vercel serverless functions
let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) {
    console.log('✅ Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    console.log('🔄 Connecting to MongoDB...');
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 15000,
      family: 4,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 5,
      minPoolSize: 1
    });

    cachedConnection = conn;
    console.log('✅ MongoDB Connected:', conn.connection.host);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }
};

// Ensure database is connected before handling requests
const handler = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error('🚨 Database connection failed:', error);
    return res.status(503).json({
      success: false,
      error: 'Database unavailable. Please try again later.',
      message: 'Service temporarily unavailable'
    });
  }
};

module.exports = handler;
module.exports.default = handler;
