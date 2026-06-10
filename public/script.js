/* === Graph Analyzer - Frontend Logic === */

(() => {
  'use strict';

  // DOM refs
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

  const EXAMPLE = `A->B, A->C, B->D, C->E, E->F
X->Y, Y->Z, Z->X
P->Q, Q->R
G->H, G->H, G->I
hello, 1->2, A->`;

  const API_URL = '/api/graph';

  // Events
  edgeInput.addEventListener('input', updateCount);
  submitBtn.addEventListener('click', handleSubmit);
  exampleBtn.addEventListener('click', () => {
    edgeInput.value = EXAMPLE;
    updateCount();
    edgeInput.focus();
  });
  clearBtn.addEventListener('click', () => {
    edgeInput.value = '';
    updateCount();
    errorSection.hidden = true;
    resultsSection.hidden = true;
  });
  jsonToggle.addEventListener('click', () => {
    const open = jsonOutput.hidden;
    jsonOutput.hidden = !open;
    jsonToggle.textContent = open
      ? '{ } Hide JSON Response ▴'
      : '{ } Show JSON Response ▾';
  });

  updateCount();

  // Parse input into array
  function parseInput(text) {
    return text.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
  }

  function updateCount() {
    const n = parseInput(edgeInput.value).length;
    edgeCount.textContent = n + ' edge' + (n !== 1 ? 's' : '');
  }

  function setLoading(on) {
    submitBtn.querySelector('.btn-label').hidden = on;
    submitBtn.querySelector('.btn-loading').hidden = !on;
    submitBtn.disabled = on;
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    errorSection.hidden = false;
    resultsSection.hidden = true;
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function handleSubmit() {
    const raw = edgeInput.value.trim();
    if (!raw) { showError('Please enter at least one edge.'); return; }

    const edges = parseInput(raw);
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
        throw new Error(err.error || 'Server error ' + res.status);
      }

      const data = await res.json();
      renderResults(data);
    } catch (err) {
      showError(err.message || 'Could not reach the API.');
    } finally {
      setLoading(false);
    }
  }

  function renderResults(data) {
    // user info
    document.getElementById('userId').textContent        = data.user_id || '—';
    document.getElementById('userEmail').textContent      = data.email_id || '—';
    document.getElementById('userEnrollment').textContent = data.enrollment_number || '—';

    // stats
    document.getElementById('totalTrees').textContent  = data.summary?.total_trees ?? 0;
    document.getElementById('totalCycles').textContent  = data.summary?.total_cycles ?? 0;
    document.getElementById('largestRoot').textContent  = data.summary?.largest_tree_root || '—';

    // hierarchies
    renderHierarchies(data.hierarchies || []);

    // invalid
    renderChips('invalidSection', 'invalidList', 'invalidCount', data.invalid_entries || [], 'chip-yellow');

    // duplicates
    renderChips('duplicateSection', 'duplicateList', 'duplicateCount', data.duplicate_edges || [], 'chip-gray');

    // json
    jsonOutput.textContent = JSON.stringify(data, null, 2);
    jsonOutput.hidden = true;
    jsonToggle.textContent = '{ } Show JSON Response ▾';

    resultsSection.hidden = false;
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderHierarchies(list) {
    const box = document.getElementById('hierarchiesContainer');
    box.innerHTML = '';

    list.forEach(h => {
      const isCycle = !!h.has_cycle;

      const card = document.createElement('div');
      card.className = 'hier-card ' + (isCycle ? 'is-cycle' : 'is-tree');

      // header
      const header = document.createElement('div');
      header.className = 'hier-header';

      const rootDiv = document.createElement('div');
      rootDiv.className = 'hier-root';
      rootDiv.innerHTML = `<span class="root-node">${esc(h.root)}</span> Root: ${esc(h.root)}`;

      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'hier-tags';
      if (isCycle) {
        tagsDiv.innerHTML = '<span class="tag tag-red">Cycle</span>';
      } else {
        tagsDiv.innerHTML = `<span class="tag tag-green">Tree</span><span class="tag tag-blue">depth ${h.depth}</span>`;
      }

      header.appendChild(rootDiv);
      header.appendChild(tagsDiv);
      card.appendChild(header);

      // body
      const body = document.createElement('div');
      body.className = 'hier-body';

      if (isCycle) {
        body.innerHTML = '<div class="cycle-msg">🔄 Cycle detected — nodes form a circular loop. No tree can be built.</div>';
      } else {
        const treeEl = document.createElement('div');
        treeEl.className = 'tree';
        buildTreeDOM(treeEl, h.tree, true);
        body.appendChild(treeEl);
      }

      card.appendChild(body);
      box.appendChild(card);
    });
  }

  function buildTreeDOM(container, obj, isRoot) {
    Object.keys(obj).forEach(key => {
      const children = obj[key];
      const childKeys = Object.keys(children);
      const isLeaf = childKeys.length === 0;

      const item = document.createElement('div');
      item.className = 'tree-item';
      if (isRoot) item.classList.add('tree-root');
      if (isLeaf) item.classList.add('tree-leaf');

      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = key;
      item.appendChild(label);

      if (!isLeaf) {
        buildTreeDOM(item, children, false);
      }

      container.appendChild(item);
    });
  }

  function renderChips(sectionId, listId, countId, items, chipClass) {
    const sec  = document.getElementById(sectionId);
    const list = document.getElementById(listId);
    const cnt  = document.getElementById(countId);

    if (!items.length) { sec.hidden = true; return; }

    cnt.textContent = items.length;
    list.innerHTML = items.map(i =>
      `<span class="chip ${chipClass}">${esc(i || '""')}</span>`
    ).join('');
    sec.hidden = false;
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

})();
