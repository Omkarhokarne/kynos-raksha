const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    let users = [];
    if (fs.existsSync(usersPath)) {
      users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    }
    const safeUsers = users.map(u => {
      const { password, ...safe } = u;
      return safe;
    });

    return res.status(200).json({ success: true, users: safeUsers });
  } catch (err) {
    console.error('Users list error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
};
