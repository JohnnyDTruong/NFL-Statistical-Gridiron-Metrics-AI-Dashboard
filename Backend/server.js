/* =================================================================
NFL AI Chat/Assistant Backend - Server Development (API + CRUD)
==================================================================*/

/* ================================
MONGO DB CONNECTION
================================ */
require("dotenv").config(); // load .env
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

//////////////

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Fuse = require("fuse.js");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

/* ================================
LOAD NFL DATA
================================ */
const frontendPath = path.join(__dirname, "../Frontend");
app.use(express.static(frontendPath));

const dataPath = path.join(frontendPath, "stats_players_all.json");
const players = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
console.log("Loaded players:", players.length);

/* ================================
FUZZY SEARCH SETUP
================================ */
const fuseOptions = {
  keys: [{ name: "player_display_name", weight: 2 }],
  threshold: 0.45,
  distance: 100
};
const fuse = new Fuse(players, fuseOptions);

/* ================================
GRAMMAR CORRECTION
================================ */
async function correctUserMessage(message) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2000);

    const response = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        text: message,
        language: "en-US"
      }),
      signal: controller.signal
    });

    const data = await response.json();
    let corrected = message;

    if (data.matches && data.matches.length) {
      data.matches.forEach(match => {
        if (match.replacements.length) {
          corrected = corrected.replace(
            message.substr(match.offset, match.length),
            match.replacements[0].value
          );
        }
      });
    }

    return corrected;
  } catch (err) {
    return message;
  }
}

/* ================================
STAT KEYWORD MAP
================================ */
const statMap = {
  "passing yards": "passing_yards",
  "pass yards": "passing_yards",
  "passing td": "passing_tds",
  "passing tds": "passing_tds",
  "passing touchdown": "passing_tds",
  "passing touchdowns": "passing_tds",

  "rushing yards": "rushing_yards",
  "rush yards": "rushing_yards",
  "rushing td": "rushing_tds",
  "rushing tds": "rushing_tds",

  "receiving yards": "receiving_yards",
  "recieving yards": "receiving_yards",
  "recving yards": "receiving_yards",
  "receving yards": "receiving_yards",
  "recv yards": "receiving_yards",

  "receiving td": "receiving_tds",
  "receiving tds": "receiving_tds",
  "receiving touchdown": "receiving_tds",
  "receiving touchdowns": "receiving_tds",
  "rec tds": "receiving_tds",

  "receptions": "receptions",
  "targets": "targets",
  "carries": "carries",

  "interceptions": "def_interceptions",
  "interception": "def_interceptions",
  "ints": "def_interceptions",

  "tackles": "def_tackles_solo",
  "solo tackles": "def_tackles_solo",
  "tackles solo": "def_tackles_solo",
  "tackle": "def_tackles_solo",

  "sacks": "def_sacks",
  "sack": "def_sacks",

  "passes defended": "def_pass_defended",
  "deflect passes": "def_pass_defended",

  "assist tackles": "def_tackle_assists",
  "tackles assisted": "def_tackle_assists",

  "forced fumbles": "def_fumbles_forced",
  "fumbles forced": "def_fumbles_forced",

  "fantasy points": "fantasy_points",
  "fantasy point": "fantasy_points",
  "fantasy pts": "fantasy_points",
  "fp": "fantasy_points",
};

/* ================================
INTENT DETECTION (CHATGPT STYLE)
================================ */

const intentMap = {
  LEADER: ["top", "leader", "leaders", "best", "most", "highest", "who leads", "who has most"],
  COMPARE: ["vs", "versus", "compare", "difference", "better"],
  TREND: ["trend", "improving", "declining", "getting better"],
  CONSISTENCY: ["consistent", "consistency", "reliable"],
  PREDICT: ["predict", "next season", "future", "projection"],
  CAREER: ["career", "all time", "total career"],
  BEST_SEASON: ["best season", "highest season", "peak season"]
};

function detectIntent(q) {
  for (let intent in intentMap) {
    for (let phrase of intentMap[intent]) {
      if (q.includes(phrase)) return intent;
    }
  }
  return null;
}

/* ================================
HELPER FUNCTIONS
================================ */

const statPositionMap = {
  passing_yards: ["QB"],
  passing_tds: ["QB"],

  rushing_yards: ["QB", "RB"],
  rushing_tds: ["QB", "RB"],

  receiving_yards: ["WR", "TE", "RB"],
  receiving_tds: ["WR", "TE", "RB"],
  receptions: ["WR", "TE", "RB"],
  targets: ["WR", "TE", "RB"],

  def_interceptions: ["CB", "DB", "FS", "SS", "LB", "OLB", "ILB"],
  def_sacks: ["DE", "DT", "NT", "LB", "OLB", "ILB"],
  def_tackles_solo: ["CB", "DB", "FS", "SS", "LB", "OLB", "ILB", "DE", "DT", "NT"],
  def_pass_defended: ["CB", "DB", "FS", "SS", "LB", "OLB", "ILB"],
  def_tackle_assists: ["CB", "DB", "FS", "SS", "LB", "OLB", "ILB", "DE", "DT", "NT"],
  def_fumbles_forced: ["CB", "DB", "FS", "SS", "LB", "OLB", "ILB", "DE", "DT", "NT"],

  fantasy_points: ["QB", "RB", "WR", "TE"]
};

function getStat(player, key) {
  return Number(player[key]) || 0;
}

function extractSeason(q) {
  const match = q.match(/20\d{2}/);
  return match ? Number(match[0]) : null;
}

function detectStat(q) {
  const phrases = Object.keys(statMap).sort((a, b) => b.length - a.length);

  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");

    if (regex.test(q)) {
      return statMap[phrase];
    }
  }

  return null;
}

function detectStatLoose(q) {
  const words = q.split(" ");

  if (words.includes("yards") && words.includes("receiving")) return "receiving_yards";
  if (words.includes("yards") && words.includes("rushing")) return "rushing_yards";
  if (words.includes("yards") && words.includes("passing")) return "passing_yards";

  if (words.includes("touchdowns") && words.includes("passing")) return "passing_tds";
  if (words.includes("touchdowns") && words.includes("rushing")) return "rushing_tds";
  if (words.includes("touchdowns") && words.includes("receiving")) return "receiving_tds";
  if ((words.includes("touchdowns") || words.includes("tds")) && words.includes("receiving")) return "receiving_tds";

  return null;
}

function isChartQuery(q) {
  return (
    q.includes("chart") ||
    q.includes("graph") ||
    q.includes("visualize") ||
    q.includes("plot") ||
    q.includes("trend line")
  );
}

function getLeagueBestSeason(stat) {
  const allowedPositions = statPositionMap[stat] || null;

  let filtered = players.filter(p =>
    getStat(p, stat) > 0 &&
    Number(p.season) >= 2022 &&
    Number(p.season) <= 2025
  );

  if (allowedPositions) {
    filtered = filtered.filter(p => allowedPositions.includes(p.position));
  }

  if (!filtered.length) return null;

  return filtered.reduce((best, current) =>
    getStat(current, stat) > getStat(best, stat) ? current : best
  );
}

/* ================================
AI HELPER FUNCTIONS
================================ */

/* CAREER TOTAL */
function getCareerStat(playerName, stat) {
  const seasons = players.filter(p => p.player_display_name === playerName);
  return seasons.reduce((sum, s) => sum + getStat(s, stat), 0);
}

/* BEST SEASON */
function getBestSeason(playerName, stat) {
  const seasons = players.filter(p => p.player_display_name === playerName);
  if (!seasons.length) return null;

  return seasons.reduce((best, current) =>
    getStat(current, stat) > getStat(best, stat) ? current : best
  );
}

/* TREND ANALYSIS */
function analyzeTrend(playerName, stat) {
  const seasons = players
    .filter(p => p.player_display_name === playerName)
    .sort((a, b) => Number(a.season) - Number(b.season));

  if (seasons.length < 2) return "Not enough data to analyze trend.";

  const first = getStat(seasons[0], stat);
  const last = getStat(seasons[seasons.length - 1], stat);

  if (last > first) return "📈 Performance is trending upward.";
  if (last < first) return "📉 Performance is declining.";
  return "➖ Performance is stable.";
}

/* CONSISTENCY SCORE */
function getConsistencyScore(playerName, stat) {
  const seasons = players
    .filter(p => p.player_display_name === playerName)
    .filter((v, i, a) => a.findIndex(x => x.season === v.season) === i);

  const values = seasons
    .map(s => Number(String(s[stat]).replace(/,/g, "")))
    .filter(v => !isNaN(v));

  if (values.length < 2) return null;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;

  // Scale variance relative to avg
  const score = Math.round(Math.max(0, Math.min(100, 100 - (variance / avg))));
  return score;
}

/* Trend Charts */

function buildPlayerTrendChart(playerName, stat) {
  const seasons = players
    .filter(p => p.player_display_name === playerName)
    .sort((a, b) => Number(a.season) - Number(b.season));

  if (seasons.length < 2) return null;

  const labels = seasons.map(p => Number(p.season));
  const values = seasons.map(p => getStat(p, stat));

  return {
    chartType: "line",
    title: `${playerName} ${stat.replace("def_", "").replaceAll("_", " ")}`.replace(/\b\w/g, c => c.toUpperCase()),
    labels,
    values,
    stat,
    player: playerName
  };
}

/* 2 Player Comparison Charts */

function buildComparisonTrendChart(player1, player2, stat) {
  const p1Seasons = players
    .filter(p => p.player_display_name === player1)
    .sort((a, b) => Number(a.season) - Number(b.season));

  const p2Seasons = players
    .filter(p => p.player_display_name === player2)
    .sort((a, b) => Number(a.season) - Number(b.season));

  if (!p1Seasons.length || !p2Seasons.length) return null;

  const allSeasons = [...new Set([
    ...p1Seasons.map(p => Number(p.season)),
    ...p2Seasons.map(p => Number(p.season))
  ])].sort((a, b) => a - b);

  const p1Values = allSeasons.map(season => {
    const row = p1Seasons.find(p => Number(p.season) === season);
    return row ? getStat(row, stat) : null;
  });

  const p2Values = allSeasons.map(season => {
    const row = p2Seasons.find(p => Number(p.season) === season);
    return row ? getStat(row, stat) : null;
  });

  return {
    chartType: "line",
    title: `${player1} vs ${player2} ${stat.replace("def_", "").replaceAll("_", " ")}`.replace(/\b\w/g, c => c.toUpperCase()),
    labels: allSeasons,
    datasets: [
      {
        label: player1,
        data: p1Values,
        borderWidth: 3,
        tension: 0.3
      },
      {
        label: player2,
        data: p2Values,
        borderWidth: 3,
        tension: 0.3
      }
    ]
  };
}

/* ================================
POSITION DETECTION
================================ */
function detectPosition(q) {
  if (q.includes("qb")) return "QB";
  if (q.includes("wr")) return "WR";
  if (q.includes("rb")) return "RB";
  if (q.includes("te")) return "TE";
  if (q.includes("defense") || q.includes("defensive")) return "DEF";
  return null;
}

/* ================================
PLAYER DETECTION
================================ */
function detectPlayers(q) {
  let cleanQuery = q
    .toLowerCase()
    .replace(/[.'"]/g, "")
    .replace(/20\d{2}/g, "")
    .trim();

  const statPhrases = Object.keys(statMap).sort((a, b) => b.length - a.length);

  statPhrases.forEach(phrase => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    cleanQuery = cleanQuery.replace(regex, "");
  });

  cleanQuery = cleanQuery.replace(
    /\b(plot|graph|chart|visualize|trend|predict|next|next year|season|stats|stat|who|had|more|between|compare|how|is|what|which|consistent|consistency|elite|top|leader|leaders|best|most|highest|yards|tds|touchdowns)\b/g,
    ""
  );

  cleanQuery = cleanQuery.replace(/\s+/g, " ").trim();

  if (!cleanQuery) return [];

  const playerNames = cleanQuery
    .split(/\s+vs\s+|\s+v\s+|\s+versus\s+|\s+or\s+|\s+and\s+|,/)
    .map(s => s.trim())
    .filter(Boolean);

  const found = [];

  playerNames.forEach(name => {
    const exact = players.find(
      p => p.player_display_name.toLowerCase().replace(/[.'"]/g, "") === name
    );

    if (exact) {
      found.push(exact.player_display_name);
      return;
    }

    const startMatch = players.find(
      p => p.player_display_name.toLowerCase().replace(/[.'"]/g, "").startsWith(name)
    );

    if (startMatch) {
      found.push(startMatch.player_display_name);
      return;
    }

    const results = fuse.search(name);
    if (results.length) {
      found.push(results[0].item.player_display_name);
    }
  });

  return [...new Set(found)].slice(0, 2);
}

/* ================================
CHECK IF DEFENSIVE STAT
================================ */
function isDefensiveStat(stat) {
  return stat.startsWith("def_");
}

/* ================================
TOP PLAYERS / LEADERS
================================ */
function getTopPlayers(stat, season = null, topN = 5, position = null) {
  let filtered = season
    ? players.filter(p => Number(p.season) === season)
    : players;

  /* AUTO DETECT DEFENSE */
  if (isDefensiveStat(stat)) {
    position = "DEF";
  }

  if (position && position !== "DEF") {
    filtered = filtered.filter(p => p.position === position);
  }

  if (position === "DEF") {
    filtered = filtered.filter(p =>
      ["CB","DB","FS","SS","LB","OLB","ILB","DE","DT","NT"].includes(p.position)
    );
  }

  filtered = filtered.filter(p => getStat(p, stat) > 0);
  filtered.sort((a, b) => getStat(b, stat) - getStat(a, stat));

  return filtered.slice(0, topN)
    .map(p => `${p.player_display_name} (${getStat(p, stat)})`);
}

/* ================================
SMARTER PREDICTIONS
================================ */
function predictPlayerPerformance(playerName, stat) {
  const playerData = players
    .filter(p => p.player_display_name === playerName)
    .sort((a, b) => Number(a.season) - Number(b.season));

  if (playerData.length < 2) {
    return `Not enough data to predict ${playerName}.`;
  }

  const last = playerData[playerData.length - 1];
  const prev = playerData[playerData.length - 2];

  const prediction =
    getStat(last, stat) * 0.7 +
    getStat(prev, stat) * 0.3;

  return `📈 Predicted ${stat.replace("def_", "").replace("_", " ")} for ${playerName} next season: ${Math.round(prediction)}`;
}

/* ================================
FORMAT PLAYER STATS
================================ */
function formatStats(player) {
  const pos = player.position;
  let output = `🏈 ${player.player_display_name} (${player.season}) – ${player.position}\n\n`;

  if (pos === "QB") {
    output += `
Passing Yards: ${player.passing_yards || 0}
Passing TDs: ${player.passing_tds || 0}
Rushing Yards: ${player.rushing_yards || 0}
Rushing TDs: ${player.rushing_tds || 0}
`;
  }

  if (pos === "RB") {
    output += `
Rushing Yards: ${player.rushing_yards || 0}
Rushing TDs: ${player.rushing_tds || 0}
Receiving Yards: ${player.receiving_yards || 0}
Receptions: ${player.receptions || 0}
`;
  }

  if (pos === "WR" || pos === "TE") {
    output += `
Receiving Yards: ${player.receiving_yards || 0}
Receiving TDs: ${player.receiving_tds || 0}
Receptions: ${player.receptions || 0}
Targets: ${player.targets || 0}
`;
  }

  if (["CB","DB","FS","SS","LB","OLB","ILB","DE","DT","NT"].includes(pos)) {
    output += `
Solo Tackles: ${player.def_tackles_solo || 0}
Sacks: ${player.def_sacks || 0}
Interceptions: ${player.def_interceptions || 0}
Passes Defended: ${player.def_pass_defended || 0}
`;
  }

  return output;
}

/* ================================
AI ENGINE
================================ */
function generateResponse(question) {
  const q = question.toLowerCase();
  const intent = detectIntent(q);
  const season = extractSeason(q);
  let statRequested = detectStat(q);
  if (!statRequested) statRequested = detectStatLoose(q);
  const playersMentioned = detectPlayers(q);
  let position = detectPosition(q);

  /* ================================
  NEW QUESTION TYPES
  ================================ */

  /* CAREER STATS */
  if (q.includes("career") && statRequested && playersMentioned.length) {
    const total = getCareerStat(playersMentioned[0], statRequested);
    return `🏆 Career ${statRequested.replace("def_", "").replace("_"," ")} for ${playersMentioned[0]}: ${total}`;
  }

  /* BEST SEASON */
  const isBestSeasonQuery =
  q.includes("best season") ||
  q.includes("highest season") ||
  (q.includes("best") && q.includes("season")) ||
  (q.includes("who had the best") && !!statRequested);

  if (isBestSeasonQuery && statRequested) {
    const isOverallQuery =
      q.includes("who had") ||
      q.includes("best overall") ||
      q.includes("in the league") ||
      q.includes("overall");

    if (!isOverallQuery && playersMentioned.length > 0) {
      const best = getBestSeason(playersMentioned[0], statRequested);
      if (!best) return "No season data found.";

      return `🔥 Best season for ${playersMentioned[0]}: ${best.season} with ${getStat(best, statRequested)} ${statRequested.replace(/_/g, " ")}`;
    }

    const bestOverall = getLeagueBestSeason(statRequested);
    if (!bestOverall) return "No season data found.";

    return `🔥 Best overall season for ${statRequested.replace(/_/g, " ")}: ${bestOverall.player_display_name} in ${bestOverall.season} with ${getStat(bestOverall, statRequested)}.`;
  }

  /* TREND */
  if (!isChartQuery(q) && q.includes("trend") && statRequested && playersMentioned.length) {
    return analyzeTrend(playersMentioned[0], statRequested);
  }

  /* CONSISTENCY */
  if (q.includes("consistent") || q.includes("consistency")) {
    if (!playersMentioned.length) {
      return "I couldn't detect a player. Try a name like 'Justin Jefferson' or 'Travis Kelce'.";
    }

    const playerName = playersMentioned[0];

    // Get all seasons for the player, converting season to string for consistency
    const seasons = players
      .filter(p => p.player_display_name === playerName)
      .filter((v, i, a) =>
        a.findIndex(x => String(x.season) === String(v.season)) === i
      );

    if (seasons.length < 2) {
      return "Not enough seasons to measure consistency.";
    }

    const position = seasons[0].position;

    // Auto-select the most relevant stat based on position
    let statToMeasure;
    if (position === "QB") statToMeasure = "passing_yards";
    else if (position === "RB") statToMeasure = "rushing_yards";
    else if (position === "WR" || position === "TE") statToMeasure = "receiving_yards";
    else if (["CB","DB","FS","SS","LB","OLB","ILB","DE","DT","NT"].includes(position)) {
      // Pick first available defensive stat
      statToMeasure =
        seasons.find(s => s.def_tackles_solo) ? "def_tackles_solo" :
        seasons.find(s => s.def_interceptions) ? "def_interceptions" :
        seasons.find(s => s.def_sacks) ? "def_sacks" :
        "def_tackles_solo"; // fallback
    } else {
      statToMeasure = "receiving_yards"; // default fallback
    }

    // Map stat values, ignore undefined/null, convert to number
    const values = seasons
      .map(s => Number(s[statToMeasure]))
      .filter(v => !isNaN(v));

    if (values.length < 2) {
      return "Not enough data to measure consistency.";
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const score = Math.round(Math.max(0, Math.min(100, 100 - (stdDev / avg * 100))));

    return `📊 Consistency score for ${playerName} (${statToMeasure.replace("_", " ")}): ${score}/100`;
  }

  /* AUTO FIX DEFENSE LEADER QUERIES */
  if (statRequested && isDefensiveStat(statRequested)) {
    position = "DEF";
  }

  /* ELITE PLAYER CHECK */
  if (q.includes("elite") && playersMentioned.length) {

    const playerName = playersMentioned[0];
    const seasons = players.filter(p => p.player_display_name === playerName);

    if (!seasons.length) return `No data found for ${playerName}.`;

    const latest = seasons[seasons.length - 1];

    let stat;
    if (latest.position === "QB") stat = "passing_yards";
    else if (latest.position === "RB") stat = "rushing_yards";
    else stat = "receiving_yards";

    const leaders = getTopPlayers(stat, latest.season, 5);

    const elite = leaders.some(p => p.includes(playerName));

    if (elite) {
      return `🔥 Yes — ${playerName} is performing at an elite level based on ${stat.replace("_"," ")} rankings.`;
    }

    return `📊 ${playerName} is solid, but not currently top 5 in ${stat.replace("_"," ")}.`;
  }

  /* LEAGUE LEADERS */
  if ((intent === "LEADER") && statRequested) {
    const top = getTopPlayers(statRequested, season, 5, position);

    let label = "Players";
    if (position === "QB") label = "QB";
    if (position === "RB") label = "RB";
    if (position === "WR") label = "WR";
    if (position === "TE") label = "TE";
    if (position === "DEF") label = "Defensive Players";

    return `🏆 Top 5 ${label} for ${statRequested.replace("def_", "").replace("_", " ")} (${season || "Season"}):\n${top.join("\n")}`;
  }

  /* PREDICTIONS */
  if ((intent === "PREDICT" || q.includes("predict")) && playersMentioned.length) {

    const playerName = playersMentioned[0];

    if (!statRequested) {
      return "I couldn't detect which stat to predict. Try something like 'predict passing TDs for Josh Allen'.";
    }

    const seasons = players.filter(p => p.player_display_name === playerName);

    if (!seasons.length) {
      return "No data found.";
    }

    return predictPlayerPerformance(playerName, statRequested);
  }

    /* WHO IS BETTER */ 
  if (q.includes("better") && playersMentioned.length === 2) {

    const [p1, p2] = playersMentioned;

    const p1Seasons = players.filter(p => p.player_display_name === p1);
    const p2Seasons = players.filter(p => p.player_display_name === p2);

    if (!p1Seasons.length || !p2Seasons.length) {
      return "Not enough data to compare.";
    }

    const pos = p1Seasons[0].position;

    let stat;

    if (pos === "QB") stat = "passing_yards";
    else if (pos === "RB") stat = "rushing_yards";
    else stat = "receiving_yards";

    const p1Career = getCareerStat(p1, stat);
    const p2Career = getCareerStat(p2, stat);

    if (p1Career > p2Career) {
      return `🏆 ${p1} has been more productive overall based on career ${stat.replace("_"," ")}.`;
    }

    if (p2Career > p1Career) {
      return `🏆 ${p2} has been more productive overall based on career ${stat.replace("_"," ")}.`;
    }

    return `Both players have identical career ${stat.replace("_"," ")}.`;
  }

  /* TWO PLAYER COMPARISON CHART */
  if (isChartQuery(q) && playersMentioned.length === 2 && statRequested) {
    const [p1Name, p2Name] = playersMentioned;

    const chart = buildComparisonTrendChart(p1Name, p2Name, statRequested);

    if (!chart) {
      return {
        reply: `Not enough data to build a comparison chart for ${p1Name} and ${p2Name}.`
      };
    }

    return {
      type: "comparison_chart",
      reply: `Here is the comparison chart for ${p1Name} vs ${p2Name} in ${statRequested.replace("def_", "").replaceAll("_", " ")}.`,
      chart
    };
  }

  /* COMPARISON */
  if (playersMentioned.length === 2 && statRequested) {
    const [p1Name, p2Name] = playersMentioned;

    let p1;
    let p2;

    if (season) {
      p1 = players.find(
        p => p.player_display_name === p1Name && Number(p.season) === season
      );

      p2 = players.find(
        p => p.player_display_name === p2Name && Number(p.season) === season
      );
    } else {
      p1 = players.filter(p => p.player_display_name === p1Name).slice(-1)[0];
      p2 = players.filter(p => p.player_display_name === p2Name).slice(-1)[0];
    }

    if (!p1 || !p2) {
      return `I couldn't find both players for ${season}.`;
    }

    const val1 = getStat(p1, statRequested);
    const val2 = getStat(p2, statRequested);

    let winner = "Both players";
    if (val1 > val2) winner = p1.player_display_name;
    if (val2 > val1) winner = p2.player_display_name;

    return `
  📊 ${statRequested.replace("def_", "").replace("_", " ").toUpperCase()} (${season || p1.season})

  ${p1.player_display_name}: ${val1}
  ${p2.player_display_name}: ${val2}

  🏆 ${winner} had more.
  `;
  }

  /* CHART / TREND VISUALIZATION */
  if (isChartQuery(q) && playersMentioned.length) {
  let chartStat = statRequested;

  if (!chartStat && q.includes("fantasy")) {
    chartStat = "fantasy_points";
  }

  if (!chartStat) {
    const playerSeasons = players.filter(
      p => p.player_display_name === playersMentioned[0]
    );

    if (!playerSeasons.length) {
      return { reply: "No data found for that player." };
    }

    const pos = playerSeasons[0].position;

    if (pos === "QB") chartStat = "passing_yards";
    else if (pos === "RB") chartStat = "rushing_yards";
    else if (pos === "WR" || pos === "TE") chartStat = "receiving_yards";
    else chartStat = "fantasy_points";
  }

  const chart = buildPlayerTrendChart(playersMentioned[0], chartStat);

  if (!chart) {
    return {
      reply: `Not enough data to build a trend chart for ${playersMentioned[0]}.`
    };
  }

  return {
    type: "chart",
    reply: `Here is the trend chart for ${playersMentioned[0]} in ${chartStat.replace("def_", "").replaceAll("_", " ")}.`,
    chart
  };
  }

  /* SINGLE PLAYER LOOKUP */
  const playerCandidates = players.filter(
    p => p.player_display_name === playersMentioned[0]
  );

  let playerData;

  if (season) {
    playerData = playerCandidates.find(p => Number(p.season) === season);

    if (!playerData) {
      return `I couldn't find ${season} data for ${playersMentioned[0]}.`;
    }
  } else {
    playerData = playerCandidates[playerCandidates.length - 1];
  }

  if (!playerData) return "No data found for that player.";

  if (statRequested) {
    const value = getStat(playerData, statRequested);
    return `
📊 ${playerData.player_display_name} (${playerData.season})

${statRequested.replace("def_", "").replace("_", " ").toUpperCase()}: ${value}
`;
  }

  return formatStats(playerData);
}

/* ================================
ROUTE
================================ */
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: "Please ask a question." });

  const cleanedMessage = await correctUserMessage(message);
  const result = generateResponse(cleanedMessage);

  if (typeof result === "string") {
    return res.json({ reply: result });
  }

  return res.json(result);

});

/* ================================
START SERVER
================================ */
app.listen(PORT, () => {
  console.log(`🚀 NFL AI Server running on http://localhost:${PORT}`);
});

// ============================
// Fantasy Builder Routes
// ============================

const fantasyRoutes = require("./routes/fantasy");
app.use("/api/fantasy", fantasyRoutes);
