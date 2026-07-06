const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, query);
    } else if (file.endsWith('.js') || file.endsWith('.cds')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes(query)) {
          console.log(`${fullPath}:${i + 1}: ${line.trim()}`);
        }
      });
    }
  }
}

searchDir('backend/srv', 'RegistrationRequest');
console.log('--- RegistrationRequest search done ---');
searchDir('backend/srv', 'approve');
console.log('--- approve search done ---');
searchDir('backend/srv', 'bpType');
console.log('--- bpType search done ---');
