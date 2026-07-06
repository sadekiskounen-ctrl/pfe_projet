const fs = require('fs');
const content = fs.readFileSync('frontend/crm/index.html', 'utf8');
const lines = content.split('\n');
let inDashboard = false;
lines.forEach((line, i) => {
  if (line.includes('class="kpis-grid"')) {
    inDashboard = true;
  }
  if (inDashboard) {
    console.log(`${i + 1}: ${line}`);
    if (line.includes('</div>') && line.includes('grid')) {
      // we can stop after a few lines or when we hit the end of the section
    }
  }
});
