'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const docModelPath = path.join(
  projectRoot,
  'temp',
  'react-native-awesome-button.api.json'
);

if (!fs.existsSync(docModelPath)) {
  throw new Error(
    `API doc model is missing at ${docModelPath}. Run yarn api:check first.`
  );
}

const model = JSON.parse(fs.readFileSync(docModelPath, 'utf8'));
const missing = [];

function hasSummary(item) {
  if (typeof item.docComment !== 'string') {
    return false;
  }

  const summary = item.docComment
    .split(
      /\n\s*@(?:alpha|beta|deprecated|internal|public|remarks|returns|see)\b/u,
      1
    )[0]
    .replace(/\\\[/gu, '[')
    .replace(/\\\]/gu, ']')
    .trim();
  return summary.length > 0;
}

function visit(item, parentName = '') {
  const name = item.name || item.displayName || item.kind || '<anonymous>';
  const qualifiedName = parentName ? `${parentName}.${name}` : name;
  const isUserApi =
    item.kind !== 'Package' &&
    item.kind !== 'EntryPoint' &&
    item.kind !== 'Model' &&
    !item.isProtected &&
    !item.isPrivate;

  if (isUserApi && !hasSummary(item)) {
    missing.push(`${item.kind}: ${qualifiedName}`);
  }

  for (const member of item.members || []) {
    visit(member, qualifiedName);
  }
}

visit(model);

if (missing.length > 0) {
  throw new Error(
    `Exported API items without a non-empty TSDoc summary:\n${missing
      .map((item) => `- ${item}`)
      .join('\n')}`
  );
}

console.log('All exported API items have non-empty TSDoc summaries.');
