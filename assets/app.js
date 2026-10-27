/* Free Local AI Models - page logic.
   Written as a small UMD-ish module so the same file can run in the
   browser (DOM wiring) and in Node (unit tests for the pure functions). */
(function (global) {
  'use strict';

  var RAM_OPTIONS = [
    { value: 'any', label: 'Any RAM', ceiling: null },
    { value: '4', label: 'Runs on 4 GB or less', ceiling: 4 },
    { value: '8', label: 'Runs on 8 GB (typical laptop)', ceiling: 8 },
    { value: '16', label: 'Runs on 16 GB (desktop / gaming laptop)', ceiling: 16 },
    { value: '32', label: 'Runs on 32 GB', ceiling: 32 },
    { value: '64', label: 'Runs on 64 GB or more', ceiling: 64 }
  ];

  var VERDICT_META = {
    'great-first-pick': { label: 'Great first pick', className: 'verdict-great' },
    'solid-pick': { label: 'Solid pick', className: 'verdict-solid' },
    'for-enthusiasts': { label: 'For hardware enthusiasts', className: 'verdict-heavy' }
  };

  var DEVICE_META = {
    'cpu-friendly': 'CPU-friendly (no graphics card needed)',
    'cpu-or-small-gpu': 'CPU or a small GPU',
    'gpu-recommended': 'GPU strongly recommended',
    'gpu-required': 'Needs a real GPU'
  };

  var LINK_HOSTS = ['huggingface.co', 'www.huggingface.co', 'ollama.com'];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&' + 'amp;')
      .replace(/</g, '&' + 'lt;')
      .replace(/>/g, '&' + 'gt;')
      .replace(/"/g, '&' + 'quot;')
      .replace(/'/g, '&#39;');
  }

  function formatRam(model) {
    var ram = model.ramGB;
    if (ram.min === ram.max) return ram.min + ' GB';
    return ram.min + '-' + ram.max + ' GB';
  }

  function formatSize(model) {
    var gb = model.approxDownloadGB;
    var rounded = gb >= 10 ? Math.round(gb) : Math.round(gb * 10) / 10;
    return '~' + rounded + ' GB download';
  }

  function matchesRam(model, ceiling) {
    if (ceiling === null || ceiling === undefined) return true;
    return model.ramGB.min <= ceiling;
  }

  function matchesQuery(model, query) {
    if (!query) return true;
    var haystack = [model.name, model.family, model.creator, model.blurb, model.params, model.license]
      .join(' ')
      .toLowerCase();
    return haystack.indexOf(query.toLowerCase()) !== -1;
  }

  function filterModels(models, state) {
    var ceiling = state && state.ram ? Number(state.ram) : null;
    return models.filter(function (model) {
      var ramOk = state.ram === 'any' || state.ram === undefined || state.ram === '' || matchesRam(model, ceiling);
      var familyOk = !state.family || state.family === 'all' || model.family === state.family;
      return ramOk && familyOk && matchesQuery(model, state.q || '');
    });
  }

  function sortModels(models) {
    return models
      .slice()
      .sort(function (a, b) {
        if (a.approxDownloadGB !== b.approxDownloadGB) return a.approxDownloadGB - b.approxDownloadGB;
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      });
  }

  function families(models) {
    var seen = {};
    var list = [];
    models.forEach(function (model) {
      if (!seen[model.family]) {
        seen[model.family] = true;
        list.push(model.family);
      }
    });
    return list.sort();
  }

  function verifyLinkHosts(model) {
    return model.links.every(function (link) {
      var host = String(link.url).replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
      return LINK_HOSTS.indexOf(host) !== -1;
    });
  }

  function renderCard(model) {
    var verdict = VERDICT_META[model.verdict.level] || VERDICT_META['solid-pick'];
    var linksHtml = model.links
      .map(function (link) {
        return '<a href="' + escapeHtml(link.url) + '" rel="noopener noreferrer">' + escapeHtml(link.label) + '</a>';
      })
      .join('');
    var strengths = model.strengths
      .map(function (item) {
        return '<li>' + escapeHtml(item) + '</li>';
      })
      .join('');
    var weaknesses = model.weaknesses
      .map(function (item) {
        return '<li>' + escapeHtml(item) + '</li>';
      })
      .join('');
    var install =
      model.installHint
        ? '<p class="install">Quick install with Ollama: <code>' + escapeHtml(model.installHint) + '</code></p>'
        : '';

    return (
      '<article class="card" data-model-id="' + escapeHtml(model.id) + '">' +
      '<header class="card-head">' +
      '<h3>' + escapeHtml(model.name) + '</h3>' +
      '<span class="chip">' + escapeHtml(model.family) + ' - ' + escapeHtml(model.creator) + '</span>' +
      '</header>' +
      '<p class="blurb">' + escapeHtml(model.blurb) + '</p>' +
      '<ul class="stats">' +
      '<li><span class="stat-label">Size</span><b>' + escapeHtml(model.params) + ' params</b></li>' +
      '<li><span class="stat-label">Download</span><b>' + escapeHtml(formatSize(model)) + ' (4-bit)</b></li>' +
      '<li><span class="stat-label">System RAM</span><b>' + escapeHtml(formatRam(model)) + '</b></li>' +
      '<li><span class="stat-label">Runs on</span><b>' + escapeHtml(DEVICE_META[model.device]) + '</b></li>' +
      '<li><span class="stat-label">License</span><b>' + escapeHtml(model.license) + '</b></li>' +
      '</ul>' +
      '<div class="tradeoffs">' +
      '<div class="col"><h4>Strengths</h4><ul class="plus">' + strengths + '</ul></div>' +
      '<div class="col"><h4>Watch out for</h4><ul class="minus">' + weaknesses + '</ul></div>' +
      '</div>' +
      '<p class="verdict ' + verdict.className + '"><b>' + escapeHtml(verdict.label) + '</b><span>' +
      escapeHtml(model.verdict.text) + '</span></p>' +
      install +
      '<footer class="card-foot">' +
      linksHtml +
      '<span class="checked">Checked ' + escapeHtml(model.rechecked) + '</span>' +
      '</footer>' +
      '</article>'
    );
  }

  function renderEmptyState() {
    return (
      '<div class="empty-state">' +
      '<h3>No model fits that combination</h3>' +
      '<p>Try "Any RAM" or clear the search box - there is almost always a model that fits.</p>' +
      '</div>'
    );
  }

  function renderApp(root, models) {
    var state = { ram: 'any', family: 'all', q: '' };

    root.innerHTML =
      '<div class="controls">' +
      '<div class="control-group">' +
      '<label for="ram-filter">Your RAM budget</label>' +
      '<select id="ram-filter">' +
      RAM_OPTIONS.map(function (option) {
        return '<option value="' + option.value + '">' + escapeHtml(option.label) + '</option>';
      }).join('') +
      '</select>' +
      '</div>' +
      '<div class="control-group">' +
      '<label for="family-filter">Family</label>' +
      '<select id="family-filter">' +
      '<option value="all">All families</option>' +
      families(models)
        .map(function (family) {
          return '<option value="' + escapeHtml(family) + '">' + escapeHtml(family) + '</option>';
        })
        .join('') +
      '</select>' +
      '</div>' +
      '<div class="control-group control-grow">' +
      '<label for="model-search">Search</label>' +
      '<input id="model-search" type="search" placeholder="Try "coder", "vision" or "Llama"" aria-label="Search models">' +
      '</div>' +
      '</div>' +
      '<p id="result-count" class="result-count" role="status" aria-live="polite"></p>' +
      '<section id="cards" class="card-grid" aria-label="Model cards"></section>';

    var ramSelect = root.querySelector('#ram-filter');
    var familySelect = root.querySelector('#family-filter');
    var searchInput = root.querySelector('#model-search');
    var cardsEl = root.querySelector('#cards');
    var countEl = root.querySelector('#result-count');

    function draw() {
      var visible = sortModels(filterModels(models, state));
      countEl.textContent = 'Showing ' + visible.length + ' of ' + models.length + ' models';
      cardsEl.innerHTML = visible.length
        ? visible.map(renderCard).join('')
        : renderEmptyState();
    }

    ramSelect.addEventListener('change', function () {
      state.ram = ramSelect.value;
      draw();
    });
    familySelect.addEventListener('change', function () {
      state.family = familySelect.value;
      draw();
    });
    searchInput.addEventListener('input', function () {
      state.q = searchInput.value;
      draw();
    });

    draw();
  }

  function init() {
    var root = document.getElementById('app-root');
    var dataEl = document.getElementById('models-data');
    if (!root || !dataEl) return;
    renderApp(root, JSON.parse(dataEl.textContent));
  }

  var api = {
    RAM_OPTIONS: RAM_OPTIONS,
    VERDICT_META: VERDICT_META,
    DEVICE_META: DEVICE_META,
    LINK_HOSTS: LINK_HOSTS,
    escapeHtml: escapeHtml,
    formatRam: formatRam,
    formatSize: formatSize,
    matchesRam: matchesRam,
    matchesQuery: matchesQuery,
    filterModels: filterModels,
    sortModels: sortModels,
    families: families,
    verifyLinkHosts: verifyLinkHosts,
    renderCard: renderCard,
    renderEmptyState: renderEmptyState,
    renderApp: renderApp,
    init: init
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    global.FreeLocalModelsApp = api;
  }

  if (typeof document !== 'undefined' && document.getElementById) {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
