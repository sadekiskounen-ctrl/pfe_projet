const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../frontend/srm/index.html');
const html = fs.readFileSync(filePath, 'utf8');

const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
scriptRegex.exec(html); // first block
scriptRegex.exec(html); // second block
const match = scriptRegex.exec(html); // third block
const js = match[1];

// Helper to remove comments and strings but keep track of source line
function parseCode(code) {
  const lines = code.split('\n');
  const tokens = [];
  
  let inString = null;
  let escape = false;
  let inMultiComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    let inSingleComment = false;

    for (let colIdx = 0; colIdx < line.length; colIdx++) {
      const char = line[colIdx];

      if (inMultiComment) {
        if (char === '*' && line[colIdx + 1] === '/') {
          inMultiComment = false;
          colIdx++;
        }
        continue;
      }

      if (inSingleComment) {
        continue;
      }

      if (inString) {
        if (escape) { escape = false; continue; }
        if (char === '\\') { escape = true; continue; }
        if (char === inString) { inString = null; }
        continue;
      }

      // Check comments
      if (char === '/' && line[colIdx + 1] === '*') {
        inMultiComment = true;
        colIdx++;
        continue;
      }
      if (char === '/' && line[colIdx + 1] === '/') {
        inSingleComment = true;
        colIdx++;
        continue;
      }

      // Check strings
      if (char === '"' || char === "'" || char === '`') {
        inString = char;
        continue;
      }

      // Brackets
      if (char === '{' || char === '(' || char === '[') {
        tokens.push({ char, line: lineIdx + 1, col: colIdx + 1 });
      } else if (char === '}' || char === ')' || char === ']') {
        tokens.push({ char, line: lineIdx + 1, col: colIdx + 1 });
      }
    }
  }
  return tokens;
}

const tokens = parseCode(js);
const stack = [];

tokens.forEach(t => {
  if (t.char === '{' || t.char === '(' || t.char === '[') {
    stack.push(t);
  } else if (t.char === '}' || t.char === ')' || t.char === ']') {
    if (stack.length === 0) {
      console.log(`Unmatched closing '${t.char}' at line ${t.line}`);
      return;
    }
    const last = stack.pop();
    const matches = { '}': '{', ')': '(', ']': '[' };
    if (last.char !== matches[t.char]) {
      console.log(`Mismatch: opened '${last.char}' at line ${last.line} but closed with '${t.char}' at line ${t.line}`);
    }
  }
});

console.log("\nRemaining stack of unclosed brackets:");
stack.forEach(t => {
  const htmlLine = 1009 + t.line - 1;
  const lines = js.split('\n');
  console.log(`- '${t.char}' opened at script line ${t.line} (index.html line ${htmlLine}): ${lines[t.line-1].substring(0, 100)}`);
});
