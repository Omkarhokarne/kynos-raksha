const { verifyToken } = require('./_utils');

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
    const tempToken = (body.tempToken || '').trim();
    const enteredOtp = (body.otp || '').trim();
    const email = (body.email || '').trim().toLowerCase();

    if (!tempToken) {
      return res.status(400).json({ success: false, message: 'Session token is required.' });
    }

    const payload = verifyToken(tempToken);
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Invalid or expired security session. Please request a new code.' });
    }

    if (payload.otp !== enteredOtp) {
      return res.status(401).json({ success: false, message: 'Incorrect OTP code. Please enter the valid 6-digit verification code.' });
    }

    const verifiedUser = {
      id: 'USR-' + Date.now(),
      name: payload.name || 'Verified User',
      email: payload.email,
      userType: payload.userType || 'public',
      userTypeTitle: payload.userTypeTitle || 'Community Member',
      verified: true,
      otpVerified: true,
      lastLogin: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      user: verifiedUser,
      message: 'Identity & OTP Verified! Access granted.'
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
