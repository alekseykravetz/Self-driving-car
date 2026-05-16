# Project Architecture

The **Self-driving-car** project is a comprehensive simulation platform designed to explore and demonstrate autonomous vehicle navigation using neural networks and genetic algorithms. The system is built with TypeScript and designed to run in a web browser without complex build tools.

## System Overview

The project is divided into several core modules, each responsible for a specific aspect of the simulation:

### 1. Mathematical Foundations (`ts/math/`)

The bedrock of the simulation, providing geometric primitives and utility functions.

- **Primitives**: `Point`, `Segment`, `Polygon`, and `Envelope` classes handle spatial logic, intersection tests, and distance calculations.
- **Graph**: Manages the network of points and segments that define the road system.
- **OSM Importer**: Allows importing real-world map data from OpenStreetMap.

### 2. Car Mechanics & Sensors (`ts/car/`)

Handles the physics and perception of the vehicles.

- **Car**: Implements movement physics (acceleration, friction, steering) and collision detection.
- **Sensors**: A ray-casting system that allows cars to "see" their environment (road borders, other cars, and markings).
- **Controls**: Supports multiple input methods, including keyboard, tilt (phone), camera-based markers, and AI.

### 3. Neural Network (`ts/neural-network/`)

The "brain" of the autonomous vehicles.

- **Network**: A multi-layer feedforward neural network.
- **Level**: Individual layers of the network with weights and biases.
- **Genetic Algorithm**: Implements mutation logic to evolve the best-performing "brains" over successive generations.
- **Visualizer**: A real-time visualization tool to inspect the neural network's internal state and activations.

### 4. World Editor & Environment (`ts/world-editor/`)

Tools for creating and managing the simulation environment.

- **World**: The main container for the environment, managing road generation, buildings, trees, and markings.
- **Editors**: Interactive tools for building the road graph, placing traffic lights, stop signs, crosswalks, and more.
- **Traffic Manager**: Orchestrates the behavior of non-player (DUMMY) cars and traffic light states.

### 5. Simulators & UI (`ts/simulators/`, `ts/viewport/`, `ts/mini-map/`)

The visual interface and simulation runners.

- **Viewport**: Handles zooming and panning for the main simulation view.
- **Mini-Map**: Provides a top-down overview of the entire world.
- **Simulators**: Specialized environments for training AI (e.g., `cameraViewSimulator`, `simpleRoadSimulator`).

## Data Flow

1. **Input**: Sensors cast rays and gather distance data from the `World`.
2. **Processing**: Sensor data (offsets) are fed into the `NeuralNetwork`.
3. **Decision**: The network outputs control signals (Forward, Left, Right, Reverse).
4. **Action**: The `Car` updates its position and orientation based on these signals and physics.
5. **Feedback**: If the car crashes, it is marked as `damaged`. The `fitness` score (distance traveled) is used for the genetic algorithm.

## Evolution Workflow

1. Spawn a generation of cars with slightly mutated brains.
2. Simulate until all cars are damaged or a time limit is reached.
3. Select the "best" car based on fitness.
4. Save the best brain and use it as the base for the next generation.
