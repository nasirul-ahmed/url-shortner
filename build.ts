import { build } from 'esbuild';
import { clean } from 'esbuild-plugin-clean';
import esbuildPluginTsc from 'esbuild-plugin-tsc';
import { dependencies, devDependencies } from './package.json';

build({
  entryPoints: ['src/app.ts'],
  outdir: 'dist',
  platform: 'node',
  external: Object.keys(dependencies).concat(Object.keys(devDependencies)),
  bundle: true,
  minify: true,
  plugins: [
    clean({
      patterns: ['./dist/*'],
    }),
    esbuildPluginTsc({ force: true }),
    // esbuildPluginPino({ transports: [] }),
  ],
  sourcemap: 'inline',
});
