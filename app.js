fetch("people.json")
  .then(res => res.json())
  .then(people => {
    const list = document.getElementById("genealogy");
    const panel = document.getElementById("details");

    people.forEach(p => {
      const div = document.createElement("div");
      div.className = "name";
      div.textContent = p.name;
      div.addEventListener("click", () => showDetails(p));
      list.appendChild(div);
    });

    function showDetails(p) {
      panel.innerHTML = `
        <h2>${p.name}</h2>
        <p><em>${p.tribe}</em></p>
        <p>${p.desc}</p>
        <h3>Significance</h3>
        <p>${p.significance}</p>
        <h4>Scripture References</h4>
        ${p.verses.map(v => 
          `<a class="verse" href="https://www.biblegateway.com/passage/?search=${encodeURIComponent(v)}" target="_blank">${v}</a>`
        ).join("")}
      `;
    }
  });
