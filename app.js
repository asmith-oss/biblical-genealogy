// ============================================================
// Biblical Genealogy Interactive Tree (Auto-Nesting + Cache)
// - Builds a nested hierarchy from the flat JSON (ignores "metadata")
// - Caches the nested structure in localStorage (one-time build)
// - Preserves ALL existing UI features & CSS classes
// - Backward-compatible with descendants as IDs or objects
// ============================================================

/*
  Overview of key globals:

  - flatGenealogyData: raw JSON loaded from biblical_genealogy.json (flat, by id)
  - peopleById: a normalized flat lookup map { id -> personObject }
  - nestedRoots: array of nested root nodes (objects with descendants as objects)
  - genealogyData: kept as the flat lookup (for backward-compat with any logic that expects a map)

  Rendering works with BOTH styles:
  - If a person.descendants is an array of IDs -> we resolve children from peopleById
  - If a person.descendants is an array of objects -> we use those directly
*/

let peopleById = {};      // flat lookup by id (kept for search and compatibility)
let nestedRoots = [];     // array of nested root nodes
let genealogyData = {};   // flat lookup exposed under the legacy name for compatibility

let currentPath = [];
let expandedNodes = new Set();

// ---------- Utilities ----------
function prettifyKey(k) {
  return String(k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function isPersonObject(v) {
  return v && typeof v === 'object' && (
    'descendants' in v || 'bio' in v || 'scripture' in v || 'name' in v || 'id' in v
  );
}

// Normalize text for tolerant search
function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, "") // remove punctuation/symbols
    .replace(/\s+/g, " ")           // collapse spaces
    .trim();
}

function isScriptureQuery(q) {
  // e.g., "Genesis 5", "1 Samuel 17", "Matt 1", "Rom 11:17"
  const re = /^\s*(?:[1-3]\s*)?[A-Za-z.]+(?:\s+[A-Za-z.]+)?\s+\d+(?::\d+(-\d+)?)?\s*$/;
  return re.test(q);
}

// ---------- Core: Builder (Auto-Nesting) ----------
/*
  buildNestedTree(data)
  - Skips "metadata"
  - Makes shallow copies with empty descendants
  - Connects parent -> child as nested objects
  - Identifies roots (never referenced as a descendant) and returns them
*/
function buildNestedTree(data) {
  const lookup = {};
  // pass 1: shallow copies with empty descendants
  for (const id in data) {
    if (!Object.prototype.hasOwnProperty.call(data, id)) continue;
    if (id === "metadata") continue;
    const src = data[id];
    // Shallow copy, force id, normalize name, and defer descendants connection
    lookup[id] = {
      id,
      name: src?.name || prettifyKey(id),
      bio: src?.bio || "",
      scripture: src?.scripture || "",
      descendants: [] // IMPORTANT: we will reconnect as objects
    };
  }

  // pass 2: reconnect descendants as objects (if they exist as IDs in source)
  for (const id in data) {
    if (!Object.prototype.hasOwnProperty.call(data, id)) continue;
    if (id === "metadata") continue;
    const src = data[id];
    if (!src || !Array.isArray(src.descendants) || src.descendants.length === 0) continue;

    const parent = lookup[id];
    for (const childId of src.descendants) {
      if (lookup[childId]) parent.descendants.push(lookup[childId]);
    }
  }

  // detect roots: anyone not referenced as a child
  const allChildren = new Set(
    Object.values(lookup).flatMap(p => p.descendants.map(d => d.id))
  );

  const roots = [];
  for (const id in lookup) {
    if (!allChildren.has(id)) roots.push(lookup[id]);
  }
  return roots;
}

// ---------- Cache Wrapper ----------
/*
  One-time caching of the nested tree.
  We never cache the flat lookup so you can keep editing the JSON safely;
  the nested form is just a derived view for rendering performance.
*/
function getNestedWithCache(flatData) {
  const cached = localStorage.getItem("nestedGenealogy");
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      // fall through to rebuild
    }
  }
  const built = buildNestedTree(flatData);
  try {
    localStorage.setItem("nestedGenealogy", JSON.stringify(built));
  } catch (_) {
    // storage might be full or disabled — continue gracefully
  }
  return built;
}

// ---------- Load Data ----------
async function loadGenealogyData() {
  try {
    const res = await fetch('./biblical_genealogy.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.status} ${res.statusText}`);
    const raw = await res.json();

    // Your file may be either { genealogy: {...} } or a flat object. Support both.
    const flatGenealogyData = raw && raw.genealogy ? raw.genealogy : raw;

    // Build flat lookup (peopleById) WITHOUT altering your original JSON shape.
    peopleById = {};
    for (const key in flatGenealogyData) {
      if (!Object.prototype.hasOwnProperty.call(flatGenealogyData, key)) continue;
      if (key === "metadata") continue;
      const v = flatGenealogyData[key];
      if (!v || typeof v !== 'object') continue;

      // ensure id + defaults; keep descendants as-is (array of IDs in your data)
      const id = key;
      peopleById[id] = {
        id,
        name: v.name || prettifyKey(id),
        bio: v.bio || '',
        scripture: v.scripture || '',
        descendants: Array.isArray(v.descendants) ? v.descendants.slice() : []
      };
    }

    // Build nested hierarchy with caching
    nestedRoots = getNestedWithCache(flatGenealogyData);

    // Expose flat lookup under legacy name for compatibility with existing logic
    genealogyData = peopleById;

    // Initialize UI from the TRUE root (prefer nested Adam)
    initializeTree();
    setupEventListeners();
    updateStats();

    console.info('Genealogy loaded — people:', Object.keys(peopleById).length, 'roots:', nestedRoots.length);
  } catch (err) {
    console.error('Error loading genealogy data:', err);
    initializeTree();
    setupEventListeners();
    updateStats();
  }
}

// ---------- Helpers to Support Both ID-based and Object-based descendants ----------
function getChildrenArray(person) {
  // Returns an array of CHILD OBJECTS no matter original shape
  if (!person) return [];

  // If descendants are already nested objects:
  if (Array.isArray(person.descendants) && person.descendants.length && typeof person.descendants[0] === 'object') {
    return person.descendants.filter(Boolean);
  }

  // If descendants are ID strings: resolve from flat lookup
  const ids = Array.isArray(person.descendants) ? person.descendants : [];
  const out = [];
  for (const cid of ids) {
    if (peopleById[cid]) out.push(peopleById[cid]);
  }
  return out;
}

function findPerson(idOrName) {
  if (!idOrName) return null;
  const raw = String(idOrName).trim();

  // direct id lookup
  if (peopleById[raw]) return peopleById[raw];

  const q = normalizeText(raw);
  for (const p of Object.values(peopleById)) {
    if (!p) continue;
    if (normalizeText(p.id) === q) return p;
    if (normalizeText(p.name) === q) return p;
  }
  return null;
}

function fuzzyFind(nameLike) {
  if (!nameLike) return [];
  const q = normalizeText(nameLike);

  const persons = Object.values(peopleById).filter(Boolean);
  const starts = [];
  const includes = [];
  const seen = new Set();

  for (const p of persons) {
    const nid = normalizeText(p.id);
    const nname = normalizeText(p.name);
    const nbio = normalizeText(p.bio || "");

    const isStart = nid.startsWith(q) || nname.startsWith(q);
    const isIncl = (!isStart) && (nid.includes(q) || nname.includes(q) || nbio.includes(q));

    if (isStart && !seen.has(p.id)) { starts.push(p); seen.add(p.id); }
    else if (isIncl && !seen.has(p.id)) { includes.push(p); seen.add(p.id); }
  }
  return [...starts, ...includes];
}

// ---------- Tree ----------
function pickRootForUI() {
  // Prefer nested Adam if available, else fall back to flat lookup
  const adamNested =
    (nestedRoots.find(n => n.id === 'adam') ||
     nestedRoots.find(n => (n.name || '').toLowerCase() === 'adam')) || null;

  if (adamNested) return adamNested;

  // fallback: derive Adam from flat lookup if nested not found
  if (peopleById['adam']) return peopleById['adam'];

  // last resort: first nested root or first flat person
  return nestedRoots[0] || Object.values(peopleById)[0] || null;
}

function initializeTree() {
  const rootEl = document.getElementById("tree-root");
  const rootPerson = pickRootForUI();

  if (!rootPerson) {
    console.error("No root person found in dataset");
    return;
  }

  const rootNode = createNode(rootPerson);
  rootEl.innerHTML = '';
  rootEl.appendChild(rootNode);
  currentPath = [rootPerson.name || rootPerson.id || 'Root'];
  updateBreadcrumb(currentPath);
}

function createNode(personData) {
  const div = document.createElement("div");
  div.className = "node-box";
  div.dataset.personId = personData.id;
  
  const fullName = personData.name || personData.id || 'Unknown';
  const children = getChildrenArray(personData);
  const childCount = children.length;
  
  // Add title attribute for tooltip if name is long
  if (fullName.length > 18) {
    div.setAttribute('title', fullName);
  }

  const hasDescendants = childCount > 0;
  
  // Create innerHTML with optional child count badge
  let innerHTML = `<span class="node-name">${fullName}</span>`;
  
  if (hasDescendants) {
    innerHTML += `<span class="child-count">${childCount}</span>`;
    innerHTML += `<span class="expand-indicator">▼</span>`;
  }
  
  div.innerHTML = innerHTML;

  // Single click expands
  div.addEventListener("click", e => {
    e.stopPropagation();
    if (hasDescendants) toggleBranch(div, personData);
  });

  // Double click opens modal
  div.addEventListener("dblclick", e => {
    e.stopPropagation();
    openModal(personData);
  });

  // Long-press opens modal (mobile)
  let touchTimer;
  div.addEventListener("touchstart", e => {
    e.stopPropagation();
    touchTimer = setTimeout(() => openModal(personData), 600);
  });
  ["touchend", "touchcancel", "touchmove"].forEach(evt =>
    div.addEventListener(evt, () => clearTimeout(touchTimer))
  );

  return div;
}

function toggleBranch(container, personData) {
  const personId = personData.id;
  const existing = container.nextElementSibling;

  if (existing && existing.classList.contains("branch") && existing.dataset.parentId === String(personId)) {
    if (expandedNodes.has(personId)) {
      existing.remove();
      expandedNodes.delete(personId);
      const indicator = container.querySelector('.expand-indicator');
      if (indicator) indicator.textContent = '▼';
    } else {
      existing.classList.add('active');
      expandedNodes.add(personId);
      const indicator = container.querySelector('.expand-indicator');
      if (indicator) indicator.textContent = '▲';
    }
    return;
  }

  const children = getChildrenArray(personData);
  if (!children.length) return;

  const branch = document.createElement("div");
  branch.className = "branch active";
  branch.dataset.parentId = personId;

  children.forEach(childObj => {
    if (childObj) branch.appendChild(createNode(childObj));
  });

  container.insertAdjacentElement("afterend", branch);
  expandedNodes.add(personId);
  const indicator = container.querySelector('.expand-indicator');
  if (indicator) indicator.textContent = '▲';

  if (!currentPath.length || currentPath[currentPath.length - 1] !== (personData.name || personData.id)) {
    currentPath.push(personData.name || personData.id);
    updateBreadcrumb(currentPath);
  }
}

// ---------- Modal ----------
function openModal(personData) {
  const modal = document.getElementById("infoModal");
  const modalContent = document.getElementById("person-info");

  const name = personData.name || personData.id || 'Unknown';
  const bio = personData.bio || 'No biography available.';
  const scripture = personData.scripture || 'No scripture refs.';
  const descendantsCount = getChildrenArray(personData).length;

  modal.style.display = "block";
  modalContent.innerHTML = `
    <h2>${name}</h2>
    <div class="bio-section">
      <h3>Biography</h3>
      <p>${bio}</p>
    </div>
    <div class="scripture-section">
      <h3>📖 Scripture References</h3>
      <p class="scripture-refs">${scripture}</p>
    </div>
    <div class="descendants-section">
      <h3>Descendants</h3>
      <p>${descendantsCount} direct descendant(s) recorded</p>
    </div>
  `;
}

// ---------- Autocomplete ----------
function setupAutocomplete(inputElement, onSelect) {
  if (!inputElement) return;
  
  // Create dropdown container
  const dropdown = document.createElement('div');
  dropdown.className = 'autocomplete-dropdown';
  dropdown.style.cssText = `
    position: absolute;
    background: #1a2332;
    border: 2px solid #3a4a7d;
    border-radius: 8px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  `;
  
  // Position dropdown below input
  const positionDropdown = () => {
    const rect = inputElement.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = (rect.bottom + 5) + 'px';
    dropdown.style.width = rect.width + 'px';
  };
  
  document.body.appendChild(dropdown);
  
  // Show suggestions
  inputElement.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    
    if (value.length < 2) {
      dropdown.style.display = 'none';
      return;
    }
    
    const matches = fuzzyFind(value).slice(0, 10);
    
    if (matches.length === 0) {
      dropdown.style.display = 'none';
      return;
    }
    
    dropdown.innerHTML = matches.map(p => `
      <div class="autocomplete-item" data-id="${p.id}" style="
        padding: 10px;
        cursor: pointer;
        border-bottom: 1px solid #2a3a5d;
        color: #fff;
        transition: background 0.2s;
      ">
        <div style="font-weight: 500;">${p.name}</div>
        <div style="font-size: 0.85rem; color: #9dd3ff;">${(p.bio || '').substring(0, 80)}${p.bio && p.bio.length > 80 ? '...' : ''}</div>
      </div>
    `).join('');
    
    // Add hover effects and click handlers
    dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.style.background = '#3a4a7d';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });
      item.addEventListener('click', () => {
        const person = peopleById[item.dataset.id];
        if (person) {
          inputElement.value = person.name;
          dropdown.style.display = 'none';
          if (onSelect) onSelect(person);
        }
      });
    });
    
    positionDropdown();
    dropdown.style.display = 'block';
  });
  
  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (e.target !== inputElement && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
  
  // Reposition on scroll/resize
  window.addEventListener('scroll', positionDropdown);
  window.addEventListener('resize', positionDropdown);
}

// ---------- Global UI / Events ----------
function setupEventListeners() {
  // Modal close
  const modal = document.getElementById("infoModal");
  const closeBtn = document.querySelector(".close");
  if (closeBtn) closeBtn.onclick = () => (modal.style.display = "none");
  window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };

  // Search with autocomplete
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  if (searchBtn && searchInput) {
    setupAutocomplete(searchInput, (person) => {
      openModal(person);
    });
    searchBtn.addEventListener('click', () => smartSearch(searchInput.value));
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') smartSearch(searchInput.value); });
  }

  // Lineage tools with autocomplete
  const linInput = document.getElementById('lin-person');
  if (linInput) {
    setupAutocomplete(linInput);
  }

  // Compare fields with autocomplete
  const cmpAInput = document.getElementById('cmp-a');
  const cmpBInput = document.getElementById('cmp-b');
  if (cmpAInput) setupAutocomplete(cmpAInput);
  if (cmpBInput) setupAutocomplete(cmpBInput);

  // Quick navigation buttons (Jump To)
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => jumpToPerson(btn.dataset.person));
  });

  // Lineage tools
  const btnAnc = document.getElementById('btn-ancestors');
  const btnDesc = document.getElementById('btn-descendants');

  if (btnAnc) btnAnc.addEventListener('click', () => {
    const id = (document.getElementById('lin-person') || {}).value?.trim();
    if (!id) return alert('Enter a person id or name');
    const person = findPerson(id) || (fuzzyFind(id)[0] || null);
    if (!person) return alert('Person not found');
    const list = getAncestors(person.id);
    displayResults(`Ancestors of ${person.name}`, list);
  });

  if (btnDesc) btnDesc.addEventListener('click', () => {
    const id = (document.getElementById('lin-person') || {}).value?.trim();
    if (!id) return alert('Enter a person id or name');
    const person = findPerson(id) || (fuzzyFind(id)[0] || null);
    if (!person) return alert('Person not found');
    const list = getDescendants(person.id);
    displayResults(`Descendants of ${person.name}`, list);
  });

  // Compare
  const btnCmp = document.getElementById('btn-compare');
  if (btnCmp) btnCmp.addEventListener('click', () => {
    const a = (document.getElementById('cmp-a') || {}).value?.trim();
    const b = (document.getElementById('cmp-b') || {}).value?.trim();
    if (!a || !b) return alert('Enter both people to compare');
    const p1 = findPerson(a) || (fuzzyFind(a)[0] || null);
    const p2 = findPerson(b) || (fuzzyFind(b)[0] || null);
    if (!p1 || !p2) return alert('One or both people not found');
    comparePeople(p1.id, p2.id);
  });

  // Chronology
  const btnChron = document.getElementById('btn-chronology');
  if (btnChron) btnChron.addEventListener('click', listChronologically);
}

// ---------- Search ----------
function smartSearch(q) {
  const query = (q || '').trim();
  if (!query) return;
  if (isScriptureQuery(query)) return searchByScripture(query);

  // name-based search
  const exact = findPerson(query);
  if (exact) return openModal(exact);

  const results = fuzzyFind(query).slice(0, 25);
  if (results.length === 0) return alert('No matches found for: ' + query);
  displayResults(`Matches for "${query}"`, results);
}

function searchByScripture(ref) {
  const results = Object.values(peopleById).filter(p =>
    p.scripture && p.scripture.toLowerCase().includes(ref.toLowerCase())
  );
  displayResults(`People connected to ${ref}`, results);
}

// ---------- Lineage helpers ----------
function getAncestors(id, seen = new Set()) {
  const ancestors = [];
  for (const person of Object.values(peopleById)) {
    if (!person || !Array.isArray(person.descendants)) continue;
    if (person.descendants.includes(id) && !seen.has(person.id)) {
      ancestors.push(person);
      seen.add(person.id);
      ancestors.push(...getAncestors(person.id, seen));
    }
  }
  // dedupe while preserving order
  const uniq = [];
  const seenIds = new Set();
  for (const p of ancestors) { if (p && !seenIds.has(p.id)) { uniq.push(p); seenIds.add(p.id); } }
  return uniq;
}

function getDescendants(id, seen = new Set()) {
  const person = peopleById[id];
  if (!person || !Array.isArray(person.descendants)) return [];
  const out = [];
  for (const childId of person.descendants) {
    const child = peopleById[childId] || null;
    if (child && !seen.has(child.id)) {
      out.push(child);
      seen.add(child.id);
      out.push(...getDescendants(child.id, seen));
    }
  }
  // dedupe
  const uniq = [];
  const ids = new Set();
  for (const p of out) { if (p && !ids.has(p.id)) { uniq.push(p); ids.add(p.id); } }
  return uniq;
}

// ---------- Themes / Filters (Messianic line kept intact in case you highlight later) ----------
const messianicLine = [
  "adam","seth","enos","enosh","kenan","mahalalel","jared","enoch","methuselah","lamach","lamech","noah",
  "shem","arapachshad","arphaxad","shelah","heber","peleg","reu","serug","nahor","terah","abraham",
  "isaac","jacob","judah","pharez","perez","hezron","ram","amminadab","nahshon","salmon","boaz",
  "obed","jesse","david","solomon","rehoboam","abijah","asa","jehoshaphat","joram","uzziah","jotham",
  "ahaz","hezekiah","manasseh","amon","josiah","jeconiah","jehoiachin","shealtiel","zerubbabel",
  "abiud","eliakim","azor","zadok","achim","eliud","eleazar","matthan","jacob","joseph","jesus"
].map(s => s.toLowerCase());

function highlightMessianicLine() {
  document.querySelectorAll('.highlight-messianic').forEach(n => n.classList.remove('highlight-messianic'));
  messianicLine.forEach(id => {
    const match = Object.values(peopleById).find(p => p.id && p.id.toLowerCase() === id);
    if (!match) return;
    const el = document.querySelector(`[data-person-id="${match.id}"]`);
    if (el) el.classList.add("highlight-messianic");
  });
}

function listChronologically() {
  const ordered = Object.values(peopleById)
    .filter(p => p && typeof p.scripture === 'string' && p.scripture.trim().length)
    .sort((a, b) => a.scripture.localeCompare(b.scripture));
  displayResults("Biblical Figures (Approximate Order)", ordered.slice(0, 250)); // cap to keep UI snappy
}

// ---------- Compare ----------
function comparePeople(id1, id2) {
  const p1 = peopleById[id1];
  const p2 = peopleById[id2];
  const modal = document.getElementById("infoModal");
  const content = document.getElementById("person-info");
  modal.style.display = "block";
  content.innerHTML = `
    <h2>Compare ${p1?.name || id1} and ${p2?.name || id2}</h2>
    <div class="compare-grid">
      <div>
        <h3>${p1?.name || 'Unknown'}</h3>
        <p>${p1?.bio || 'No biography available.'}</p>
        <small class="scripture-refs">${p1?.scripture || ''}</small>
      </div>
      <div>
        <h3>${p2?.name || 'Unknown'}</h3>
        <p>${p2?.bio || 'No biography available.'}</p>
        <small class="scripture-refs">${p2?.scripture || ''}</small>
      </div>
    </div>
  `;
}

// ---------- Results rendering ----------
function displayResults(title, list) {
  const modal = document.getElementById("infoModal");
  const content = document.getElementById("person-info");
  modal.style.display = "block";

  if (!list || list.length === 0) {
    content.innerHTML = `<h2>${title}</h2><p>No matching entries found.</p>`;
    return;
  }

  content.innerHTML = `
    <h2>${title} (${list.length})</h2>
    <div class="search-results">
      ${list.map(p => `
        <div class="search-result-item" data-person-id="${p.id}">
          <strong>${p.name}</strong>
          <p>${(p.bio || '').substring(0, 220)}${(p.bio && p.bio.length > 220) ? '…' : ''}</p>
        </div>
      `).join('')}
    </div>
  `;

  content.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      modal.style.display = "none";
      jumpToPerson(item.dataset.personId);
    });
  });
}

// ---------- Jump / Breadcrumb / Stats ----------
function jumpToPerson(personId) {
  const person = findPerson(personId) || (fuzzyFind(personId)[0] || null);
  if (!person) {
    console.error('Person not found:', personId);
    return;
  }

  expandedNodes.clear();
  currentPath = [person.name];

  const root = document.getElementById('tree-root');
  root.innerHTML = '';
  const node = createNode(person);
  root.appendChild(node);
  updateBreadcrumb(currentPath);
}

function updateBreadcrumb(path) {
  const breadcrumb = document.getElementById("breadcrumb");
  breadcrumb.innerHTML = path.map((name) =>
    `<span class="breadcrumb-item">${name}</span>`
  ).join(' → ');
}

function updateStats() {
  const count = Object.keys(peopleById).length;
  const el = document.getElementById('person-count');
  if (el) el.textContent = count;
}

// ---------- Boot ----------
window.addEventListener('DOMContentLoaded', loadGenealogyData);
