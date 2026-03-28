/* =================================================================
NFL SCRIPT 2 - SEASON TRENDS TAB (AI-ENHANCED)
==================================================================*/

(() => {
  console.log("Season Trends module loaded");

  // ===== DOM ELEMENTS =====
  const startSelect = document.getElementById("trendSeasonStart");
  const endSelect = document.getElementById("trendSeasonEnd");
  const teamSelect = document.getElementById("trendTeamSelect");
  const positionSelect = document.getElementById("trendPositionSelect");
  const playerInput = document.getElementById("trendPlayerSearch");
  const dropdown = document.getElementById("trendPlayerDropdown");
  const chartCanvas = document.getElementById("trendChart");
  const aiSummaryEl = document.getElementById("trendAISummary");
  const predictionContainer = document.getElementById("seasonPredictions");

  if (!playerInput || !dropdown || !chartCanvas) return;

  let trendChart = null;
  let selectedPlayer = null;

  // ===== DATA SOURCE =====
  const getAllPlayers = () => window.allPlayers || [];

  // ===== HELPERS =====
  const clamp = (val) => Math.max(0, Math.round(val || 0));

  // Normalize positions to groups
  function getPositionGroup(pos) {
    const dbPositions = ["DB", "CB", "SAF", "FS", "SS"];
    const dlPositions = ["DL", "DE", "DT", "NT"];
    const lbPositions = ["LB", "OLB", "ILB"];

    if (dbPositions.includes(pos)) return "DB";
    if (dlPositions.includes(pos)) return "DL";
    if (lbPositions.includes(pos)) return "LB";

    return pos; // QB, RB, WR, TE, etc.
  }

  // ===== RESET UI =====
  function resetUI() {
    selectedPlayer = null;
    playerInput.value = "";
    dropdown.innerHTML = "";
    dropdown.classList.add("hidden");

    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }

    aiSummaryEl.innerHTML = "";
    predictionContainer.innerHTML = "";
  }

  // ===== SEASON VALIDATION =====
  function validateSeasonRange() {
    const start = Number(startSelect.value);
    const end = Number(endSelect.value);

    [...endSelect.options].forEach(o => o.disabled = start && Number(o.value) < start);
    [...startSelect.options].forEach(o => o.disabled = end && Number(o.value) > end);

    if (start && end && start > end) endSelect.value = "";
  }

  startSelect.addEventListener("change", validateSeasonRange);
  endSelect.addEventListener("change", validateSeasonRange);

  // ===== PLAYER FILTERING =====
  function getFilteredPlayers() {
    const query = playerInput.value.toLowerCase();
    const team = teamSelect.value || null;
    const position = positionSelect.value || null;

    return getAllPlayers()
      .filter(p =>
        (!team || p.recent_team === team) &&
        (!position || p.position === position || getPositionGroup(p.position) === position) &&
        (!query || p.player_display_name.toLowerCase().includes(query))
      )
      .map(p => p.player_display_name)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a.localeCompare(b));
  }

  // ===== DROPDOWN =====
  function renderDropdown(players) {
    dropdown.innerHTML = "";

    if (!players.length) {
      dropdown.innerHTML = `<div class="dropdown-item muted">No players found</div>`;
      dropdown.classList.remove("hidden");
      return;
    }

    players.forEach(name => {
      const div = document.createElement("div");
      div.className = "dropdown-item";
      div.textContent = name;

      div.onclick = () => {
        selectedPlayer = name;
        playerInput.value = name;
        dropdown.classList.add("hidden");
        renderTrendChart();
      };

      dropdown.appendChild(div);
    });

    dropdown.classList.remove("hidden");
  }

  playerInput.addEventListener("input", () => renderDropdown(getFilteredPlayers()));
  playerInput.addEventListener("focus", () => {renderDropdown(getFilteredPlayers());});
  playerInput.addEventListener("click", () => {renderDropdown(getFilteredPlayers());});

  teamSelect.addEventListener("change", resetUI);
  positionSelect.addEventListener("change", resetUI);

  document.addEventListener("click", e => {
    if (!e.target.closest(".search-wrapper")) dropdown.classList.add("hidden");
  });

  // ===== SEASON DATA =====
  function getSeasonData(name, start, end) {
    return getAllPlayers()
      .filter(p =>
        p.player_display_name === name &&
        Number(p.season) >= start &&
        Number(p.season) <= end
      )
      .sort((a, b) => a.season - b.season);
  }

  // ===== PRIMARY METRIC =====
  function extractMetric(p) {
    const group = getPositionGroup(p.position);

    if (p.position === "QB") return clamp(p.passing_yards);
    if (p.position === "RB") return clamp(p.rushing_yards);
    if (["WR", "TE"].includes(p.position)) return clamp(p.receiving_yards);

    if (group === "DL") return clamp(p.def_sacks);
    if (group === "LB") return clamp(p.def_tackles_solo);
    if (group === "DB") return clamp(p.def_interceptions);

    return clamp(p.games);
  }

  // ===== TREND SUMMARY =====
  function generateAISummary(values, position) {
    if (!values || values.length < 2) {
      return "Not enough data for AI trend analysis.";
    }

    const deltas = values.slice(1).map((v, i) => v - values[i]);
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    const trend =
      avg > 0 ? "Increasing 📈" :
      avg < 0 ? "Decreasing 📉" :
      "Stable ➖";

    const metricLabel = `${position} Performance`;

    return `
      <strong>AI Trend Summary</strong><br>
      Metric: <strong>${metricLabel}</strong><br>
      Direction: <strong>${trend}</strong><br>
      Avg Year-Over-Year (YoY) Change: <strong>${avg.toFixed(1)}</strong>
    `;
  }

  function filterValidQBSeasons(seasons) {
    return seasons.filter(s =>
        s.attempts >= 150 ||   // minimum starter threshold
        s.games >= 6
    );
  }

  // ===== CHART =====
  function renderTrendChart() {
    const start = Number(startSelect.value);
    const end = Number(endSelect.value);
    if (!selectedPlayer || !start || !end) return;

    const seasons = getSeasonData(selectedPlayer, start, end);
    if (seasons.length < 1) return;

    const labels = seasons.map(s => s.season);
    const values = seasons.map(extractMetric);

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(chartCanvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Season Performance",
          data: values,
          borderWidth: 3,
          tension: 0.3
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 25
          }
        },
        plugins: {
          datalabels: {
            display: false
          }
        },
        scales: {
          y: { beginAtZero: true, grace: "15%", grid: { color: 'rgba(255,255,255,0.3)' } },
          x: { ticks: { color: "#ffffff" }, grid: { color: 'rgba(255,255,255,0.3)' } }
        }
      }
    });

    aiSummaryEl.innerHTML = generateAISummary(values, seasons[0].position);
    renderSeasonPredictions(seasons);
  }

  // ===== AI MATH =====
  function avgYoY(values, position = null) {
  const deltas = [];

  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] <= 0) continue;
    deltas.push((values[i] - values[i - 1]) / values[i - 1]);
  }

  if (!deltas.length) return 0;

  let avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;

  // 🔒 QB volatility clamp
  if (position === "QB") {
    avg = Math.max(-0.25, Math.min(avg, 0.25));
  }

  return avg;
  }

  function projectQBStat(values, statName) {
    const last = values.at(-1);
    const avg = values.reduce((a,b)=>a+b,0) / values.length;

    // Strong regression to mean
    let expected = (last * 0.55) + (avg * 0.45);

    const caps = {
      "Passing Yards": 5200,
      "Passing TDs": 45,
      "INTs": 20,
      "Sacks Taken": 55
    };

    if (statName === "INTs") {
        expected = Math.min(expected, last + 3);
    }


    expected = Math.min(expected, caps[statName] || Infinity);

    const floor = clamp(expected * 0.8);
    const ceiling = clamp(expected * 1.15);

    const yoy = avgYoY(values, "QB");

    return { floor, expected: clamp(expected), ceiling, yoy };
  }

  function confidenceFromYoY(yoy, position) {
    const pct = Math.abs(yoy);

    if (position === "QB") {
    if (pct > 0.08) return { label: "Medium", value: "60%" };
    return { label: "Low", value: "40%" };
    }

    if (pct > 0.07) return { label: "High", value: "80%" };
    if (pct > 0.03) return { label: "Medium", value: "60%" };
    return { label: "Low", value: "40%" };
  }


  // ===== POSITION STATS =====
  function positionStats(pos, seasons) {
    const group = getPositionGroup(pos);

    const map = {
      QB: {
        "Attempts": seasons.map(s => clamp(s.attempts)),
        "Passing Yards": seasons.map(s => clamp(s.passing_yards)),
        "Yards / Attempt": seasons.map(s => {
          if (s.attempts < 100) return null;
          return Math.min(9.5, Math.max(5.5, s.passing_yards / s.attempts));
        }).filter(v => v !== null),
        "Passing TDs": seasons.map(s => clamp(s.passing_tds)),
        "INTs": seasons.map(s => clamp(s.passing_interceptions)),
        "Sacks Taken": seasons.map(s => clamp(s.sacks_suffered)),
        "Rushing Yards": seasons.map(s => clamp(s.rushing_yards)),
        "Rushing TDs": seasons.map(s => clamp(s.rushing_tds)),
        "Fantasy Points": seasons.map(s => clamp(s.fantasy_points))
      },

      RB: {
        "Carries": seasons.map(s => clamp(s.carries)),
        "Total Touches": seasons.map(s => clamp(s.carries + s.receptions)),
        "Rushing Yards": seasons.map(s => clamp(s.rushing_yards)),
        "Yards / Carry": seasons.map(s =>
          s.carries ? clamp(s.rushing_yards / s.carries) : 0
        ),
        "Rushing TDs": seasons.map(s => clamp(s.rushing_tds)),
        "Receiving Yards": seasons.map(s => clamp(s.receiving_yards)),
        "Receiving TDs": seasons.map(s => clamp(s.receiving_tds)),
        "Fantasy Points": seasons.map(s => clamp(s.fantasy_points))
      },

      WR: {
        "Targets": seasons.map(s => clamp(s.targets)),
        "Receptions": seasons.map(s => clamp(s.receptions)),
        "Receiving Yards": seasons.map(s => clamp(s.receiving_yards)),
        "Air Yards": seasons.map(s => clamp(s.receiving_air_yards)),
        "Receiving TDs": seasons.map(s => clamp(s.receiving_tds)),
        "Rushing Yards": seasons.map(s => clamp(s.rushing_yards)),
        "Rushing TDs": seasons.map(s => clamp(s.rushing_tds)),
        "Fantasy Points": seasons.map(s => clamp(s.fantasy_points))
      },

      TE: {
        "Targets": seasons.map(s => clamp(s.targets)),
        "Receptions": seasons.map(s => clamp(s.receptions)),
        "Receiving Yards": seasons.map(s => clamp(s.receiving_yards)),
        "Receiving TDs": seasons.map(s => clamp(s.receiving_tds)),
        "Air Yards": seasons.map(s => clamp(s.receiving_air_yards)),
        "Rushing Yards": seasons.map(s => clamp(s.rushing_yards)),
        "Rushing TDs": seasons.map(s => clamp(s.rushing_tds)),
        "Fantasy Points": seasons.map(s => clamp(s.fantasy_points))
      },

      DL: {
        "QB Hits": seasons.map(s => clamp(s.def_qb_hits)),
        "Sacks": seasons.map(s => clamp(s.def_sacks)),
        "Tackles for Loss": seasons.map(s => clamp(s.def_tackles_for_loss)),
        "Forced Fumbles": seasons.map(s => clamp(s.def_fumbles_forced)),
        "Fumble Recoveries": seasons.map(s => clamp(s.def_fumbles_recovered)),
        "INTs": seasons.map(s => clamp(s.def_interceptions)),
        "Passes Defended": seasons.map(s => clamp(s.def_pass_defended)),
        "Defensive TDs": seasons.map(s => clamp(s.def_tds)),
        "Assist Tackles": seasons.map(s => clamp(s.def_tackle_assists))
      },

      LB: {
        "Total Tackles": seasons.map(s =>
          clamp(s.def_tackles_solo + s.def_tackle_assists)
        ),
        "Sacks": seasons.map(s => clamp(s.def_sacks)),
        "QB Hits": seasons.map(s => clamp(s.def_qb_hits)),
        "INTs": seasons.map(s => clamp(s.def_interceptions)),
        "Passes Defended": seasons.map(s => clamp(s.def_pass_defended)),
        "Defensive TDs": seasons.map(s => clamp(s.def_tds)),
        "Assist Tackles": seasons.map(s => clamp(s.def_tackle_assists)),
        "Forced Fumbles": seasons.map(s => clamp(s.def_fumbles_forced)),
        "Fumble Recoveries": seasons.map(s => clamp(s.def_fumbles_recovered))
      },

      DB: {
        "Passes Defended": seasons.map(s => clamp(s.def_pass_defended)),
        "Interceptions": seasons.map(s => clamp(s.def_interceptions)),
        "Tackles": seasons.map(s => clamp(s.def_tackles_solo)),
        "Defensive TDs": seasons.map(s => clamp(s.def_tds)),
        "Assist Tackles": seasons.map(s => clamp(s.def_tackle_assists)),
        "Forced Fumbles": seasons.map(s => clamp(s.def_fumbles_forced)),
        "Fumble Recoveries": seasons.map(s => clamp(s.def_fumbles_recovered)),
        "Sacks": seasons.map(s => clamp(s.def_sacks)),
        "QB Hits": seasons.map(s => clamp(s.def_qb_hits))
      }
    };

    return map[group] || {};
  }

  function projectRushingTDs(seasons) {
    const last = seasons.at(-1);

    const carries = last.carries || 0;
    const pastTDs = seasons.map(s => s.rushing_tds || 0);

    // TD rate based on workload
    let tdRate = 0.02; // default
    if (carries > 250) tdRate = 0.03;
    else if (carries < 150) tdRate = 0.015;

    const expected = carries * tdRate;

    const floor = clamp(expected * 0.65);
    const ceiling = clamp(Math.min(expected * 1.4, carries > 250 ? 16 : 10));

    const yoy = avgYoY(pastTDs);

    return { floor, expected: clamp(expected), ceiling, yoy };
  }

  function stabilizeVolume(values, position, statName) {
    const last = values.at(-1);
    const avg = values.reduce((a,b)=>a+b,0) / values.length;

    // Regression toward average
    let expected = (last * 0.6) + (avg * 0.4);

    // Position-based caps
    const caps = {
        "Carries": position === "RB" ? 320 : 120,
        "Rushing Yards": position === "RB" ? 1600 : 600,
        "Receptions": 110,
        "Targets": 150,
        "Passing Attempts": 650
    };

    const cap = caps[statName] || Infinity;
    expected = Math.min(expected, cap);

    const floor = clamp(expected * 0.75);
    const ceiling = clamp(expected * 1.2);

    const yoy = avgYoY(values);

    return {
        floor: clamp(floor),
        expected: clamp(expected),
        ceiling: clamp(ceiling),
        yoy
    };
  }

  function projectRange(values) {
    const avg = values.reduce((a,b)=>a+b,0) / values.length;
    const yoy = avgYoY(values);

    const expected = avg;
    const floor = clamp(expected * 0.8);
    const ceiling = clamp(expected * 1.2);

    return {
        floor,
        expected: clamp(expected),
        ceiling,
     yoy
    };
  }


  // ===== RENDER AI TABLE =====
function renderSeasonPredictions(seasons) {
  if (seasons.length < 2) {
    predictionContainer.innerHTML = `<p>Not enough seasons for AI predictions.</p>`;
    return;
  }

  const pos = seasons[0].position;

  let cleanSeasons = seasons;

    if (pos === "QB") {
    cleanSeasons = filterValidQBSeasons(seasons);
    }

    if (cleanSeasons.length < 2) {
    predictionContainer.innerHTML =
        `<p>Not enough starter-level seasons for reliable AI projections.</p>`;
    return;
    }

    const stats = positionStats(pos, cleanSeasons);

  const rows = Object.entries(stats).map(([stat, values]) => {
    let projection;

    const volumeStats = [
      "Carries",
      "Rushing Yards",
      "Receptions",
      "Targets",
      "Passing Attempts",
      "Fantasy Points"
    ];

    if (stat === "Rushing TDs") {
      projection = projectRushingTDs(seasons);
    } else if (volumeStats.includes(stat)) {
      projection = stabilizeVolume(values, pos, stat);
    } else if (pos === "QB" && ["Passing Yards", "Passing TDs", "INTs", "Sacks Taken"].includes(stat)) {
      projection = projectQBStat(values, stat);
    } else {
      projection = projectRange(values);
    }

    const { floor, expected, ceiling, yoy } = projection;
    const confidence = confidenceFromYoY(yoy, pos);

    const trend =
      yoy > 0.02 ? "Increasing" :
      yoy < -0.02 ? "Decreasing" :
      "Stable";

    return `
      <tr>
        <td>${stat}</td>
        <td>${trend}</td>
        <td>${(yoy * 100).toFixed(2)}%</td>
        <td>${floor} / <strong>${expected}</strong> / ${ceiling}</td>
        <td>${confidence.value} (${confidence.label})</td>
      </tr>
    `;
  }).join("");

  predictionContainer.innerHTML = `
    <div class="prediction-card">
      <h3>AI Season Projections (Next Season)</h3>
      <table class="prediction-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Trend</th>
            <th>YoY %</th>
            <th>Floor / Expected / Ceiling</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}


})();

//553 LOC
