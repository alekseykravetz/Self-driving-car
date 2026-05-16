# World Editor & Environment

The `ts/world-editor/` directory contains tools for designing and managing the simulation environment.

## World Generation (`ts/world-editor/world.ts`)

The `World` class acts as the central hub for the environment. It translates an abstract `Graph` of points and segments into a visual world.

### Features

- **Road Generation**: Uses `Envelope` primitives to create asphalt surfaces and white road borders.
- **Buildings**: Procedurally generated alongside roads, ensuring they don't overlap with the pavement.
- **Trees**: Distributed randomly in valid areas (not on roads or inside buildings).
- **Lane Guides**: Generated to help autonomous cars stay in their lanes.

## Markings (`ts/world-editor/markings/`)

Various traffic markings can be added to the world to influence vehicle behavior:

- **`Start`**: Defines where cars spawn.
- **`Stop`**: Standard stop lines.
- **`Yield`**: Yield markings.
- **`Crossing`**: Pedestrian crosswalks.
- **`Light`**: Traffic lights with dynamic states (Red, Green, Yellow).
- **`Parking`**: Designated parking spots.
- **`Target`**: Destination points for navigation.

## Traffic Management (`ts/world-editor/trafficManager.ts`)

The `TrafficManager` handles the dynamic elements of the world:

- **Traffic Lights**: Manages the timing and state transitions of all `Light` markings.
- **Dummy Cars**: Orchestrates the behavior of non-AI cars to simulate a realistic traffic environment.

## Editors (`ts/world-editor/editors/`)

A suite of interactive tools for world creation:

- **`GraphEditor`**: The primary tool for adding/removing points and connecting them with segments.
- **Marking Editors**: Specialized tools (e.g., `LightEditor`, `StopEditor`) for placing and configuring specific road markings.
- **`WorldEditor`**: An umbrella editor that coordinates the various sub-editors and manages viewport interaction.
