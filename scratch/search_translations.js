const fs = require('fs');
const content = fs.readFileSync('frontend/crm/index.html', 'utf8');
const lines = content.split('\n');
let inTranslations = false;
lines.forEach((line, i) => {
  if (line.includes('const translations =')) {
    inTranslations = true;
  }
  if (inTranslations) {
    console.log(`${i + 1}: ${line}`);
    if (line.includes('};') && !line.includes('translations =')) {
      inTranslations = false;
    }
  }
});
