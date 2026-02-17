// Create initial admin user - Run this once only!
// Usage: node scripts/create-admin.js

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  console.log('Please add your MongoDB connection string to the .env file');
  console.log('Format: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name');
  process.exit(1);
}

async function createAdminUser() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. Skipping creation.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create new admin
    const admin = new Admin({
      username: 'admin',
      email: 'admin@hackhalt.com',
      password: 'HackHalt@2025', // Change this password after first login!
      role: 'super-admin',
      isActive: true
    });

    await admin.save();
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📋 Admin Credentials:');
    console.log('Username: admin');
    console.log('Password: HackHalt@2025');
    console.log('');
    console.log('⚠️  IMPORTANT: Change the password after first login!');
    console.log('');
    console.log('🔗 Login at: http://localhost:5000/admin-login');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:');
    if (error.message.includes('querySrv')) {
      console.error('MongoDB connection failed. Check your MONGODB_URI in .env file.');
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

createAdminUser();
