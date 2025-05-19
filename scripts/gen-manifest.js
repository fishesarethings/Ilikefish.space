// scripts/gen-manifest.js
import fs from 'fs';
import glob from 'glob';
import path from 'path';

const files = glob.sync('**/*.*', { ignore: ['node_modules/**', '.git/**'] });
const manifest = files.map(f => '/' + f.replace(/\\/g, '/'));
const content  = `self.__WB_MANIFEST = ${JSON.stringify(manifest)};`;

fs.writeFileSync(path.resolve('precache-manifest.js'), content);
console.log('precache-manifest.js generated with', manifest.length, 'entries');
