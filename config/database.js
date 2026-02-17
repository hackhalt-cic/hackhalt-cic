const mongoose = require('mongoose');

// Connect to MongoDB Atlas with retry logic
const connectDB = async (retries = 5) => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables. Please add your MongoDB Atlas connection string.');
    }

    console.log('🔄 Connecting to MongoDB Atlas...');
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 15000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,  // Connection pool size for better performance
      minPoolSize: 5,   // Minimum connections
      maxIdleTimeMS: 45000 // Close idle connections after 45s
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    
    if (retries > 0) {
      const delayMs = (6 - retries) * 3000; // Exponential backoff: 3s, 6s, 9s, 12s, 15s
      console.log(`⏳ Retrying connection (${retries} attempts left) in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return connectDB(retries - 1);
    }
    
    console.error('\n📌 To fix MongoDB connection:');
    console.error('1. Go to MongoDB Atlas: https://cloud.mongodb.com/');
    console.error('2. Go to Network Access (left sidebar)');
    console.error('3. Click "+ ADD IP ADDRESS"');
    console.error('4. Either:\n   a) Allow access from 0.0.0.0/0 (allow all)\n   b) Click "ADD MY CURRENT IP"\n   c) Or add Vercel IP: 76.76.19.0/24 and 76.76.21.0/24');
    console.error('5. Wait 2-3 minutes for IP whitelist to propagate');
    console.error('6. Verify MONGODB_URI has correct format: mongodb+srv://username:password@cluster.mongodb.net/database');
    console.error('7. Make sure there are no special characters in password, or they are URL encoded\n');
    
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
