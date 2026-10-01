# Ironhold

Ironhold is a browser-based fantasy action game with arena waves, online rooms, open-world exploration, quests, mounts, and procedural Three.js visuals.

The valley now moves through daylight, golden dusk, moonlit nights, and morning over twelve minutes of play. Stars and fireflies emerge after dusk, and online players share the host's sky.

Scenery is spatially batched, shadows follow the player, and combat effects have bounded or explicitly released GPU resources. Press `-` during play for FPS, frame CPU time, draw calls, geometry buffers, and network counters. See [performance notes](docs/PERFORMANCE.md) for measurements and tuning limits.

Phones and tablets use a left thumbstick, swipes on the world to look/aim, and labeled combat buttons. Hold the primary attack to repeat or hold Guard as a knight. Nearby interaction buttons handle talking, brewing, and riding. World opens the map, quests, gear, and potion pouch; Menu offers help, kit/mount changes, audio, and activity yield. Phone and tablet play supports landscape. Rotating upright pauses the game and shows a rotate prompt. Touch devices use a smaller rendering and shadow budget.

Full screen is available in the touch toolbar and session menu, with an exit toggle. Browsers that restrict fullscreen show instructions; iPhone users can launch Ironhold through Share → Add to Home Screen for play without browser controls. Home Screen launches use the supported web-app metadata.

Play the live game here:

https://ironhold-game.web.app/

Firebase Hosting is the supported production deployment. The old GitHub Pages URL redirects to the Firebase game.
