const fs = require('fs');
const content = fs.readFileSync('frontend/crm/index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('nav-factures') || line.includes('navFactures')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
