// ==========================================================
// Biblical Genealogy Interactive Script (No inline onclicks)
// ==========================================================

// All data is contained right here (inline — no fetch needed)
const people = [
  {
    id: "abraham",
    name: "Abraham",
    tribe: "Hebrew / Patriarch",
    desc: "Father of faith; through him all nations are blessed (Gen 12:1-3).",
    significance:
      "God’s covenant with Abraham is everlasting and unconditional — a promise of land, descendants, and blessing to all nations through his seed. This covenant remains active and foundational for both Israel and believing Gentiles.",
    verses: [
      "Genesis 12:1-3",
      "Genesis 15:5-18",
      "Romans 4:13-17",
      "Galatians 3:6-29"
    ]
  },
  {
    id: "judah",
    name: "Judah",
    tribe: "Tribe of Judah",
    desc: "Fourth son of Jacob; received the scepter promise (Gen 49:8-10).",
    significance:
      "Through Judah, the royal line was established — leading to David and ultimately the Messiah. This preserves the Abrahamic covenant’s continuation through the house of David.",
    verses: ["Genesis 49:8-10", "Revelation 7:5"]
  },
  {
    id: "david",
    name: "David",
    tribe: "Judah",
    desc: "King to whom God swore an everlasting throne (2 Sam 7).",
    significance:
      "The Davidic covenant expands on the Abrahamic one, promising that a descendant of David will reign forever — fulfilled in Jesus, the Messiah.",
    verses: ["2 Samuel 7:12-16", "Psalm 89:3-4", "Luke 1:31-33"]
  },
  {
    id: "jesus",
    name: "Jesus (Yeshua)",
    tribe: "Judah",
    desc: "The promised Messiah; fulfiller of all covenants.",
    significance:
      "Through Christ, the blessing of Abraham extends to all nations. The 144,000 in Revelation symbolize the sealed remnant from Israel, showing that God’s covenant with the tribes still stands while Gentiles are grafted in through faith.",
    verses: ["Luke 3:23-38", "Galatians 3:14", "Revelation 7:4-10"]
  }
];

// =============================
// Utility functions
// =============================

// Creates clickable genealogy names
function renderGenealogy() {
  const list = document.getElementById("genealogy");
  if (!list) return;

  list.innerHTML = ""; // Clear any existing content

  people.forEach(p => {
    const div = document.createElement("div");
    div.className = "name";
    div.textContent = p.name;
    div.dataset.id = p.id;
    div.addEventListener("click", () => showDetails(p));
    list.appendChild(div);
  });
}

// Displays detailed info in the side panel
function showDetails(p) {
  const panel = document.getElementById("details");
  if (!panel) return;

  panel.innerHTML = `
    <h2>${p.name}</h2>
    <p><em>${p.tribe}</em></p>
    <p>${p.desc}</p>
    <h3>Significance</h3>
    <p>${p.significance}</p>
    <h4>Scripture References</h4>
    <ul class="verses">
      ${p.verses
        .map(
          v =>
            `<li><a href="https://www.biblegateway.com/passage/?search=${encodeURIComponent(
              v
            )}" target="_blank">${v}</a></li>`
        )
        .join("")}
    </ul>
  `;
}

// Initialize once the page loads
document.addEventListener("DOMContentLoaded", renderGenealogy);
