const fs = require('fs');
const content = fs.readFileSync('frontend/crm/index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('client-badge') || line.includes('portal-badge-top') || line.includes('badge-b2c') || line.includes('badge-b2b')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
