const { verifyToken, signToken, sendOtpEmail } = require('./_utils');

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

    if (!tempToken) {
      return res.status(400).json({ success: false, message: 'Session token is required.' });
    }

    const payload = verifyToken(tempToken);
    if (!payload) {
      return res.status(400).json({ success: false, message: 'Invalid or expired session token.' });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const newExpiresAt = Date.now() + 10 * 60 * 1000;

    const newPayload = {
      ...payload,
      otp: newOtp,
      expiresAt: newExpiresAt
    };
    const newTempToken = signToken(newPayload);

    await sendOtpEmail(payload.email, payload.name, newOtp, payload.userTypeTitle);

    return res.status(200).json({
      success: true,
      tempToken: newTempToken,
      message: `Fresh verification PIN dispatched to ${payload.email}. Please check your email inbox.`
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
