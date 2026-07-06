const fs = require('fs');
const content = fs.readFileSync('frontend/crm/index.html', 'utf8');
const lines = content.split('\n');
let inSubmitCart = false;
let braceCount = 0;
lines.forEach((line, i) => {
  if (line.includes('function submitCart(')) {
    inSubmitCart = true;
  }
  if (inSubmitCart) {
    console.log(`${i + 1}: ${line}`);
    // count open and close braces
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    braceCount += openBraces - closeBraces;
    if (braceCount === 0 && !line.includes('function submitCart(')) {
      inSubmitCart = false;
    }
  }
});
