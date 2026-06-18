const fs = require('fs');
const vm = require('vm');
const path = require('path');

function checkJsSyntax(filePath) {
  console.log(`Checking syntax of JS in ${filePath}...`);
  const html = fs.readFileSync(filePath, 'utf8');
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = scriptRegex.exec(html)) !== null) {
    const js = match[1];
    count++;
    console.log(`  Found script block ${count}: length=${js.length}, starts with: ${JSON.stringify(js.substring(0, 80))}`);
    if (js.trim().length === 0) {
      console.log(`    Skipping empty script block`);
      continue;
    }
    try {
      new vm.Script(js, { filename: `${path.basename(filePath)} [script ${count}]` });
      console.log(`    vm.Script check: OK`);
    } catch (err) {
      console.error(`    vm.Script check: ERROR:`, err.message);
    }
  }
}

checkJsSyntax(path.resolve(__dirname, '../frontend/srm/index.html'));
