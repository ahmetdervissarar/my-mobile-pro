import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const strictMode = process.argv.includes('--strict');

const scanRoots = ['apps'];
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.md']);

const mojibakePatterns = [
  'Ã§',
  'Ã¶',
  'Ã¼',
  'ÅŸ',
  'Ä±',
  'ÄŸ',
  'Ä°',
  'Ã‡',
  'Ã–',
  'Ãœ',
  'â€',
];

const nonUtf8Files = [];
const replacementCharFiles = [];
const mojibakeFiles = [];

const decoder = new TextDecoder('utf-8', { fatal: true });

function walkDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return;
  }

  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.expo' || entry.name === 'dist') {
        continue;
      }

      walkDirectory(fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!extensions.has(path.extname(entry.name))) {
      continue;
    }

    auditFile(fullPath);
  }
}

function toRelativePath(fullPath) {
  return path.relative(repoRoot, fullPath).replaceAll(path.sep, '/');
}

function auditFile(filePath) {
  const bytes = fs.readFileSync(filePath);
  let text;

  try {
    text = decoder.decode(bytes);
  } catch {
    nonUtf8Files.push(toRelativePath(filePath));
    return;
  }

  if (text.includes('\uFFFD')) {
    replacementCharFiles.push(toRelativePath(filePath));
  }

  if (mojibakePatterns.some((pattern) => text.includes(pattern))) {
    mojibakeFiles.push(toRelativePath(filePath));
  }
}

for (const root of scanRoots) {
  walkDirectory(path.join(repoRoot, root));
}

function printList(title, files) {
  if (files.length === 0) {
    console.log(`${title}: none`);
    return;
  }

  console.log(`${title}:`);
  for (const file of files) {
    console.log(`  - ${file}`);
  }
}

printList('NON-UTF8 (BLOCKING)', nonUtf8Files);
printList('U+FFFD replacement char (BLOCKING)', replacementCharFiles);
printList(
  strictMode ? 'Turkish mojibake signatures (STRICT BLOCKING)' : 'Turkish mojibake signatures (WARNING)',
  mojibakeFiles,
);

const hasBlockingIssue =
  nonUtf8Files.length > 0 ||
  replacementCharFiles.length > 0 ||
  (strictMode && mojibakeFiles.length > 0);

if (hasBlockingIssue) {
  process.exitCode = 1;
} else {
  console.log(strictMode ? 'ENCODING_AUDIT_STRICT_OK' : 'ENCODING_AUDIT_OK');
}
