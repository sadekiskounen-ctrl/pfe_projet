const fs = require('fs');
const path = require('path');

function searchHtml(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchHtml(fullPath);
    } else if (file.endsWith('.html')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      let found = false;
      lines.forEach((line, i) => {
        if (line.includes('rel="icon"') || line.includes('rel=\'icon\'') || line.includes('rel="shortcut icon"')) {
          console.log(`${fullPath}:${i + 1}: ${line.trim()}`);
          found = true;
        }
      });
      if (!found) {
        console.log(`${fullPath}: NO ICON DEFINED`);
      }
    }
  }
}

searchHtml('frontend');
