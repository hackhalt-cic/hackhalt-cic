// Verify and fix admin user - Run this to diagnose login issues
// Usage: node scripts/verify-and-fix-admin.js

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  console.log('Please add your MongoDB connection string to the .env file');
  process.exit(1);
}

async function verifyAndFixAdmin() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ Admin user found!');
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Active: ${existingAdmin.isActive}`);
      console.log(`   Created: ${existingAdmin.createdAt}`);
      console.log(`   Last Login: ${existingAdmin.lastLogin || 'Never'}\n`);

      // Test password verification
      console.log('🔍 Testing password verification...');
      const testPassword = 'HackHalt@2025';
      
      // Check if password field exists
      if (!existingAdmin.password) {
        console.log(`⚠️  Password field is empty or corrupted`);
        console.log(`🔄 Resetting password to "HackHalt@2025"...\n`);
        existingAdmin.password = 'HackHalt@2025';
        await existingAdmin.save();
        console.log('✅ Password reset successful!\n');
      } else {
        try {
          const passwordMatch = await existingAdmin.comparePassword(testPassword);
          if (passwordMatch) {
            console.log(`✅ Password verification works correctly\n`);
          } else {
            console.log(`❌ Password "HackHalt@2025" does NOT match`);
            console.log(`🔄 Resetting password...\n`);
            
            // Reset password
            existingAdmin.password = 'HackHalt@2025';
            await existingAdmin.save();
            console.log('✅ Password reset successful!\n');
          }
        } catch (error) {
          console.error('❌ Error testing password:', error.message);
          console.log(`⚠️  Password field may be corrupted`);
          console.log(`🔄 Resetting password to "HackHalt@2025"...\n`);
          
          // Reset password
          existingAdmin.password = 'HackHalt@2025';
          await existingAdmin.save();
          console.log('✅ Password reset successful!\n');
        }
      }
    } else {
      console.log('❌ Admin user NOT found in database');
      console.log('🔄 Creating admin user...\n');

      const admin = new Admin({
        username: 'admin',
        email: 'admin@hackhalt.com',
        password: 'HackHalt@2025',
        role: 'super-admin',
        isActive: true
      });

      await admin.save();
      console.log('✅ Admin user created successfully!\n');
    }

    console.log('📋 LOGIN CREDENTIALS:');
    console.log('   Username: admin');
    console.log('   Password: HackHalt@2025\n');

    console.log('🔗 Try logging in at: /admin-login\n');

    console.log('If you still can\'t login:');
    console.log('1. Check browser console (F12) for error messages');
    console.log('2. Check server logs for errors');
    console.log('3. Make sure MongoDB is connected properly');
    console.log('4. Clear browser cache and try again\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔗 MongoDB connection refused. Check:');
      console.log('1. MongoDB Atlas network access allows your IP');
      console.log('2. MONGODB_URI in .env file is correct');
      console.log('3. MongoDB server is running');
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

verifyAndFixAdmin();
