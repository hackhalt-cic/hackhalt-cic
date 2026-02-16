#!/usr/bin/env node

/**
 * Database and API Verification Script
 * Run this locally to test if your MongoDB connection and API are working
 */

const http = require('http');
const https = require('https');

async function checkAPI(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode,
            success: json.success,
            data: json,
            error: null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            success: false,
            data: null,
            error: 'Invalid JSON response: ' + data.substring(0, 100)
          });
        }
      });
    }).on('error', (err) => {
      resolve({
        status: 0,
        success: false,
        data: null,
        error: err.message
      });
    });
  });
}

async function main() {
  console.log('\n🔍 HackHalt Admin API Verification\n');
  console.log('=====================================\n');

  // Test localhost first
  console.log('1️⃣  Testing Local API (localhost:5000)...');
  const localResult = await checkAPI('http://localhost:5000/api/submissions');
  if (localResult.error) {
    console.log('   ❌ Local API failed:', localResult.error);
    console.log('   Make sure: npm start or npm run dev is running\n');
  } else {
    console.log('   ✅ Status:', localResult.status);
    console.log('   ✅ Database connected:', localResult.data.success);
    console.log('   📊 Data counts:', localResult.data.counts);
  }

  // Test production
  console.log('\n2️⃣  Testing Production API (Vercel)...');
  const prodUrl = process.env.VERCEL_URL || 'https://hackhalt.org';
  const prodResult = await checkAPI(`${prodUrl}/api/submissions`);
  
  if (prodResult.error) {
    console.log('   ❌ Production API failed:', prodResult.error);
    console.log('   Issues to check:');
    console.log('   - MONGODB_URI is set in Vercel environment variables');
    console.log('   - MongoDB Atlas whitelist includes 0.0.0.0/0');
    console.log('   - MongoDB credentials are correct');
  } else {
    console.log('   ✅ Status:', prodResult.status);
    console.log('   ✅ Database connected:', prodResult.data.success);
    if (prodResult.data.success) {
      console.log('   📊 Data counts:', prodResult.data.counts);
    } else {
      console.log('   ⚠️  Error:', prodResult.data.error || 'Unknown error');
    }
  }

  console.log('\n=====================================');
  console.log('✅ Setup guide: See VERCEL_MONGODB_SETUP.md');
  console.log('');
}

main().catch(console.error);
