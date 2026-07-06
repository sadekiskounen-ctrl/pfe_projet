const fs = require('fs');
const content = fs.readFileSync('frontend/crm/index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('B2B') || line.includes('B2C') || line.includes('b2b') || line.includes('b2c')) {
    // skip script lines we already know (line numbers > 2600)
    if (i + 1 < 2600 && !line.includes('class=') && !line.includes('href=')) {
      console.log(`${i + 1}: ${line.trim()}`);
    }
  }
});
