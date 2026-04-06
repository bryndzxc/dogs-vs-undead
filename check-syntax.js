const fs = require('fs');
const path = require('path');
const Module = require('module');

const jsDir = './js';
const files = fs.readdirSync(jsDir, { recursive: true })
  .filter(f => f.endsWith('.js'));

let hasErrors = false;

files.forEach(f => {
  const filePath = path.join(jsDir, f);
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    new Module().constructor._load(filePath, null, true);
  } catch (e) {
    console.log(`${filePath}: ${e.message}`);
    hasErrors = true;
  }
});

if (!hasErrors) {
  console.log(`All ${files.length} JavaScript files passed syntax validation`);
}
