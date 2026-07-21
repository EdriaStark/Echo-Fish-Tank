import { readFile } from 'node:fs/promises';

const requiredFiles = ['index.html', 'styles.css', 'design-system.js', 'auth-boundary.js', 'app.js', '_redirects', '_headers'];
const files = await Promise.all(requiredFiles.map(async file => [file, await readFile(file, 'utf8')]));
const content = Object.fromEntries(files);

if (!content['index.html'].includes('auth-boundary.js')) throw new Error('Auth boundary is not loaded.');
if (!content['_redirects'].includes('/index.html 200')) throw new Error('SPA fallback is missing.');
if (/https:\/\/edriastark\.github\.io/.test(content['index.html'])) throw new Error('Deployment-specific canonical URL found.');
if (/api[_-]?key\s*[:=]/i.test(content['app.js'])) throw new Error('Potential API key found in app.js.');

console.log(`Static verification passed for ${requiredFiles.length} files.`);
