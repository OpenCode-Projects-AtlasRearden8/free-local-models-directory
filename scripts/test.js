#!/usr/bin/env node
'use strict';

/* No-dependency test suite for the free-local-models-directory.
   Validates:
     1. models.json schema + content rules
     2. the pure render/filter logic in assets/app.js
     3. the built page: embedded data, offline assets, required UI knobs,
        freshness of the built index.html
   Run with: node scripts/test.js */

const fs = require('fs');
const path = require('path');
const app = require('../assets/app.js');
const build = require('./build.js');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log('PASS  ' + name);
  } else {
    failed++;
    console.log('FAIL  ' + name + (detail ? ' :: ' + detail : ''));
  }
}

function section(title) {
  console.log('\n=== ' + title + ' ===');
}

/* ---------- 1. Schema + content rules ---------- */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEVICE_VALUES = ['cpu-friendly', 'cpu-or-small-gpu', 'gpu-recommended', 'gpu-required'];
const VERDICT_LEVELS = ['great-first-pick', 'solid-pick', 'for-enthusiasts'];
const ALLOWED_HOSTS = ['huggingface.co', 'www.huggingface.co', 'ollama.com'];
const RAM_MIN_STEPPING = [4, 8, 12, 16, 24, 32];

function hostOf(url) {
  return String(url).replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
}

const models = JSON.parse(fs.readFileSync(build.PATHS.models, 'utf8'));

section('JSON schema: models.json');

check('models.json parses to a non-empty array', Array.isArray(models) && models.length > 0, 'len=' + models.length);
check('at least 15 models present so the directory is useful', models.length >= 15, 'len=' + models.length);

const knownFamilies = {};
models.forEach(function (m) { knownFamilies[m.family] = true; });

check('covers the required families (Llama, Mistral, Qwen, Gemma)',
  ['Llama', 'Mistral', 'Qwen', 'Gemma'].every(function (f) { return knownFamilies[f]; }),
  'families=' + Object.keys(knownFamilies).join(','));

const idsSeen = {};
const errors = [];

models.forEach(function (m, index) {
  const where = 'model[' + index + '(' + (m.id || '?') + ')]';

  const required = ['id', 'name', 'creator', 'family', 'blurb', 'params', 'approxDownloadGB',
    'ramGB', 'device', 'license', 'strengths', 'weaknesses', 'verdict', 'links', 'rechecked'];
  required.forEach(function (key) {
    if (!(key in m)) errors.push(where + ' missing field ' + key);
  });

  if (typeof m.id !== 'string' || !/^[a-z0-9-]+$/.test(m.id)) errors.push(where + ' bad id slug');
  if (idsSeen[m.id]) errors.push(where + ' duplicate id');
  idsSeen[m.id] = true;

  if (typeof m.name !== 'string' || !m.name) errors.push(where + ' bad name');
  if (typeof m.creator !== 'string' || !m.creator) errors.push(where + ' bad creator');
  if (typeof m.family !== 'string' || !m.family) errors.push(where + ' bad family');
  if (typeof m.blurb !== 'string' || m.blurb.length < 15 || m.blurb.length > 220) errors.push(where + ' blurb length');
  if (typeof m.params !== 'string' || !/^[0-9.]+B$/.test(m.params)) errors.push(where + ' bad params ("8B" expected)');

  if (typeof m.approxDownloadGB !== 'number' || !(m.approxDownloadGB > 0.2) || m.approxDownloadGB > 200) {
    errors.push(where + ' implausible approxDownloadGB');
  }

  const ram = m.ramGB || {};
  if (typeof ram.min !== 'number' || typeof ram.max !== 'number' ||
      RAM_MIN_STEPPING.indexOf(ram.min) === -1 ||
      ram.max <= ram.min || ram.max > 256) {
    errors.push(where + ' bad ramGB range');
  }

  if (DEVICE_VALUES.indexOf(m.device) === -1) errors.push(where + ' bad device');
  if (typeof m.license !== 'string' || m.license.length > 90) errors.push(where + ' bad license');

  if (!Array.isArray(m.strengths) || m.strengths.length < 1 || m.strengths.length > 5 ||
      !m.strengths.every(function (s) { return typeof s === 'string' && s.length > 8 && s.length < 160; })) {
    errors.push(where + ' bad strengths');
  }
  if (!Array.isArray(m.weaknesses) || m.weaknesses.length < 1 || m.weaknesses.length > 5 ||
      !m.weaknesses.every(function (s) { return typeof s === 'string' && s.length > 8 && s.length < 160; })) {
    errors.push(where + ' bad weaknesses');
  }

  const verdict = m.verdict || {};
  if (VERDICT_LEVELS.indexOf(verdict.level) === -1 ||
      typeof verdict.text !== 'string' || verdict.text.length < 10 || verdict.text.length > 200) {
    errors.push(where + ' bad verdict');
  }

  if (!Array.isArray(m.links) || m.links.length < 1 || m.links.length > 3) {
    errors.push(where + ' bad link count');
  } else {
    m.links.forEach(function (link) {
      if (typeof link.label !== 'string' || typeof link.url !== 'string') {
        errors.push(where + ' malformed link');
      } else if (!/^https:\/\//.test(link.url)) {
        errors.push(where + ' link not https: ' + link.url);
      } else if (ALLOWED_HOSTS.indexOf(hostOf(link.url)) === -1) {
        errors.push(where + ' link host not an official download home: ' + link.url);
      }
    });
  }

  if (typeof m.installHint !== 'undefined' &&
      (typeof m.installHint !== 'string' || !/^ollama run [a-z0-9:.\-]+$/.test(m.installHint))) {
    errors.push(where + ' installHint must look like "ollama run <tag>"');
  }

  if (typeof m.rechecked !== 'string' || !ISO_DATE.test(m.rechecked)) {
    errors.push(where + ' rechecked must be YYYY-MM-DD');
  } else {
    const d = new Date(m.rechecked + 'T00:00:00Z');
    if (isNaN(d.getTime()) || d > new Date()) errors.push(where + ' rechecked is invalid or in the future');
  }
});

check('every model passes all field rules', errors.length === 0, errors.join(' | '));

const ramOrderOk = models.every(function (m, i) {
  const prev = models[i - 1];
  return !prev || prev.ramGB.min <= m.ramGB.min;
});
check('models roughly ordered by RAM need (readable for beginners)', ramOrderOk,
  models.map(function (m) { return m.ramGB.min; }).join(','));

check('recheck dates present on every card (per-card freshness)',
  models.every(function (m) { return ISO_DATE.test(m.rechecked || ''); }));

check('every model links to an official download home (no stores/mirrors/affiliates)',
  models.every(app.verifyLinkHosts));

/* ---------- 2. Pure logic in assets/app.js ---------- */

section('Page logic: assets/app.js');

check('RAM filter ladder is ordered and includes "any"',
  app.RAM_OPTIONS[0].ceiling === null &&
  app.RAM_OPTIONS.slice(1).every(function (opt, i, arr) {
    return !arr[i - 1] || opt.ceiling > arr[i - 1].ceiling;
  }));

check('matchesRam: ceiling null shows everything',
  models.every(function (m) { return app.matchesRam(m, null); }));

const tiny = app.matchesRam(models[0], 4);
const bigModel = models[models.length - 1];
check('matchesRam: smallest model fits 4 GB, largest does not',
  tiny === true && app.matchesRam(bigModel, 4) === false);

const anyAll = app.filterModels(models, { ram: 'any', family: 'all', q: '' });
check('filterModels with no filters returns all models', anyAll.length === models.length);

const fit16 = app.filterModels(models, { ram: '16', family: 'all', q: '' });
check('filterModels RAM=16 keeps exactly models whose floor is <= 16',
  fit16.every(function (m) { return m.ramGB.min <= 16; }) &&
  fit16.length === models.filter(function (m) { return m.ramGB.min <= 16; }).length);

const fit8 = app.filterModels(models, { ram: '8', family: 'all', q: '' });
check('RAM filter is monotonic (8GB set is a subset of 16GB set)',
  fit8.length < fit16.length && fit8.every(function (m) { return fit16.indexOf(m) !== -1; }));

const llamaFamily = app.filterModels(models, { ram: 'any', family: 'Llama', q: '' });
check('family filter isolates the Llama cards',
  llamaFamily.length > 0 && llamaFamily.every(function (m) { return m.family === 'Llama'; }));

const coderSearch = app.filterModels(models, { ram: 'any', family: 'all', q: 'coder' });
check('search finds the dedicated coder model', coderSearch.length >= 1 &&
  coderSearch.some(function (m) { return /coder/i.test(m.name); }));

const ramCounts = models.reduce(function (acc, m) { acc[m.family] = (acc[m.family] || 0) + 1; return acc; }, {});
check('families() helper returns sorted distinct families',
  JSON.stringify(app.families(models)) === JSON.stringify(Object.keys(ramCounts).sort()));

const sorted = app.sortModels(models);
check('sortModels orders by approx download size ascending',
  sorted.every(function (m, i) {
    const prev = sorted[i - 1];
    return !prev || prev.approxDownloadGB <= m.approxDownloadGB;
  }));

/* ---------- 3. Card render output ---------- */

section('Card rendering');

const lorem = { escaped: null };
lorem.escaped = app.escapeHtml('<img src=x> & " \' ');
check('escapeHtml neutralizes markup', lorem.escaped.indexOf('<img') === -1 &&
  lorem.escaped.indexOf('&' + 'lt;img') !== -1 && lorem.escaped.indexOf('&') !== -1);

let cardChecksOk = true;
const cardDetails = [];
models.forEach(function (m) {
  const card = app.renderCard(m);
  const bits = {
    hasArticle: card.indexOf('<article') === 0,
    hasName: card.indexOf(m.name) !== -1,
    hasRecheck: card.indexOf(m.rechecked) !== -1,
    hasVerdict: card.indexOf(app.VERDICT_META[m.verdict.level].label) !== -1,
    hasSize: card.indexOf('GB') !== -1,
    hasRam: card.indexOf(app.formatRam(m)) !== -1,
    linkCount: (card.match(/<a href=/g) || []).length === m.links.length,
    clean: card.indexOf('undefined') === -1 && card.indexOf('[object') === -1
  };
  if (!Object.keys(bits).every(function (k) { return bits[k]; })) {
    cardChecksOk = false;
    cardDetails.push(m.id + ' :: ' + JSON.stringify(bits));
  }
});
check('renderCard produces complete HTML for every model', cardChecksOk, cardDetails.join(' | '));

const starterCards = models.filter(function (m) { return m.verdict.level === 'great-first-pick'; }).length;
check('page offers at least a few beginner verdicts', starterCards >= 4, 'great-first-pick x' + starterCards);

const heavyVerdicts = models.filter(function (m) { return m.verdict.level === 'for-enthusiasts'; }).length;
check('enthusiast-tier verdicts exist for big machines', heavyVerdicts >= 1, 'for-enthusiasts x' + heavyVerdicts);

/* ---------- 4. Built page: offline single file ---------- */

section('Built page: index.html');

let indexHtml = null;
try {
  indexHtml = fs.readFileSync(build.PATHS.output, 'utf8');
} catch (e) {
  /* handled below */
}

check('index.html exists (run: npm run build)', indexHtml !== null);
if (indexHtml) {
  const rendered = build.render(build.loadSources());
  check('index.html is up to date with sources (not stale)',
    rendered === indexHtml, 'stale file - run "npm run build" then re-commit');

  check('starts with a doctype', /^<!doctype html>/i.test(indexHtml.trim()));
  check('has utf-8 charset', /charset=["']?utf-8/i.test(indexHtml));
  check('title mentions the directory', /<title>[^<]*Free Local AI Models/i.test(indexHtml));

  const jsonMatch = indexHtml.match(/<script id="models-data" type="application\/json">([\s\S]*?)<\/script>/);
  check('embedded models JSON present in its own script tag', !!jsonMatch);
  if (jsonMatch) {
    let embeddedOk = false;
    let parsed = null;
    try {
      parsed = JSON.parse(jsonMatch[1]);
      embeddedOk = JSON.stringify(parsed) === JSON.stringify(models);
    } catch (e) { embeddedOk = false; }
    check('embedded JSON parses and equals models.json', embeddedOk);
    check('no "</script" possible inside embedded JSON',
      jsonMatch[1].toLowerCase().indexOf('</script') === -1);
  }

  const appSource = fs.readFileSync(build.PATHS.app, 'utf8');
  const styleSource = fs.readFileSync(build.PATHS.styles, 'utf8');
  check('app.js source embedded verbatim (same file as tested)', indexHtml.includes(appSource));
  check('styles embedded verbatim', indexHtml.includes(styleSource));

  check('no external script/link/img/iframe sources (fully offline)',
    !/<(?:script|img|iframe|source)\b[^>]*\b(src|href)\s*=\s*["']?https?:/i.test(indexHtml) &&
    !/<link\b[^>]*\bhref\s*=\s*["']?https?:/i.test(indexHtml) &&
    !/<(?:script|img|iframe|link|source)\b[^>]*\b(src|href)\s*=\s*["']\/\/[^"']/i.test(indexHtml));

  check('filter select + search input are labeled and wired', /id="app-root"/.test(indexHtml) &&
    appSource.includes('ram-filter') && appSource.includes('model-search') &&
    appSource.includes('for="ram-filter"'));

  check('no affiliate or store links in the page',
    /[?&]ref=|amazon|clickbank|gumroad|gmv2|hop\.clickbank|\.taffer|\/aff\//i.test(indexHtml) === false);

  check('license line present inside the page footer',
    indexHtml.includes('Copyright (c) 2026 Asdale Dynamics, LLC'));

  const kb = (Buffer.byteLength(indexHtml, 'utf8') / 1024).toFixed(1);
  check('single-file size stays lean for beginners (< 200 KB)', Number(kb) < 200, kb + ' KB');
}

/* ---------- Summary ---------- */

console.log('\n' + (failed === 0 ? 'ALL PASS' : 'FAILURES: ' + failed) +
  '  (' + passed + ' passed, ' + failed + ' failed)');
process.exit(failed === 0 ? 0 : 1);
