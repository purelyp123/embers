import { createHash } from "node:crypto";

function isMediaPath(path) {
    return typeof path === "string"
        && !path.includes("\\")
        && path.split("/").every(part => part !== "" && part !== "." && part !== "..")
        && /^[a-zA-Z0-9_/.-]+\.(webm|webp)$/.test(path);
}

export function validateManifest(manifest) {
    if (!/^[a-f0-9]{40}$/.test(manifest.revision)
        || manifest.baseURL !== `https://raw.githubusercontent.com/Jules-Bens-Aa/JB2A_DnD5e/${manifest.revision}/Library`) {
        throw Error("Asset source must be the official JB2A library at a pinned revision");
    }
    if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
        throw Error("Asset manifest is empty");
    }

    const paths = new Set();
    for (const asset of manifest.assets) {
        if (!isMediaPath(asset.path) || !isMediaPath(asset.sourcePath ?? asset.path)) {
            throw Error(`Invalid asset path: ${asset.path}`);
        }
        if (!/^[a-f0-9]{40}$/.test(asset.sha) || !Number.isSafeInteger(asset.size) || asset.size <= 0) {
            throw Error(`Invalid asset checksum or size: ${asset.path}`);
        }
        if (paths.has(asset.path)) throw Error(`Duplicate asset path: ${asset.path}`);
        if (asset.sourcePath && !asset.reason) throw Error(`Missing compatibility reason: ${asset.path}`);
        paths.add(asset.path);
    }
}

export function assetMatches({ data, asset }) {
    if (data.length !== asset.size) return false;
    const sha = createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
    return sha === asset.sha;
}
