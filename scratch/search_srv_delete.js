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
    } else if (file.endsWith('.js') || file.endsWith('.cds')) {
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

searchAll('backend/srv/admin', 'BusinessPartners');
searchAll('backend/srv/admin', 'delete');
searchAll('backend/srv/admin', 'DELETE');
