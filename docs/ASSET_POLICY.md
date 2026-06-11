# Ironhold Asset And Texture Policy

This policy covers visual assets, textures, generated bitmaps, audio files, and any future non-code resources.

## Goals

- Improve model readability and material richness without losing Ironhold's low-poly procedural identity.
- Keep Firebase deployment straightforward and predictable.
- Keep performance stable on desktop during Exploration, Crownford traversal, and arena waves.
- Avoid licensing uncertainty.

## Preferred Asset Order

1. **Procedural textures in code**
   - Best for terrain, simple noise, cloth weave, dirt, grass, stylized stone, UI fills, and generated biome variation.
   - Use `CanvasTexture` or equivalent generated textures when the texture can stay compact and stylized.

2. **Generated bitmap textures**
   - Best for custom stylized materials: Crownford banners, arena stone, dragon scales, spider carapace, wizard robe fabric, shield crests, signs, icons, and quest markers.
   - Generated assets should still be optimized before commit.

3. **External free texture sources**
   - Use only when they provide a clear quality gain over procedural generation.
   - Prefer CC0/public-domain assets.
   - Avoid GPL, CC-BY-SA, or unclear licenses for game assets unless the tradeoff is deliberately approved.
   - CC-BY assets are allowed only if attribution is tracked and the asset is worth the maintenance cost.

## Candidate External Sources

- Poly Haven (`https://polyhaven.com/`): good candidate for CC0 PBR materials.
- ambientCG (`https://ambientcg.com/`): good candidate for CC0 PBR materials.
- OpenGameArt (`https://opengameart.org/`): useful, but every asset must be checked individually because licenses vary.

## File And Performance Budgets

- Prefer small, stylized textures over high-resolution realism.
- Start with diffuse/albedo only unless normal/roughness maps are visibly worth the cost.
- Keep most material textures at `256x256` or `512x512`.
- Use `1024x1024` only for highly visible shared atlases.
- Prefer texture atlases for related props over many individual files.
- Reuse materials aggressively across repeated houses, NPCs, enemies, rocks, trees, and city structures.
- Avoid large displacement maps and high-resolution PBR stacks in the browser build.

## Repo Rules

- Store committed image assets under `assets/textures/` or `assets/audio/` when those directories exist.
- Record non-generated external assets in an asset manifest before shipping.
- The manifest should include source URL, author if applicable, license, download date, modified status, and attribution text when required.
- Generated assets should identify the generation workflow or prompt summary when useful.
- Firebase Hosting may publish optimized assets, but planning docs and raw source references remain excluded.

## Implementation Guidance

- Texture model cleanup should happen after scale/proportion fixes, so the texture work supports the final silhouettes.
- Crownford should get the first focused material pass: stone, roof tile, banners, timber, road, arena sand, and church/castle accents.
- Characters should get small detail textures only where they improve recognition: robes, armor panels, shields, capes, barbarian paint, spider markings, and dragon scales.
- Texture changes require a performance note in the final summary.

## Acceptance

- The texture improves readability or atmosphere from the default third-person camera.
- The asset license is known and compatible.
- File size and GPU cost are intentional.
- No texture causes obvious tiling, shimmering, muddy color, or broken UV/projection on the model.
- The game still loads quickly from Firebase and remains smooth during Crownford traversal and arena waves.
