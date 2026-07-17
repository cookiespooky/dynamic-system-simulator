# Dynamic System Simulator

A browser-only mathematical dynamic network simulator designed for GitHub Pages and mobile interaction.

## Current prototype

- 200 nodes with four dimensionless parameters
- three initial groups
- similarity-based dynamic links
- neighbor convergence plus random drift
- play, pause, single-step and x1/x10/x100 controls
- touch/mouse pan and pinch zoom
- node selection and P1 intervention
- live mathematical summary
- responsive dark monochrome canvas UI
- no backend and no framework

Open `index.html` through GitHub Pages or any static HTTP server.

## Architecture direction

The current build is deliberately dependency-free. The next iteration should move the simulation loop into a Web Worker, introduce seeded random generation, declarative parameter/rule schemas, snapshots and timeline analysis while keeping rendering and UI separate from the mathematical engine.
