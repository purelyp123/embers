import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const source = process.argv[2];
if (!source) throw Error("Usage: npm run import:spells -- /path/to/src/data/spells");

const catalog = {};
for (let level = 1; level <= 9; level++) {
    const spells = JSON.parse(await readFile(resolve(source, `spells-level-${level}.json`), "utf8"));
    for (const [id, spell] of Object.entries(spells)) {
        if (spell.id !== id || spell.level !== level || catalog[id]) {
            throw Error(`Invalid or duplicate spell: ${id} in level ${level}`);
        }
        // Card artwork belongs to Deck Designer and isn't part of Embers' asset library.
        const definition = { ...spell };
        delete definition.icon;
        catalog[id] = definition;
    }
}

const destination = fileURLToPath(new URL("../src/assets/spell-catalog.json", import.meta.url));
await writeFile(destination, `${JSON.stringify(catalog, null, 4)}\n`);
console.log(`Imported ${Object.keys(catalog).length} level 1–9 spells into ${destination}`);
