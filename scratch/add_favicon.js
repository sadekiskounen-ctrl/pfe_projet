const fs = require('fs');
const path = require('path');

function getHtmlFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      if (item !== 'node_modules' && item !== '.git' && item !== 'gen' && item !== '.pfe_projet_mta_build_tmp') {
        getHtmlFiles(fullPath, files);
      }
    } else if (item.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

const rootDir = path.join(__dirname, '..');
const htmlFiles = getHtmlFiles(rootDir);

console.log(`Found ${htmlFiles.length} HTML files:`);
htmlFiles.forEach(file => console.log(`- ${file}`));

const faviconTag = '    <link rel="icon" type="image/png" href="/images/logo_round.png">';

htmlFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('rel="icon"') || content.includes('rel="shortcut icon"')) {
    console.log(`Favicon link tag already present in: ${filePath}`);
    return;
  }
  
  // Insert right after <title> or <head>
  if (content.includes('</title>')) {
    content = content.replace('</title>', `</title>\n${faviconTag}`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Added favicon after </title> in: ${filePath}`);
  } else if (content.includes('<head>')) {
    content = content.replace('<head>', `<head>\n${faviconTag}`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Added favicon after <head> in: ${filePath}`);
  } else {
    console.log(`Could not find target tags in: ${filePath}`);
  }
});
console.log('Favicon update completed.');
