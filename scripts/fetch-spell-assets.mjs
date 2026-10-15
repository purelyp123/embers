import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assetMatches, validateManifest } from "./animation-assets.mjs";

const manifest = JSON.parse(await readFile(new URL("../src/assets/spell-animation-assets.json", import.meta.url), "utf8"));
const destination = fileURLToPath(new URL("../public/Library/", import.meta.url));
validateManifest(manifest);

const controller = new AbortController();
let nextIndex = 0;
let verified = 0;
let downloaded = 0;
const totalBytes = manifest.assets.reduce((total, asset) => total + asset.size, 0);
console.log(`Preparing ${manifest.assets.length} JB2A files (${(totalBytes / 1e9).toFixed(2)} GB on first download).`);

async function fetchAsset(asset) {
    const path = resolve(destination, asset.path);
    const existing = await readFile(path).catch(error => {
        if (error.code === "ENOENT") return undefined;
        throw error;
    });
    if (existing && assetMatches({ data: existing, asset })) return;

    // Compatibility copies retain their legacy destination names without altering media bytes.
    const response = await fetch(`${manifest.baseURL}/${asset.sourcePath ?? asset.path}`, {
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]),
        redirect: "error",
    });
    if (!response.ok) throw Error(`Download failed (${response.status}): ${asset.path}`);
    const data = Buffer.from(await response.arrayBuffer());
    if (!assetMatches({ data, asset })) throw Error(`Asset checksum or size mismatch: ${asset.path}`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    downloaded++;
}

async function downloadNext() {
    while (!controller.signal.aborted && nextIndex < manifest.assets.length) {
        const asset = manifest.assets[nextIndex++];
        await fetchAsset(asset);
        verified++;
        if (verified % 50 === 0) console.log(`Verified ${verified}/${manifest.assets.length} files (${downloaded} downloaded).`);
    }
}

// Limit simultaneous transfers so fresh Render builds don't open thousands of connections.
try {
    await Promise.all(Array.from({ length: 4 }, () => downloadNext()));
} finally {
    controller.abort();
}
console.log(`Verified ${verified} JB2A files in ${destination} (${downloaded} downloaded).`);
