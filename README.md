# Real Racing 4

A 3D racing prototype in the browser, built as a university project (University of Bologna).

**Live demo:** https://real-racing.netlify.app/

## What is here
- A 3D scene rendered with [Babylon.js](https://www.babylonjs.com/): a car model (`assets/s15.glb`), road textures and a road sign.
- [`real_racing_4_fine.js`](real_racing_4_fine.js) is the script the page loads (orbit and free camera modes, car speed, shadows).
- [`real_racing_4.js`](real_racing_4.js) is the earlier version of the scene (free camera moved with W/A/S/D, Q/E for up/down). [`test_closing.html`](test_closing.html) is a small test page.

## Tech
JavaScript, Babylon.js (with its loaders) and PEP.js for pointer events. No build step.

## Run it
Serve the folder with any static server (for example `python -m http.server`) and open `index.html`. Opening the file directly may block the 3D model from loading.
