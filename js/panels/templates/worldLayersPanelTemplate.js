'use strict';
/**
 * Template for <world-layers-panel>. The panel renders its layer toggle buttons
 * dynamically in `connectedCallback`, so the static template is just the empty
 * container (kept as a named const to mirror the other toolbar panels and stay
 * registered with eslint).
 */
const WORLD_LAYERS_PANEL_TEMPLATE = `
    <div class="world-layers-groups"></div>
`;
