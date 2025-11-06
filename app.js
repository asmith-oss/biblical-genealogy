// ============================================================
// Biblical Genealogy Interactive Tree with Full Database
// ============================================================

// The complete genealogy database
const genealogyData = {
  "adam": {
    "id": "adam",
    "name": "Adam & Eve",
    "bio": "The first humans created by God in His image. Adam named all the animals and was given dominion over creation. Eve was created from Adam's rib as his helper. They lived in the Garden of Eden until the Fall, when they ate the forbidden fruit and brought sin into the world. They had three named sons: Cain, Abel, and Seth.",
    "scripture": "Gen 1:26-27; 2:7-25; 3:1-24; 5:1-5",
    "descendants": ["cain", "abel", "seth"]
  },
  "cain": {
    "id": "cain",
    "name": "Cain",
    "bio": "Firstborn son of Adam and Eve. A farmer who brought an offering of crops to God, which was not accepted. In jealousy, he murdered his brother Abel, becoming the first murderer. God marked him and sent him to wander in the land of Nod, east of Eden, where he built a city named after his son Enoch.",
    "scripture": "Gen 4:1-17, 25; Heb 11:4; 1 John 3:12; Jude 1:11",
    "descendants": ["enoch_cain"]
  },
  "abel": {
    "id": "abel",
    "name": "Abel",
    "bio": "Second son of Adam and Eve. A shepherd who brought the firstborn of his flock as an offering to God, which was accepted. He was murdered by his brother Cain out of jealousy. Abel is remembered as the first martyr and a man of faith whose blood cried out from the ground.",
    "scripture": "Gen 4:2-10, 25; Matt 23:35; Luke 11:51; Heb 11:4; 12:24",
    "descendants": []
  },
  "seth": {
    "id": "seth",
    "name": "Seth",
    "bio": "Third named son of Adam and Eve, born after Abel's murder. His name means 'appointed' or 'granted,' as Eve said God appointed him in place of Abel. Through Seth came the godly line that called upon the name of the LORD, leading ultimately to Noah and Christ.",
    "scripture": "Gen 4:25-26; 5:3-8; Luke 3:38",
    "descendants": ["enosh"]
  },
  // ... paste the REST of your genealogy data here with the same structure
  // Make sure EVERY entry has an "id" field matching its key
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
  const hasDescendants = personData.descendants && personData.descendants.length > 0;
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
  const descendants = personData.descendants || [];
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
}