const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../frontend/srm/index.html');
const html = fs.readFileSync(filePath, 'utf8');

const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
scriptRegex.exec(html); // first block
const match = scriptRegex.exec(html); // second block
const js = match[1];
const lines = js.split('\n');

// State machine for JS parsing to find unclosed template literal or strings
let inString = null; // '"', "'", or '`'
let escape = false;
let braceStack = []; // to track `${` inside template literals
let parenStack = [];
let bracketStack = [];

for (let i = 0; i < js.length; i++) {
  const char = js[i];

  // Track line and col
  let line = 1;
  let offset = 0;
  for (const l of lines) {
    if (offset + l.length + 1 > i) {
      line = lines.indexOf(l) + 1;
      break;
    }
    offset += l.length + 1;
  }

  if (inString) {
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === inString) {
      // closed string
      inString = null;
      continue;
    }
    if (inString === '`' && char === '$' && js[i + 1] === '{') {
      braceStack.push({ type: 'template_expr', line, index: i });
      i++; // skip '{'
      continue;
    }
    continue;
  }

  // Not in string
  if (char === '"' || char === "'" || char === '`') {
    inString = char;
    continue;
  }

  if (char === '{') {
    braceStack.push({ type: 'object', line, index: i });
  } else if (char === '}') {
    if (braceStack.length === 0) {
      console.log(`Unmatched closing '}' at script line ${line}`);
      continue;
    }
    braceStack.pop();
  } else if (char === '(') {
    parenStack.push({ line, index: i });
  } else if (char === ')') {
    if (parenStack.length === 0) {
      console.log(`Unmatched closing ')' at script line ${line}`);
      continue;
    }
    parenStack.pop();
  } else if (char === '[') {
    bracketStack.push({ line, index: i });
  } else if (char === ']') {
    if (bracketStack.length === 0) {
      console.log(`Unmatched closing ']' at script line ${line}`);
      continue;
    }
    bracketStack.pop();
  }
}

if (inString) {
  console.log(`Unclosed string/template literal: opened '${inString}'`);
}
if (braceStack.length > 0) {
  console.log(`Unclosed braces remaining: ${braceStack.length}`);
  braceStack.forEach(b => {
    console.log(`- '${b.type}' opened at script line ${b.line} (index.html line ${1009 + b.line - 1}): ${lines[b.line-1].substring(0, 100)}`);
  });
}
if (parenStack.length > 0) {
  console.log(`Unclosed parens remaining: ${parenStack.length}`);
  parenStack.forEach(p => {
    console.log(`- '(' opened at script line ${p.line} (index.html line ${1009 + p.line - 1}): ${lines[p.line-1].substring(0, 100)}`);
  });
}
if (bracketStack.length > 0) {
  console.log(`Unclosed brackets remaining: ${bracketStack.length}`);
}
