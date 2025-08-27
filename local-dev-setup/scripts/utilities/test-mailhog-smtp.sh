#!/bin/bash

echo "============================================================"
echo "Testing MailHog SMTP Server"
echo "============================================================"

# Create email content with proper SMTP format
cat > /tmp/test-email.txt << 'EOF'
From: test@umig.local
To: user@example.com
Subject: UMIG Enhanced Email Test
MIME-Version: 1.0
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #0052cc; color: white; padding: 20px; text-align: center;">
            <h1>UMIG Email Test</h1>
        </div>
        <div style="padding: 20px; background: #f5f5f5;">
            <h2>Test Email Successful!</h2>
            <p>This is a test of the UMIG Enhanced Email Service through MailHog.</p>
            <p>Step: CHK-006 - System Check</p>
            <p>Status: IN_PROGRESS</p>
            <a href="http://localhost:8090" style="display: inline-block; padding: 10px 20px; background: #0052cc; color: white; text-decoration: none; border-radius: 4px;">View in Confluence</a>
        </div>
    </div>
</body>
</html>
EOF

echo "Sending email to MailHog SMTP server..."
curl --url smtp://localhost:1025 \
     --mail-from test@umig.local \
     --mail-rcpt user@example.com \
     --upload-file /tmp/test-email.txt \
     --silent --show-error

if [ $? -eq 0 ]; then
    echo "✅ Email sent successfully to MailHog!"
    
    # Check MailHog for the message
    sleep 1
    MESSAGES=$(curl -s http://localhost:8025/api/v2/messages | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('count', 0))")
    
    echo "📧 MailHog Status: $MESSAGES message(s) in inbox"
    echo "View at: http://localhost:8025"
else
    echo "❌ Failed to send email to MailHog"
fi

echo "============================================================"