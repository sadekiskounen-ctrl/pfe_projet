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
    } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.bat') || file.endsWith('.sh') || file.endsWith('.env') || file.endsWith('.example')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(query.toLowerCase())) {
            console.log(`${fullPath}:${i + 1}: ${line.trim()}`);
          }
        });
      } catch (e) {}
    }
  }
}

searchAll('.', 'btp');
console.log('--- btp search done ---');
searchAll('.', 'cf ');
console.log('--- cf search done ---');
searchAll('.', 'mouloud');
console.log('--- mouloud search done ---');
