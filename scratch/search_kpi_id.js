const fs = require('fs');
const content = fs.readFileSync('frontend/crm/index.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('id="kpi-') || line.includes('kpis-container') || line.includes('kpi-card')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});
