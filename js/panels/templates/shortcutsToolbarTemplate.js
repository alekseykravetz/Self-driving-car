'use strict';
/**
 * Template for <shortcuts-toolbar>. The toolbar renders its key indicators
 * dynamically via `setShortcuts()`, so the static template is just the empty
 * groups container (kept as a named const to mirror the other toolbar panels
 * and stay registered with eslint).
 */
const SHORTCUTS_TOOLBAR_TEMPLATE = `
    <div class="shortcuts-groups"></div>
`;
