// Test password and admin status locally
const http = require('http');

async function testDebugEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('\n🔍 DEBUG TEST\n');

  try {
    console.log('1️⃣  Checking admin user status...\n');
    const adminStatus = await testDebugEndpoint('/api/debug/admin');
    console.log('Admin Status:', JSON.stringify(adminStatus, null, 2));

    console.log('\n2️⃣  Testing password "HackHalt@2025"...\n');
    const passwordTest = await testDebugEndpoint('/api/debug/test-password', 'POST', {
      password: 'HackHalt@2025'
    });
    console.log('Password Test:', JSON.stringify(passwordTest, null, 2));

    console.log('\n3️⃣  Testing login...\n');
    const loginTest = await testDebugEndpoint('/api/admin/login', 'POST', {
      username: 'admin',
      password: 'HackHalt@2025'
    });
    console.log('Login Test:', JSON.stringify(loginTest, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
