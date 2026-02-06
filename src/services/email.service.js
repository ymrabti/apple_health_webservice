const nodemailer = require("nodemailer");
const config = require("../config/config");

const transport = nodemailer.createTransport(config.email.smtp);
const logger = require("../config/logger");

if (config.env === "production") {
    transport
        .verify()
        .then(() => logger.info("Connected to email server"))
        .catch(() =>
            logger.warn(
                "Unable to connect to email server. Make sure you have configured the SMTP options in .env"
            )
        );
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text) => {
    const sent = await transport.sendMail({
        from: config.email.from,
        to,
        subject,
        html: text,
    });
    logger.info(JSON.stringify(sent, null, 4));
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @param {string} origin
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token, origin) => {
    const subject = `Reset Your Password - AppleHealth Social`;
    // replace this url with the link to the reset password page of your front-end app
    const resetPasswordUrl = `${origin}/reset-password?token=${token}`;
    const text = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      min-height: 100vh;
    }
    .wrapper {
      padding: 40px 20px;
    }
    .container {
      width: 100%;
      max-width: 520px;
      margin: 0 auto;
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
      padding: 30px 40px;
      text-align: center;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, #22d3ee 0%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
    }
    .content {
      padding: 40px;
    }
    h1 {
      color: #f1f5f9;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 20px 0;
    }
    p {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    .button-wrapper {
      text-align: center;
      margin: 30px 0;
    }
    .reset-btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #22d3ee 0%, #a855f7 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      box-shadow: 0 10px 30px -5px rgba(34, 211, 238, 0.3);
    }
    .footer {
      padding: 20px 40px;
      background: rgba(15, 23, 42, 0.5);
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }
    .footer p {
      color: #64748b;
      font-size: 13px;
      margin: 0;
      text-align: center;
    }
    .icon {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg {
      width: 28px;
      height: 28px;
      fill: #f59e0b;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <p class="logo">AppleHealth Social</p>
      </div>
      <div class="content">
        <div class="icon">
          <svg viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
        </div>
        <h1>Reset Your Password</h1>
        <p>We received a request to reset your password for your <strong style="color: #f1f5f9;">AppleHealth Social</strong> account. Click the button below to create a new password:</p>
        <div class="button-wrapper">
          <a href="${resetPasswordUrl}" class="reset-btn">Reset Password</a>
        </div>
        <p>This link will expire in 1 hour for security reasons. If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} AppleHealth Social. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
    await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @param {string} origin
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token, origin) => {
    const subject = "Verify Your Email - AppleHealth Social";
    // replace this url with the link to the email verification page of your front-end app
    const verificationEmailUrl = `${origin}/verify-email?token=${token}`;
    const text = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      min-height: 100vh;
    }
    .wrapper {
      padding: 40px 20px;
    }
    .container {
      width: 100%;
      max-width: 520px;
      margin: 0 auto;
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, rgba(34, 211, 238, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%);
      padding: 30px 40px;
      text-align: center;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      background: linear-gradient(135deg, #22d3ee 0%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
    }
    .content {
      padding: 40px;
    }
    h1 {
      color: #f1f5f9;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 20px 0;
    }
    p {
      color: #94a3b8;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }
    .button-wrapper {
      text-align: center;
      margin: 30px 0;
    }
    .verify-btn {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #22d3ee 0%, #a855f7 100%);
      color: #ffffff;
      text-decoration: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      box-shadow: 0 10px 30px -5px rgba(34, 211, 238, 0.3);
    }
    .footer {
      padding: 20px 40px;
      background: rgba(15, 23, 42, 0.5);
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }
    .footer p {
      color: #64748b;
      font-size: 13px;
      margin: 0;
      text-align: center;
    }
    .icon {
      width: 60px;
      height: 60px;
      margin: 0 auto 20px;
      background: linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg {
      width: 28px;
      height: 28px;
      fill: #22d3ee;
    }
    .welcome-badge {
      display: inline-block;
      padding: 6px 16px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <p class="logo">AppleHealth Social</p>
      </div>
      <div class="content">
        <div class="icon">
          <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        </div>
        <span class="welcome-badge">Welcome to the community!</span>
        <h1>Verify Your Email</h1>
        <p>Thank you for signing up for <strong style="color: #f1f5f9;">AppleHealth Social</strong>! To complete your registration and start tracking your health journey, please verify your email address:</p>
        <div class="button-wrapper">
          <a href="${verificationEmailUrl}" class="verify-btn">Verify Email Address</a>
        </div>
        <p>If you didn't create an account with us, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} AppleHealth Social. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
    await sendEmail(to, subject, text);
};

module.exports = {
    transport,
    sendEmail,
    sendResetPasswordEmail,
    sendVerificationEmail,
};
