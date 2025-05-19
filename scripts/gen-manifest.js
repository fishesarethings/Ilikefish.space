// scripts/gen-manifest.js
const fs   = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      walk(full, fileList);
    } else {
      // skip hidden folders like .git/node_modules
      if (!full.match(/(node_modules|\.git)\//)) {
        fileList.push('/' + full.replace(/\\/g, '/'));
      }
    }
  });
  return fileList;
}

const files   = walk(path.join(__dirname, '..'));
const content = `self.__WB_MANIFEST = ${JSON.stringify(files)};`;
fs.writeFileSync(path.join(__dirname, '../precache-manifest.js'), content);
console.log('precache-manifest.js generated with', files.length, 'entries');
