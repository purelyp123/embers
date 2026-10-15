# 🔥 Embers
Embers is an Owlbear Rodeo extension that allows you to play animated spells and abilities. It uses the animated assets generously provided by [JB2A](https://jb2a.com/), under the Creative Commons License Attribution-NonCommercial CC BY-NC-SA ([click here](https://creativecommons.org/licenses/by-nc-sa/4.0/) to know more about this). Many thanks to [Aji Banawan](https://github.com/aaajii) for his work on Embers' UI.

## How to use it
### Basic usage
To play a spell or ability effect with Embers, you can select the "Cast spell" tool on the tools panel, or press `shift+C`.

![Tool Panel](./images/toolpanel.png)

After this, you will enter the default "Add Targets" tool mode, which allows you to click on the scene and add targets to your spell. If you mess up, you can remove a target by selecting the "Remove Target" (or pressing `R`), and clicking on a target, or remove all targets using the "Clear Selection" button (or pressing `X`); you can then go back to adding more targets by clicking on the previous tool mode (or pressing `A`).
Once you are done selecting all your targets, you can select the spell you want to cast (by clicking on the "Select Spell" action or pressing `.`) and either click on the "Cast Selected Spell" tool action or press `Enter` to play the effect.

![Tool Modes](./images/toolmodes.png)

This image shows, from left to right:
* Add Target (`A`)
* Remove Target (`R`)
* Cast Selected Spell (`Enter`)
* Select Spell (`.`)
* Clear Selection (`X`)

### Effect Customization
When the "Cast spell" tool is activated, if Embers' action panel is opened, it will switch to the "Spell Details" tab and show the currently selected spell's properties. Some of these can be edited, like the color of some spells, and will immediately take effect.

![Spell Details](./images/spelldetails.png)

### API
Embers exposes most of its capabilities through the Owlbear Rodeo SDK's broadcasting functionality. However, since it is still in a heavy development stage, the documentation regarding this has not been published yet.

## Roadmap
These are some features that are on Embers' backlog:

- [x] Support basic projectiles/AOE effects
- [x] Support all spell effects from JB2A
- [ ] Support all generic effects from JB2A
- [x] Include the 288 level 1–9 spells from Deck Designer (dedicated effects where available, school sigils otherwise)
- [ ] Add dedicated spell animations for spells currently using school sigils
- [x] Support permanent effects
- [x] Support custom metadata
- [x] Allow for custom spell parameters
- [x] Implement the settings menu
- [x] Save targets between castings (when option is enabled in settings)
- [x] Enforce maximum and minimum number of targets specified in the spell's description
- [x] Allow players to control their own permanent effects (not just the GM)
- [x] Create the UI for creating custom spells
- [x] Allow some simple actions like moving tokens (for spells like Misty Step)
- [ ] Allow basic shader effects like changing colors, screen shake, etc
- [x] Allow effects to play when a spell ends manually

## Development and spell catalog

To build with Docker instead of installing Node dependencies on your host, start
Docker Desktop (or another Docker engine with Buildx), then run from this repo:

```sh
docker buildx build --target artifact --output type=local,dest=dist .
```

The Dockerfile uses the official Node.js `22.23.3-bookworm-slim` image. It installs
the locked npm dependencies with installation hooks disabled, runs `npm test`,
downloads and verifies the complete animation library, and runs the TypeScript
and Vite build. The resulting static site is exported directly into your local
`dist/` folder using Docker's [local exporter](https://docs.docker.com/build/building/export/).
No web server is started. Only the exported files are written to your checkout;
dependencies and build caches stay in Docker.

The first Docker build downloads its base image, npm packages, and about 1.12 GB
of animation assets. Docker caches npm downloads and the animation library for
later builds. These caches are separate from the files you already downloaded
on your Mac; removing Docker's build cache means downloading them again.

The build context excludes host `node_modules/`, `dist/`, `public/Library/`, Git
history, and local environment files. Source files are copied into the build
container; your checkout is not mounted into it. Docker needs network access for
the initial dependency and asset downloads. The Dockerfile does not install
global npm packages or additional system packages.

To run just the tests in Docker, without downloading animations or building:

```sh
docker buildx build --target tests --progress=plain .
```

If you use a separate animation host, pass its public URL explicitly at build
time instead of using a local `.env` file:

```sh
docker buildx build --target artifact --build-arg VITE_ASSET_LOCATION=https://your-asset-host.example/Library --output type=local,dest=dist .
```

The exported site still includes the animation library. Build arguments are
public configuration, so do not pass secrets through them. Render's Static Site
workflow below continues to use its own npm build; this Dockerfile is for local
builds and does not change the hosting setup.

Use Node.js 22.18+ and the checked-in npm lockfile:

```sh
npm ci --ignore-scripts
npm test
npm run lint
npm run build
```

The level 1–9 spell definitions in `src/assets/spell-catalog.json` are a snapshot of
Deck Designer's `src/data/spells/spells-level-1.json` through `spells-level-9.json`.
To refresh them from a local checkout:

```sh
npm run import:spells -- /path/to/dnd-deck-designer/src/data/spells
```

Embers merges these definitions with `src/assets/spells_record.json`. Existing
spell and ability IDs, parameters, and animation blueprints stay compatible with
saved spellbooks. Cantrips and additional abilities are retained. Magic Missile
continues to use the original `magic_missiles` ID. The resulting catalog has 307
entries: 288 leveled spells plus 19 existing cantrips, spells, and abilities.

New spells use a transient JB2A rune for their school; their details identify this
as a generic casting animation. Thunderwave uses its dedicated JB2A effect.
These animations do not enforce game rules or create persistent spell areas.
The full spell text, concentration, ritual, and upcasting details are shown in the
Spell Details panel.

Fetch the animations and thumbnails for the complete effect catalog before
running or building the extension:

```sh
npm run assets:spells
npm run dev
```

This downloads 2,254 files (about 1.12 GB) from the official
[JB2A free library](https://github.com/Jules-Bens-Aa/JB2A_DnD5e) into the existing,
git-ignored `public/Library` directory. The manifest pins an upstream revision and
Git blob checksums; rerunning the command verifies sizes and checksums and skips
valid copies. Downloads run four at a time and fail on missing or invalid files.
The manifest covers every animation variant and thumbnail in
`src/assets/effect_record.json`, including generic effects used by custom spells,
plus the new school sigils. No Foundry installation, FFmpeg, or Python packages
are required to download the media.

Ten legacy paths use unchanged free files copied under Embers' expected filenames:

- Arms of Hadar's transparent animation and Entangle's transparent complete/loop
  animations use the normal-opacity originals; the custom 75% opacity versions
  are unavailable in the pinned free library.
- Detect Magic's cone thumbnail uses the free 5-foot cone thumbnail.
- The green Overcharged Sphere animation variants and thumbnail use the free
  dark-purple version; the custom green recolor is unavailable.

Effect IDs and saved blueprints remain compatible. Each substitution has a
`sourcePath` and explanation in the manifest. Other available opacity variants
are downloaded as-is.

For Render, use a Static Site with publish directory `dist`, environment variables
`NODE_VERSION=22.23.3` and `SKIP_INSTALL_DEPS=true`, and this build command:

```sh
npm ci --ignore-scripts && npm run assets:spells && npm run build
```

Render fetches the library on its build machine; locally downloaded files are
git-ignored and won't arrive through a Git push. The downloader does not run
automatically as part of `npm run build`. Vite copies `public/Library` into
`dist/Library`. Leave `VITE_ASSET_LOCATION` unset to serve these files alongside
the extension. Deployments using a separate `VITE_ASSET_LOCATION` must provide
the same library paths at that asset host.

Configure a Render rewrite from `/*` to `/index.html` for browser routes; Render
serves existing static files before applying the rewrite. Animation traffic
counts toward the hosting provider's bandwidth allowance.

Animations and thumbnails are by **Jules & Ben's Animated Assets (JB2A)** and are
used unchanged under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
The exact upstream revision, source URLs, and checksums are recorded in
`src/assets/spell-animation-assets.json`. `public/jb2a-attribution.txt` is included
in the published site. No Patreon assets are included.

### More Information
For more information, visit the [Embers website](https://embers.armindo.eu).

## Contacts
The easiest way to reach out to me about this extension is to join Owlbear Rodeo's [Discord Server](https://discord.gg/u5RYMkV98s) and message me at `armindoflores`.
