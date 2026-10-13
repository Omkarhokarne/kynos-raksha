const { sendOtpEmail, signToken, getRoleSecurityInfo } = require('./_utils');
const fs = require('fs');
const path = require('path');

const roleTitles = {
  ngo: "Verified Animal Welfare NGO",
  vet: "Verified Veterinary Surgeon",
  volunteer: "Community Feeder & Volunteer",
  govt: "Municipal Animal Welfare Officer",
  admin: "System Administrator",
  public: "Public User / Dog Guardian"
};

function getUsersList() {
  const usersPath = path.join(process.cwd(), 'data', 'users.json');
  if (fs.existsSync(usersPath)) {
    try {
      return JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    } catch (e) {}
  }
  return [];
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();
    const userType = (body.userType || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const users = getUsersList();
    let matched = users.find(u => u.email && u.email.trim().toLowerCase() === email);

    // If not found in users.json, synthesize matching user from login attempt
    if (!matched) {
      matched = {
        name: email.split('@')[0],
        email: email,
        userType: userType || 'public',
        phone: '+91 99999 00000',
        userTypeTitle: roleTitles[userType || 'public'] || 'Community Member'
      };
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const roleKey = matched.userType || userType || 'public';
    const userTypeTitle = matched.userTypeTitle || roleTitles[roleKey] || 'Community Member';
    const secInfo = getRoleSecurityInfo(roleKey);

    const tokenPayload = {
      otp: otpCode,
      email: matched.email,
      name: matched.name,
      userType: roleKey,
      userTypeTitle: userTypeTitle,
      expiresAt: expiresAt
    };
    const tempToken = signToken(tokenPayload);

    const emailResult = await sendOtpEmail(matched.email, matched.name, otpCode, userTypeTitle);
    const emailSent = emailResult.success === true;

    const rawPhone = matched.phone || '+91 98765 43210';
    const maskedPhone = rawPhone.length > 6
      ? rawPhone.substring(0, Math.min(5, rawPhone.length - 4)) + ' *** ' + rawPhone.substring(rawPhone.length - 3)
      : rawPhone;

    const respData = {
      success: true,
      otpRequired: true,
      tempToken: tempToken,
      userType: roleKey,
      userTypeTitle: userTypeTitle,
      name: matched.name,
      email: matched.email,
      phone: rawPhone,
      maskedPhone: maskedPhone,
      securityLevel: secInfo.securityLevel,
      securityBadge: secInfo.securityBadge,
      shieldIcon: secInfo.shieldIcon,
      emailSent: emailSent,
      instruction: `Enter the 6-digit login verification PIN sent to your registered email (${matched.email}).`,
      message: emailSent
        ? `Security verification PIN dispatched to ${matched.email}. Please check your email inbox.`
        : `Could not connect to SMTP server: ${emailResult.error || 'Check credentials'}.`
    };

    if (!emailSent) {
      respData.devOtp = otpCode;
    }

    return res.status(200).json(respData);
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
