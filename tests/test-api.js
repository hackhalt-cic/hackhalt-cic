const http = require('http');

const postData = JSON.stringify({
  username: 'admin',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
    console.log(`Received ${chunk.length} bytes`);
  });
  
  res.on('end', () => {
    console.log(`\nRESPONSE BODY (${data.length} bytes):`);
    console.log(data);
    console.log('\n--- END OF RESPONSE ---');
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
  process.exit(1);
});

console.log(`Sending POST request to /api/admin/login...`);
console.log(`Body: ${postData}\n`);

req.write(postData);
req.end();

// Add timeout to prevent hanging
setTimeout(() => {
  console.error('\n*** REQUEST TIMEOUT AFTER 10 SECONDS ***');
  process.exit(1);
}, 10000);
