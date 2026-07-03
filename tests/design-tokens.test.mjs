import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const variablesPath = path.join(rootDir, 'app/styles/variables.css');
const sourceDirs = ['app', 'components', 'lib'];

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function collectFiles(dirPath, files = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (/\.(css|ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

test('variables.css defines shared design tokens used by source files', () => {
  const variablesCss = readText(variablesPath);
  const definedTokens = new Set(
    [...variablesCss.matchAll(/--[a-zA-Z0-9-]+\s*:/g)].map((match) =>
      match[0].replace(':', '').trim()
    )
  );

  const usedTokens = new Set();
  for (const dir of sourceDirs) {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) continue;

    for (const filePath of collectFiles(dirPath)) {
      for (const match of readText(filePath).matchAll(/var\((--[a-zA-Z0-9-]+)/g)) {
        usedTokens.add(match[1]);
      }
    }
  }

  const missingTokens = [...usedTokens]
    .filter((token) => !definedTokens.has(token))
    .sort();

  assert.deepEqual(missingTokens, []);
});

test('base styles provide a reduced-motion fallback for global animations', () => {
  const baseCss = readText(path.join(rootDir, 'app/styles/base.css'));

  assert.match(baseCss, /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/);
  assert.match(baseCss, /animation-duration\s*:\s*0\.01ms\s*!important/);
  assert.match(baseCss, /transition-duration\s*:\s*0\.01ms\s*!important/);
});

test('source settings actions avoid noisy hover lift effects', () => {
  const sourceSettingsFiles = [
    'components/settings/SourceSettings.tsx',
    'components/settings/PremiumSourceSettings.tsx',
    'components/settings/SourceSettingsPanel.tsx',
    'components/settings/SourceManager.tsx',
  ];
  const bannedPatterns = [
    /hover:-?translate-y(?:-\S+)?/g,
    /hover:translate-y-\[[^\]]+\]/g,
    /hover:scale(?:-\S+)?/g,
    /hover:z-\S+/g,
  ];

  const offenders = [];
  for (const relativePath of sourceSettingsFiles) {
    const filePath = path.join(rootDir, relativePath);
    if (!fs.existsSync(filePath)) continue;

    const text = readText(filePath);
    for (const pattern of bannedPatterns) {
      const matches = text.match(pattern) || [];
      for (const match of matches) {
        offenders.push(`${relativePath}: ${match}`);
      }
    }
  }

  assert.deepEqual(offenders, []);
});

test('source manager uses shared icons and product-speed transitions', () => {
  const sourceManager = readText(path.join(rootDir, 'components/settings/SourceManager.tsx'));

  assert.match(sourceManager, /from 'lucide-react'/);
  assert.doesNotMatch(sourceManager, /<svg\b/);
  assert.doesNotMatch(sourceManager, /duration-\[0\.4s\]/);
});

test('source settings variants share one panel implementation', () => {
  const panelPath = path.join(rootDir, 'components/settings/SourceSettingsPanel.tsx');
  assert.equal(fs.existsSync(panelPath), true);

  const sourceSettings = readText(path.join(rootDir, 'components/settings/SourceSettings.tsx'));
  const premiumSourceSettings = readText(path.join(rootDir, 'components/settings/PremiumSourceSettings.tsx'));

  assert.match(sourceSettings, /SourceSettingsPanel/);
  assert.match(sourceSettings, /title="视频源管理"/);
  assert.match(sourceSettings, /description="管理视频来源，调整优先级和启用状态"/);
  assert.match(sourceSettings, /defaultIds=\{DEFAULT_SOURCES\.map/);

  assert.match(premiumSourceSettings, /SourceSettingsPanel/);
  assert.match(premiumSourceSettings, /title="高级源管理"/);
  assert.match(premiumSourceSettings, /description="管理高级内容来源，调整优先级和启用状态"/);
  assert.match(premiumSourceSettings, /defaultIds=\{PREMIUM_SOURCES\.map/);
});
