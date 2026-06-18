const fs = require('fs');
const path = require('path');
const esprima = require('esprima');

const filePath = path.resolve(__dirname, '../frontend/srm/index.html');
const html = fs.readFileSync(filePath, 'utf8');

const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  const js = match[1];
  count++;
  if (js.trim().length === 0) continue;
  
  // Clean optional chaining, nullish coalescing, and object spread
  const cleanJs = js
    .replace(/\?\./g, '.')
    .replace(/\?\?/g, '||')
    .replace(/\.\.\./g, '');

  console.log(`\nParsing script block ${count} (length=${js.length})...`);
  try {
    esprima.parseScript(cleanJs);
    console.log(`  Script block ${count}: OK`);
  } catch (err) {
    console.error(`  ERROR in script block ${count}:`);
    console.error("  Message:", err.message);
    console.error("  Line in script block:", err.lineNumber);
    // Let's find the absolute line number in index.html
    const htmlLines = html.substring(0, match.index).split('\n');
    const absoluteStartLine = htmlLines.length;
    console.error("  Line in index.html:", absoluteStartLine + err.lineNumber);
    console.error("  Column:", err.column);
    console.error("  Description:", err.description);
    
    // Show context lines
    const lines = js.split('\n');
    const errorLineIdx = err.lineNumber - 1;
    const start = Math.max(0, errorLineIdx - 5);
    const end = Math.min(lines.length - 1, errorLineIdx + 5);
    console.log("\nContext around error:");
    for (let idx = start; idx <= end; idx++) {
      const prefix = idx === errorLineIdx ? ">>> " : "    ";
      console.log(`${prefix}${absoluteStartLine + idx}: ${lines[idx]}`);
    }
  }
}
