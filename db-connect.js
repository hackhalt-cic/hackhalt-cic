const mongoose = require('mongoose');

// Connect to MongoDB Atlas with retry logic
const connectDB = async (retries = 3) => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables. Please add your MongoDB Atlas connection string.');
    }

    console.log('🔄 Connecting to MongoDB Atlas...');
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4, skip trying IPv6
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    
    if (retries > 0) {
      console.log(`⏳ Retrying connection (${retries} attempts left)...`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      return connectDB(retries - 1);
    }
    
    console.error('\n📌 To fix MongoDB connection:');
    console.error('1. Go to MongoDB Atlas: https://cloud.mongodb.com/');
    console.error('2. Click Network Access (left sidebar)');
    console.error('3. Allow access from 0.0.0.0/0 (or add Vercel IP specifically)');
    console.error('4. Verify MONGODB_URI environment variable is set correctly');
    console.error('5. Check that password and username in connection string are correct\n');
    
    // On production, this is a critical error
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 CRITICAL: MongoDB connection failed on production!');
      console.error('Login will not work until MongoDB is accessible.');
    } else {
      console.warn('⚠️  Server running without database in development mode.');
    }
  }
};

module.exports = connectDB;
