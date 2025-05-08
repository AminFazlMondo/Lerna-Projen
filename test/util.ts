import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export function mkdtemp() {
  const tmpdir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'projen-test-'),
  );

  return tmpdir;
}
