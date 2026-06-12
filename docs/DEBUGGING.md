# Debugging Ironhold

Practical, project-specific notes for diagnosing world/visual bugs fast. Written after a real session (the broken swamp boardwalk). Read this before spelunking `src/main.js` (~17k lines, one IIFE).

## Finding world-gen code

- Almost everything lives in `src/main.js`. Structures are built by `add*` functions: `addSwampMarkers`, `addDesertMarkers`, `addMountainRoost`, `addBriarMarkers`, `addExplorationVillage`, `addCrownfordCity`, `addBogPool`, `addExplorationRoadNetwork`.
- Grep anchors that work well: the material name (`materials.swampPlank`, `materials.darkStone`), the primitive helpers (`makeBox(`, `makeCylinder(`, `makeCone(`), or the biome id string (`"swamp"`). Materials are declared once in the big `materials = { ... }` object — find the material, then grep its usages.
- Top-level world assembly is `setupExplorationWorld()` — read it to learn build ORDER (this matters, see flat zones below). Biome centers are seeded-random: `setupExplorationBiomes` places e.g. swamp at `x: -218 - random() * 10`.
- The world seed is `explorationSeed()` = `"explore-" + roomCode`. The room code is RANDOM per session (`hostOnlineGame` → `randomRoomCode()`), so biome/structure positions jitter a few units between resumes. Don't memorize world coordinates across reloads; recompute each session.

## Terrain sampler contract (the #1 source of structure bugs)

- `explorationTerrainHeight(localX, localZ)` is the single source of truth for ground height. Wrappers: `explorationGroundLocalY(x, z, offset)` (local/group coords), `explorationGroundWorldY(worldX, worldZ, offset)` (world coords; exploration group origin is `game.exploration.origin`, currently (180, 0, 0)), `setExplorationLocalGroundPosition(object, x, z, offset)`.
- NEVER hardcode a Y for anything that touches the ground. The terrain shaping (`explorationRawTerrainHeight`) gets retuned periodically (amplitudes raised twice recently; swamp basins deepened); every hardcoded Y silently breaks. The swamp boardwalk posts were at absolute `y = 0.43` from when swamp ground was ~0 — after the retune the ground was anywhere from -3.4 to +0.8 depending on seed, leaving posts floating meters in the air.
- Long objects must sample per-piece, not once at the center: sample each segment/post/ramp end at its own (x, z). Roads do this per-vertex (`createRoadRibbonGeometry`, `densifyRoadPoints`); decor should at least do it per-segment. A single 19-unit box sampled at its center floats/buries at the ends on sloped ground.
- Flat zones: `registerExplorationFlatZone(x, z, radius, blend, height, strength)` entries in `game.exploration.terrainFlatZones` lerp the sampler toward a target height. ORDER GOTCHA: the visible ground mesh is built early in `setupExplorationWorld` with only the preset zones from `setupExplorationFlatZones()`; lakes, villages and cities register MORE zones afterwards (`addExplorationVillage` adds a strength-0.94 zone). Anything sampled after those registrations (including the player's walk height) can sit above/below the rendered ground mesh near villages. Structures should bridge that visually (e.g. posts extending ~1.5 below the sampled ground).
- There is no walkable-platform physics: the player's Y is always the terrain sampler. A "walkable" deck must keep its top within ~0.25 of the sampler or the player visibly clips/floats. Colliders (`addExplorationCollider(x, z, radius, kind)`) are 2D radial blockers only — use them to block movement, never to support standing.

## Browser smoke testing

- Serve: dev server runs at `http://127.0.0.1:8791/` (also `npm run serve` → 8765). Plain static files, no build step — a reload picks up edits.
- Resume flow: front page → "Resume Game" button. The save lives in `localStorage` under `ironholdProgressV2` (key exported from `src/content/rpg.js`); `exploration.position` is the player's LOCAL position. The game saves on `beforeunload`, so editing the save then reloading gets overwritten — patch `Storage.prototype.setItem`/`getItem` from the console instead (CDP `Runtime.evaluate` runs in the MAIN world, so prototype patches and `window` hooks reach game code).
- Error hooking before clicking Resume: `window.__errs = []; window.addEventListener('error', e => __errs.push(e.message));` plus wrapping `console.error`. Init failures log `"Ironhold init failed"`.
- Screenshot workflow: screenshot after every navigation/teleport; the scene is dark in swamp/night — judge geometry by silhouettes and shadows.
- rAF throttling gotcha: in a background/IDE browser tab, `requestAnimationFrame` is throttled or suspended, and `tick()` clamps `dt` to 0.034s. Anything time-based (camera turn via Q/E, walking via WASD, FPS measurements) crawls or stalls — FPS numbers from a backgrounded tab are meaningless, and "hold key for N ms" automation does almost nothing. Screenshots force a frame, which is often the only reason the sim advances at all.
- Synthetic input works: the game reads `event.code` from `window` keydown/keyup, so `window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))` moves the player — but see the throttling gotcha. The game pauses on window blur/visibility-hidden (`pauseForControlLoss`), though the IDE browser tab doesn't seem to trigger it.

## Traveling to a biome for verification

- Biomes (minimap shows them): Mistfen swamp ≈ local (-220, 170), Dragonspine mountain ≈ (200, 160), desert and briar in the other quadrants; Crownford ≈ (12, 132); homestead at (0, 0). Local coords = world coords minus `game.exploration.origin`.
- There is NO built-in teleport/debug console (gap worth adding behind a flag). Two workarounds:
  1. Save-position teleport: rewrite `exploration.position` in `ironholdProgressV2` and resume. Must beat the `beforeunload` save — patch `Storage.prototype.getItem` to override the position at read time, then reload and click Resume.
  2. Temporary code hook (faster iteration): drop `window.__dbgTeleport = (x, z, yaw) => { player.position.copy(explorationToWorld(x, z)); player.group.position.copy(player.position); if (Number.isFinite(yaw)) game.cameraYaw = yaw; }` inside any module-scope setup function (e.g. the biome marker function you're already editing), call it from the console, REMOVE IT before finishing.
- Because the seed changes per session, find structures at runtime: log their computed position from the construction code into `localStorage` (temp line), read it from the console, teleport there. Camera: `forwardFromYaw(yaw)` is `(-sin yaw, -cos yaw)` (yaw 0 looks toward -z); to face a target, set `game.cameraYaw = atan2(-dx, -dz)` where (dx, dz) is the direction you want to look.

## Verification baseline

- `npm run check` — syntax-checks the three JS entry files. Run before finishing, after removing temp debug code.
- `git diff --check` — whitespace errors.
- Visual check in browser (see above) + confirm `window.__errs` stays empty on resume.
- Collision: colliders are registered with `addExplorationCollider` next to the mesh code; if you move/resize a structure, update its collider call (radius/kind) in the same function. Walk into the structure in-browser to confirm blocking; walk over low decor to confirm it does NOT block.

## Multi-agent etiquette

- The working tree usually has UNCOMMITTED changes from other agents working in parallel. `git status` being dirty is normal — never revert, stash, or `checkout --` anything you didn't author.
- Re-read the exact code region immediately before every edit (another agent may have changed it since your last read). Keep `StrReplace` anchors tight.
- Stay in your assigned scope (e.g. one structure/system); read shared code freely but don't edit enemy/audio/terrain/etc. if it's someone else's lane.
- Don't commit, don't deploy, don't run destructive git commands. Leave the tree dirty for the coordinator.
- Remove every temporary debug hook (`window.__dbg*`, `localStorage.setItem("debug*")`, extra logging) before finishing; grep for `__dbg|debug` in your touched files to confirm.
