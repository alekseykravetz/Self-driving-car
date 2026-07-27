import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { StorybookConfig } from '@storybook/web-components-vite';

/**
 * Storybook config for the Self-Driving-Car design system.
 *
 * The project source (`ts/`) is authored with the `nodenext` convention of
 * importing sibling modules with an explicit `.js` extension (e.g.
 * `import { x } from './foo.js'`) even though the files on disk are `.ts`.
 * Vite does not rewrite those specifiers by default, so we add a tiny `pre`
 * resolver plugin that maps a relative `*.js` import back to its `*.ts`
 * source when the `.ts` file exists. This lets stories import straight from
 * `ts/` (the source of truth) instead of the compiled `js/` output.
 */
const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx|js|jsx)'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/web-components-vite',
    options: {},
  },
  core: { disableTelemetry: true },
  async viteFinal(viteConfig) {
    viteConfig.plugins = viteConfig.plugins ?? [];
    viteConfig.plugins.push({
      name: 'resolve-nodenext-js-to-ts',
      enforce: 'pre',
      resolveId(source, importer) {
        if (
          importer &&
          source.endsWith('.js') &&
          (source.startsWith('./') || source.startsWith('../'))
        ) {
          const tsCandidate = resolve(
            dirname(importer),
            source.replace(/\.js$/, '.ts'),
          );
          if (existsSync(tsCandidate)) return tsCandidate;
        }
        return null;
      },
    });
    return viteConfig;
  },
};

export default config;
