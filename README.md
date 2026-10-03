# Real Racing

**Live demo:** https://real-racing.netlify.app/

## Overview
Real Racing is a 3D web app where the user builds a slot-car track piece by piece. Each key adds one of 11 segment types: straights, curves, ascending and descending helices, loops and gentle slopes. A car then drives along the finished track at a speed the user controls.

The project was developed in the University of Bologna PCTO programme "Metodi Matematici per l'Animazione" (2023/24). It is built with JavaScript and [Babylon.js](https://www.babylonjs.com/) (scene, shadows, orbit and free camera).

## Controls
- A key per segment type adds that piece to the end of the track (the in-app panel, toggled with `I`, lists them all).
- `C` closes the circuit automatically.
- `V` switches between the orbit camera and the free camera.
- A speed display shows the car's speed, which the user controls.

## The mathematics

### Geometry of the pieces
Each segment is built with rotations and pivot transformations, so the end of one piece lines up exactly with the start of the next (same position, same heading).

### Collision detection
A spatial hash divides the scene into a grid, so a new piece is only checked against nearby pieces instead of all of them. This avoids comparing every pair of pieces (O(n²)).

### Automatic circuit closure (key `C`)
The program has to find pieces that bring the track back to the starting point with the right heading. It works in three stages:

1. **Beam search with A\*** looks for a sequence of existing segment types that closes the loop, keeping only the most promising partial tracks at each step.
2. **Dubins paths** are the fallback: the shortest path between two oriented points for a vehicle with a minimum turning radius. They are built from circular arcs (L, R) and straight lines (S), and the four combinations tried are LSL, RSR, LSR and RSL.
3. **Cubic Bézier curve** is the last resort, when the other two do not give a valid result:

   B(t) = (1−t)³·P₀ + 3(1−t)²t·P₁ + 3(1−t)t²·P₂ + t³·P₃,  t ∈ [0, 1]

   P₀ and P₃ are the two endpoints. P₁ and P₂ are placed along the headings at the start and at the end, so the curve joins the track smoothly.

### Motion along a curve
The car follows a parametrised curve. Its velocity is the derivative of the position vector with respect to the parameter:

B′(t) = 3(1−t)²(P₁−P₀) + 6(1−t)t(P₂−P₁) + 3t²(P₃−P₂)

## Code
- [`index.html`](index.html) loads Babylon.js, its loaders and PEP.js, then the script below.
- [`real_racing_4_fine.js`](real_racing_4_fine.js) is the full program: segments, collision hash, circuit closure and the car.
- [`real_racing_4.js`](real_racing_4.js) is an earlier version of the scene, and [`test_closing.html`](test_closing.html) a small test page.
- `assets/` holds the car model (`s15.glb`), road textures and a road sign.

## Run it locally
Serve the folder with any static server (for example `python -m http.server`) and open `index.html`. Opening the file directly may block the 3D model from loading.
