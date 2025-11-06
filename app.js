// ============================================================
// Biblical Genealogy Interactive Tree with Full Database
// ============================================================

// The complete genealogy database
const genealogyData = {
  "root": {
    "id": "adam",
    "name": "Adam & Eve",
    "bio": "The first humans created by God in His image. Adam named all the animals and was given dominion over creation. Eve was created from Adam's rib as his helper. They lived in the Garden of Eden until the Fall, when they ate the forbidden fruit and brought sin into the world. They had three named sons: Cain, Abel, and Seth.",
    "scripture": "Gen 1:26-27; 2:7-25; 3:1-24; 5:1-5",
    "descendants": ["cain", "abel", "seth"]
  },
  // ... [Include the ENTIRE JSON genealogy database here - all 400+ entries]
  // For brevity in this response, I'm showing the structure. 
  // You would paste the complete JSON from the artifact here.
};

// State management
let currentPath = [];
let expandedNodes = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTree();
  setupEventListeners();
  updateStats();
});

function initializeTree() {
  const root = document.getElementById("tree-root");
  const rootPerson = genealogyData.root;
  const rootNode = createNode(rootPerson, genealogyData);
  root.innerHTML = '';
  root.appendChild(rootNode);
  updateBreadcrumb([rootPerson.name]);
}

function createNode(personData, dataSource) {
  const div = document.createElement("div");
  div.className = "node-box";
  div.dataset.personId = personData.id;
  
  // Add visual indicator if person has descendants
  const hasDescendants = personData.descendants && personData.descendants.length > 0;
  div.innerHTML = `
    <span class="node-name">${personData.name}</span>
    ${hasDescendants ? '<span class="expand-indicator">▼</span>' : ''}
  `;

  // Single click to expand
  div.addEventListener("click", e => {
    e.stopPropagation();
    if (hasDescendants) {
      toggleBranch(div, personData, dataSource);
    }
  });

  // Double click for details
  div.addEventListener("dblclick", e => {
    e.stopPropagation();
    openModal(personData);
  });

  return div;
}

function toggleBranch(container, personData, dataSource) {
  const personId = personData.id;
  const existing = container.nextElementSibling;
  
  // If branch exists, toggle it
  if (existing && existing.classList.contains("branch") && existing.dataset.parentId === personId) {
    if (expandedNodes.has(personId)) {
      existing.remove();
      expandedNodes.delete(personId);
      container.querySelector('.expand-indicator').textContent = '▼';
    }
    return;
  }

  // Create new branch
  if (!personData.descendants || personData.descendants.length === 0) return;

  const branch = document.createElement("div");
  branch.className = "branch active";
  branch.dataset.parentId = personId;

  personData.descendants.forEach(childId => {
    const childData = dataSource[childId];
    if (childData) {
      const childNode = createNode(childData, dataSource);
      branch.appendChild(childNode);
    }
  });

  container.insertAdjacentElement("afterend", branch);
  expandedNodes.add(personId);
  container.querySelector('.expand-indicator').textContent = '▲';
  
  // Update breadcrumb
  currentPath.push(personData.name);
  updateBreadcrumb(currentPath);
}

function openModal(personData) {
  const modal = document.getElementById("infoModal");
  const modalContent = document.getElementById("person-info");
  
  modal.style.display = "block";
  modalContent.innerHTML = `
    <h2>${personData.name}</h2>
    <div class="bio-section">
      <h3>Biography</h3>
      <p>${personData.bio}</p>
    </div>
    <div class="scripture-section">
      <h3>📖 Scripture References</h3>
      <p class="scripture-refs">${personData.scripture}</p>
    </div>
    ${personData.descendants && personData.descendants.length > 0 ? `
      <div class="descendants-section">
        <h3>Descendants</h3>
        <p>${personData.descendants.length} direct descendant(s) recorded</p>
      </div>
    ` : ''}
  `;
}

function setupEventListeners() {
  // Modal close
  const modal = document.getElementById("infoModal");
  const closeBtn = document.querySelector(".close");
  closeBtn.onclick = () => (modal.style.display = "none");
  window.onclick = e => {
    if (e.target === modal) modal.style.display = "none";
  };

  // Search functionality
  const searchBtn = document.getElementById("search-btn");
  const searchInput = document.getElementById("search-input");
  
  searchBtn.addEventListener('click', () => performSearch(searchInput.value));
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch(searchInput.value);
  });

  // Quick navigation buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const personId = btn.dataset.person;
      jumpToPerson(personId);
    });
  });
}

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
        ${results.map(([id, person]) => `
          <div class="search-result-item" data-person-id="${id}">
            <strong>${person.name}</strong>
            <p>${person.bio.substring(0, 150)}...</p>
          </div>
        `).join('')}
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
  const person = genealogyData[personId];
  if (!person) return;

  // Reset tree
  expandedNodes.clear();
  currentPath = [];
  
  const root = document.getElementById("tree-root");
  root.innerHTML = '';
  
  const node = createNode(person, genealogyData);
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
  const count = Object.keys(genealogyData).length - 1; // -1 for root
  document.getElementById('person-count').textContent = count;
}