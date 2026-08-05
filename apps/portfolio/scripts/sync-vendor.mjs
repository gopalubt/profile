/**
 * Copy the GpApp source into apps/portfolio/vendor/ so the static site can load
 * it with a plain <script> tag.
 *
 * The site has no bundler on purpose - it is served straight off GitHub Pages -
 * so vendor/gpapp.js is committed. Run this after editing packages/gpapp/gpapp.js.
 *
 *   npm run sync-vendor --workspace=@gsr/portfolio
 */
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../../packages/gpapp/gpapp.js');
const destination = resolve(here, '../vendor/gpapp.js');

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);

console.info(`Synced gpapp.js -> ${destination}`);
