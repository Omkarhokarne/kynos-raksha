const { sendOtpEmail, signToken, getRoleSecurityInfo } = require('./_utils');

const roleTitles = {
  ngo: "Verified Animal Welfare NGO",
  vet: "Verified Veterinary Surgeon",
  volunteer: "Community Feeder & Volunteer",
  govt: "Municipal Animal Welfare Officer",
  admin: "System Administrator",
  public: "Public User / Dog Guardian"
};

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
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();
    const userType = (body.userType || 'public').trim().toLowerCase();
    const organization = (body.organization || '').trim();
    const licenseNo = (body.licenseNo || '').trim();
    const phone = (body.phone || '').trim();

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const roleKey = userType || 'public';
    const userTypeTitle = roleTitles[roleKey] || 'Community Member';
    const secInfo = getRoleSecurityInfo(roleKey);

    const tokenPayload = {
      otp: otpCode,
      email: email,
      name: name,
      userType: roleKey,
      userTypeTitle: userTypeTitle,
      expiresAt: expiresAt
    };
    const tempToken = signToken(tokenPayload);

    // Dispatch real email via Gmail SMTP
    const emailResult = await sendOtpEmail(email, name, otpCode, userTypeTitle);
    const emailSent = emailResult.success === true;

    const rawPhone = phone || '+91 99999 00000';
    const maskedPhone = rawPhone.length > 6
      ? rawPhone.substring(0, Math.min(5, rawPhone.length - 4)) + ' *** ' + rawPhone.substring(rawPhone.length - 3)
      : rawPhone;

    const respData = {
      success: true,
      otpRequired: true,
      tempToken: tempToken,
      userType: roleKey,
      userTypeTitle: userTypeTitle,
      name: name,
      email: email,
      phone: rawPhone,
      maskedPhone: maskedPhone,
      securityLevel: secInfo.securityLevel,
      securityBadge: secInfo.securityBadge,
      shieldIcon: secInfo.shieldIcon,
      emailSent: emailSent,
      instruction: `Enter the 6-digit registration verification PIN sent to your registered email address (${email}).`,
      message: emailSent
        ? `Registration verification PIN dispatched to ${email}. Please check your email inbox.`
        : `Could not connect to SMTP server: ${emailResult.error || 'Check credentials'}.`
    };

    if (!emailSent) {
      respData.devOtp = otpCode;
    }

    return res.status(201).json(respData);
  } catch (err) {
    console.error('Registration handler error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
