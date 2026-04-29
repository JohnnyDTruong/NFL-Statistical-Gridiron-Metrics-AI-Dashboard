/* =======================================================================
NFL SCRIPT 3 – LEAGUE TRENDS & AI INSIGHTS
======================================================================= */

(() => {
  console.log("League AI module loaded with charts");
  Chart.register(ChartDataLabels);

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

  // ===== NEW: AI CONFIDENCE CALCULATOR =====
  function calculateConfidence(value, avg) {
    if (!avg || avg === 0) return 50;

    const diff = (value - avg) / avg;

    let confidence = 50 + diff * 120;

    if (confidence > 97) confidence = 97;
    if (confidence < 40) confidence = 40;

    return Math.round(confidence);
  }

  // ===== NEW: TREND CLASSIFIER =====
  function getTrendLabel(confidence) {
    if (confidence >= 90) return "Superstar trajectory";
    if (confidence >= 80) return "High breakout potential";
    if (confidence >= 70) return "Trending upward";
    if (confidence >= 60) return "Stable production";
    return "Volatile outlook";
  }

  // ===== LEAGUE METRICS =====
  const leagueMetrics = {
    QB: {
      "Passing Yards": p => p.passing_yards,
      "Yards / Attempt": p => p.passing_yards / (p.attempts || 1),
      "Passing TDs": p => p.passing_tds,
      "TD : INT Ratio": p => p.passing_tds / Math.max(1, p.passing_interceptions),
      "Rushing Yards": p => p.rushing_yards,
      "Rushing TDs": p => p.rushing_tds,
      "Fantasy Points": p => p.fantasy_points
    },
    RB: {
      "Rushing Yards": p => p.rushing_yards,
      "Yards / Carry": p => p.rushing_yards / (p.carries || 1),
      "Rushing TDs": p => p.rushing_tds,
      "Total Touches": p => p.carries + p.receptions,
      "Rushing Yards": p => p.rushing_yards,
      "Rushing TDs": p => p.rushing_tds,
      "Catch Rate %": p => (p.receptions / (p.targets || 1)) * 100,
      "Fantasy Points": p => p.fantasy_points
    },
    WR: {
      "Receiving Yards": p => p.receiving_yards,
      "Yards / Target": p => p.receiving_yards / (p.targets || 1),
      "Receiving TDs": p => p.receiving_tds,
      "Catch Rate %": p => (p.receptions / (p.targets || 1)) * 100,
      "Rushing Yards": p => p.rushing_yards,
      "Rushing TDs": p => p.rushing_tds,
      "Fantasy Points": p => p.fantasy_points
    },
    TE: {
      "Receiving Yards": p => p.receiving_yards,
      "Yards / Target": p => p.receiving_yards / (p.targets || 1),
      "Receiving TDs": p => p.receiving_tds,
      "Catch Rate %": p => (p.receptions / (p.targets || 1)) * 100,
      "Rushing Yards": p => p.rushing_yards,
      "Rushing TDs": p => p.rushing_tds,
      "Fantasy Points": p => p.fantasy_points
    },
    DL: {
      "Sacks": p => p.def_sacks,
      "QB Hits": p => p.def_qb_hits,
      "TacklesForLoss": p => p.def_tackles_for_loss,
      "Passes Defended": p => p.def_pass_defended,
      "Solo Tackles": p => p.def_tackles_solo,
      "Total Tackles": p => p.def_tackles_solo + p.def_tackle_assists,
      "Interceptions": p => p.def_interceptions
    },
    LB: {
      "Total Tackles": p => p.def_tackles_solo + p.def_tackle_assists,
      "Solo Tackles": p => p.def_tackles_solo,
      "Passes Defended": p => p.def_pass_defended,
      "Sacks": p => p.def_sacks,
      "Interceptions": p => p.def_interceptions,
      "TacklesForLoss": p => p.def_tackles_for_loss,
      "QB Hits": p => p.def_qb_hits
    },
    DB: {
      "Interceptions": p => p.def_interceptions,
      "Passes Defended": p => p.def_pass_defended,
      "Solo Tackles": p => p.def_tackles_solo,
      "Total Tackles": p => p.def_tackles_solo + p.def_tackle_assists,
      "Sacks": p => p.def_sacks,
      "TacklesForLoss": p => p.def_tackles_for_loss,
      "QB Hits": p => p.def_qb_hits
    }
  };

  // ===== AI INSIGHT GENERATOR (ENHANCED) =====
  function aiInsight(value, avg, metric, group) {
    const percentAboveAvg = ((value - avg) / avg) * 100;
    const confidence = calculateConfidence(value, avg);
    const trend = getTrendLabel(confidence);

    let insight = "";

    if (percentAboveAvg > 30) insight = `Elite - top tier output, could dominate this season 📈`;
    else if (percentAboveAvg > 10) insight = `Above average - likely reliable contributor`;
    else insight = `Solid baseline - production dependent on role`;

    // Metric-specific flavor
    if (group === "QB" && metric.includes("Yards")) insight += " | Strong passing efficiency trend.";
    if (group === "RB" && metric.includes("Yards")) insight += " | May benefit from strong offensive line support.";
    if (group === "WR" && metric.includes("Receiving")) insight += " | Likely primary target in passing schemes.";
    if (group === "TE" && metric.includes("Receiving")) insight += " | Usage in red zone may be significant.";
    if (group === "DL" && metric.includes("Sacks")) insight += " | Pressure could disrupt QB timing.";
    if (group === "LB" && metric.includes("Tackles")) insight += " | High tackle rate shows defensive reliability.";
    if (group === "DB" && metric.includes("Interceptions")) insight += " | Ball-hawking skill could swing games.";

    // ===== NEW INSIGHT DATA =====
    insight += ` | Confidence: ${confidence}%`;
    insight += ` | Trend: ${trend}`;

    if (confidence >= 85) {
      insight += " | Breakout probability high next season.";
    } else if (confidence < 60) {
      insight += " | Production may fluctuate next year.";
    }

    return insight;
  }

  // ===== CORE LOGIC =====
  function generateLeagueInsights(season, filterPos) {
    const data = getAllPlayers().filter(p => Number(p.season) === season);
    container.innerHTML = "";

    Object.entries(leagueMetrics).forEach(([group, metrics]) => {
      if (filterPos && filterPos !== group) return;

      container.insertAdjacentHTML("beforeend", `<h3>${group} League Leaders</h3>`);

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
        const chartId = `chart-${group}-${label.replace(/\s+/g, '')}`;

        const cardHTML = `
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
                      <td>${aiInsight(p.value, avg, label, group)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
            <div class="chart-container">
              <canvas id="${chartId}"></canvas>
            </div>
          </div>
        `;

        container.insertAdjacentHTML("beforeend", cardHTML);

        const ctx = document.getElementById(chartId).getContext("2d");
        new Chart(ctx, {
          type: "bar",
          data: {
            labels: ranked.map(r => r.name),
            datasets: [{
              label: label,
              data: ranked.map(r => clamp(r.value)),
              backgroundColor: "#00d4ff",
              borderRadius: 6,
              barPercentage: 0.9,
              categoryPercentage: 0.8,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: true },
              datalabels: {
                color: "#ffffff",
                anchor: "end",
                align: "start",
                offset: 6,
                font: {
                  weight: "bold",
                  size: 12
                },
                formatter: value => value
              }
            },
            scales: {
              x: {
                ticks: {
                  color: "#ccc",
                  maxRotation: 30,
                  minRotation: 0
                },
                grid: {
                  display: true,
                  color: "rgba(255,255,255,0.08)"
                }
              },
              y: {
                beginAtZero: true,
                ticks: {
                  color: "#ccc"
                },
                grid: {
                  display: true,
                  color: "rgba(255,255,255,0.15)"
                }
              }
            }
          }
        });

      });
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
