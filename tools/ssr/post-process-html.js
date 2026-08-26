import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { postProcessBlockHtml } from './post-process.js';

const usage = 'Usage: npm run ssr:html -- <input.html> <output.html> [--module <component.ssr.js>]';

/**
 * Loads SSR-safe component modules, then post-processes a generated HTML file.
 * Component modules register their custom elements before Lit receives the HTML.
 *
 * @param {string[]} args command-line arguments
 * @returns {Promise<void>}
 */
async function main(args) {
  const modules = [];
  const files = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--module') {
      index += 1;
      if (!args[index]) throw new Error(`${usage}\n--module requires a path.`);
      modules.push(args[index]);
    } else {
      files.push(args[index]);
    }
  }
  if (files.length !== 2) throw new Error(usage);

  await Promise.all(modules.map((modulePath) => import(pathToFileURL(resolve(modulePath)).href)));
  const [inputPath, outputPath] = files.map((filePath) => resolve(filePath));
  const input = await readFile(inputPath, 'utf8');
  const { html, rendered } = await postProcessBlockHtml(input);
  await writeFile(outputPath, html);
  process.stdout.write(`SSR ${rendered ? 'applied' : 'skipped'}: ${outputPath}\n`);
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
