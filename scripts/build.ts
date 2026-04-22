import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { $ } from 'bun';

const ROOT = join(import.meta.dir, '..');
const DIST = join(ROOT, 'dist');

async function clean(): Promise<void> {
	await rm(DIST, { recursive: true, force: true });
	await mkdir(DIST, { recursive: true });
}

async function bundleEntry(entry: string, outfile: string): Promise<void> {
	const result = await Bun.build({
		entrypoints: [join(ROOT, entry)],
		outdir: DIST,
		target: 'browser',
		format: 'iife',
		minify: false,
		sourcemap: 'none',
		naming: outfile,
	});

	if (!result.success) {
		for (const log of result.logs) console.error(log);
		throw new Error(`Bundle failed for ${entry}`);
	}
}

async function copyStaticAssets(): Promise<void> {
	await mkdir(join(DIST, 'popup'), { recursive: true });
	await cp(join(ROOT, 'popup/popup.html'), join(DIST, 'popup/popup.html'), {
		force: true,
	});
	await cp(join(ROOT, 'popup/popup.css'), join(DIST, 'popup/popup.css'), {
		force: true,
	});
	await cp(join(ROOT, 'css'), join(DIST, 'css'), {
		recursive: true,
		force: true,
	});
	await cp(join(ROOT, 'icons'), join(DIST, 'icons'), {
		recursive: true,
		force: true,
	});
}

async function writeManifest(): Promise<void> {
	const source = await readFile(join(ROOT, 'manifest.json'), 'utf8');
	const manifest = JSON.parse(source);
	await writeFile(
		join(DIST, 'manifest.json'),
		`${JSON.stringify(manifest, null, 2)}\n`,
	);
}

await clean();
await Promise.all([
	bundleEntry('src/content/index.ts', 'content.js'),
	bundleEntry('src/popup/popup.ts', 'popup/popup.js'),
]);
await copyStaticAssets();
await writeManifest();

const sizes = await $`du -sh ${DIST}/*`.quiet();
console.log('Build complete. dist/ contents:');
console.log(sizes.stdout.toString());
