// Package the Lantern Ward game and its rendered scenes for the make.fun judge.
import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier, readGameTree } from './vendor/makefun-game.ts';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

async function packageLanternWard() {
  const entryDirectory = fileURLToPath(new URL('.', import.meta.url));
  const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const screenshotDirectory = join(entryDirectory, 'screenshots');
  const entries = await readdir(screenshotDirectory, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  // Match the dossier library: hidden files and subdirectories are not screenshots.
  const screenshots = entries.filter(entry => entry.isFile() && !entry.name.startsWith('.'));
  if (screenshots.length < 3) {
    throw new Error(`screenshots/ requires at least 3 PNG or JPEG images; found ${screenshots.length}.`);
  }

  await mkdir(outputDirectory, { recursive: true });
  for (const folder of ['game', 'screenshots']) {
    await cp(join(entryDirectory, folder), join(outputDirectory, folder), { recursive: true });
  }

  // The vendored library validates image contents and caps and supplies the exact hand-in bytes.
  const dossier = buildDossier(outputDirectory, DOSSIER_CAPS);
  await writeFile(join(outputDirectory, 'dossier.json'), dossier);
  const game = readGameTree(join(outputDirectory, 'game'), DOSSIER_CAPS);
  const imageCount = JSON.parse(Buffer.from(dossier).toString('utf8')).images.length;
  console.log(`Lantern Ward: ${game.files.length} game files, ${imageCount} screenshots, ${dossier.byteLength} dossier bytes.`);
}

try {
  await packageLanternWard();
} catch (error) {
  console.error(`Lantern Ward packaging failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
