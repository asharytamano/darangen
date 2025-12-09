console.log("✅ tafsir.js loaded");
console.log("REST API root:", tafsirAPI.root);

let currentResults = [];
let currentPage = 1;
const perPage = 20;

async function loadSurahs() {
  console.log("📡 Calling:", tafsirAPI.root + "surahs");

  try {
    const res = await fetch(tafsirAPI.root + "surahs");
    console.log("🔎 Response status:", res.status);

    const surahs = await res.json();
    console.log("📦 Surahs data:", surahs);

    const list = document.getElementById("surah-list");
    list.innerHTML = "<h3>Surahs</h3>";

    surahs.forEach(function (s) {
      const div = document.createElement("div");
      div.className = "surah-item";
      div.innerHTML =
        s.surah_number +
        ". " +
        s.surah_name_en +
        '<span class="surah-arabic">' +
        s.surah_name_ar +
        "</span>";
      div.onclick = function () {
        document
          .querySelectorAll(".surah-item")
          .forEach(function (item) {
            item.classList.remove("active");
          });
        div.classList.add("active");
        loadSurah(s.surah_number, s.surah_name_en, s.surah_name_ar);
      };
      list.appendChild(div);
    });

    document.getElementById("surah-title").innerText =
      "Select a Surah or Search";
    document.getElementById("ayahs").innerHTML = "";
    document.getElementById("pagination").innerHTML = "";
  } catch (err) {
    console.error("❌ Error loading surahs:", err);
  }
}

async function loadSurah(id, nameEn, nameAr) {
  console.log("📡 Loading surah:", id);

  const res = await fetch(tafsirAPI.root + "surah?id=" + id);
  const surah = await res.json();

  document.getElementById("surah-title").innerText =
    surah.surah_number + ". " + nameEn + " (" + nameAr + ")";

  currentResults = surah.ayahs || [];
  currentPage = 1;
  renderAyahs();
}

async function searchAyahs() {
  const q = document.getElementById("search-input").value.trim();
  const exact = document.getElementById("exact-match").checked ? 1 : 0;

  if (!q) {
    alert("Enter a keyword to search");
    return;
  }

  document.getElementById("surah-title").innerText =
    "Search results for: " + q;
  document.getElementById("ayahs").innerHTML = "Searching...";

  try {
    const res = await fetch(
      tafsirAPI.root +
        "search?q=" +
        encodeURIComponent(q) +
        "&exact=" +
        exact
    );
    let results = await res.json();

    // 🔎 Prepare regex for highlighting
    const keywords = q.split(/\s+/).filter(function (k) {
      return k.length > 0;
    });
    const regex = new RegExp("(" + keywords.join("|") + ")", "gi");

    // ✅ Highlight matches safely (avoid null errors)
    results = results.map(function (r) {
      return {
        surah: r.surah,
        ayah: r.ayah,
        quran_text: (r.quran_text || "").replace(regex, "<mark>$1</mark>"),
        maranao_translation: (r.maranao_translation || "").replace(
          regex,
          "<mark>$1</mark>"
        ),
        tafsir_text_original: (r.tafsir_text_original || "").replace(
          regex,
          "<mark>$1</mark>"
        ),
      };
    });

    currentResults = results;
    currentPage = 1;
    renderAyahs();

    // Reset active surah highlight (since this is a search result)
    document.querySelectorAll(".surah-item").forEach(function (item) {
      item.classList.remove("active");
    });
  } catch (err) {
    console.error("❌ Search failed:", err);
    document.getElementById("ayahs").innerHTML =
      "<p style='color:red;'>Error searching. Please try again.</p>";
  }
}

function renderAyahs() {
  const ayahsDiv = document.getElementById("ayahs");
  ayahsDiv.innerHTML = "";

  if (!currentResults || currentResults.length === 0) {
    ayahsDiv.innerHTML = "<p>No results found.</p>";
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  // ✅ Insert Basmala image for all Surahs except 1 and 9
  if (currentResults.length > 0) {
    const surahNum = currentResults[0].surah;
    if (surahNum !== "1" && surahNum !== "9") {
      const basmalaDiv = document.createElement("div");
      basmalaDiv.className = "basmala-intro";
      basmalaDiv.innerHTML = `
        <img src="https://main.maranaw.com/wp-content/uploads/2025/09/bismillah-scaled.webp"
             alt="Bismillah" class="basmala-img" />
      `;
      ayahsDiv.appendChild(basmalaDiv);
    }
  }

  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const pageItems = currentResults.slice(start, end);

  pageItems.forEach(function (r, index) {
    const id = index + start;
    const div = document.createElement("div");
    div.className = "ayah";
    div.id = "ayah-" + id;

    div.innerHTML = `
      <div><strong>Surah ${r.surah}, Ayah ${r.ayah}</strong></div>
      <div class="quran">${r.quran_text}</div>
      <div class="translation">🔹 ${r.maranao_translation}</div>

      <div class="ayah-actions">
        <button onclick="toggleTafsir(${id})">Show Tafsir</button>
        <button onclick="toggleFavorite(${id})">⭐ Add to Favorites</button>
        <button onclick="copyAyah(${id})">📋 Copy</button>
        <button onclick="shareAyah(${id})">🔗 Share</button>
      </div>

      <div id="tafsir-${id}" class="tafsir">📖 ${r.tafsir_text_original}</div>
      <div id="share-links-${id}" class="share-links" style="display:none;"></div>
    `;
    ayahsDiv.appendChild(div);
  });

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(currentResults.length / perPage);
  const pagDiv = document.getElementById("pagination");
  pagDiv.innerHTML = "";

  if (totalPages <= 1) return;

  if (currentPage > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.innerText = "Prev";
    prevBtn.onclick = function () {
      currentPage--;
      renderAyahs();
    };
    pagDiv.appendChild(prevBtn);
  }

  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.innerText = i;
    if (i === currentPage) {
      pageBtn.style.fontWeight = "bold";
      pageBtn.style.background = "#ddd";
    }
    pageBtn.onclick = function () {
      currentPage = i;
      renderAyahs();
    };
    pagDiv.appendChild(pageBtn);
  }

  if (currentPage < totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Next";
    nextBtn.onclick = function () {
      currentPage++;
      renderAyahs();
    };
    pagDiv.appendChild(nextBtn);
  }
}

function toggleTafsir(index) {
  // 1. Hide all tafsirs first
  document.querySelectorAll(".tafsir").forEach(function (el) {
    el.style.display = "none";
  });

  // 2. Reset all "Show/Hide" button texts
  document
    .querySelectorAll(".ayah-actions button:first-child")
    .forEach(function (btn) {
      btn.innerText = "Show Tafsir";
    });

  // 3. Then toggle only the selected one
  const tafsirDiv = document.getElementById("tafsir-" + index);
  const button = tafsirDiv.previousElementSibling.querySelector("button");

  if (tafsirDiv.style.display === "none" || tafsirDiv.style.display === "") {
    tafsirDiv.style.display = "block";
    button.innerText = "Hide Tafsir";
  } else {
    tafsirDiv.style.display = "none";
    button.innerText = "Show Tafsir";
  }
}

function toggleFavorite(id) {
  const ayahDiv = document.getElementById("ayah-" + id);
  const surah = ayahDiv.querySelector("strong").innerText;
  const quran = ayahDiv.querySelector(".quran").innerText;
  const translation = ayahDiv.querySelector(".translation").innerText;

  let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

  const exists = favorites.find(function (f) {
    return f.id === id;
  });
  if (exists) {
    favorites = favorites.filter(function (f) {
      return f.id !== id;
    });
    localStorage.setItem("favorites", JSON.stringify(favorites));
    alert("Removed from Favorites");
    ayahDiv.querySelector(
      ".ayah-actions button:nth-child(2)"
    ).innerText = "⭐ Add to Favorites";
  } else {
    favorites.push({ id: id, surah: surah, quran: quran, translation: translation });
    localStorage.setItem("favorites", JSON.stringify(favorites));
    alert("Added to Favorites.\n\nClick ⭐ View Favorites above to see your saved ayahs.");
    ayahDiv.querySelector(
      ".ayah-actions button:nth-child(2)"
    ).innerText = "⭐ Remove from Favorites";
  }
}

function copyAyah(id) {
  const ayahDiv = document.getElementById("ayah-" + id);
  const surahAyah = ayahDiv.querySelector("strong").innerText;
  const quran = ayahDiv.querySelector(".quran").innerText;
  const translation = ayahDiv.querySelector(".translation").innerText;
  const tafsirDiv = ayahDiv.querySelector(".tafsir");
  const tafsir = tafsirDiv ? tafsirDiv.innerText : "";

  const text =
    surahAyah + "\n" + quran + "\n" + translation + (tafsir ? "\n" + tafsir : "");
  navigator.clipboard.writeText(text);
  alert("Copied to clipboard");
}

function shareAyah(id) {
  const ayahDiv = document.getElementById("ayah-" + id);
  const surahAyah = ayahDiv.querySelector("strong").innerText;
  const quran = ayahDiv.querySelector(".quran").innerText;
  const translation = ayahDiv.querySelector(".translation").innerText;

  const text = surahAyah + "\n" + quran + "\n" + translation;
  const shareUrl = window.location.href;

  if (navigator.share) {
    navigator
      .share({
        title: "Maranao Tafsir",
        text: text,
        url: shareUrl,
      })
      .catch((err) => console.log("Share cancelled:", err));
  } else {
    // Desktop fallback
    const encoded = encodeURIComponent(text + "\n" + shareUrl);
    const fb = "https://www.facebook.com/sharer/sharer.php?u=" + encoded;
    const tw = "https://twitter.com/intent/tweet?text=" + encoded;
    const wa = "https://wa.me/?text=" + encoded;

    window.open(fb, "_blank", "width=600,height=400");
  }
}

loadSurahs();
