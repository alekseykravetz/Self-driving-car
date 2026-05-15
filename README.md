# Self-driving Car Simulation

An interactive autonomous vehicle simulation platform built with TypeScript. This project explores neural networks, genetic algorithms, and procedural world generation to create a self-learning driving agent.

## 🚀 Quick Start

### Prerequisites
- Node.js (for `tsc`, `eslint`, and `serve`)

### Installation
```bash
npm install
```

### Running the App
The project uses the TypeScript compiler (`tsc`) and a static server (`serve`).

1. **Compile TypeScript**:
   ```bash
   npm run start
   ```
   (This runs `tsc --watch` to continuously compile your changes).

2. **Start the Web Server**:
   ```bash
   npx serve -p 8080
   ```
   Open [http://localhost:8080](http://localhost:8080) in your browser.

## 🛠️ Main Commands

| Command | Description |
|---------|-------------|
| `npm run start` | Start TypeScript compiler in watch mode. |
| `npm run lint:fix` | Run ESLint and fix issues. |
| `npx prettier --write .` | Format all files with Prettier. |
| `npx serve -p 8080` | Run the static web server. |

## 📖 Documentation

The project is modularized into several core components. Detailed design specifications can be found in the `docs/` directory:

- **[Project Architecture](docs/Architecture.md)**: High-level overview and system design.
- **[Mathematical Foundations](docs/Math.md)**: Geometric primitives and spatial logic.
- **[Car Physics & Perception](docs/Physics.md)**: Vehicle dynamics and ray-casting sensors.
- **[Neural Network & Evolution](docs/NeuralNetwork.md)**: Brain implementation and genetic training.
- **[World Editor & Environment](docs/WorldEditor.md)**: Procedural generation and editing tools.
- **[Simulators & Training](docs/Simulators.md)**: Overview of different simulation environments.

## 📂 Project Structure

- `ts/`: Source TypeScript files.
    - `math/`: Geometry and graph logic.
    - `car/`: Vehicle physics, sensors, and controls.
    - `neural-network/`: Brain and visualization.
    - `world-editor/`: Environment and editing tools.
    - `ai-training/`: Simulation runners.
- `html/`: Entry points for various simulation views (Simulator, World Editor, Race, etc.).
- `assets/`: Images and textures.
- `saves/`: Serialized world data and trained neural network "brains".

## 🤝 Contributing

This project is designed for several developers to collaborate. Please follow the existing coding standards:
- Use TypeScript for all logic.
- Run `npm run lint:fix` before committing.
- Document any major changes in the relevant `docs/*.md` file.
