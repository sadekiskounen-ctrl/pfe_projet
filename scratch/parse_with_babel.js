const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

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
    console.log(`Parsing script block 3 using @babel/parser...`);
    try {
      parser.parse(js, {
        sourceType: "module",
        plugins: ["optionalChaining", "nullishCoalescingOperator", "objectRestSpread"]
      });
      console.log("SUCCESS: Script block 3 parsed successfully with Babel!");
    } catch (err) {
      console.error("BABEL PARSE ERROR:");
      console.error("Message:", err.message);
      console.error("Loc:", err.loc);
      
      const htmlLines = html.substring(0, match.index).split('\n');
      const absoluteStartLine = htmlLines.length;
      const htmlLineNum = absoluteStartLine + err.loc.line;
      console.error(`Error is at script line ${err.loc.line} (index.html line ${htmlLineNum})`);
      
      // Show context lines
      const lines = js.split('\n');
      const errorLineIdx = err.loc.line - 1;
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
