# Car Physics & Perception

The `ts/car/` directory contains the core logic for vehicle movement, sensor simulation, and control systems.

## Car Physics (`ts/car/car.ts`)

The `Car` class implements a simplified physics model for vehicle dynamics.

### Movement Model
- **Acceleration**: Increases the speed when the "forward" control is active.
- **Friction**: Constant force that reduces speed over time, allowing the car to coast to a stop.
- **Max Speed**: Caps the vehicle's velocity.
- **Steering**: Changing the `angle` based on speed and input. Steering is more effective at higher speeds but capped to prevent unrealistic turns.
- **Polygon Representation**: The car is represented as a rectangular polygon that rotates with the vehicle's angle. This polygon is used for accurate collision detection.

### Collision Detection
In each `update()` cycle, the car's polygon is checked against all environment polygons (road borders, buildings, other cars). If an intersection is detected, the car is marked as `damaged` and stops moving.

## Perception System (`ts/car/sensors/sensor.ts`)

The `Sensor` class provides the car with environmental awareness.

### Ray Casting
- The sensor casts several "rays" (segments) in a spread around the front of the car.
- **Ray Count**: The number of sensors (e.g., 5).
- **Ray Spread**: The angle covered by the sensors.
- **Ray Length**: How far the sensors can "see".
- Each ray checks for intersections with:
    1.  `roadBorders`
    2.  `buildings`
    3.  `trafficMarkings`
    4.  Other `cars`

### Readings
For each ray, the sensor identifies the closest intersection point. The result is an "offset" (normalized distance between 0 and 1) representing how close an obstacle is in that direction. These offsets are the primary inputs for the neural network.

## Control Systems (`ts/car/controls/`)

The simulation supports several control modes:
- **`Controls`**: Standard keyboard input (WASD/Arrows).
- **`PhoneControls`**: Utilizes device orientation (tilt) for steering.
- **`CameraControls`**: Uses a camera feed and marker detection to control the car.
- **`AI`**: The car is controlled by outputs from its `NeuralNetwork`.
- **`DUMMY`**: Follows a fixed path or simple logic (used for traffic).
