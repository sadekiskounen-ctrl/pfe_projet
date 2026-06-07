const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  "frontend-react/dashboard.html",
  "frontend-react/src/components/Sidebar.jsx",
  "frontend-react/src/components/Settings.jsx",
  "frontend/srm/index.html",
  "frontend/srm/fournisseurs/webapp/index.html",
  "frontend/registration/index.html",
  "frontend/index.html",
  "frontend/crm/index.html",
  "frontend/crm/dashboard/webapp/index.html",
  "frontend/crm/dashboard/webapp/view/Dashboard.view.xml",
  "frontend/crm/clients/webapp/index.html",
  "frontend/auth.html",
  "frontend/admin/login.html",
  "frontend/admin/dashboard/webapp/view/App.view.xml",
  "backend/srv/lib/pdf-generator.js",
  "backend/srv/lib/email-service.js"
];

const rootDir = "c:\\Users\\hicha\\OneDrive\\Bureau\\pfe_projet-main";

filesToUpdate.forEach(relPath => {
  const fullPath = path.join(rootDir, relPath);
  if (fs.existsSync(fullPath)) {
    console.log(`Updating ${relPath}...`);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace name
    content = content.replace(/CloudBridge/g, 'Bridgify Cloud');
    content = content.replace(/cloudbridge\.dz/g, 'bridgify.dz');
    content = content.replace(/cloudbridge\.com/g, 'bridgify.com');
    
    fs.writeFileSync(fullPath, content, 'utf8');
  } else {
    console.log(`File not found: ${relPath}`);
  }
});

console.log("Renaming complete!");
