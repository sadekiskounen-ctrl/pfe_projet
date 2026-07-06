const fs = require('fs');
const path = require('path');

function searchAll(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file.includes('node_modules') || file.includes('.git') || file.includes('.system_generated')) continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchAll(fullPath, query);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.html')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.includes(query)) {
            console.log(`${fullPath}:${i + 1}: ${line.trim()}`);
          }
        });
      } catch (e) {}
    }
  }
}

searchAll('frontend-react/src', 'delete');
searchAll('frontend-react/src', 'Delete');
