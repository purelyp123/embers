import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { assetMatches, validateManifest } from "./animation-assets.mjs";

const revision = "e930132102cbfa22a0ba964a3df73feb3412727a";
const data = Buffer.from("fixture");
const asset = {
    path: "Generic/Example_400x400.webm",
    sha: createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex"),
    size: data.length,
};
const manifest = {
    revision,
    baseURL: `https://raw.githubusercontent.com/Jules-Bens-Aa/JB2A_DnD5e/${revision}/Library`,
    assets: [asset],
};

test("only checksum-verified media from the pinned official source is accepted", () => {
    validateManifest(manifest);
    assert.equal(assetMatches({ data, asset }), true);
    assert.equal(assetMatches({ data: Buffer.from("changed"), asset }), false);
    assert.equal(assetMatches({ data, asset: { ...asset, size: 1 } }), false);
    assert.throws(() => validateManifest({ ...manifest, revision: "main" }), /pinned revision/);
    assert.throws(() => validateManifest({ ...manifest, baseURL: "https://example.com" }), /official JB2A/);
});

test("unsafe paths, duplicate destinations, and invalid checksums are rejected", () => {
    for (const path of ["../outside.webm", "/absolute.webm", "Generic/../outside.webm", "Generic\\outside.webm", "Generic/file.js", "Generic//file.webm"]) {
        assert.throws(() => validateManifest({ ...manifest, assets: [{ ...asset, path }] }), /Invalid asset path/);
    }
    assert.throws(() => validateManifest({ ...manifest, assets: [asset, asset] }), /Duplicate asset path/);
    assert.throws(() => validateManifest({ ...manifest, assets: [{ ...asset, sha: "invalid" }] }), /Invalid asset checksum/);
    assert.throws(() => validateManifest({ ...manifest, assets: [] }), /manifest is empty/);
});

test("compatibility copies require a safe source path and an explanation", () => {
    const compatible = { ...asset, sourcePath: "Generic/Original_400x400.webm", reason: "Use the available free variant." };
    validateManifest({ ...manifest, assets: [compatible] });
    assert.throws(() => validateManifest({ ...manifest, assets: [{ ...compatible, sourcePath: "../outside.webm" }] }), /Invalid asset path/);
    assert.throws(() => validateManifest({ ...manifest, assets: [{ ...compatible, reason: "" }] }), /Missing compatibility reason/);
});
