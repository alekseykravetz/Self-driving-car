import { Segment } from '../../math/primitives/segment.js';
import { formatMetersFromWorldPixels } from '../../math/worldUnits.js';
import { getNearestPoint, subtract, normalize, perpendicular, scale, add, formatDegrees, } from '../../math/utils.js';
import { drawPoint } from '../../rendering/pointRenderer.js';
import { drawSegment } from '../../rendering/segmentRenderer.js';
export class GraphEditor {
    #viewport;
    #canvas;
    #graph;
    #ctx;
    #selected = null;
    #hovered = null;
    #dragging = false;
    #mouse = null; // Current mouse position (relative to viewport/canvas)
    #isOneWay = false;
    #isSeparated = false;
    #keyboardManager = null;
    // Temporary points for finding shortest path operation
    #startPoint = null;
    #endPoint = null;
    shortestPath = null;
    #boundMouseDown;
    #boundMouseMove;
    #boundMouseUp;
    #boundContextMenu;
    #bindings;
    constructor(viewport, graph) {
        this.#viewport = viewport;
        this.#canvas = viewport.canvas;
        this.#graph = graph;
        this.#ctx = this.#canvas.getContext('2d');
        this.#boundMouseDown = this.#handleMouseDown.bind(this);
        this.#boundMouseMove = this.#handleMouseMove.bind(this);
        this.#boundMouseUp = () => {
            this.#dragging = false;
        };
        this.#boundContextMenu = (e) => e.preventDefault();
        this.#bindings = this.#buildBindings();
    }
    #addEventListeners() {
        this.#canvas.addEventListener('mousedown', this.#boundMouseDown);
        this.#canvas.addEventListener('mousemove', this.#boundMouseMove);
        this.#canvas.addEventListener('mouseup', this.#boundMouseUp);
        this.#canvas.addEventListener('contextmenu', this.#boundContextMenu);
    }
    #removeEventListeners() {
        this.#canvas.removeEventListener('mousedown', this.#boundMouseDown);
        this.#canvas.removeEventListener('mousemove', this.#boundMouseMove);
        this.#canvas.removeEventListener('mouseup', this.#boundMouseUp);
        this.#canvas.removeEventListener('contextmenu', this.#boundContextMenu);
    }
    enable() {
        this.#addEventListeners();
        this.#keyboardManager?.pushBindings(this.#bindings);
    }
    /**
     * Connect the {@link KeyboardManager} so this editor's shortcuts are
     * registered while the editor is enabled.
     */
    bindKeyboard(km) {
        this.#keyboardManager = km;
    }
    disable() {
        this.#removeEventListeners();
        this.#keyboardManager?.popBindings();
        this.#selected = null;
        this.#hovered = null;
        this.#dragging = false;
        this.#startPoint = null;
        this.#endPoint = null;
    }
    #buildBindings() {
        return [
            {
                id: 'keyS',
                key: 's',
                label: 'S',
                title: 'S — Set path start point (hover a point)',
                group: 'Graph',
                kind: 'momentary',
                handler: {
                    onKeyDown: () => {
                        if (this.#mouse)
                            this.#startPoint = this.#mouse;
                        this.#computeShortestPath();
                    },
                },
            },
            {
                id: 'keyE',
                key: 'e',
                label: 'E',
                title: 'E — Set path end point (hover a point)',
                group: 'Graph',
                kind: 'momentary',
                handler: {
                    onKeyDown: () => {
                        if (this.#mouse)
                            this.#endPoint = this.#mouse;
                        this.#computeShortestPath();
                    },
                },
            },
            {
                id: 'keyC',
                key: 'c',
                label: 'C',
                title: 'C — Clear computed path and start/end points',
                group: 'Graph',
                kind: 'momentary',
                handler: {
                    onKeyDown: () => {
                        this.#startPoint = null;
                        this.#endPoint = null;
                        this.shortestPath = null;
                    },
                },
            },
            {
                id: 'keyO',
                key: 'o',
                label: 'O',
                title: 'O — One-way road mode. Hold while creating a segment, or click to latch it on permanently.',
                group: 'Graph',
                kind: 'toggle',
                toggle: {
                    onActivate: () => {
                        this.#isOneWay = true;
                    },
                    onDeactivate: () => {
                        this.#isOneWay = false;
                    },
                },
            },
            {
                id: 'keyH',
                key: 'h',
                label: 'H',
                title: 'H — Hard-separation road mode (solid centre line). Hold while creating a segment, or click to latch it on permanently.',
                group: 'Graph',
                kind: 'toggle',
                toggle: {
                    onActivate: () => {
                        this.#isSeparated = true;
                    },
                    onDeactivate: () => {
                        this.#isSeparated = false;
                    },
                },
            },
        ];
    }
    #computeShortestPath() {
        if (this.#startPoint && this.#endPoint) {
            this.shortestPath = this.#graph.getShortestPath(this.#startPoint, this.#endPoint);
        }
    }
    // Handles mouse movement over the canvas. Updates hovered state and drags selected points.
    #handleMouseMove(e) {
        this.#mouse = this.#viewport.getMouse(e, true);
        this.#hovered = getNearestPoint(this.#mouse, this.#graph.points, 10 * this.#viewport.zoom);
        if (this.#dragging && this.#selected) {
            // Update the position of the selected point to the current mouse position
            this.#selected.x = this.#mouse.x;
            this.#selected.y = this.#mouse.y;
        }
    }
    // Handles mouse button presses on the canvas. Manages point selection, creation, and removal.
    #handleMouseDown(e) {
        // Right-click (button === 2)
        if (e.button === 2) {
            if (this.#selected) {
                // If a point is selected, deselect it on right-click
                this.#selected = null;
            }
            else if (this.#hovered) {
                // If hovering over a point and nothing is selected, remove the hovered point
                this.#removePoint(this.#hovered);
            }
        }
        // Left-click (button === 0)
        if (e.button === 0) {
            if (this.#mouse) {
                if (this.#hovered) {
                    // If clicking on an existing point (hovered)
                    this.#selectPoint(this.#hovered); // Select it (and try to add segment if another was selected)
                    this.#dragging = true; // Start dragging the selected point
                    return; // Prevent adding a new point
                }
                // If clicking on empty space, add a new point at the mouse position
                this.#graph.addPoint(this.#mouse);
                // Select the newly added point
                this.#selectPoint(this.#mouse);
                // The new point is now also the hovered point
                this.#hovered = this.#mouse;
            }
        }
    }
    /**
     * Selects a point. If another point was previously selected, attempts to add a segment between them.
     * @param point - The point to select.
     */
    #selectPoint(point) {
        if (this.#selected && this.#selected !== point) {
            // If a point was already selected, try to create a segment to the new point
            this.#graph.tryAddSegment(new Segment(this.#selected, point, this.#isOneWay, this.#isSeparated));
        }
        this.#selected = point;
    }
    #removePoint(point) {
        this.#graph.removePoint(point);
        this.#hovered = null;
        if (this.#selected === point) {
            this.#selected = null;
        }
    }
    dispose() {
        this.#graph.dispose();
        this.#selected = null;
        this.#hovered = null;
        this.#dragging = false;
        this.#mouse = null;
        this.shortestPath = null;
        this.#startPoint = null;
        this.#endPoint = null;
    }
    // todo: change name to draw in all editors
    // Renders the graph and editor-specific visuals (hovered, selected points, intent line) onto the canvas.
    display() {
        for (const seg of this.#graph.segments) {
            drawSegment(this.#ctx, seg);
        }
        for (const point of this.#graph.points) {
            drawPoint(this.#ctx, point);
        }
        if (this.#hovered) {
            drawPoint(this.#ctx, this.#hovered, { fill: true });
        }
        if (this.#selected) {
            const intent = this.#hovered ?? this.#mouse;
            const segment = new Segment(this.#selected, intent);
            drawSegment(this.#ctx, segment, {
                dash: [3, 3],
            });
            this.#drawIntentMeasurements(segment);
            drawPoint(this.#ctx, this.#selected, { outline: true });
        }
        if (this.shortestPath) {
            this.shortestPath.forEach((seg) => {
                drawSegment(this.#ctx, seg, { color: 'red', width: 8 });
            });
        }
    }
    #drawIntentMeasurements(segment) {
        const lengthPx = segment.length();
        if (lengthPx < 1)
            return;
        const dir = subtract(segment.p2, segment.p1);
        const angleFromStart = Math.atan2(dir.y, dir.x);
        const label = `${formatMetersFromWorldPixels(lengthPx)}  ${formatDegrees(angleFromStart)}`;
        const paddingX = 8;
        const paddingY = 5;
        const gap = 12 * this.#viewport.zoom;
        const fontSize = 13 * this.#viewport.zoom;
        const normal = perpendicular(normalize(dir));
        const anchor = add(segment.p2, scale(normal, gap));
        this.#ctx.save();
        this.#ctx.font = `${fontSize}px Arial`;
        this.#ctx.textBaseline = 'middle';
        const width = this.#ctx.measureText(label).width + paddingX * 2;
        const height = fontSize + paddingY * 2;
        const x = anchor.x - width / 2;
        const y = anchor.y - height / 2;
        this.#ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        this.#ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
        this.#ctx.lineWidth = 1 * this.#viewport.zoom;
        this.#ctx.beginPath();
        this.#ctx.roundRect(x, y, width, height, 4 * this.#viewport.zoom);
        this.#ctx.fill();
        this.#ctx.stroke();
        this.#ctx.fillStyle = '#111';
        this.#ctx.fillText(label, x + paddingX, anchor.y);
        this.#ctx.restore();
    }
}
