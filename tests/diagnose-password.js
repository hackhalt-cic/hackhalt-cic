// Comprehensive diagnostic - check everything
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

async function diagnose() {
  console.log('\n🔬 COMPREHENSIVE ADMIN PASSWORD DIAGNOSIS\n');
  
  try {
    console.log('1️⃣  Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected\n');

    // Get admin user
    console.log('2️⃣  Fetching admin user...');
    const admin = await Admin.findOne({ username: 'admin' }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin user not found!\n');
      console.log('Available users:');
      const allUsers = await Admin.find().select('username');
      allUsers.forEach(u => console.log(`  - ${u.username}`));
      process.exit(1);
    }
    
    console.log(`✅ Found admin: ${admin.username}\n`);

    // Check password field
    console.log('3️⃣  Checking password field...');
    console.log(`   Has password: ${!!admin.password}`);
    console.log(`   Password length: ${admin.password ? admin.password.length : 0}`);
    console.log(`   Password prefix: ${admin.password ? admin.password.substring(0, 40) : 'N/A'}`);
    console.log(`   Looks like bcrypt hash: ${admin.password && admin.password.startsWith('$2') ? 'YES ✅' : 'NO ❌'}\n`);

    if (!admin.password) {
      console.log('❌ PASSWORD FIELD IS EMPTY!\n');
      process.exit(1);
    }

    // Test comparePassword method
    console.log('4️⃣  Testing comparePassword method...');
    const testPassword = 'HackHalt@2025';
    
    try {
      const result = await admin.comparePassword(testPassword);
      console.log(`   Password "${testPassword}": ${result ? '✅ MATCHES' : '❌ DOES NOT MATCH'}\n`);
      
      if (!result) {
        console.log('❌ PASSWORD DOES NOT MATCH!\n');
        
        // Try to manually test bcrypt
        console.log('5️⃣  Manual bcrypt test...');
        try {
          const manualResult = await bcrypt.compare(testPassword, admin.password);
          console.log(`   bcrypt.compare result: ${manualResult}\n`);
        } catch (bcryptError) {
          console.log(`   bcrypt.compare error: ${bcryptError.message}\n`);
        }
      }
    } catch (compareError) {
      console.log(`❌ comparePassword threw error: ${compareError.message}\n`);
    }

    // Summary
    console.log('📋 SUMMARY:');
    if (admin.password && admin.password.startsWith('$2')) {
      const isValid = await admin.comparePassword('HackHalt@2025');
      if (isValid) {
        console.log('✅ Everything looks good! Password should work.');
      } else {
        console.log('❌ Password hash exists but does NOT match "HackHalt@2025"');
        console.log('   → Run: node scripts/force-create-admin.js');
      }
    } else {
      console.log('❌ Password field is corrupted or empty');
      console.log('   → Run: node scripts/force-create-admin.js');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

diagnose();
