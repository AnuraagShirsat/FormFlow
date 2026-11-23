/**
 * FormFlow - Automated Secret & Key Leak Scanner
 * Owner: Anuraag (/scripts)
 *
 * Scans repository files and /extension to verify that no live API keys, credentials,
 * private keys, or non-template .env files are ever staged or committed.
 *
 * Usage:
 *   node scripts/secret-scan.js
 *
 * RULES:
 * - Pure Node.js, zero third-party dependencies.
 * - Skips node_modules and .git directories.
 * - Prints ONLY the first 4 characters of any match (never logs full secrets).
 * - Exits with status code 1 if any violation is discovered.
 */

const fs = require('fs');
const path = require('path');

// Root directory of the repository
const REPO_ROOT = path.resolve(__dirname, '..');

// Directories to ignore during scanning
const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.gemini',
  'dist',
  'build'
]);

// Secret patterns constructed dynamically to avoid false positives when scanning this file
const PATTERNS = [
  {
    name: 'Google API Key Prefix (AIza)',
    regex: new RegExp('AI' + 'za', 'g')
  },
  {
    name: 'Secret Key Prefix (sk-)',
    regex: new RegExp('sk' + '-', 'g')
  },
  {
    name: 'Non-Empty Gemini Key Assignment',
    regex: new RegExp('GEMINI_' + 'API_KEY\\s*=\\s*["\']?[^\\s#\'"]+["\']?', 'g')
  },
  {
    name: 'Private Key Header',
    regex: new RegExp('BEGIN' + ' PRIVATE KEY', 'g')
  }
];

// Binary file extensions to skip text inspection
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz', '.woff', '.woff2', '.ttf'
]);

let violationCount = 0;

/**
 * Checks whether a given filename violates the environment file policy.
 * Only .env.example is permitted in the repository.
 * @param {string} filename The name of the file.
 * @param {string} fullPath The absolute file path.
 */
function checkEnvFile(filename, fullPath) {
  const isEnvFile = filename === '.env' || (filename.startsWith('.env.') && filename !== '.env.example');
  if (isEnvFile) {
    const relPath = path.relative(REPO_ROOT, fullPath);
    console.error(`[VIOLATION] Disallowed environment file: ${relPath}`);
    console.error('            Only .env.example with empty values may be committed to Git.');
    violationCount++;
  }
}

/**
 * Scans text content line by line for secret patterns.
 * Prints only the first 4 characters of any match.
 * @param {string} filePath Absolute file path.
 */
function scanFileContent(filePath) {
  // Skip this scanner script itself to prevent self-matching
  if (path.resolve(filePath) === path.resolve(__filename)) {
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    // If file cannot be read as utf8, skip safely
    return;
  }

  const lines = content.split('\n');
  const relPath = path.relative(REPO_ROOT, filePath);

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];

    for (const pattern of PATTERNS) {
      // Reset regex state
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(lineText)) !== null) {
        const secret = match[0];
        const preview = secret.slice(0, 4) + '...';
        console.error(`[VIOLATION] ${relPath}:${i + 1} - ${pattern.name} detected (Preview: "${preview}")`);
        violationCount++;
      }
    }
  }
}

/**
 * Recursively scans directory entries.
 * @param {string} currentDir Directory path to traverse.
 */
function traverseDirectory(currentDir) {
  let entries;
  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch (err) {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        traverseDirectory(fullPath);
      }
    } else if (entry.isFile()) {
      checkEnvFile(entry.name, fullPath);
      scanFileContent(fullPath);
    }
  }
}

/**
 * Main execution entry point.
 */
function runScan() {
  console.log('FormFlow Security: Scanning working tree and extension for secret leaks...');
  traverseDirectory(REPO_ROOT);

  if (violationCount > 0) {
    console.error(`\n[FAILED] Secret scan failed with ${violationCount} violation(s).`);
    console.error('Please remove sensitive tokens or .env files before pushing to Git.');
    process.exit(1);
  } else {
    console.log('\n[PASSED] FormFlow Secret Scan: Clean. Zero secrets or disallowed .env files found.');
    process.exit(0);
  }
}

runScan();
