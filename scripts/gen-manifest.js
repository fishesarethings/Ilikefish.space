// scripts/gen-manifest.js
const fs   = require('fs');                              // :contentReference[oaicite:0]{index=0}
const path = require('path');
const glob = require('glob');

// Crawl this directory (project root)
const files = glob.sync('**/*.*', {
  ignore: ['node_modules/**', '.git/**']
});

const manifest = files.map(f => '/' + f.replace(/\\/g,'/'));
const content  = `self.__WB_MANIFEST = ${JSON.stringify(manifest)};`;

fs.writeFileSync(path.join(__dirname, '../precache-manifest.js'), content);
console.log('precache-manifest.js generated with', manifest.length, 'entries');
