#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */

const { build } = require('estrella');

build({
  entry: 'src/extension.ts',
  outfile: 'dist/extension.js',
  external: [ 'vscode' ],
  target: 'node12',
  platform: 'node',
  bundle: true,
  sourcemap: true,
  loader: { '.ts': 'ts' }
});