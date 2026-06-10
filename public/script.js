/* ═══════════════════════════════════════════════════════════════════
   Graph Hierarchy Analyzer — Frontend Logic
   ═══════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  // ── DOM Elements ────────────────────────────────────────────────
  const edgeInput      = document.getElementById('edgeInput');
  const edgeCount      = document.getElementById('edgeCount');
  const submitBtn      = document.getElementById('submitBtn');
  const exampleBtn     = document.getElementById('exampleBtn');
  const clearBtn       = document.getElementById('clearBtn');
  const errorSection   = document.getElementById('errorSection');
  const errorMessage   = document.getElementById('errorMessage');
  const resultsSection = document.getElementById('resultsSection');
  const jsonToggle     = document.getElementById('jsonToggle');
  const jsonOutput     = document.getElementById('jsonOutput');

  // ── Example Data ────────────────────────────────────────────────
  const EXAMPLE_INPUT = `A->B, A->C, B->D, C->E, E->F
X->Y, Y->Z, Z->X
P->Q, Q->R
G->H, G->H, G->I
hello, 1->2, A->`;

  // ── API URL ─────────────────────────────────────────────────────
  const API_URL = '/api/graph';

  // ── Event Listeners ─────────────────────────────────────────────
  edgeInput.addEventListener('input', updateEdgeCount);
  submitBtn.addEventListener('click', handleSubmit);
  exampleBtn.addEventListener('click', loadExample);
  clearBtn.addEventListener('click', clearAll);
  jsonToggle.addEventListener('click', toggleJSON);

  // ── Initialize ──────────────────────────────────────────────────
  updateEdgeCount();

  // ── Parse Input ─────────────────────────────────────────────────
  function parseInput(text) {
    return text
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // ── Update Edge Count ───────────────────────────────────────────
  function updateEdgeCount() {
    const edges = parseInput(edgeInput.value);
    edgeCount.textContent = edges.length;
  }

  // ── Load Example ────────────────────────────────────────────────
  function loadExample() {
    edgeInput.value = EXAMPLE_INPUT;
    updateEdgeCount();
    edgeInput.focus();
  }

  // ── Clear All ───────────────────────────────────────────────────
  function clearAll() {
    edgeInput.value = '';
    updateEdgeCount();
    errorSection.hidden = true;
    resultsSection.hidden = true;
    edgeInput.focus();
  }

  // ── Toggle JSON ─────────────────────────────────────────────────
  function toggleJSON() {
    const isOpen = !jsonOutput.hidden;
    jsonOutput.hidden = isOpen;
    jsonToggle.classList.toggle('active', !isOpen);
    jsonToggle.querySelector('span').textContent =
      isOpen ? 'Show Raw JSON Response' : 'Hide Raw JSON Response';
  }

  // ── Set Loading State ───────────────────────────────────────────
  function setLoading(loading) {
    const text   = submitBtn.querySelector('.btn__text');
    const loader = submitBtn.querySelector('.btn__loader');
    const icon   = submitBtn.querySelector('.btn__icon');

    if (loading) {
      text.hidden = true;
      if (icon) icon.style.display = 'none';
      loader.hidden = false;
      submitBtn.disabled = true;
    } else {
      text.hidden = false;
      if (icon) icon.style.display = '';
      loader.hidden = true;
      submitBtn.disabled = false;
    }
  }

  // ── Show Error ──────────────────────────────────────────────────
  function showError(msg) {
    errorMessage.textContent = msg;
    errorSection.hidden = false;
    resultsSection.hidden = true;
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── Handle Submit ───────────────────────────────────────────────
  async function handleSubmit() {
    const rawText = edgeInput.value.trim();

    if (!rawText) {
      showError('Please enter at least one edge.');
      return;
    }

    const edges = parseInput(rawText);
    errorSection.hidden = true;
    resultsSection.hidden = true;
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edges })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      renderResults(data);
    } catch (err) {
      showError(err.message || 'Failed to connect to the API.');
    } finally {
      setLoading(false);
    }
  }

  // ── Render Results ──────────────────────────────────────────────
  function renderResults(data) {
    // User info
    document.getElementById('userId').textContent        = data.user_id || '—';
    document.getElementById('userEmail').textContent      = data.email_id || '—';
    document.getElementById('userEnrollment').textContent = data.enrollment_number || '—';

    // Summary
    document.getElementById('totalTrees').textContent  = data.summary?.total_trees ?? 0;
    document.getElementById('totalCycles').textContent  = data.summary?.total_cycles ?? 0;
    document.getElementById('largestRoot').textContent  = data.summary?.largest_tree_root || '—';

    // Hierarchies
    renderHierarchies(data.hierarchies || []);

    // Invalid entries
    renderTagList(
      'invalidSection', 'invalidList', 'invalidCount',
      data.invalid_entries || [], 'tag--invalid'
    );

    // Duplicate edges
    renderTagList(
      'duplicateSection', 'duplicateList', 'duplicateCount',
      data.duplicate_edges || [], 'tag--duplicate'
    );

    // Raw JSON
    jsonOutput.textContent = JSON.stringify(data, null, 2);
    jsonOutput.hidden = true;
    jsonToggle.classList.remove('active');
    jsonToggle.querySelector('span').textContent = 'Show Raw JSON Response';

    // Show
    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Render Hierarchies ──────────────────────────────────────────
  function renderHierarchies(hierarchies) {
    const container = document.getElementById('hierarchiesContainer');
    container.innerHTML = '';

    hierarchies.forEach((h, i) => {
      const isCycle = !!h.has_cycle;
      const card = document.createElement('div');
      card.className = `hierarchy-card hierarchy-card--${isCycle ? 'cycle' : 'tree'}`;
      card.style.animationDelay = `${i * 0.08}s`;

      // Header
      const header = document.createElement('div');
      header.className = 'hierarchy-card__header';

      const rootInfo = document.createElement('div');
      rootInfo.className = 'hierarchy-card__root';
      rootInfo.innerHTML = `
        <span class="hierarchy-card__root-label">Root</span>
        <span class="hierarchy-card__root-node">${escapeHtml(h.root)}</span>
      `;

      const meta = document.createElement('div');
      meta.className = 'hierarchy-card__meta';

      if (isCycle) {
        meta.innerHTML = `<span class="hierarchy-card__tag tag--cycle">⟳ Cycle</span>`;
      } else {
        meta.innerHTML = `
          <span class="hierarchy-card__tag tag--tree">✓ Tree</span>
          <span class="hierarchy-card__tag tag--depth">Depth: ${h.depth}</span>
        `;
      }

      header.appendChild(rootInfo);
      header.appendChild(meta);
      card.appendChild(header);

      // Body
      const body = document.createElement('div');
      body.className = 'hierarchy-card__body';

      if (isCycle) {
        body.innerHTML = `
          <div class="cycle-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Cycle detected — all nodes in this group form a circular dependency. Tree construction is not possible.</span>
          </div>
        `;
      } else {
        const treeView = document.createElement('div');
        treeView.className = 'tree-view';
        renderTreeNode(treeView, h.tree, true);
        body.appendChild(treeView);
      }

      card.appendChild(body);
      container.appendChild(card);
    });
  }

  // ── Render Tree Node (recursive) ────────────────────────────────
  function renderTreeNode(container, obj, isRoot) {
    const keys = Object.keys(obj);

    keys.forEach(key => {
      const children = obj[key];
      const childKeys = Object.keys(children);
      const isLeaf = childKeys.length === 0;

      const nodeEl = document.createElement('div');
      nodeEl.className = 'tree-node';
      if (isRoot) nodeEl.classList.add('tree-root');
      if (isLeaf) nodeEl.classList.add('tree-leaf');

      const label = document.createElement('div');
      label.className = 'tree-node__label';
      label.innerHTML = `<span class="tree-node__dot"></span>${escapeHtml(key)}`;
      nodeEl.appendChild(label);

      if (!isLeaf) {
        renderTreeNode(nodeEl, children, false);
      }

      container.appendChild(nodeEl);
    });
  }

  // ── Render Tag List ─────────────────────────────────────────────
  function renderTagList(sectionId, listId, countId, items, tagClass) {
    const section = document.getElementById(sectionId);
    const list    = document.getElementById(listId);
    const count   = document.getElementById(countId);

    if (items.length === 0) {
      section.hidden = true;
      return;
    }

    count.textContent = items.length;
    list.innerHTML = items.map(item =>
      `<span class="tag ${tagClass}">${escapeHtml(item || '""')}</span>`
    ).join('');

    section.hidden = false;
  }

  // ── Escape HTML ─────────────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

})();
