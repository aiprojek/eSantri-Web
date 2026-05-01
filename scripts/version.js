
import fs from 'fs';
import path from 'path';

const buildCountFile = path.resolve('.build_count');
const ciGithubRunNumber = process.env.GITHUB_RUN_NUMBER;
const ciCloudflareSha = process.env.CF_PAGES_COMMIT_SHA;

const resolveBuildSequence = () => {
    if (ciGithubRunNumber) {
        const parsed = parseInt(ciGithubRunNumber, 10);
        return Number.isNaN(parsed) ? 1 : parsed;
    }

    if (ciCloudflareSha) {
        const safeHex = ciCloudflareSha.slice(0, 6);
        const parsed = parseInt(safeHex, 16);
        return Number.isNaN(parsed) ? 1 : parsed % 10000;
    }

    let buildCount = 0;
    if (fs.existsSync(buildCountFile)) {
        buildCount = parseInt(fs.readFileSync(buildCountFile, 'utf8'), 10);
    }
    buildCount += 1;
    fs.writeFileSync(buildCountFile, buildCount.toString(), 'utf8');
    return buildCount;
};

const now = new Date();
const dd = String(now.getDate()).padStart(2, '0');
const mm = String(now.getMonth() + 1).padStart(2, '0');
const yyyy = now.getFullYear();
const xx = String(resolveBuildSequence()).padStart(4, '0');

const version = `${dd}${mm}${yyyy}.${xx}`;

console.log(`Build Version: ${version}`);

// Write to a file that can be imported
const versionFile = path.resolve('version.ts');
fs.writeFileSync(versionFile, `export const APP_VERSION = "${version}";\n`, 'utf8');
