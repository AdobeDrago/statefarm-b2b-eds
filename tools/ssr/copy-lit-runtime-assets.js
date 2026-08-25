import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const assetPaths = [
  'lit/index.js',
  'lit-html/lit-html.js',
  'lit-html/is-server.js',
  'lit-html/private-ssr-support.js',
  'lit-html/directive.js',
  'lit-html/directive-helpers.js',
  'lit-element/lit-element.js',
  '@lit/reactive-element/reactive-element.js',
  '@lit/reactive-element/css-tag.js',
  '@lit-labs/ssr-client/lit-element-hydrate-support.js',
  '@lit-labs/ssr-client/lib/hydrate-lit-html.js',
];

/**
 * Copies the browser modules needed to hydrate Lit SSR output into EDS-served
 * static assets. Keep this list small and add modules as component imports need
 * them rather than publishing all of node_modules.
 *
 * @returns {Promise<void>}
 */
async function copyLitRuntimeAssets() {
  await Promise.all(assetPaths.map(async (assetPath) => {
    const source = resolve(projectRoot, 'node_modules', assetPath);
    const destination = resolve(projectRoot, 'scripts/lit/vendor', assetPath);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }));
  process.stdout.write('Copied Lit hydration assets to scripts/lit/vendor.\n');
}

copyLitRuntimeAssets().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
