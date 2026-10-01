# Performance Contracts And Verification

The September 30, 2026 performance pass reduces scene submission, shadow work, repeated HUD updates, and temporary resource growth. Preserve these contracts when extending the game.

## Rendering And Simulation Contracts

- Desktop render resolution is capped at device pixel ratio 1.5 and three million drawing-buffer pixels. Phones/tablets use DPR 1.25 and 1.2 million pixels, detected through coarse-pointer/touch capability or the first touch gesture. These caps do not scale the CSS viewport or touch targets.
- Use one directional sun shadow map, focused around the player with a ±50-unit orthographic extent: 2048×2048 on desktop and 1024×1024 on touch devices. Torch point lights do not cast shadows. Mobile panels omit backdrop blur.
- Static scenery batches use 32-unit cells in Exploration and 24-unit cells in the arena and dungeon. Preserve source materials, geometry, transforms, shadow flags, and render ordering. Exclude mutable or live-raycast roots: NPCs, quest items, herb nodes, mounts, animated torch flames, and Bellwater's ribbon, back sheet, and foam. Transparent and unsupported art remains separate.
- Dispose generated batch geometry before rebuilding a world. Original cached geometry and shared materials remain owned by their existing systems; batch disposal restores the original hierarchy.
- Enemy visibility is a local rendering decision. Distance and activity culling must not disable authoritative AI, combat, rewards, or snapshots for other players.
- Enemy separation builds its broad phase lazily. Below 128 living eligible enemies it uses a direct scan; larger populations use the spatial grid. Sequential position updates and neighbor force order preserve the original simulation result.
- Projectile factories list their private geometries and materials explicitly. Hit, expiry, snapshot removal, activity cleanup, and reset dispose only those owned resources. Cached arrow geometry and shared materials must survive.
- Impact particles reuse one geometry and a pool capped at 256 active particles. Expiry and reset return particles to the pool.
- Routine HUD updates run at 15 Hz, with existing event updates retained. Potion inventory rendering skips unchanged inventory, unlock, and herb state.

## Controlled Before/After Sample

The in-app browser used a 1280×720 CSS viewport, seed `explore-performance-fixed`, home camera yaw 0.35 and pitch −0.2, 60 warmup frames, then 240 sampled frames. Only one sample was active at a time. Baseline and updated builds used the same scene; the rendering pixel-ratio cap changed from 1.7 to 1.5.

| Home scene metric | Baseline | Updated |
| --- | ---: | ---: |
| Mean frame CPU work | 14.87 ms | 5.17 ms |
| Mean render submission CPU time | 14.16 ms | 4.55 ms |
| Draw calls | 2,685 | 1,009 |
| Submitted triangles | 375,408 | 294,157 |
| Scene nodes | 27,149 | 10,950 |

The dungeon sample improved from 3.58 to 2.49 ms mean frame CPU work, with draw calls changing from 267 to 261. An updated real host session in room 2986, with no peer during the timing sample, measured 5.39 ms mean frame CPU work, 4.73 ms render submission, and 1,039 draw calls.

Render submission time is CPU time inside the renderer and is included in frame CPU work. These measurements do not measure GPU execution or guarantee a frame rate on other hardware. The result includes the resolution-cap change alongside batching, culling, and CPU optimizations.

## Verification Evidence

- Nineteen automated tests and the syntax checks passed. Static batching also passed transform checks against the game's actual Three.js 0.160 runtime, including compound rotated/nonuniform hierarchies.
- After warmup, ten resource-stress cycles exercised lightning, flaming arrows, fire, venom, hex, and enemy arrows, plus requests for 512 impact particles. Geometry buffers returned to 1,412 after every cycle; active particles peaked at 256 and returned to zero.
- Two clients subsequently connected to the room; remote combat damage and herb pickup worked. Additional smoke checks covered night rendering, elevated terrain, dungeon entry, arena entry/pause/resume/yield, and the ordinary preview's performance overlay. Browser consoles were clear.

The resource check covers these temporary projectile and particle paths. It does not establish that every existing resource lifecycle is leak-free. Maximum-wave performance and representative hardware validation remain follow-up work.
