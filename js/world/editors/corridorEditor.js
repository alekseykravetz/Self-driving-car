import { Point } from '../../math/primitives/point.js';
import { Segment } from '../../math/primitives/segment.js';
import { Corridor } from '../corridor.js';
import { getNearestPoint } from '../../math/utils.js';
import { drawPoint } from '../../rendering/pointRenderer.js';
import { drawSegment } from '../../rendering/segmentRenderer.js';
/**
 * Authoring tool for {@link Corridor} world objects.
 *
 * Click a first graph point to set the corridor start, then a second point to
 * build a corridor along the shortest path between them and add it to the
 * world. Multiple corridors can be added. Holding/latching 't' (tunnel) builds
 * the next corridor with open ends so corridors can be chained together.
 * Right-click removes the corridor nearest the cursor (or cancels an in-progress
 * pick).
 */
export class CorridorEditor {
    #viewport;
    #world;
    #canvas;
    #ctx;
    #mouse = null;
    #hovered = null;
    #start = null;
    // Tunnel (open-ended) mode mirrors the graph editor's one-way toggle:
    // active while 't' is held OR latched via the shortcuts toolbar.
    #isOpen = false;
    #openHeld = false;
    #openLatched = false;
    #toolbar = null;
    #boundMouseDown;
    #boundMouseMove;
    #boundContextMenu;
    #boundKeyDown;
    #boundKeyUp;
    constructor(viewport, world) {
        this.#viewport = viewport;
        this.#world = world;
        this.#canvas = viewport.canvas;
        this.#ctx = this.#canvas.getContext('2d');
        this.#boundMouseDown = this.#handleMouseDown.bind(this);
        this.#boundMouseMove = this.#handleMouseMove.bind(this);
        this.#boundContextMenu = (e) => e.preventDefault();
        this.#boundKeyDown = this.#handleKeyDown.bind(this);
        this.#boundKeyUp = this.#handleKeyUp.bind(this);
    }
    /**
     * Connect the shared <shortcuts-toolbar> so the tunnel toggle ('t') can be
     * latched by clicking its indicator.
     */
    setShortcutsToolbar(toolbar) {
        this.#toolbar = toolbar;
        toolbar.setClickListener((id) => {
            if (id === 'keyT') {
                this.#openLatched = !this.#openLatched;
                this.#updateOpen();
            }
        });
        this.#updateOpen();
    }
    enable() {
        this.#canvas.addEventListener('mousedown', this.#boundMouseDown);
        this.#canvas.addEventListener('mousemove', this.#boundMouseMove);
        this.#canvas.addEventListener('contextmenu', this.#boundContextMenu);
        window.addEventListener('keydown', this.#boundKeyDown);
        window.addEventListener('keyup', this.#boundKeyUp);
    }
    disable() {
        this.#canvas.removeEventListener('mousedown', this.#boundMouseDown);
        this.#canvas.removeEventListener('mousemove', this.#boundMouseMove);
        this.#canvas.removeEventListener('contextmenu', this.#boundContextMenu);
        window.removeEventListener('keydown', this.#boundKeyDown);
        window.removeEventListener('keyup', this.#boundKeyUp);
        this.#start = null;
        this.#hovered = null;
    }
    #handleKeyDown(e) {
        if (e.key === 't') {
            this.#openHeld = true;
            this.#updateOpen();
        }
    }
    #handleKeyUp(e) {
        if (e.key === 't') {
            this.#openHeld = false;
            this.#updateOpen();
        }
    }
    #updateOpen() {
        this.#isOpen = this.#openHeld || this.#openLatched;
        this.#toolbar?.setActive('keyT', this.#isOpen);
    }
    #handleMouseMove(e) {
        this.#mouse = this.#viewport.getMouse(e, true);
        this.#hovered = getNearestPoint(this.#mouse, this.#world.graph.points, 10 * this.#viewport.zoom);
    }
    #handleMouseDown(e) {
        // Right-click: cancel in-progress pick, or remove nearest corridor.
        if (e.button === 2) {
            if (this.#start) {
                this.#start = null;
            }
            else if (this.#mouse) {
                this.#removeNearestCorridor(this.#mouse);
            }
            return;
        }
        // Left-click: pick start, then end (builds the corridor). Snaps to a graph
        // vertex when one is hovered, otherwise uses the raw cursor position so a
        // corridor can start/end anywhere along a road (matching the s/e/c tool).
        if (e.button === 0 && this.#mouse) {
            const point = this.#hovered ?? new Point(this.#mouse.x, this.#mouse.y);
            if (!this.#start) {
                this.#start = point;
            }
            else {
                this.#buildCorridor(this.#start, point);
                this.#start = null;
            }
        }
    }
    #buildCorridor(start, end) {
        const path = this.#world.graph.getShortestPath(start, end);
        if (path.length === 0)
            return;
        const corridor = Corridor.fromPath(path, this.#world.roadWidth, this.#world.roadRoundness, { openStart: this.#isOpen, openEnd: this.#isOpen });
        this.#world.addCorridor(corridor);
    }
    #removeNearestCorridor(point) {
        const threshold = this.#world.roadWidth;
        let bestIndex = -1;
        let bestDistance = Infinity;
        for (let i = 0; i < this.#world.corridors.length; i++) {
            for (const seg of this.#world.corridors[i].skeleton) {
                const d = seg.distanceToPoint(point);
                if (d < bestDistance) {
                    bestDistance = d;
                    bestIndex = i;
                }
            }
        }
        if (bestIndex !== -1 && bestDistance < threshold) {
            this.#world.corridors.splice(bestIndex, 1);
        }
    }
    display() {
        if (this.#hovered) {
            drawPoint(this.#ctx, this.#hovered, { fill: true });
        }
        if (this.#start) {
            drawPoint(this.#ctx, this.#start, { outline: true });
            if (this.#mouse) {
                drawSegment(this.#ctx, new Segment(this.#start, this.#mouse), {
                    color: 'red',
                    width: 4,
                    dash: [4, 4],
                });
            }
        }
    }
}
