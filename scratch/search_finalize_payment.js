const fs = require('fs');
const content = fs.readFileSync('frontend/crm/index.html', 'utf8');
const lines = content.split('\n');
let inFunc = false;
let braceCount = 0;
lines.forEach((line, i) => {
  if (line.includes('async function finalizePayment(')) {
    inFunc = true;
  }
  if (inFunc) {
    console.log(`${i + 1}: ${line}`);
    // count open and close braces
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    braceCount += openBraces - closeBraces;
    if (braceCount === 0 && !line.includes('async function finalizePayment(')) {
      inFunc = false;
    }
  }
});
