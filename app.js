// ============================================================
// Expandable Genealogy Tree
// ============================================================

// Hierarchical genealogy data
const treeData = {
  id: "adam",
  name: "Adam & Eve",
  info: "The first humans (Genesis 1–3). The promise of a Redeemer begins in Genesis 3:15.",
  descendants: [
    {
      id: "cain",
      name: "Cain",
      info: "Firstborn; his line ends in the flood (Gen 4).",
      descendants: []
    },
    {
      id: "seth",
      name: "Seth",
      info: "Given in place of Abel; his line 'calls on the name of the Lord' (Gen 4:26).",
      descendants: [
        {
          id: "enosh",
          name: "Enosh",
          info: "Grandson of Adam; the faithful line continues (Gen 5:6–11).",
          descendants: [
            {
              id: "kenan",
              name: "Kenan",
              descendants: [
                {
                  id: "mahalalel",
                  name: "Mahalalel",
                  descendants: [
                    {
                      id: "jared",
                      name: "Jared",
                      descendants: [
                        {
                          id: "enoch",
                          name: "Enoch",
                          info: "Walked with God and was taken (Gen 5:24).",
                          descendants: [
                            {
                              id: "methuselah",
                              name: "Methuselah",
                              descendants: [
                                {
                                  id: "lamech",
                                  name: "Lamech",
                                  descendants: [
                                    {
                                      id: "noah",
                                      name: "Noah",
                                      info: "Builder of the ark; preserved the human race; received the Noahic covenant (Gen 6–9).",
                                      descendants: [
                                        {
                                          id: "shem",
                                          name: "Shem",
                                          info: "Blessed by Noah; through him the promise continues (Gen 9:26).",
                                          descendants: [
                                            {
                                              id: "arpachshad",
                                              name: "Arpachshad",
                                              descendants: [
                                                {
                                                  id: "shelah",
                                                  name: "Shelah",
                                                  descendants: [
                                                    {
                                                      id: "eber",
                                                      name: "Eber",
                                                      info: "Root of 'Hebrew'; ancestor of Abraham (Gen 10:21–25).",
                                                      descendants: [
                                                        {
                                                          id: "peleg",
                                                          name: "Peleg",
                                                          descendants: [
                                                            {
                                                              id: "reu",
                                                              name: "Reu",
                                                              descendants: [
                                                                {
                                                                  id: "serug",
                                                                  name: "Serug",
                                                                  descendants: [
                                                                    {
                                                                      id: "nahor",
                                                                      name: "Nahor",
                                                                      descendants: [
                                                                        {
                                                                          id: "terah",
                                                                          name: "Terah",
                                                                          descendants: [
                                                                            {
                                                                              id: "abraham",
                                                                              name: "Abraham",
                                                                              info: "Father of faith; God covenanted land, seed, and blessing (Gen 12; 15; 17).",
                                                                              descendants: [
                                                                                {
                                                                                  id: "isaac",
                                                                                  name: "Isaac",
                                                                                  descendants: [
                                                                                    {
                                                                                      id: "jacob",
                                                                                      name: "Jacob (Israel)",
                                                                                      info: "Father of 12 tribes; covenant reaffirmed (Gen 28; 35).",
                                                                                      descendants: [
                                                                                        {
                                                                                          id: "judah",
                                                                                          name: "Judah",
                                                                                          info: "Tribe of kings; 'the scepter shall not depart from Judah' (Gen 49:10).",
                                                                                          descendants: [
                                                                                            {
                                                                                              id: "perez",
                                                                                              name: "Perez",
                                                                                              descendants: [
                                                                                                {
                                                                                                  id: "hezron",
                                                                                                  name: "Hezron",
                                                                                                  descendants: [
                                                                                                    {
                                                                                                      id: "ram",
                                                                                                      name: "Ram",
                                                                                                      descendants: [
                                                                                                        {
                                                                                                          id: "amminadab",
                                                                                                          name: "Amminadab",
                                                                                                          descendants: [
                                                                                                            {
                                                                                                              id: "nahshon",
                                                                                                              name: "Nahshon",
                                                                                                              descendants: [
                                                                                                                {
                                                                                                                  id: "salmon",
                                                                                                                  name: "Salmon",
                                                                                                                  descendants: [
                                                                                                                    {
                                                                                                                      id: "boaz",
                                                                                                                      name: "Boaz",
                                                                                                                      info: "Kinsman-redeemer who married Ruth the Moabite, preserving the line of Judah.",
                                                                                                                      descendants: [
                                                                                                                        {
                                                                                                                          id: "obed",
                                                                                                                          name: "Obed",
                                                                                                                          descendants: [
                                                                                                                            {
                                                                                                                              id: "jesse",
                                                                                                                              name: "Jesse",
                                                                                                                              descendants: [
                                                                                                                                {
                                                                                                                                  id: "david",
                                                                                                                                  name: "David",
                                                                                                                                  info: "King of Israel; received the Davidic covenant—eternal throne through his seed (2 Sam 7).",
                                                                                                                                  descendants: [
                                                                                                                                    {
                                                                                                                                      id: "jesus",
                                                                                                                                      name: "Jesus (Messiah)",
                                                                                                                                      info: "Son of David, Son of Abraham; fulfiller of all covenants.",
                                                                                                                                      descendants: []
                                                                                                                                    }
                                                                                                                                  ]
                                                                                                                                }
                                                                                                                              ]
                                                                                                                            }
                                                                                                                          ]
                                                                                                                        }
                                                                                                                      ]
                                                                                                                    }
                                                                                                                  ]
                                                                                                                }
                                                                                                              ]
                                                                                                            }
                                                                                                          ]
                                                                                                        }
                                                                                                      ]
                                                                                                    }
                                                                                                  ]
                                                                                                }
                                                                                              ]
                                                                                            }
                                                                                          ]
                                                                                        }
                                                                                      ]
                                                                                    }
                                                                                  ]
                                                                                }
                                                                              ]
                                                                            }
                                                                          ]
                                                                        }
                                                                      ]
                                                                    }
                                                                  ]
                                                                }
                                                              ]
                                                            }
                                                          ]
                                                        }
                                                      ]
                                                    }
                                                  ]
                                                }
                                              ]
                                            }
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// ============================================================
// Rendering logic
// ============================================================

function createNode(person) {
  const div = document.createElement("div");
  div.className = "node-box";
  div.textContent = person.name;

  div.addEventListener("click", e => {
    e.stopPropagation(); // Prevent parent collapse
    toggleBranch(div, person);
  });

  // Optional info popup below node
  if (person.info) {
    const infoDiv = document.createElement("div");
    infoDiv.className = "person-info";
    infoDiv.textContent = person.info;
    div.appendChild(infoDiv);
  }

  return div;
}

function toggleBranch(container, person) {
  const existing = container.nextSibling;
  if (existing && existing.classList.contains("branch")) {
    existing.remove(); // Collapse branch
    return;
  }

  if (!person.descendants || person.descendants.length === 0) return;

  const branch = document.createElement("div");
  branch.className = "branch";

  person.descendants.forEach(child => {
    const childNode = createNode(child);
    branch.appendChild(childNode);
  });

  container.insertAdjacentElement("afterend", branch);
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("tree-root");
  const rootNode = createNode(treeData);
  root.appendChild(rootNode);
});
