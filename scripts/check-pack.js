'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), 'awesome-button-npm-pack-')
);
let output;
try {
  output = execFileSync(
    'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        npm_config_cache: path.join(temporaryRoot, 'npm-cache'),
      },
      encoding: 'utf8',
    }
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
const reports = JSON.parse(output);
const report = reports[0];

if (!report || !Array.isArray(report.files)) {
  throw new Error('npm pack did not return a package file manifest.');
}

const files = report.files.map(({ path }) => path).sort();
const required = [
  'CHANGELOG.md',
  'LICENSE',
  'MIGRATION.md',
  'README.md',
  'lib/commonjs/index.js',
  'lib/module/index.js',
  'lib/typescript/src/index.d.ts',
  'package.json',
];
const missing = required.filter(
  (requiredPath) => !files.includes(requiredPath)
);
const forbidden = files.filter((file) => {
  const segments = file.split('/');
  return (
    segments.includes('__tests__') ||
    segments.includes('__fixtures__') ||
    segments.includes('__mocks__') ||
    segments.includes('demo') ||
    segments.includes('example') ||
    segments.includes('examples') ||
    segments.includes('coverage') ||
    segments.includes('node_modules') ||
    segments.includes('temp') ||
    file.endsWith('.api.json')
  );
});

if (missing.length > 0 || forbidden.length > 0) {
  throw new Error(
    [
      missing.length > 0 ? `Missing required files: ${missing.join(', ')}` : '',
      forbidden.length > 0
        ? `Forbidden package files: ${forbidden.join(', ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  );
}

console.log(files.join('\n'));
console.log(`Validated ${files.length} npm package files.`);
