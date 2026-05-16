# Self-driving Car Project Instructions

This project is a simulation of a self-driving car using TypeScript. It runs as a static site and uses `tsc` for compilation.

## 🏗️ Architecture

- **Math-First**: All geometric logic lives in `ts/math/`. Use existing primitives (`Point`, `Segment`, `Polygon`) instead of raw objects.
- **Physics**: Car movement is in `ts/car/car.ts`. Collision detection is polygon-based.
- **AI**: The brain is in `ts/neural-network/network.ts`. It's a feedforward network with a step activation function.
- **World**: The `World` class in `ts/world-editor/world.ts` manages the environment.

## 🛠️ Workflows

- **Compilation**: Always run `npm run start` (or `npx tsc`) after changing `.ts` files.
- **Linting**: Run `npm run lint:fix` to keep code clean.
- **Documentation**: If you add a new module or significantly change existing logic, update the corresponding file in the `docs/` directory.

## 🧪 Testing

- Currently, the project relies on visual validation in the simulator.
- For new features, verify them by running the relevant simulation in `html/simulator.html` or `html/world.html`.

## 📌 Conventions

- Prefer explicit composition over inheritance.
- Use private/protected members where appropriate.
- Maintain the static server (`serve`) workflow; do not add bundlers like Webpack or Vite unless explicitly requested.
