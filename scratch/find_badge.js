const fs = require('fs');
const content = fs.readFileSync('frontend/crm/index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  // Look for IS_B2B/IS_B2C usage in JS and any badge update code
  if (line.includes('IS_B2B') || line.includes('IS_B2C') || 
      line.includes('badge-b2b') || line.includes('badge-b2c') ||
      line.includes('clientBadge') || line.includes('portalBadge') ||
      line.includes('companyName') && line.includes('textContent')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
