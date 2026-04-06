const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getJsFiles(dir) {
  let files = [];
  try {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        files = files.concat(getJsFiles(full));
      } else if (full.endsWith('.js')) {
        files.push(full);
      }
    });
  } catch (e) {
    // ignore
  }
  return files;
}

const files = getJsFiles('./js');
let errors = [];

files.forEach(f => {
  try {
    execSync(`node --check "${f}"`, { stdio: 'pipe', shell: true });
  } catch (e) {
    errors.push({ file: f, error: e.message });
  }
});

if (errors.length === 0) {
  console.log(`✓ All ${files.length} JavaScript files passed syntax validation`);
} else {
  console.log(`❌ Syntax errors found in ${errors.length} file(s):\n`);
  errors.forEach(err => {
    console.log(`File: ${err.file}`);
    console.log(err.error);
    console.log();
  });
  process.exit(1);
}
