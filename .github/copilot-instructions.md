# Copilot instructions for first-app

## Project overview

This repository is a small browser game built with plain HTML, CSS, and JavaScript. The app is intentionally dependency-free: `index.html` provides the DOM shell and canvas, `style.css` contains all visual styling, and `game.js` owns the game logic, physics, input handling, and rendering.

The project is not a framework app or a multi-package codebase. Most changes are local to a small number of files and fall into one of these buckets:

- HTML structure and UI text in `index.html`
- Presentation and layout styling in `style.css`
- Game state, physics, collisions, animation loop, and controls in `game.js`

## Build, test, and lint commands

There are no package scripts, bundlers, linters, or automated tests configured in this repository.

Use a local static server to validate browser behavior during development:

```bash
cd /workspaces/first-app
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

If you need to validate a change, reload the page and manually verify the game flow:

- movement with left/right controls
- jump behavior and platform collision
- star collection and score updates
- enemy interactions and life loss
- restart/reset flow and win/lose overlay

There is no single-test command to run because no test framework is configured.

## High-level architecture

### DOM + canvas split

`index.html` contains the game shell, HUD, start/finish overlay, and touch buttons. The canvas element (`#game`) is the rendering surface for the actual game world. The DOM layer is mostly for UI and state display, not game logic.

### Static world data

`game.js` defines the game world as a set of arrays and constants:

- `platforms`: static floor and elevated stepping platforms
- `stars`: collectible objects with positions, collection state, and animation phase
- `enemyStarts`: patrol ranges for enemies
- `WIDTH`, `HEIGHT`, `WORLD_WIDTH`, `GRAVITY`, `MOVE_SPEED`, `JUMP_SPEED`, `TOTAL_STARS`: global tuning values

These values are intentionally centralized, so gameplay tuning is usually done by editing these constants and world arrays rather than scattering numbers through the code.

### Game loop and state

The main game flow is:

- `resetGame()` initializes player state, world state, score/lives, and overlay visibility
- `frame()` computes `dt` and advances the simulation
- `update(dt)` runs movement, enemy logic, star collection, camera tracking, and win/lose checks
- `draw()` renders the background, platforms, goal, stars, enemies, and player each frame

The animation loop is driven by `requestAnimationFrame(frame)`, so changes should preserve the timing assumptions of the loop and the physics values.

### Input and player logic

Inputs are normalized into the `controls` object and consumed in `movePlayer()`. Collision and landing behavior are determined by checking the player's bounding box against platform rectangles and whether the player crossed a platform top while falling.

Enemy logic lives in `updateEnemies()`, and star collection is handled by `collectStars()`. The game reports state transitions through the message overlay (`#message`) and updates HUD text via `updateHud()`.

## Key conventions

- Keep the project dependency-free and browser-native. Do not introduce a framework, bundler, or transpile step unless there is clear repo-level intent to do so.
- Treat the game as a single-page canvas app: gameplay logic belongs in `game.js`, while presentation belongs in `style.css` and semantic structure belongs in `index.html`.
- World data is intentionally declarative. Add or adjust levels by editing the `platforms`, `stars`, and `enemyStarts` arrays rather than hardcoding behavior in multiple places.
- `resetGame()` is the canonical reset path. If a gameplay state changes, ensure it is also reset here when appropriate.
- The project copy is in Japanese. Keep user-facing strings, button labels, and overlay text consistent with the existing terminology and tone.
- Use the existing canvas drawing helpers (`roundedRect`, `drawBackground`, `drawPlatforms`, etc.) rather than creating ad hoc rendering patterns in new code.

## Repository-specific notes

- The README is intentionally minimal and does not add project tooling or a build system.
- There is no `.github/copilot-instructions.md`, `AGENTS.md`, `CLAUDE.md`, or similar repository-specific AI guidance file yet.
- Keep changes surgical and local; this repo is small and the gameplay is tightly coupled across a few files.
- UI と説明文は、日本語で表示するようにしてください。明確な例外がない限り、英語を使わないでください。
