import type { Preview } from '@storybook/web-components';

// Design-system foundations + the atoms we showcase in stories.
import '../styles/tokens.css';
import '../styles/atoms/_base.css';
import '../styles/atoms/_button.css';
import '../styles/atoms/_input.css';
import '../styles/atoms/_label.css';
import '../styles/atoms/_badge.css';
import '../styles/atoms/_key-indicator.css';
import '../styles/atoms/_toolbar-btn.css';
import '../styles/atoms/_icon.css';

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
          'Project Views',
        ],
      },
    },
  },
};

export default preview;
