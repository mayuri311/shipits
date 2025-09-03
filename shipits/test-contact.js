const fetch = require('node-fetch');

async function testContact() {
  try {
    const response = await fetch('http://localhost:3555/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Email Test',
        email: 'thomas@velroi.com',
        message: 'This is a test to verify that contact form emails are being sent properly.'
      })
    });

    const result = await response.json();
    console.log('Contact form response:', result);

    if (result.success) {
      console.log('✅ Contact form submitted successfully!');
      console.log('📧 Check your email at thomas@velroi.com for the notification');
    } else {
      console.log('❌ Contact form failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error submitting contact form:', error.message);
  }
}

testContact();
