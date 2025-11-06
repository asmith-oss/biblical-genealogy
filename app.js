// ============================================================
// Biblical Genealogy Interactive Tree (Upgraded v2)
// Desktop + Mobile/Tablet Friendly — UTF-8 safe symbols
// Added: forgiving text search with normalization (no exact-format requirement)
// ============================================================

let genealogyData = {};
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
function flattenEntries(obj, outMap) {
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return;
    if (isPersonObject(value)) {
      const mapKey = (value.id && String(value.id)) || key;
      outMap[mapKey] = {
        id: value.id || mapKey,
        name: value.name || prettifyKey(mapKey),
        bio: value.bio || '',
        scripture: value.scripture || '',
        descendants: Array.isArray(value.descendants) ? value.descendants.slice() : [],
        __sourceKey: key,
        ...value
      };
      if (mapKey !== key) outMap[key] = outMap[mapKey];
    } else {
      flattenEntries(value, outMap);
    }
  });
}

// Normalize text (for search)
function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, "") // remove punctuation/symbols
    .replace(/\s+/g, " ") // collapse spaces
    .trim();
}

function isScriptureQuery(q) {
  // e.g., "Genesis 5", "1 Samuel 17", "Matt 1", "Rom 11:17"
  const re = /^\s*(?:[1-3]\s*)?[A-Za-z.]+(?:\s+[A-Za-z.]+)?\s+\d+(?::\d+(-\d+)?)?\s*$/;
  return re.test(q);
}

function findPerson(idOrName) {
  if (!idOrName) return null;
  const q = normalizeText(idOrName);

  // Direct ID match
  if (genealogyData[idOrName]) return genealogyData[idOrName];

  // Match by normalized id or name
  for (const p of Object.values(genealogyData)) {
    if (!p) continue;
    if (normalizeText(p.id) === q) return p;
    if (normalizeText(p.name) === q) return p;
  }

  return null;
}

function fuzzyFind(nameLike) {
  if (!nameLike) return [];
  const q = normalizeText(nameLike);
  return Object.values(genealogyData).filter(p => {
    const n = normalizeText(p.name);
    const i = normalizeText(p.id);
    const b = normalizeText(p.bio || "");
    return n.includes(q) || i.includes(q) || b.includes(q);
  });
}

// ---------- Load Data ----------
async function loadGenealogyData() {
  try {
    const res = await fetch('./biblical_genealogy.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.status} ${res.statusText}`);
    const raw = await res.json();
    const source = raw && raw.genealogy ? raw.genealogy : raw;

    const normalized = {};
    flattenEntries(source, normalized);
    genealogyData = normalized;

    initializeTree();
    setupEventListeners();
    updateStats();

    console.info('Genealogy loaded — people:', Object.keys(genealogyData).length);
  } catch (err) {
    console.error('Error loading genealogy data:', err);
    initializeTree();
    setupEventListeners();
    updateStats();
  }
}

// ---------- Tree ----------
function initializeTree() {
  const root = document.getElementById("tree-root");

  const rootPerson =
    genealogyData["adam"] ||
    genealogyData.root ||
    Object.values(genealogyData).find(p => p && p.id === "adam") ||
    Object.values(genealogyData)[0];

  if (!rootPerson) {
    console.error("No root person found in genealogyData");
    return;
  }

  const rootNode = createNode(rootPerson);
  root.innerHTML = '';
  root.appendChild(rootNode);
  currentPath = [rootPerson.name];
  updateBreadcrumb(currentPath);
}

function createNode(personData) {
  const div = document.createElement("div");
  div.className = "node-box";
  div.dataset.personId = personData.id;

  const hasDescendants = personData.descendants && personData.descendants.length > 0;
  div.innerHTML = `
    <span class="node-name">${personData.name}</span>
    ${hasDescendants ? '<span class="expand-indicator">▼</span>' : ''}
  `;

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

  const descendants = personData.descendants || [];
  if (descendants.length === 0) return;

  const branch = document.createElement("div");
  branch.className = "branch active";
  branch.dataset.parentId = personId;

  descendants.forEach(childId => {
    const childData = genealogyData[childId] || Object.values(genealogyData).find(p => p && p.id === childId);
    if (childData) {
      branch.appendChild(createNode(childData));
    } else {
      console.warn(`Missing data for descendant: ${childId}`);
    }
  });

  container.insertAdjacentElement("afterend", branch);
  expandedNodes.add(personId);
  const indicator = container.querySelector('.expand-indicator');
  if (indicator) indicator.textContent = '▲';

  if (!currentPath.length || currentPath[currentPath.length - 1] !== personData.name) {
    currentPath.push(personData.name);
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
  const descendantsCount = (personData.descendants && personData.descendants.length) || 0;

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

// ---------- Global UI / Events ----------
function setupEventListeners() {
  // Modal close
  const modal = document.getElementById("infoModal");
  const closeBtn = document.querySelector(".close");
  closeBtn.onclick = () => (modal.style.display = "none");
  window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };

  // Search
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  searchBtn.addEventListener('click', () => smartSearch(searchInput.value));
  searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') smartSearch(searchInput.value); });

  // Quick navigation buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => jumpToPerson(btn.dataset.person));
  });

  // Lineage tools
  document.getElementById('btn-ancestors').addEventListener('click', () => {
    const id = document.getElementById('lin-person').value.trim();
    if (!id) return alert('Enter a person id or name');
    const person = findPerson(id) || (fuzzyFind(id)[0] || null);
    if (!person) return alert('Person not found');
    const list = getAncestors(person.id);
    displayResults(`Ancestors of ${person.name}`, list);
  });

  document.getElementById('btn-descendants').addEventListener('click', () => {
    const id = document.getElementById('lin-person').value.trim();
    if (!id) return alert('Enter a person id or name');
    const person = findPerson(id) || (fuzzyFind(id)[0] || null);
    if (!person) return alert('Person not found');
    const list = getDescendants(person.id);
    displayResults(`Descendants of ${person.name}`, list);
  });

  document.getElementById('btn-highlight-messianic').addEventListener('click', () => {
    highlightMessianicLine();
    alert('Messianic line highlighted (if nodes are visible). Tip: navigate to Adam or David first.');
  });

  // Compare
  document.getElementById('btn-compare').addEventListener('click', () => {
    const a = document.getElementById('cmp-a').value.trim();
    const b = document.getElementById('cmp-b').value.trim();
    if (!a || !b) return alert('Enter both people to compare');
    const p1 = findPerson(a) || (fuzzyFind(a)[0] || null);
    const p2 = findPerson(b) || (fuzzyFind(b)[0] || null);
    if (!p1 || !p2) return alert('One or both people not found');
    comparePeople(p1.id, p2.id);
  });

  // Tribe & roles
  document.getElementById('btn-tribe').addEventListener('click', () => {
    const tribe = document.getElementById('tribe-select').value;
    if (!tribe) return;
    listTribe(tribe);
  });
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => filterByRole(btn.dataset.role));
  });

  // Timeline
  document.getElementById('btn-chronology').addEventListener('click', listChronologically);
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
  const results = Object.values(genealogyData).filter(p =>
    p.scripture && p.scripture.toLowerCase().includes(ref.toLowerCase())
  );
  displayResults(`People connected to ${ref}`, results);
}

// ---------- Lineage helpers ----------
function getAncestors(id, seen = new Set()) {
  const ancestors = [];
  for (const person of Object.values(genealogyData)) {
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
  const person = genealogyData[id];
  if (!person || !Array.isArray(person.descendants)) return [];
  const out = [];
  for (const childId of person.descendants) {
    const child = genealogyData[childId] || null;
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

// ---------- Themes / Filters ----------
function listTribe(tribe) {
  const t = String(tribe).toLowerCase();
  const tribeMembers = Object.values(genealogyData).filter(p =>
    (p.bio && p.bio.toLowerCase().includes(t)) ||
    (p.name && p.name.toLowerCase().includes(t))
  );
  displayResults(`${tribe} Tribe`, tribeMembers);
}

function filterByRole(keyword) {
  const k = String(keyword).toLowerCase();
  const matches = Object.values(genealogyData).filter(p =>
    p.bio && p.bio.toLowerCase().includes(k)
  );
  const title = k === 'woman' ? 'Women of Faith' : `People associated with "${keyword}"`;
  displayResults(title, matches);
}

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
    // accept exact id or a person whose id matches case-insensitively
    const match = Object.values(genealogyData).find(p => p.id && p.id.toLowerCase() === id);
    if (!match) return;
    const el = document.querySelector(`[data-person-id="${match.id}"]`);
    if (el) el.classList.add("highlight-messianic");
  });
}

function listChronologically() {
  const ordered = Object.values(genealogyData)
    .filter(p => p && typeof p.scripture === 'string' && p.scripture.trim().length)
    .sort((a, b) => a.scripture.localeCompare(b.scripture));
  displayResults("Biblical Figures (Approximate Order)", ordered.slice(0, 250)); // cap to keep UI snappy
}

// ---------- Compare ----------
function comparePeople(id1, id2) {
  const p1 = genealogyData[id1];
  const p2 = genealogyData[id2];
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
    <h2>${title}
