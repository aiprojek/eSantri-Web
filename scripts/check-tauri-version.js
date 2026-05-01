import fs from 'fs';
import path from 'path';

const readJson = (relativePath) => {
  const filePath = path.resolve(relativePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const readCargoVersion = (relativePath) => {
  const filePath = path.resolve(relativePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^version\s*=\s*"([^"]+)"/m);
  if (!match) {
    throw new Error(`Tidak menemukan field version pada ${relativePath}`);
  }
  return match[1];
};

const pkg = readJson('package.json');
const tauriConf = readJson('src-tauri/tauri.conf.json');
const cargoVersion = readCargoVersion('src-tauri/Cargo.toml');

const packageVersion = pkg.version;
const tauriConfVersion = tauriConf?.package?.version;

const mismatches = [];

if (!packageVersion) mismatches.push('package.json tidak punya field "version".');
if (!tauriConfVersion) mismatches.push('src-tauri/tauri.conf.json tidak punya field "package.version".');

if (packageVersion && tauriConfVersion && packageVersion !== tauriConfVersion) {
  mismatches.push(`Version mismatch: package.json (${packageVersion}) != tauri.conf.json (${tauriConfVersion})`);
}

if (packageVersion && cargoVersion && packageVersion !== cargoVersion) {
  mismatches.push(`Version mismatch: package.json (${packageVersion}) != Cargo.toml (${cargoVersion})`);
}

if (mismatches.length > 0) {
  console.error('❌ Validasi versi Tauri gagal:');
  mismatches.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`✅ Versi sinkron: ${packageVersion} (package.json, tauri.conf.json, Cargo.toml)`);
