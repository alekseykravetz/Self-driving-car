import type { Preview } from '@storybook/web-components';

// The full atomic-design stylesheet: tokens + every atom, molecule and common
// organism. Loading the shared entry point (the same one every app page uses)
// keeps Storybook visually identical to production and means new component
// styles show up automatically without touching this file.
import '../styles/index.css';
// World-editor-panel lives outside index.css's "common" set on some pages, so
// pull its stylesheet in explicitly for the organism stories.
import '../styles/organisms/_world-editor-panel.css';

// Register the <app-icon> custom element (self-registers on import).
import '../ts/ui/atoms/appIcon.js';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#0f0f14' },
        { name: 'surface', value: '#17171e' },
        { name: 'light', value: '#e8e8e8' },
      ],
    },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Icons',
          ['Gallery', 'Playground', 'Animation Reference'],
          'Design System',
          'Atoms',
          'Molecules',
          'Organisms',
          'Project Views',
        ],
      },
    },
  },
};

export default preview;
