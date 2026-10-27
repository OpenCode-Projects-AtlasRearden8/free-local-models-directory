#!/usr/bin/env node
'use strict';

/* Build scripts assemble the single offline index.html from:
     template.html + assets/styles.css + assets/app.js + models.json
   No dependencies, no network. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const PATHS = {
  template: path.join(ROOT, 'template.html'),
  styles: path.join(ROOT, 'assets', 'styles.css'),
  app: path.join(ROOT, 'assets', 'app.js'),
  models: path.join(ROOT, 'models.json'),
  output: path.join(ROOT, 'index.html')
};

function loadSources() {
  return {
    template: fs.readFileSync(PATHS.template, 'utf8'),
    styles: fs.readFileSync(PATHS.styles, 'utf8'),
    app: fs.readFileSync(PATHS.app, 'utf8'),
    models: JSON.parse(fs.readFileSync(PATHS.models, 'utf8'))
  };
}

/* Inline JSON goes into <script type="application/json">. Escaping "<"
   prevents "</script" from appearing inside the payload while remaining
   valid JSON - it still parses back to the identical object. */
function embedJson(models) {
  return JSON.stringify(models, null, 2).replace(/</g, '\\u003c');
}

function validateSources(sources) {
  if (!sources.template.includes('%%STYLES%%')) {
    throw new Error('template.html is missing the %%STYLES%% marker');
  }
  if (!sources.template.includes('%%MODELS_JSON%%')) {
    throw new Error('template.html is missing the %%MODELS_JSON%% marker');
  }
  if (!sources.template.includes('%%APP_JS%%')) {
    throw new Error('template.html is missing the %%APP_JS%% marker');
  }
  if (/<\/script/i.test(sources.app)) {
    throw new Error('assets/app.js must not contain a literal closing script tag');
  }
  if (/<\/style/i.test(sources.styles)) {
    throw new Error('assets/styles.css must not contain a literal closing style tag');
  }
}

function render(sources) {
  validateSources(sources);

  let html = sources.template
    .replace('%%STYLES%%', sources.styles)
    .replace('%%MODELS_JSON%%', embedJson(sources.models))
    .replace('%%APP_JS%%', sources.app);

  if (html.includes('%%')) {
    throw new Error('Unreplaced %% marker left in output; aborting to avoid a broken build');
  }
  return html;
}

function main() {
  const sources = loadSources();
  const html = render(sources);
  fs.writeFileSync(PATHS.output, html);
  const kb = (fs.statSync(PATHS.output).size / 1024).toFixed(1);
  console.log('Built index.html (' + kb + ' KB, single file, offline) from ' + Object.keys(PATHS).length + ' sources.');
}

module.exports = { render, loadSources, PATHS };

if (require.main === module) {
  main();
}
