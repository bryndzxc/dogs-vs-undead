#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const jsDir = './js';
const files = [];

function walkDir(dir) {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (item.endsWith('.js')) {
      files.push(fullPath);
    }
  });
}

walkDir(jsDir);

let errorCount = 0;

files.forEach(file => {
  try {
    const code = fs.readFileSync(file, 'utf8');
    new Function(code);
  } catch (e) {
    console.log(`${file}: ${e.message}`);
    errorCount++;
  }
});

if (errorCount === 0) {
  console.log(`All ${files.length} JavaScript files passed syntax validation`);
}

process.exit(errorCount > 0 ? 1 : 0);
