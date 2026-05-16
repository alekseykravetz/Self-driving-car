# Simulators & Training Environments

The project includes several specialized simulators located in `ts/simulators/` and `ts/ai-training/`.

## Main Simulator (`ts/ai-training/simulator.ts`)

The primary environment for training autonomous cars using genetic algorithms.

- **Goal**: Maximize the distance traveled by cars in a complex environment.
- **Visualization**: Shows the entire world, all cars in the current generation, and the neural network of the "best" car.
- **Features**: Supporting saving/loading brains, adjusting mutation rates, and toggling visual layers (sensors, network).

## Simple Road Simulator (`ts/ai-training/simpleRoadSimulator.ts`)

A simplified version of the simulator focused on basic road-following tasks.

- **Usage**: Good for initial testing of car physics and basic neural network configurations.

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
