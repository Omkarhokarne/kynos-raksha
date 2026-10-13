const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SECRET = process.env.TOKEN_SECRET || 'kynos-raksha-secure-token-2026';

function signToken(data) {
  const json = JSON.stringify(data);
  const b64 = Buffer.from(json).toString('base64url');
  const hmac = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  return `${b64}.${hmac}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64, hmac] = parts;
  const expectedHmac = crypto.createHmac('sha256', SECRET).update(b64).digest('base64url');
  if (hmac !== expectedHmac) return null;
  try {
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (data.expiresAt && Date.now() > data.expiresAt) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function getSmtpConfig() {
  let config = {};
  const localConfigPath = path.join(process.cwd(), 'data', 'email-config.json');
  if (fs.existsSync(localConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
    } catch (e) {}
  }

  const senderEmail = (process.env.SMTP_USER || config.senderEmail || '').trim();
  const rawPass = process.env.SMTP_PASS || config.senderPassword || '';
  const senderPass = rawPass ? rawPass.replace(/\s+/g, '').trim() : '';
  const smtpServer = process.env.SMTP_SERVER || config.smtpServer || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || config.smtpPort || '587', 10);
  const senderName = process.env.SMTP_NAME || config.senderName || 'Kynos Raksha Safety Team';

  return { senderEmail, senderPass, smtpServer, smtpPort, senderName };
}

async function sendOtpEmail(toEmail, recipientName, otpCode, userRoleTitle) {
  const { senderEmail, senderPass, smtpServer, smtpPort, senderName } = getSmtpConfig();

  if (!senderEmail || !senderPass) {
    return { success: false, error: 'SMTP credentials not configured' };
  }

  const transporter = nodemailer.createTransport({
    host: smtpServer,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: senderEmail,
      pass: senderPass
    }
  });

  const displayName = recipientName || 'Community Guardian';
  const roleName = userRoleTitle || 'Registered User';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Kynos Raksha Security Verification</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06);">
    <div style="background: linear-gradient(135deg, #c2410c 0%, #ea580c 100%); padding: 26px 20px; text-align: center; color: #ffffff;">
      <div style="font-size: 38px; margin-bottom: 6px;">🐕🛡️</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">KYNOS RAKSHA</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.92; font-weight: 500;">Digital Dog Identity & Stray Safety Platform</p>
    </div>
    
    <div style="padding: 30px 26px;">
      <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #0f172a;">Account Registration Verification</h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px 0;">
        Hello <strong>${displayName}</strong>,<br><br>
        Thank you for registering on <strong>Kynos Raksha</strong> as a <strong>${roleName}</strong>. To activate your account and verify your email address, please use the following one-time verification PIN:
      </p>

      <div style="background: #fff7ed; border: 2px dashed #f97316; border-radius: 10px; padding: 20px; text-align: center; margin: 22px 0;">
        <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; color: #c2410c; display: block; margin-bottom: 6px;">Your 6-Digit Email Verification PIN</span>
        <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #c2410c; font-family: monospace;">${otpCode}</div>
        <span style="font-size: 12px; color: #9a3412; display: block; margin-top: 8px;">⏱️ Valid for <strong>10 minutes</strong></span>
      </div>

      <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 20px 0;">
        🔒 <strong>Security Warning:</strong> Never share this code with anyone. Kynos Raksha administrators will never ask for your verification PIN.
      </p>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11.5px; color: #94a3b8; text-align: center;">
        If you did not request this registration, please ignore this email.<br>
        © 2026 Kynos Raksha Identity & Safety Collective.
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: toEmail,
      subject: `[Kynos Raksha] Your Verification PIN: ${otpCode}`,
      html: htmlBody
    });
    return { success: true };
  } catch (err) {
    console.error('Nodemailer send error:', err);
    return { success: false, error: err.message };
  }
}

function getRoleSecurityInfo(userType) {
  switch (userType) {
    case 'vet':
      return {
        securityLevel: "Clinical Surgery & Rabies Vaccine Authorization 2FA",
        securityBadge: "🩺 VETERINARY SURGEON 2FA",
        shieldIcon: "🩺",
        instruction: "Enter the 6-digit clinical security key dispatched to your licensed veterinary contact."
      };
    case 'govt':
      return {
        securityLevel: "Municipal Ward Access & Civic Authority Clearance 2FA",
        securityBadge: "🏛️ MUNICIPAL OFFICER CLEARANCE",
        shieldIcon: "🏛️",
        instruction: "Enter the 6-digit government clearance passcode dispatched to your official municipal officer mobile."
      };
    case 'ngo':
      return {
        securityLevel: "Animal Welfare Organization Dispatch & QR Issuance Security Token",
        securityBadge: "🐾 NGO DISPATCH VERIFICATION",
        shieldIcon: "🐾",
        instruction: "Enter the 6-digit NGO authorization pin dispatched to your registered organization coordinator."
      };
    case 'volunteer':
      return {
        securityLevel: "Community Feeder & Pack Territory Safety Pin",
        securityBadge: "🥣 COMMUNITY FEEDER SAFETY PIN",
        shieldIcon: "🥣",
        instruction: "Enter the 6-digit feeder security code dispatched to your volunteer phone number."
      };
    case 'admin':
      return {
        securityLevel: "Central System Administrator Root 2FA Authentication",
        securityBadge: "🛡️ ADMIN ROOT SECURITY 2FA",
        shieldIcon: "🛡️",
        instruction: "Enter the 6-digit master root security PIN dispatched to central administrator device."
      };
    default:
      return {
        securityLevel: "Citizen Safety & Dog Guardian Identity Authentication",
        securityBadge: "📱 CITIZEN SAFETY VERIFICATION",
        shieldIcon: "📱",
        instruction: "Enter the 6-digit citizen verification code dispatched to your registered phone & email."
      };
  }
}

module.exports = {
  signToken,
  verifyToken,
  sendOtpEmail,
  getRoleSecurityInfo
};
