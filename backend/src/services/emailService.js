const nodemailer = require('nodemailer');

// Create transporter using SMTP settings
const createTransporter = () => {
    // If not configured, we'll log it and return null
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('Mail: ⚠️ SMTP settings are missing in environment variables. Email service is disabled.');
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for 587
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        // TLS options for SMTP (useful for IONOS starttls)
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * Sends a welcome email to the newly registered user.
 * Sent in the background so it doesn't block the API response.
 */
const sendWelcomeEmail = async (toEmail, userName) => {
    const transporter = createTransporter();
    if (!transporter) return;

    const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME || 'CatchSensor'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Willkommen bei CatchSensor! 🦊',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="https://catchsensor.de/icons/fox-logo.png" alt="CatchSensor Logo" style="width: 100px; height: 100px; border-radius: 20px;" />
                </div>
                <h2 style="color: #1b3a2e; text-align: center;">Hallo ${userName || 'Jäger'},</h2>
                <p style="color: #4a5568; line-height: 1.6;">
                    Dein CatchSensor-Konto wurde erfolgreich erstellt! Du kannst dich jetzt in der App anmelden, um deine Melder zu verwalten, Alarmierungen einzurichten und Fangereignisse in Echtzeit zu überwachen.
                </p>
                
                <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <a href="https://catchsensor.de" style="background-color: #1b3a2e; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
                        Zur CatchSensor App
                    </a>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #718096; font-size: 11px; text-align: center;">
                    Diese E-Mail wurde automatisch generiert. Bitte antworte nicht darauf.
                </p>
            </div>
        `
    };

    try {
        console.log(`Mail: 📤 Attempting to send welcome email to ${toEmail}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`Mail: ✅ Welcome email sent successfully to ${toEmail} (ID: ${info.messageId})`);
    } catch (error) {
        console.error(`Mail: ❌ Failed to send welcome email to ${toEmail}:`, error.message);
    }
};

module.exports = {
    sendWelcomeEmail
};
