const fs = require('fs');
const content = fs.readFileSync('frontend/auth.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('role') || line.includes('select') || line.includes('Client') || line.includes('B2C')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
