import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createSpellCatalog, spellIDForDefinition } from "./spell-catalog.ts";
import type { Effect, Effects } from "../types/effects.ts";
import type { SpellDefinition, Spells } from "../types/spells.ts";

const readJSON = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const definitions = readJSON("../assets/spell-catalog.json") as Record<string, SpellDefinition>;
const presets = readJSON("../assets/spells_record.json") as Spells;
const effects = readJSON("../assets/effect_record.json") as Effects;
const getEffect = (id: string) => {
    let value: Effects | Effect = effects;
    for (const key of id.split(".")) value = (value as Effects)[key];
    return value as Effect | undefined;
};
const catalog = createSpellCatalog({ definitions, presets, effects });

test("all 288 level 1–9 spells are selectable with their full rules text", () => {
    assert.equal(Object.keys(definitions).length, 288);
    assert.deepEqual(Array.from({ length: 9 }, (_, i) => Object.values(definitions).filter(s => s.level === i + 1).length), [55, 35, 42, 34, 38, 31, 20, 17, 16]);
    for (const definition of Object.values(definitions)) {
        const spell = catalog[spellIDForDefinition(definition.id)];
        assert.equal(spell.name, definition.name);
        assert.deepEqual(spell.details, definition);
        assert.ok(spell.blueprints?.length);
    }
    assert.equal(Object.keys(catalog).length, 307);
});

test("existing spells, abilities, saved IDs and animation settings are preserved", () => {
    for (const [id, preset] of Object.entries(presets)) {
        const { details, ...spell } = catalog[id];
        if (details) assert.equal(spellIDForDefinition(details.id), id);
        assert.deepEqual(spell, { ...preset, name: catalog[id].details?.name ?? preset.name });
    }
    assert.equal(spellIDForDefinition("magic-missile"), "magic_missiles");
    assert.ok(catalog.magic_missiles.details);
    assert.equal(catalog.magic_missile, undefined);
    assert.equal(catalog.wish.details?.level, 9);
    assert.equal(catalog.fire_bolt.details, undefined);
});

test("new spells use real JB2A effects and transient target-safe casting cues", () => {
    for (const [id, spell] of Object.entries(catalog)) {
        if (presets[id]) continue;
        assert.equal(spell.minTargets, 1);
        assert.equal(spell.replicate, "all");
        assert.equal(spell.copy, -1);
        const blueprint = spell.blueprints![0];
        const effect = getEffect(blueprint.id as string);
        assert.ok(effect);
        assert.equal(effect.type, "CIRCLE");
        assert.equal(spell.thumbnail, effect.thumbnail);
        assert.equal(blueprint.duration, undefined);
        assert.equal(blueprint.attachedTo, undefined);
        assert.deepEqual(blueprint.effectProperties, {
            source: "$targets[0].position",
            size: id === "thunderwave" ? "$size" : "$targets[0].size",
        });
        assert.ok(Object.values(effect.variants).every(v => v.duration.every(d => d > 0)));
        assert.equal(spell.firstTargetIsCaster, spell.details!.range.startsWith("Self"));
    }
    assert.equal(catalog.thunderwave.blueprints![0].id, "thunderwave");
    assert.equal(catalog.thunderwave.parameters![0].defaultValue, 3);
    assert.match(catalog.wish.animationNote!, /generic casting animation/);
});

test("download manifest includes every asset and thumbnail used by added spells", () => {
    const manifest = readJSON("../assets/spell-animation-assets.json");
    const paths = new Set(manifest.assets.map((asset: { path: string }) => asset.path));
    for (const [id, spell] of Object.entries(catalog)) {
        if (presets[id]) continue;
        const effect = getEffect(spell.blueprints![0].id as string)!;
        assert.ok(paths.has(effect.thumbnail), effect.thumbnail);
        for (const variant of Object.values(effect.variants)) {
            for (const name of variant.name) assert.ok(paths.has(`${effect.basename}_${name}.webm`));
        }
    }
    assert.equal(paths.size, 2254);
});

test("download manifest covers every original effect and preset thumbnail", () => {
    const manifest = readJSON("../assets/spell-animation-assets.json");
    const paths = new Set(manifest.assets.map((asset: { path: string }) => asset.path));
    const required = new Set<string>();
    const collect = (group: Effects | Effect) => {
        if (typeof group.basename === "string") {
            const effect = group as Effect;
            required.add(effect.thumbnail);
            for (const variant of Object.values(effect.variants)) {
                for (const name of variant.name) required.add(`${effect.basename}_${name}.webm`);
            }
            return;
        }
        for (const child of Object.values(group)) collect(child as Effects | Effect);
    };
    collect(effects);
    for (const spell of Object.values(presets)) {
        if (spell.thumbnail) required.add(spell.thumbnail);
    }
    assert.deepEqual(paths, required);

    const compatibility = manifest.assets.filter((asset: { sourcePath?: string }) => asset.sourcePath);
    assert.equal(compatibility.length, 10);
    for (const asset of compatibility) {
        assert.ok(asset.reason);
        assert.notEqual(asset.path, asset.sourcePath);
    }
});

test("a missing fallback animation fails with the effect ID", () => {
    assert.throws(
        () => createSpellCatalog({ definitions: { wish: definitions.wish }, presets: {}, effects: {} }),
        /Missing spell animation: generic\.magic_signs\.conjuration_rune\.complete/,
    );
});
