
import fs from 'fs';
import path from 'path';

const buildCountFile = path.resolve('.build_count');
let buildCount = 0;

if (fs.existsSync(buildCountFile)) {
    buildCount = parseInt(fs.readFileSync(buildCountFile, 'utf8'), 10);
}

buildCount += 1;
fs.writeFileSync(buildCountFile, buildCount.toString(), 'utf8');

const now = new Date();
const dd = String(now.getDate()).padStart(2, '0');
const mm = String(now.getMonth() + 1).padStart(2, '0');
const yyyy = now.getFullYear();
const xx = String(buildCount).padStart(2, '0');

const version = `${dd}${mm}${yyyy}.${xx}`;

console.log(`Build Version: ${version}`);

// Write to a file that can be imported
const versionFile = path.resolve('version.ts');
fs.writeFileSync(versionFile, `export const APP_VERSION = "${version}";\n`, 'utf8');
