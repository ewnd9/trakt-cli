import test from 'ava';
import path from 'path';
import { execSync } from 'child_process';

test('true', t => {
  const output = execSync(path.resolve(__dirname, '..', 'cli.js')).toString();
  t.regexTest(/(access trakt from CLI|copy pin from)/, output);
});
