const { execSync } = require('child_process');

try {
  const diff = execSync('git diff -U5 frontend/srm/index.html', { encoding: 'utf8' });
  const lines = diff.split('\n');
  console.log("=== GIT DIFF FOR srm/index.html ===");
  lines.forEach(line => {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      console.log(line);
    }
  });
} catch (err) {
  console.error("Error getting diff:", err.message);
}
