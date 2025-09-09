// Email Test Setup - Requires MailHog SMTP server
console.log("📧 Setting up Email Test environment...");

// Check MailHog availability
const checkMailHog = async () => {
  try {
    const response = await fetch("http://localhost:8025/api/v2/messages");
    return response.ok;
  } catch (e) {
    return false;
  }
};

// Skip tests if MailHog not available
beforeAll(async () => {
  const mailHogAvailable = await checkMailHog();

  if (!mailHogAvailable) {
    console.log("🚫 Skipping email tests - MailHog not available");
    console.log('💡 MailHog is part of "npm start" stack');

    // Skip all tests in this run
    const originalTest = global.test;
    global.test = (...args) => originalTest.skip(...args);
    global.it = (...args) => originalTest.skip(...args);
  } else {
    console.log("✅ Email test environment ready");
  }
});
