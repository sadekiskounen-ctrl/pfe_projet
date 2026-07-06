const fs = require('fs');
const content = fs.readFileSync('frontend/registration/index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('B2B') || line.includes('B2C') || line.includes('companyName') || line.includes('type:')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
