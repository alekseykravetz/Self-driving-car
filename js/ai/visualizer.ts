/**
 * Provides static methods to draw a NeuralNetwork on an HTML Canvas.
 */
class Visualizer {
  /**
   * Draws the entire neural network structure onto the canvas context.
   * @param ctx - The 2D rendering context of the canvas.
   * @param network - The NeuralNetwork instance to draw.
   */
  static drawNetwork(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
  ): void {
    // Define margins and calculate drawing area dimensions
    const margin: number = 50;
    const left: number = margin;
    const top: number = margin;
    const width: number = ctx.canvas.width - margin * 2;
    const height: number = ctx.canvas.height - margin * 2;

    // Calculate the vertical space allocated for each level
    const levelHeight: number = height / network.levels.length;

    // Draw levels from bottom (output) to top (input)
    // This ensures connections are drawn under the nodes of the next layer up
    for (let i: number = network.levels.length - 1; i >= 0; i--) {
      // Calculate the vertical position (top edge) of the current level
      const levelTop: number =
        top +
        lerp(
          height - levelHeight, // Bottom-most position
          0, // Top-most position
          // Interpolation factor based on level index
          network.levels.length === 1 ? 0.5 : i / (network.levels.length - 1),
        );

      // Set line style for drawing level boundaries (optional visualization aid)
      ctx.setLineDash([7, 3]); // Dashed line

      // Draw the current level
      Visualizer.drawLevel(
        ctx,
        network.levels[i],
        left,
        levelTop,
        width,
        levelHeight,
        // Provide labels only for the output layer (last layer, index network.levels.length - 1)
        i === network.levels.length - 1 ? ['↥', '↤', '↦', '↧'] : [], // Example labels ['⬆️', '⬅️', '➡️', '⬇️']
      );
      ctx.setLineDash([]); // Reset line dash
    }
  }

  /**
   * Draws a single level of the neural network.
   * @param ctx - The 2D rendering context.
   * @param level - The Level instance to draw.
   * @param left - The left boundary for drawing the level.
   * @param top - The top boundary for drawing the level.
   * @param width - The width allocated for drawing the level.
   * @param height - The height allocated for drawing the level.
   * @param outputLabels - An array of strings to label the output neurons (if any).
   */
  static drawLevel(
    ctx: CanvasRenderingContext2D,
    level: Level,
    left: number,
    top: number,
    width: number,
    height: number,
    outputLabels: string[],
  ): void {
    // Calculate right and bottom boundaries based on inputs
    const right: number = left + width;
    const bottom: number = top + height;

    // Destructure level properties for easier access
    const { inputs, outputs, weights, biases } = level;
    const nodeRadius: number = 18; // Radius of the neuron visualization

    // --- Draw connections (weights) ---
    // Iterate through each input neuron of this level
    for (let i: number = 0; i < inputs.length; i++) {
      // Iterate through each output neuron of this level
      for (let j: number = 0; j < outputs.length; j++) {
        ctx.beginPath();
        // Line starts from the input node position (bottom of the level drawing area)
        ctx.moveTo(
          Visualizer.getNodeX(inputs, i, left, right), // x-coord of input node i
          bottom, // y-coord (bottom edge)
        );
        // Line ends at the output node position (top of the level drawing area)
        ctx.lineTo(
          Visualizer.getNodeX(outputs, j, left, right), // x-coord of output node j
          top, // y-coord (top edge)
        );
        // Style the connection line based on the weight value
        ctx.lineWidth = 2;
        // Use the assumed getRGBA function to color based on weight
        ctx.strokeStyle = getRGBA(weights[i][j]);
        ctx.stroke();
      }
    }

    // --- Draw input nodes --- (Represented at the bottom of the level's area)
    for (let i: number = 0; i < inputs.length; i++) {
      const x: number = Visualizer.getNodeX(inputs, i, left, right);
      // Draw outer circle (border)
      ctx.beginPath();
      ctx.arc(x, bottom, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'black';
      ctx.fill();
      // Draw inner circle (representing input value)
      ctx.beginPath();
      ctx.arc(x, bottom, nodeRadius * 0.6, 0, Math.PI * 2);
      // Use the assumed getRGBA function to color based on input activation
      ctx.fillStyle = getRGBA(inputs[i]);
      ctx.fill();
    }

    // --- Draw output nodes --- (Represented at the top of the level's area)
    for (let i: number = 0; i < outputs.length; i++) {
      const x: number = Visualizer.getNodeX(outputs, i, left, right);
      // Draw outer circle (border)
      ctx.beginPath();
      ctx.arc(x, top, nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'black';
      ctx.fill();
      // Draw inner circle (representing output value)
      ctx.beginPath();
      ctx.arc(x, top, nodeRadius * 0.6, 0, Math.PI * 2);
      // Use the assumed getRGBA function to color based on output activation
      ctx.fillStyle = getRGBA(outputs[i]);
      ctx.fill();

      // Draw bias visualization (dashed circle around the output node)
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.arc(x, top, nodeRadius * 0.8, 0, Math.PI * 2);
      // Use the assumed getRGBA function to color based on bias value
      ctx.strokeStyle = getRGBA(biases[i]);
      ctx.setLineDash([3, 3]); // Dashed line for bias
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // Draw output labels if provided
      if (outputLabels[i]) {
        ctx.beginPath();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black'; // Label color
        ctx.strokeStyle = 'white'; // Label outline for visibility
        ctx.font = nodeRadius * 1.2 + 'px Arial'; // Adjust font size
        // Draw the label text centered on the node
        ctx.fillText(outputLabels[i], x, top);
        ctx.lineWidth = 0.5;
        ctx.strokeText(outputLabels[i], x, top); // Draw outline
      }
    }
  }

  /**
   * Calculates the horizontal position (x-coordinate) for a node within a level.
   * Distributes nodes evenly between the left and right boundaries.
   * Marked as private static as it's an internal utility method.
   * @param nodes - The array of nodes (inputs or outputs) for the level.
   * @param index - The index of the specific node.
   * @param left - The left boundary coordinate.
   * @param right - The right boundary coordinate.
   * @returns The calculated x-coordinate for the node.
   */
  private static getNodeX(
    nodes: number[],
    index: number,
    left: number,
    right: number,
  ): number {
    // Use linear interpolation to find the position
    return lerp(
      left, // Start position
      right, // End position
      // Calculate interpolation factor:
      // If only one node, place it in the center (0.5).
      // Otherwise, distribute nodes evenly from 0 to 1 based on index.
      nodes.length === 1 ? 0.5 : index / (nodes.length - 1),
    );
  }
}
