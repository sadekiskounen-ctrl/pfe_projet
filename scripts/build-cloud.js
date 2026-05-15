const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const src = path.join(__dirname, '..', 'frontend');
const dest = path.join(__dirname, '..', 'gen', 'backend', 'srv', 'app');

console.log(`Copying frontend from ${src} to ${dest}...`);

if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
}

// Simple recursive copy excluding 'router'
function copyRecursive(srcPath, destPath) {
    const stats = fs.statSync(srcPath);
    if (stats.isDirectory()) {
        if (path.basename(srcPath) === 'router') return;
        if (!fs.existsSync(destPath)) fs.mkdirSync(destPath);
        fs.readdirSync(srcPath).forEach(child => {
            copyRecursive(path.join(srcPath, child), path.join(destPath, child));
        });
    } else {
        fs.copyFileSync(srcPath, destPath);
    }
}

try {
    copyRecursive(src, dest);
    console.log('Copy successful.');
} catch (err) {
    console.error('Copy failed:', err);
    process.exit(1);
}
