import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = process.cwd();

test('navbar keeps logout available below the desktop breakpoint', () => {
  const source = readFileSync(
    join(projectRoot, 'components/layout/UserMenu.tsx'),
    'utf8',
  );

  assert.match(source, /\{session && \(\s*<button\s+onClick=\{handleLogout\}/);
  assert.doesNotMatch(source, /\{session && \(\s*<div className="hidden sm:flex/);
});

test('unified settings includes the shared account management section', () => {
  const source = readFileSync(
    join(projectRoot, 'components/settings/SettingsDrawer.tsx'),
    'utf8',
  );

  assert.match(source, /import \{ AccountSettings \} from '@\/components\/settings\/AccountSettings';/);
  assert.match(source, /<AppVersionSettings \/>[\s\S]*?<AccountSettings \/>/);
});
