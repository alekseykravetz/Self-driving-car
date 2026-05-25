# Simulators & Training Environments

The project includes several specialized simulators located in `ts/simulators/` and `ts/ai-training/`, coordinated by a shared training manager.

## Reusable Training Manager (`ts/ai-training/trainingManager.ts`)

A shared control system that manages the genetic training logic and UI controls across simulators.

- **Controls**: Population size (`carCount`), pool size for crossover (`poolCount`), mutation rate (`threshold`), pause/resume, and restart controls.
- **Stats**: Live display of generation, alive count, dead count, idle count, and all-time best distance/fitness score.
- **Persistence**: Handles saving/loading the top-performing brains pool to local storage.
- **Crossover & Mutation**: Employs genetic crossover between top parents in the best pool, combined with mutation based on the threshold.

## Main Simulator (`ts/ai-training/simulator.ts`)

The primary environment for training autonomous cars using genetic algorithms on custom worlds and road maps.

- **Goal**: Maximize the distance traveled by cars in a complex environment.
- **Visualization**: Shows the entire world, all cars in the current generation (highlighting the top pool in gold and labeling ranks), and the neural network of the "best" car.
- **Features**: Powered by `TrainingManager` for full population, parameters, and restart capability. Includes custom map file loading.

## Simple Road Simulator (`ts/ai-training/simpleRoadSimulator.ts`)

A simplified version of the simulator focused on basic road-following tasks on a straight road.

- **Usage**: Good for initial testing of car physics and basic neural network configurations.
- **Features**: Powered by `TrainingManager` to support population settings, stats, and saving.

## Camera View Simulator (`ts/simulators/cameraViewSimulator.ts`)

A unique simulator that projects the car's "vision" into a simulated camera feed.

- **Concept**: Instead of abstract rays, this simulator explores how a car might navigate based on visual input.
- **Logic**: Uses the `Camera` class to render the environment from the vehicle's perspective.
- **AI Integration**: Explores the use of `camera_new_ai_ver.ts` for vision-based navigation.

## Related Components

### Viewport (`ts/viewport/viewport.ts`)

Manages the transformation (zoom, pan) between world coordinates and screen coordinates.

### Mini-Map (`ts/mini-map/miniMap.ts`)

Provides a persistent, scaled-down view of the entire world, showing the positions of the car and other entities.

### Visualizer (`ts/neural-network/visualizer.ts`)

A real-time HUD showing the internal state of the neural network driving the best car.
