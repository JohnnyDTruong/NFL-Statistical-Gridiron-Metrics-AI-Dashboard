/* =======================================================================
NFL SCRIPT 3 – LEAGUE TRENDS & AI INSIGHTS + Other Additional Features
======================================================================= */

(() => {
  console.log("League AI module loaded");

  const seasonSelect = document.getElementById("leagueSeasonSelect");
  const positionSelect = document.getElementById("leaguePositionSelect");
  const container = document.getElementById("leagueResults");

  if (!seasonSelect || !container) return;

  const getAllPlayers = () => window.allPlayers || [];

  // ===== POSITION GROUPING =====
  function getPositionGroup(pos) {
    const map = {
      QB: "QB",
      RB: "RB",
      WR: "WR",
      TE: "TE",
      DL: ["DL", "DE", "DT", "NT"],
      LB: ["LB", "OLB", "ILB"],
      DB: ["DB", "CB", "FS", "SS", "SAF"]
    };

    for (const key in map) {
      if (Array.isArray(map[key]) && map[key].includes(pos)) return key;
      if (key === pos) return key;
    }
    return null;
  }

  const clamp = v => Math.round(v || 0);

  // ===== LEAGUE METRICS (EXPANDED) =====
  const leagueMetrics = {
    QB: {
      "Passing Yards": p => p.passing_yards,
      "Yards / Attempt": p => p.passing_yards / (p.attempts || 1),
      "Passing TDs": p => p.passing_tds,
      "TD : INT Ratio": p => p.passing_tds / Math.max(1, p.passing_interceptions)
    },
    RB: {
      "Rushing Yards": p => p.rushing_yards,
      "Yards / Carry": p => p.rushing_yards / (p.carries || 1),
      "Rushing TDs": p => p.rushing_tds,
      "Total Touches": p => p.carries + p.receptions
    },
    WR: {
      "Receiving Yards": p => p.receiving_yards,
      "Yards / Target": p => p.receiving_yards / (p.targets || 1),
      "Receiving TDs": p => p.receiving_tds,
      "Catch Rate %": p => (p.receptions / (p.targets || 1)) * 100
    },
    TE: {
      "Receiving Yards": p => p.receiving_yards,
      "Yards / Target": p => p.receiving_yards / (p.targets || 1),
      "Receiving TDs": p => p.receiving_tds
    },
    DL: {
      "Sacks": p => p.def_sacks,
      "QB Hits": p => p.def_qb_hits,
      "TFL": p => p.def_tackles_for_loss
    },
    LB: {
      "Total Tackles": p => p.def_tackles_solo + p.def_tackle_assists,
      "Sacks": p => p.def_sacks,
      "INTs": p => p.def_interceptions
    },
    DB: {
      "Interceptions": p => p.def_interceptions,
      "Passes Defended": p => p.def_pass_defended,
      "Tackles": p => p.def_tackles_solo
    }
  };

  // ===== AI INSIGHT GENERATOR =====
  function aiInsight(value, avg, metric) {
    if (value > avg * 1.3) {
      return `Elite output — strong likelihood of sustained top-tier production 📈`;
    }
    if (value > avg * 1.1) {
      return `Above average — reliable contributor moving forward`;
    }
    return `Solid baseline — production likely dependent on role stability`;
  }

  // ===== CORE LOGIC =====
  function generateLeagueInsights(season, filterPos) {
    const data = getAllPlayers().filter(p => Number(p.season) === season);
    container.innerHTML = "";

    Object.entries(leagueMetrics).forEach(([group, metrics]) => {
      if (filterPos && filterPos !== group) return;

      let html = `<h3>${group} League Leaders</h3>`;

      Object.entries(metrics).forEach(([label, fn]) => {
        const ranked = data
          .filter(p => getPositionGroup(p.position) === group)
          .map(p => ({
            name: p.player_display_name,
            team: p.recent_team,
            value: fn(p)
          }))
          .filter(p => p.value && p.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        if (!ranked.length) return;

        const avg = ranked.reduce((a, b) => a + b.value, 0) / ranked.length;

        html += `
          <div class="league-card">
            <h4>${label}</h4>
            <div class="league-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Value</th>
                    <th>AI Insight</th>
                  </tr>
                </thead>
                <tbody>
                  ${ranked.map((p, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${p.name}</td>
                      <td>${p.team}</td>
                      <td>${clamp(p.value)}</td>
                      <td>${aiInsight(p.value, avg, label)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        `;
      });

      container.innerHTML += html;
    });
  }

  function refresh() {
    const season = Number(seasonSelect.value);
    const pos = positionSelect?.value || "";
    if (season) generateLeagueInsights(season, pos);
  }

  seasonSelect.addEventListener("change", refresh);
  positionSelect?.addEventListener("change", refresh);

})();
