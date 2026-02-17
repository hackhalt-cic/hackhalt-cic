// Force create/reset admin user - use this if verify-and-fix-admin.js doesn't work
// Usage: node scripts/force-create-admin.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function forceCreateAdmin() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    const Admin = require('../models/Admin');

    // Delete existing admin user
    console.log('🗑️  Removing old admin user...');
    await Admin.deleteOne({ username: 'admin' });
    console.log('✅ Old admin deleted\n');

    // Create new admin with hashed password manually
    console.log('🔐 Creating new admin with hashed password...');
    
    const password = 'HackHalt@2025';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log('Password hash created:', hashedPassword.substring(0, 20) + '...\n');

    const admin = new Admin({
      username: 'admin',
      email: 'admin@hackhalt.com',
      password: hashedPassword, // Use pre-hashed password to avoid double hashing
      role: 'super-admin',
      isActive: true
    });

    // Skip the pre-save hook by directly updating in database
    // This prevents double hashing
    await Admin.collection.insertOne({
      username: 'admin',
      email: 'admin@hackhalt.com',
      password: hashedPassword,
      role: 'super-admin',
      isActive: true,
      createdAt: new Date()
    });

    console.log('✅ Admin user created successfully!\n');

    // Verify it was created
    const createdAdmin = await Admin.findOne({ username: 'admin' }).select('+password');
    
    if (!createdAdmin) {
      console.error('❌ Admin user was not created!');
      process.exit(1);
    }

    console.log('🔍 Verifying password...');
    const passwordMatch = await bcrypt.compare(password, createdAdmin.password);
    
    if (passwordMatch) {
      console.log('✅ Password verification successful!\n');
    } else {
      console.error('❌ Password verification failed!');
      console.error('   Stored hash:', createdAdmin.password.substring(0, 30) + '...');
      console.error('   Test password:', password);
      process.exit(1);
    }

    console.log('📋 ADMIN CREDENTIALS:');
    console.log('   Username: admin');
    console.log('   Password: HackHalt@2025\n');

    console.log('🔗 Login URL: /admin-login\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.log('   (Duplicate key error - admin might already exist)');
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

forceCreateAdmin();
