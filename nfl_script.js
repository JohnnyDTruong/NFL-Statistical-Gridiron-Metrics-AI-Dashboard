/* =========================================================
NFL SCRIPT - PLAYER STATS AND COMPARISON TABS
========================================================= */

let allPlayers = [];
let charts = {}; // store chart instances

// ===== DOM Elements =====
const teamSelect = document.getElementById("teamSelect");
const positionSelect = document.getElementById("positionSelect");
const seasonSelect = document.getElementById("seasonSelect");

// Main player search & dropdown
const playerSelectInput = document.getElementById("playerSelect");
const playerDropdown = document.getElementById("playerDropdown");

// Comparison search & dropdowns
const compareSeasonSelect = document.getElementById("compareSeasonSelect");
const comparePositionSelect = document.getElementById("comparePositionSelect");

const comparePlayer1Input = document.getElementById("comparePlayer1");
const compareDropdown1 = document.getElementById("compareDropdown1");

const comparePlayer2Input = document.getElementById("comparePlayer2");
const compareDropdown2 = document.getElementById("compareDropdown2");

const tabs = document.querySelectorAll(".tab");
const tabContents = document.querySelectorAll(".tab-content");

// ===== LOAD JSON =====
async function loadPlayersJSON() {
  try {
    const res = await fetch("stats_players_all.json");
    allPlayers = await res.json();

    // Expose GLOBALLY for nfl_script_2
    window.allPlayers = allPlayers;
    
    updatePlayerDropdown();
    updateComparePlayers();
  } catch (err) {
    console.error("Failed to load JSON:", err);
  }
}

// ===== HELPER: SORT BY FIRST NAME =====
function sortByFirstName(players) {
  return players.sort((a, b) => {
    const firstA = a.player_display_name.split(" ")[0];
    const firstB = b.player_display_name.split(" ")[0];
    return firstA.localeCompare(firstB);
  });
}

// ===== MAIN PLAYER DROPDOWN / SEARCH =====
function updatePlayerDropdown() {
  const season = Number(seasonSelect.value);
  const team = teamSelect.value.trim();
  const position = positionSelect.value.trim();

  playerDropdown.innerHTML = "";
  playerSelectInput.value = "";
  playerSelectInput.disabled = true;

  if (!season) return;

  let filtered = allPlayers.filter(p =>
    Number(p.season) === season &&
    (team === "" || p.recent_team === team) &&
    (position === "" || p.position === position || p.position_group === position)
  );

  filtered = sortByFirstName(filtered);

  filtered.forEach(p => {
    const div = document.createElement("div");
    div.className = "dropdown-item";
    div.dataset.name = p.player_display_name;
    div.innerHTML = p.player_display_name;
    playerDropdown.appendChild(div);
  });

  if (filtered.length > 0) {
    playerSelectInput.disabled = false;
  }
}

// ===== COMPARISON DROPDOWN / SEARCH =====
function updateComparePlayers() {
  const season = Number(compareSeasonSelect.value);
  const position = comparePositionSelect.value.trim();

  // Clear dropdowns
  compareDropdown1.innerHTML = "";
  compareDropdown2.innerHTML = "";

  comparePlayer1Input.value = "";
  comparePlayer2Input.value = "";

  comparePlayer1Input.disabled = true;
  comparePlayer2Input.disabled = true;

  if (!season) return;

  let filtered = allPlayers.filter(p =>
    Number(p.season) === season &&
    (position === "" || p.position === position || p.position_group === position)
  );

  filtered = sortByFirstName(filtered);

  filtered.forEach(p => {
    const div1 = document.createElement("div");
    div1.className = "dropdown-item";
    div1.dataset.name = p.player_display_name;
    div1.innerHTML = p.player_display_name;
    compareDropdown1.appendChild(div1);

    const div2 = document.createElement("div");
    div2.className = "dropdown-item";
    div2.dataset.name = p.player_display_name;
    div2.innerHTML = p.player_display_name;
    compareDropdown2.appendChild(div2);
  });

  if (filtered.length > 0) {
    comparePlayer1Input.disabled = false;
    comparePlayer2Input.disabled = false;
  }
}

// ===== ATTACH SEARCH LOGIC =====
function attachSearch(inputEl, dropdownEl, callback) {
  // Input typing / filtering
  inputEl.addEventListener("input", () => {
    const query = inputEl.value.toLowerCase();
    dropdownEl.classList.remove("hidden");

    [...dropdownEl.children].forEach(div => {
      const text = div.dataset.name.toLowerCase();
      if (text.includes(query)) {
        div.style.display = "block";
        // Highlight match
        if (query) {
          const regex = new RegExp(`(${query})`, "ig");
          div.innerHTML = div.dataset.name.replace(regex, '<span class="highlight">$1</span>');
        } else {
          div.innerHTML = div.dataset.name; // reset highlight if empty
        }
      } else {
        div.style.display = "none";
      }
    });
  });

  // Show all players when input is focused
  inputEl.addEventListener("focus", () => {
    dropdownEl.classList.remove("hidden");
    const query = inputEl.value.toLowerCase();
    [...dropdownEl.children].forEach(div => {
      if (!query) {
        div.style.display = "block";
        div.innerHTML = div.dataset.name; // reset highlight
      }
    });
  });

  // Click to select any part of the row
  dropdownEl.addEventListener("click", e => {
    let targetDiv = e.target;
    // If click on <span> inside item, get parent div
    if (!targetDiv.classList.contains("dropdown-item") && targetDiv.parentElement.classList.contains("dropdown-item")) {
      targetDiv = targetDiv.parentElement;
    }
    if (targetDiv.classList.contains("dropdown-item")) {
      inputEl.value = targetDiv.dataset.name;
      dropdownEl.classList.add("hidden");
      if (callback) callback(); // Render charts if needed
    }
  });

  // Hide dropdown if input loses focus
  inputEl.addEventListener("blur", () => {
    setTimeout(() => dropdownEl.classList.add("hidden"), 150);
  });
}

// ===== PLAYER CHARTS =====
function renderPlayerCharts() {
  const playerName = playerSelectInput.value;
  const position = positionSelect.value;
  const season = Number(seasonSelect.value);
  if (!playerName || !season) return;

  const player = allPlayers.find(p => p.player_display_name === playerName && Number(p.season) === season);
  if (!player) return;

  renderAdvancedStatsTable(player, position);

  const statMap = {
    QB: [
      { canvas: "chart1", title: "Passing Yards", key: "passing_yards" },
      { canvas: "chart2", title: "Passing TDs", key: "passing_tds" },
      { canvas: "chart3", title: "Rushing Yards", key: "rushing_yards" },
      { canvas: "chart4", title: "Rushing TDs", key: "rushing_tds" },
      { canvas: "chart5", title: "Interceptions", key: "passing_interceptions" },
      { canvas: "chart6", title: "Sacks Suffered", key: "sacks_suffered" }
    ],
    RB: [
      { canvas: "chart1", title: "Rushing Yards", key: "rushing_yards" },
      { canvas: "chart2", title: "Rushing TDs", key: "rushing_tds" },
      { canvas: "chart3", title: "Receptions", key: "receptions" },
      { canvas: "chart4", title: "Receiving Yards", key: "receiving_yards" },
      { canvas: "chart5", title: "Receiving TDs", key: "receiving_tds" },
      { canvas: "chart6", title: "Rushing Fumbles", key: "rushing_fumbles" }
    ],
    WR: [
      { canvas: "chart1", title: "Receptions", key: "receptions" },
      { canvas: "chart2", title: "Receiving Yards", key: "receiving_yards" },
      { canvas: "chart3", title: "Receiving TDs", key: "receiving_tds" },
      { canvas: "chart4", title: "Rushing Yards", key: "rushing_yards" },
      { canvas: "chart5", title: "Rushing TDs", key: "rushing_tds" },
      { canvas: "chart6", title: "Receiving Targets", key: "targets" }
    ],
    TE: [
      { canvas: "chart1", title: "Receptions", key: "receptions" },
      { canvas: "chart2", title: "Receiving Yards", key: "receiving_yards" },
      { canvas: "chart3", title: "Receiving TDs", key: "receiving_tds" },
      { canvas: "chart4", title: "Rushing Yards", key: "rushing_yards" },
      { canvas: "chart5", title: "Rushing TDs", key: "rushing_tds" },
      { canvas: "chart6", title: "Receiving Targets", key: "targets" }
    ],
    DB: [
      { canvas: "chart1", title: "Solo Tackles", key: "def_tackles_solo" },
      { canvas: "chart2", title: "Assist Tackles", key: "def_tackles_with_assist" },
      { canvas: "chart3", title: "Interceptions", key: "def_interceptions" },
      { canvas: "chart4", title: "Passes Defended", key: "def_pass_defended" },
      { canvas: "chart5", title: "Sacks", key: "def_sacks" },
      { canvas: "chart6", title: "Interception Yards", key: "def_interception_yards" }
    ],
    DL: [
      { canvas: "chart1", title: "Solo Tackles", key: "def_tackles_solo" },
      { canvas: "chart2", title: "Assist Tackles", key: "def_tackle_assists" },
      { canvas: "chart3", title: "Sacks", key: "def_sacks" },
      { canvas: "chart4", title: "Forced Fumbles", key: "def_fumbles_forced" },
      { canvas: "chart5", title: "Interceptions", key: "def_interceptions" },
      { canvas: "chart6", title: "Passes Deflected", key: "def_pass_defended" }
    ],
    LB: [
      { canvas: "chart1", title: "Solo Tackles", key: "def_tackles_solo" },
      { canvas: "chart2", title: "Assist Tackles", key: "def_tackle_assists" },
      { canvas: "chart3", title: "Forced Fumbles", key: "def_fumbles_forced" },
      { canvas: "chart4", title: "Sacks", key: "def_sacks" },
      { canvas: "chart5", title: "Interceptions", key: "def_interceptions" },
      { canvas: "chart6", title: "Passes Deflected", key: "def_pass_defended" }
    ]
  };

  statMap[position].forEach(stat => {
    const ctx = document.getElementById(stat.canvas).getContext("2d");
    if (charts[stat.canvas]) charts[stat.canvas].destroy();

    charts[stat.canvas] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [stat.key.replace(/_/g, " ").toUpperCase()],
        datasets: [{ label: playerName, data: [Number(player[stat.key] || 0)], backgroundColor: "#4C72B0", barThickness: 50 }]
      },
      options: {
        responsive: true,
        plugins: { 
          title: { display: true, text: stat.title, padding: { top: 20, bottom: 20 }, color: "#fff" },
          legend: { display: false, position: "bottom" }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.3)' } },
          x: { ticks: { color: "#ffffff" }, grid: { color: 'rgba(255,255,255,0.3)' } }
        }
      }
    });
  });
}

function safeRate(numerator, denominator, decimals = 2, suffix = "") {
  if (!numerator || !denominator || denominator === 0) return "—";

  let value = numerator / denominator;

  // Auto-convert to percentage when % is requested
  if (suffix === "%") {
    value *= 100;
  }

  return value.toFixed(decimals) + suffix;
}


  // ===== Stats % Table =====
  const advancedStatMap = {
  QB: [
  {
    label: "Completion %",
    calc: p => safeRate(p.completions, p.attempts, 1, "%")
  },
  {
    label: "Passing Yards per Attempt",
    calc: p => safeRate(p.passing_yards, p.attempts)
  },
  {
    label: "TD / INT Ratio",
    calc: p =>
      p.passing_interceptions > 0
        ? (p.passing_tds / p.passing_interceptions).toFixed(2)
        : "∞"
  },
  {
    label: "Rushing Yards per Carry",
    calc: p => safeRate(p.rushing_yards, p.carries)
  }
],

WR: [
  {
    label: "Receiving Yards per Reception",
    calc: p => safeRate(p.receiving_yards, p.receptions)
  },
  {
    label: "Catch Rate",
    calc: p => safeRate(p.receptions, p.targets, 1, "%")
  },
  {
    label: "Rushing Yards per Carry",
    calc: p => safeRate(p.rushing_yards, p.carries)
  },
  {
    label: "Rushing TD/Carry Rate",
    calc: p => safeRate(p.rushing_tds, p.carries)
  },
  {
    label: "Receiving TD/Rec Rate",
    calc: p => safeRate(p.receiving_tds, p.receptions)
  }
],

RB: [
  {
    label: "Rushing Yards per Carry",
    calc: p => safeRate(p.rushing_yards, p.carries)
  },
  {
    label: "Receiving Yards per Reception",
    calc: p => safeRate(p.receiving_yards, p.receptions)
  },
  {
    label: "Catch Rate",
    calc: p => safeRate(p.receptions, p.targets, 1, "%")
  },
  {
    label: "Receiving TD/Rec Rate",
    calc: p => safeRate(p.receiving_tds, p.receptions)
  },
  {
    label: "Rushing TD/Carry Rate",
    calc: p => safeRate(p.rushing_tds, p.carries)
  }
],

TE: [
  {
    label: "Receiving Yards per Reception",
    calc: p => safeRate(p.receiving_yards, p.receptions)
  },
  {
    label: "Catch Rate",
    calc: p => safeRate(p.receptions, p.targets, 1, "%")
  },
  {
    label: "Rushing Yards per Carry",
    calc: p => safeRate(p.rushing_yards, p.carries)
  },
  {
    label: "Rushing TD/Carry Rate",
    calc: p => safeRate(p.rushing_tds, p.carries)
  },
  {
    label: "Receiving TD/Rec Rate",
    calc: p => safeRate(p.receiving_tds, p.receptions)
  }
],

DL: [
  {
    label: "Total Tackles",
    calc: p =>
      (p.def_tackles_solo || 0) + (p.def_tackle_assists || 0)
  },
  {
    label: "Sacks per Game",
    calc: p => safeRate(p.def_sacks, p.games)
  },
  {
    label: "Forced Fumbles per Game",
    calc: p => safeRate(p.def_fumbles_forced, p.games)
  },
  {
    label: "Interception Yards per Game",
    calc: p => safeRate(p.def_interception_yards, p.games)
  }
],

LB: [
  {
    label: "Total Tackles",
    calc: p =>
      (p.def_tackles_solo || 0) + (p.def_tackle_assists || 0)
  },
  {
    label: "Sacks per Game",
    calc: p => safeRate(p.def_sacks, p.games)
  },
  {
    label: "Forced Fumbles per Game",
    calc: p => safeRate(p.def_fumbles_forced, p.games)
  },
  {
    label: "Interception Yards per Game",
    calc: p => safeRate(p.def_interception_yards, p.games)
  }
],

DB: [
  {
    label: "Total Tackles",
    calc: p =>
      (p.def_tackles_solo || 0) + (p.def_tackle_assists || 0)
  },
  {
    label: "Sacks per Game",
    calc: p => safeRate(p.def_sacks, p.games)
  },
  {
    label: "Forced Fumbles per Game",
    calc: p => safeRate(p.def_fumbles_forced, p.games)
  },
  {
    label: "Interception Yards per Game",
    calc: p => safeRate(p.def_interception_yards, p.games)
  }
]
};

// ===== Render Stats % Table =====
function renderAdvancedStatsTable(player, position) {
  const table = document.getElementById("advancedStatsTable");
  table.innerHTML = "";

  const stats = advancedStatMap[position];
  if (!stats) return;

  stats.forEach(stat => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${stat.label}</td>
      <td>${stat.calc(player)}</td>
    `;
    table.appendChild(row);
  });
}

// ===== COMPARISON CHARTS =====
function renderCompareCharts() {
  const season = Number(compareSeasonSelect.value);
  const p1Name = comparePlayer1Input.value;
  const p2Name = comparePlayer2Input.value;
  const position = comparePositionSelect.value;
  if (!season || !p1Name || !p2Name) return;

  const p1 = allPlayers.find(p => p.player_display_name === p1Name && Number(p.season) === season);
  const p2 = allPlayers.find(p => p.player_display_name === p2Name && Number(p.season) === season);
  if (!p1 || !p2) return;

  renderComparisonAdvancedStats(p1, p2, position);

  const statMap = {
    QB: [
      { canvas: "compareChart1", title: "Passing Yards", key: "passing_yards" },
      { canvas: "compareChart2", title: "Passing TDs", key: "passing_tds" },
      { canvas: "compareChart3", title: "Rushing Yards", key: "rushing_yards" },
      { canvas: "compareChart4", title: "Rushing TDs", key: "rushing_tds" },
      { canvas: "compareChart5", title: "Interceptions", key: "passing_interceptions" },
      { canvas: "compareChart6", title: "Sacks Suffered", key: "sacks_suffered" }
    ],
    RB: [
      { canvas: "compareChart1", title: "Rushing Yards", key: "rushing_yards" },
      { canvas: "compareChart2", title: "Rushing TDs", key: "rushing_tds" },
      { canvas: "compareChart3", title: "Receptions", key: "receptions" },
      { canvas: "compareChart4", title: "Receiving Yards", key: "receiving_yards" },
      { canvas: "compareChart5", title: "Receiving TDs", key: "receiving_tds" },
      { canvas: "compareChart6", title: "Rushing Fumbles", key: "rushing_fumbles" }
    ],
    WR: [
      { canvas: "compareChart1", title: "Receptions", key: "receptions" },
      { canvas: "compareChart2", title: "Receiving Yards", key: "receiving_yards" },
      { canvas: "compareChart3", title: "Receiving TDs", key: "receiving_tds" },
      { canvas: "compareChart4", title: "Rushing Yards", key: "rushing_yards" },
      { canvas: "compareChart5", title: "Rushing TDs", key: "rushing_tds" },
      { canvas: "compareChart6", title: "Receiving Targets", key: "targets" }
    ],
    TE: [
      { canvas: "compareChart1", title: "Receptions", key: "receptions" },
      { canvas: "compareChart2", title: "Receiving Yards", key: "receiving_yards" },
      { canvas: "compareChart3", title: "Receiving TDs", key: "receiving_tds" },
      { canvas: "compareChart4", title: "Rushing Yards", key: "rushing_yards" },
      { canvas: "compareChart5", title: "Rushing TDs", key: "rushing_tds" },
      { canvas: "compareChart6", title: "Receiving Targets", key: "targets" }
    ],
    DB: [
      { canvas: "compareChart1", title: "Solo Tackles", key: "def_tackles_solo" },
      { canvas: "compareChart2", title: "Assist Tackles", key: "def_tackles_with_assist" },
      { canvas: "compareChart3", title: "Interceptions", key: "def_interceptions" },
      { canvas: "compareChart4", title: "Passes Defended", key: "def_pass_defended" },
      { canvas: "compareChart5", title: "Sacks", key: "def_sacks" },
      { canvas: "compareChart6", title: "Interception Yards", key: "def_interception_yards" }
    ],
    DL: [
      { canvas: "compareChart1", title: "Solo Tackles", key: "def_tackles_solo" },
      { canvas: "compareChart2", title: "Assist Tackles", key: "def_tackle_assists" },
      { canvas: "compareChart3", title: "Sacks", key: "def_sacks" },
      { canvas: "compareChart4", title: "Forced Fumbles", key: "def_fumbles_forced" },
      { canvas: "compareChart5", title: "Interceptions", key: "def_interceptions" },
      { canvas: "compareChart6", title: "Passes Deflected", key: "def_pass_defended" }
    ],
    LB: [
      { canvas: "compareChart1", title: "Solo Tackles", key: "def_tackles_solo" },
      { canvas: "compareChart2", title: "Assist Tackles", key: "def_tackle_assists" },
      { canvas: "compareChart3", title: "Forced Fumbles", key: "def_fumbles_forced" },
      { canvas: "compareChart4", title: "Sacks", key: "def_sacks" },
      { canvas: "compareChart5", title: "Interceptions", key: "def_interceptions" },
      { canvas: "compareChart6", title: "Passes Deflected", key: "def_pass_defended" }
    ]
  };

  statMap[position].forEach(stat => {
    const ctx = document.getElementById(stat.canvas).getContext("2d");
    if (charts[stat.canvas]) charts[stat.canvas].destroy();

    charts[stat.canvas] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: [stat.key.replace(/_/g, " ").toUpperCase()],
        datasets: [
          { label: p1Name, data: [Number(p1[stat.key] || 0)], backgroundColor: "#4C72B0", barThickness: 50 },
          { label: p2Name, data: [Number(p2[stat.key] || 0)], backgroundColor: "#22d3ee", barThickness: 50 }
        ]
      },
      options: {
        responsive: true,
        plugins: { 
          title: { display: true, text: stat.title, padding: { top: 20, bottom: 20 }, color: "#fff" },
          legend: { display: true, position: "bottom" }
        },                
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.3)' } }, x: { ticks: { color: "#ffffff" }, grid: { color: 'rgba(255,255,255,0.3)' } } }
      }
    });
  });
}

// ===== Render Comparison Stats % Table =====
function renderComparisonAdvancedStats(playerA, playerB, position) {
  const table = document.getElementById("compareAdvancedStatsTable");
  table.innerHTML = "";

  const stats = advancedStatMap[position];
  if (!stats) return;

  table.innerHTML = `
    <tr>
      <th><strong>${position}</strong></th>
      <th>${playerA.player_display_name}<strong> (${playerA.recent_team || "N/A"})</strong></th>
      <th>${playerB.player_display_name}<strong> (${playerB.recent_team || "N/A"})</strong></th>
    </tr>
  `;

  stats.forEach(stat => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${stat.label}</td>
      <td>${stat.calc(playerA)}</td>
      <td>${stat.calc(playerB)}</td>
    `;
    table.appendChild(row);
  });
}

// ===== EVENT LISTENERS =====
teamSelect.addEventListener("change", () => { updatePlayerDropdown(); renderPlayerCharts(); });
positionSelect.addEventListener("change", () => { updatePlayerDropdown(); renderPlayerCharts(); });
seasonSelect.addEventListener("change", () => { updatePlayerDropdown(); renderPlayerCharts(); });
playerSelectInput.addEventListener("input", renderPlayerCharts); // optional, can also trigger on selection

compareSeasonSelect.addEventListener("change", () => {
  updateComparePlayers();
  document.getElementById("compareAdvancedStatsTable").innerHTML = "";
  renderCompareCharts();
});

comparePositionSelect.addEventListener("change", () => {
  updateComparePlayers();
  document.getElementById("compareAdvancedStatsTable").innerHTML = "";
  renderCompareCharts();
});

// ===== TAB SWITCHING =====
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const target = tab.getAttribute("data-tab");

    // Toggle active tab + content
    tabs.forEach(t => t.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(target).classList.add("active");

    // Clear BOTH tables to prevent bleed-over
    const playerTable = document.getElementById("advancedStatsTable");
    const compareTable = document.getElementById("compareAdvancedStatsTable");

    if (playerTable) playerTable.innerHTML = "";
    if (compareTable) compareTable.innerHTML = "";

    // Render based on active tab
    if (target === "playerStats") {
      renderPlayerCharts();
    }

    if (target === "playerCompare") {
      renderCompareCharts();
    }
  });
});

// ===== Refresh Current Tab =====
const refreshBtn = document.getElementById("refreshPageBtn");

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    window.location.reload();
  });
}

// ===== Back to the Top =====
const backToTopBtn = document.getElementById("backToTopBtn");

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTopBtn.classList.add("show");
  } else {
    backToTopBtn.classList.remove("show");
  }
});

backToTopBtn.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

// ===== INIT SEARCH =====
attachSearch(playerSelectInput, playerDropdown, renderPlayerCharts);
attachSearch(comparePlayer1Input, compareDropdown1, renderCompareCharts);
attachSearch(comparePlayer2Input, compareDropdown2, renderCompareCharts);

// ===== INIT =====
loadPlayersJSON();

// 678 LOC
