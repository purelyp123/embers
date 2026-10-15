import type { Effect, Effects } from "../types/effects.ts";
import type { Spell, SpellDefinition, Spells } from "../types/spells.ts";

// Keep saved spellbooks and custom blueprints using Embers' original IDs working.
export function spellIDForDefinition(id: string) {
    if (id === "magic-missile") return "magic_missiles";
    return id.replaceAll("-", "_");
}

export function createSpellCatalog({ definitions, presets, effects }: {
    definitions: Record<string, SpellDefinition>;
    presets: Spells;
    effects: Effects;
}) {
    const catalog: Spells = { ...presets };

    for (const definition of Object.values(definitions)) {
        const id = spellIDForDefinition(definition.id);
        const preset = presets[id];
        if (preset) {
            catalog[id] = { ...preset, name: definition.name, details: definition };
            continue;
        }

        // These are casting cues, not persistent representations of a spell's rules.
        const effectID = id === "thunderwave"
            ? "thunderwave"
            : `generic.magic_signs.${definition.school.toLowerCase()}_rune.complete`;
        const effect = effectID.split(".").reduce<Effects | Effect | undefined>(
            (value, key) => (value as Effects | undefined)?.[key], effects,
        ) as Effect | undefined;
        if (!effect) throw Error(`Missing spell animation: ${effectID}`);

        const spell: Spell = {
            name: definition.name,
            details: definition,
            animationNote: id === "thunderwave"
                ? "JB2A Thunderwave animation."
                : `JB2A ${definition.school} sigil (generic casting animation).`,
            minTargets: 1,
            thumbnail: effect.thumbnail,
            replicate: "all",
            firstTargetIsCaster: definition.range.startsWith("Self"),
            copy: -1,
            blueprints: [{
                type: "effect",
                id: effectID,
                effectProperties: {
                    source: "$targets[0].position",
                    size: id === "thunderwave" ? "$size" : "$targets[0].size",
                },
            }],
        };
        if (id === "thunderwave") {
            spell.parameters = [{
                name: "Size (in cells)",
                id: "size",
                type: "number",
                defaultValue: 3,
                content: { min: 1 },
            }];
        }
        catalog[id] = spell;
    }
    return catalog;
}
