const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filePath = path.resolve(__dirname, '../frontend/srm/index.html');
const html = fs.readFileSync(filePath, 'utf8');

const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  const js = match[1];
  count++;
  if (js.trim().length === 0) continue;
  
  if (count === 3) {
    console.log(`Compiling script block 3 using vm.Script...`);
    try {
      new vm.Script(js, { filename: 'srm_block3.js' });
      console.log("SUCCESS: Script block 3 compiled without syntax errors!");
    } catch (err) {
      console.error("VM COMPILER SYNTAX ERROR:");
      console.error(err.stack);
      
      // Let's parse the line number from the stack trace
      // Format is usually: srm_block3.js:LINENUM
      const matchLine = err.stack.match(/srm_block3\.js:(\d+)(?::(\d+))?/);
      if (matchLine) {
        const scriptLineNum = parseInt(matchLine[1]);
        const htmlLines = html.substring(0, match.index).split('\n');
        const absoluteStartLine = htmlLines.length;
        const htmlLineNum = absoluteStartLine + scriptLineNum;
        console.error(`Error is at script line ${scriptLineNum} (index.html line ${htmlLineNum})`);
        
        // Show context lines
        const lines = js.split('\n');
        const errorLineIdx = scriptLineNum - 1;
        const start = Math.max(0, errorLineIdx - 5);
        const end = Math.min(lines.length - 1, errorLineIdx + 5);
        console.log("\nContext around error:");
        for (let idx = start; idx <= end; idx++) {
          const prefix = idx === errorLineIdx ? ">>> " : "    ";
          console.log(`${prefix}${absoluteStartLine + idx + 1}: ${lines[idx]}`);
        }
      }
    }
  }
}
