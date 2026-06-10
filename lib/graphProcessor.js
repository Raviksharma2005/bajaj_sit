
const VALID_EDGE_REGEX = /^([A-Z])->([A-Z])$/;

/**
 * Main processing function — orchestrates the full pipeline.
 * @param {string[]} edges - Array of raw edge strings
 * @param {object} userInfo - User identity fields
 * @returns {object} Full API response
 */
function processGraph(edges, userInfo) {
  const invalidEntries = [];
  const parsedEdges = [];
  const seenEdgeKeys = new Set();
  const duplicateEdgeKeys = new Set();


  for (const rawEntry of edges) {
    const entry = typeof rawEntry === 'string' ? rawEntry.trim() : '';

    
    if (entry === '') {
      invalidEntries.push(entry);
      continue;
    }

    const match = entry.match(VALID_EDGE_REGEX);
    if (!match) {
      invalidEntries.push(entry);
      continue;
    }

    const parent = match[1];
    const child = match[2];

    
    if (parent === child) {
      invalidEntries.push(entry);
      continue;
    }

    const edgeKey = `${parent}->${child}`;

    
    if (seenEdgeKeys.has(edgeKey)) {
      duplicateEdgeKeys.add(edgeKey);
      continue;
    }

    seenEdgeKeys.add(edgeKey);
    parsedEdges.push({ parent, child });
  }


  const childParentMap = new Map();
  const effectiveEdges = [];

  for (const edge of parsedEdges) {
    if (childParentMap.has(edge.child)) {
     
      continue;
    }
    childParentMap.set(edge.child, edge.parent);
    effectiveEdges.push(edge);
  }


  const adjList = new Map();
  const allNodes = new Set();
  const childNodes = new Set();

  for (const edge of effectiveEdges) {
    allNodes.add(edge.parent);
    allNodes.add(edge.child);
    childNodes.add(edge.child);

    if (!adjList.has(edge.parent)) {
      adjList.set(edge.parent, []);
    }
    adjList.get(edge.parent).push(edge.child);
  }


  const undirectedAdj = new Map();
  for (const edge of effectiveEdges) {
    if (!undirectedAdj.has(edge.parent)) undirectedAdj.set(edge.parent, []);
    if (!undirectedAdj.has(edge.child)) undirectedAdj.set(edge.child, []);
    undirectedAdj.get(edge.parent).push(edge.child);
    undirectedAdj.get(edge.child).push(edge.parent);
  }

  const visited = new Set();
  const components = [];

  for (const node of allNodes) {
    if (visited.has(node)) continue;

    const component = new Set();
    const queue = [node];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      component.add(current);

      for (const neighbor of (undirectedAdj.get(current) || [])) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    components.push(component);
  }


  const hierarchies = [];

  for (const component of components) {

    const roots = [...component].filter(n => !childNodes.has(n)).sort();

    let root;
    let hasCycle = false;

    if (roots.length === 0) {
      
      root = [...component].sort()[0]; 
      hasCycle = true;
    } else {
      root = roots[0]; 
      hasCycle = detectCycleInComponent(component, adjList);
    }

    if (hasCycle) {
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true
      });
    } else {
      const tree = buildTree(root, adjList);
      const depth = calculateDepth(tree);
      hierarchies.push({
        root,
        tree,
        depth
      });
    }
  }

  
  const nonCyclicTrees = hierarchies.filter(h => !h.has_cycle);
  const cyclicGroups = hierarchies.filter(h => h.has_cycle);

  let largestTreeRoot = '';
  let maxDepth = 0;

  for (const t of nonCyclicTrees) {
    if (
      t.depth > maxDepth ||
      (t.depth === maxDepth && (largestTreeRoot === '' || t.root < largestTreeRoot))
    ) {
      maxDepth = t.depth;
      largestTreeRoot = t.root;
    }
  }

  return {
    user_id: userInfo.user_id,
    email_id: userInfo.email_id,
    enrollment_number: userInfo.enrollment_number,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: [...duplicateEdgeKeys],
    summary: {
      total_trees: nonCyclicTrees.length,
      total_cycles: cyclicGroups.length,
      largest_tree_root: largestTreeRoot
    }
  };
}



function detectCycleInComponent(component, adjList) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();

  for (const node of component) {
    color.set(node, WHITE);
  }

  function dfs(node) {
    color.set(node, GRAY);

    for (const child of (adjList.get(node) || [])) {
      if (!component.has(child)) continue;
      const c = color.get(child);
      if (c === GRAY) return true;   // back edge → cycle
      if (c === WHITE && dfs(child)) return true;
    }

    color.set(node, BLACK);
    return false;
  }

  for (const node of component) {
    if (color.get(node) === WHITE) {
      if (dfs(node)) return true;
    }
  }

  return false;
}


function buildTree(node, adjList) {
  const children = adjList.get(node) || [];
  const childrenObj = {};

  for (const child of children) {
    const childTree = buildTree(child, adjList);
    Object.assign(childrenObj, childTree);
  }

  return { [node]: childrenObj };
}


function calculateDepth(tree) {
  const keys = Object.keys(tree);
  if (keys.length === 0) return 0;

  const rootKey = keys[0];
  const children = tree[rootKey];
  const childKeys = Object.keys(children);

  if (childKeys.length === 0) return 1;

  let maxChildDepth = 0;
  for (const childKey of childKeys) {
    const childTree = { [childKey]: children[childKey] };
    const d = calculateDepth(childTree);
    maxChildDepth = Math.max(maxChildDepth, d);
  }

  return 1 + maxChildDepth;
}

module.exports = { processGraph };
