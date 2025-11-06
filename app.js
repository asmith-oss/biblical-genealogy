 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/app.js b/app.js
index b11288abdbb6f00180833a9c7076536fe1a8ed23..e0a5852b4f81def4554ebf1273500dc65d8de793 100644
--- a/app.js
+++ b/app.js
@@ -4,208 +4,207 @@
 
 // Replace any hardcoded `const genealogyData = { ... }` with a loadable/normalized object:
 let genealogyData = {};
 
 // State management
 let currentPath = [];
 let expandedNodes = new Set();
 
 // Detect objects that look like person entries
 function isPersonObject(v) {
   return v && typeof v === 'object' && (
     'descendants' in v ||
     'bio' in v ||
     'scripture' in v ||
     'name' in v ||
     'id' in v
   );
 }
 
 // Recursively walk the raw JSON and collect person entries into outMap
 function flattenEntries(obj, outMap) {
   Object.entries(obj || {}).forEach(([key, value]) => {
     if (!value || typeof value !== 'object') return;
     if (isPersonObject(value)) {
       outMap[key] = {
+        ...value,
         id: value.id || key,
         name: value.name || prettifyKey(key),
-        bio: value.bio || '',
-        scripture: value.scripture || '',
-        descendants: Array.isArray(value.descendants) ? value.descendants.slice() : [],
-        ...value
+        bio: value.bio ?? '',
+        scripture: value.scripture ?? '',
+        descendants: Array.isArray(value.descendants) ? value.descendants.slice() : []
       };
     } else {
       // nested group — recurse
       flattenEntries(value, outMap);
     }
   });
 }
 
 async function loadGenealogyData() {
   try {
     const res = await fetch('./biblical_genealogy.json', { cache: "no-store" });
     if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.status} ${res.statusText}`);
     const raw = await res.json();
 
     // Flatten nested groups into a single id-keyed map
     const normalized = {};
     flattenEntries(raw, normalized);
 
     genealogyData = normalized;
     console.info('Genealogy loaded — person count:', Object.keys(genealogyData).length);
 
     initializeTree();
     setupEventListeners();
     updateStats();
   } catch (err) {
     console.error('Error loading genealogy data:', err);
-    // show fallback UI but still attempt init
-    initializeTree();
+    renderErrorState('Unable to load the genealogy dataset. Please ensure you are running the site from a local server or try refreshing the page.');
     setupEventListeners();
     updateStats();
   }
 }
 
 // helper: make key like "zerah_judah" -> "Zerah Judah" (optional)
 function prettifyKey(k) {
   return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
 }
 
 // Initialize after DOM ready, but only after we've attempted to load data
 document.addEventListener('DOMContentLoaded', () => {
   loadGenealogyData();
 });
 
 function initializeTree() {
   const root = document.getElementById("tree-root");
   // tolerant lookup for the root person
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
   
   // Add visual indicator if person has descendants
-  const hasDescendants = personData.descendants && personData.descendants.length > 0;
+  const hasDescendants = Array.isArray(personData.descendants) && personData.descendants.length > 0;
   div.innerHTML = `
     <span class="node-name">${personData.name}</span>
     ${hasDescendants ? '<span class="expand-indicator">▼</span>' : ''}
   `;
 
   // Single click to expand
   div.addEventListener("click", e => {
     e.stopPropagation();
     if (hasDescendants) {
       toggleBranch(div, personData);
     }
   });
 
   // Double click for details
   div.addEventListener("dblclick", e => {
     e.stopPropagation();
     openModal(personData);
   });
 
   return div;
 }
 
 function toggleBranch(container, personData) {
   const personId = personData.id;
   const existing = container.nextElementSibling;
 
   // If branch exists for this node, toggle collapse
   if (existing && existing.classList.contains("branch") && existing.dataset.parentId === personId) {
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
 
   // Create new branch (tolerant lookup for children)
-  const descendants = personData.descendants || [];
+  const descendants = Array.isArray(personData.descendants) ? personData.descendants : [];
   if (descendants.length === 0) return;
 
   const branch = document.createElement("div");
   branch.className = "branch active";
   branch.dataset.parentId = personId;
 
   descendants.forEach(childId => {
     // allow child lookup by key or by .id inside entries
     const childData = genealogyData[childId] || Object.values(genealogyData).find(p => p && p.id === childId);
     if (childData) {
       const childNode = createNode(childData);
       branch.appendChild(childNode);
     } else {
       console.warn(`Missing data for descendant: ${childId}`);
     }
   });
 
   container.insertAdjacentElement("afterend", branch);
   expandedNodes.add(personId);
   const indicator = container.querySelector('.expand-indicator');
   if (indicator) indicator.textContent = '▲';
 
   // update breadcrumb (avoid duplicates)
   if (!currentPath.length || currentPath[currentPath.length - 1] !== personData.name) {
     currentPath.push(personData.name);
     updateBreadcrumb(currentPath);
   }
 }
 
 function openModal(personData) {
   const modal = document.getElementById("infoModal");
   const modalContent = document.getElementById("person-info");
 
   const name = personData.name || personData.id || 'Unknown';
-  const bio = personData.bio || 'No biography available.';
-  const scripture = personData.scripture || 'No scripture refs.';
-  const descendantsCount = (personData.descendants && personData.descendants.length) || 0;
+  const bio = personData.bio && personData.bio.trim().length ? personData.bio : 'No biography available.';
+  const scripture = personData.scripture && personData.scripture.trim().length ? personData.scripture : 'No scripture refs.';
+  const descendantsCount = Array.isArray(personData.descendants) ? personData.descendants.length : 0;
 
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
 
 function setupEventListeners() {
   // Modal close
   const modal = document.getElementById("infoModal");
   const closeBtn = document.querySelector(".close");
   closeBtn.onclick = () => (modal.style.display = "none");
   window.onclick = e => {
@@ -233,76 +232,87 @@ function setupEventListeners() {
 function performSearch(query) {
   if (!query.trim()) return;
   
   const results = Object.entries(genealogyData)
     .filter(([id, person]) => 
       person.name && person.name.toLowerCase().includes(query.toLowerCase())
     )
     .slice(0, 10);
 
   if (results.length === 0) {
     alert('No matches found for: ' + query);
     return;
   }
 
   if (results.length === 1) {
     openModal(results[0][1]);
   } else {
     // Show search results in modal
     const modal = document.getElementById("infoModal");
     const modalContent = document.getElementById("person-info");
     modal.style.display = "block";
     
     modalContent.innerHTML = `
       <h2>Search Results for "${query}"</h2>
       <div class="search-results">
-        ${results.map(([id, person]) => `
+        ${results.map(([id, person]) => {
+          const snippetSource = (person.bio && person.bio.length > 0) ? person.bio : 'No biography available.';
+          const snippet = snippetSource.length > 150 ? `${snippetSource.slice(0, 150)}...` : snippetSource;
+          return `
           <div class="search-result-item" data-person-id="${id}">
             <strong>${person.name}</strong>
-            <p>${person.bio.substring(0, 150)}...</p>
+            <p>${snippet}</p>
           </div>
-        `).join('')}
+        `;
+        }).join('')}
       </div>
     `;
 
     // Add click handlers to search results
     modalContent.querySelectorAll('.search-result-item').forEach(item => {
       item.addEventListener('click', () => {
         const personId = item.dataset.personId;
         modal.style.display = "none";
         jumpToPerson(personId);
       });
     });
   }
 }
 
 function jumpToPerson(personId) {
   // tolerant lookup: direct key or find by .id
   const person = genealogyData[personId] || Object.values(genealogyData).find(p => p && p.id === personId);
   if (!person) {
     console.error(`Person not found: ${personId}`);
     return;
   }
 
   expandedNodes.clear();
   currentPath = [];
 
   const root = document.getElementById("tree-root");
   root.innerHTML = '';
 
   const node = createNode(person);
   root.appendChild(node);
 
   updateBreadcrumb([person.name]);
 }
 
 function updateBreadcrumb(path) {
   const breadcrumb = document.getElementById("breadcrumb");
   breadcrumb.innerHTML = path.map((name, i) => 
     `<span class="breadcrumb-item">${name}</span>`
   ).join(' → ');
 }
 
 function updateStats() {
   const count = Object.keys(genealogyData).length;
   document.getElementById('person-count').textContent = count;
-}
\ No newline at end of file
+}
+
+function renderErrorState(message) {
+  const root = document.getElementById('tree-root');
+  if (!root) return;
+  root.innerHTML = `<div class="error-state">${message}</div>`;
+  document.getElementById('breadcrumb').textContent = '';
+}
 
EOF
)