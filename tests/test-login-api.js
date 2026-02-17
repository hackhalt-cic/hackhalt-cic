// Test login API locally
// This tests if the login endpoint works properly

async function testLogin() {
  console.log('Testing login API...\n');
  
  try {
    const response = await fetch('http://localhost:5000/api/admin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'HackHalt@2025'
      })
    });

    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ LOGIN SUCCESSFUL!');
      console.log('Token:', data.token.substring(0, 20) + '...');
    } else {
      console.log('\n❌ LOGIN FAILED!');
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testLogin();
