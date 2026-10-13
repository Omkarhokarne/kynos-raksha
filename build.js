const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'public');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const items = ['index.html', 'css', 'js', 'assets', 'data'];
for (const item of items) {
  const src = path.join(__dirname, item);
  const dest = path.join(targetDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

// Ensure sensitive configs are not leaked in static bundle
const sensitive = path.join(targetDir, 'data', 'email-config.json');
if (fs.existsSync(sensitive)) {
  fs.unlinkSync(sensitive);
}

console.log('Build succeeded: public directory created and populated.');
