'use strict';
/**
 * Template for <world-layers-toolbar>. The toolbar renders its layer toggle buttons
 * dynamically in `connectedCallback`, so the static template is just the empty
 * container (kept as a named const to mirror the other toolbar panels and stay
 * registered with eslint).
 */
const WORLD_LAYERS_TOOLBAR_TEMPLATE = `
    <div class="world-layers-groups"></div>
`;
