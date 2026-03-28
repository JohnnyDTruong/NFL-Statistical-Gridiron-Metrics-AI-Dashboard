/* ============================================================
NFL SCRIPT 5 – FANTASY TEAM BUILDER
============================================================ */

(() => {

  console.log("Fantasy Builder module loaded");
  let editingTeamId = null;
  document.addEventListener("DOMContentLoaded", () => {

    let players = [];

    /* =========================================================
    LOAD PLAYERS
    ========================================================= */

    async function loadPlayers() {

      const res = await fetch("stats_players_all.json");
      players = await res.json();

      /* keep most recent season */
      players = players.filter(p => p.season === 2025);

      populateAllLists();
      updateTotals();
    }

    /* =========================================================
    POPULATE DATALISTS
    ========================================================= */

    function populateList(listId, position) {

      const list = document.getElementById(listId);

      if (!list) return;

      list.innerHTML = "";

      const filtered = players
        .filter(p => p.position === position)
        .sort((a, b) => b.fantasy_points - a.fantasy_points);

      filtered.forEach(player => {

        const option = document.createElement("option");

        option.value =
          `${player.player_display_name} (${player.recent_team})`;

        list.appendChild(option);

      });

    }

    function populateAllLists() {

      populateList("qbList", "QB");
      populateList("rbList", "RB");
      populateList("wrList", "WR");
      populateList("teList", "TE");

    }

    /* =========================================================
    FIND PLAYER
    ========================================================= */

    function getPlayer(name) {

      if (!name) return null;

      const cleanName = name.split("(")[0].trim();

      return players.find(
        p => p.player_display_name === cleanName
      );

    }

    /* =========================================================
    PREDICTED FANTASY CALCULATION
    ========================================================= */

    function calculatePredictedFantasy(player) {

      let pts = 0;

      pts += (player.passing_yards || 0) * 0.04;
      pts += (player.passing_tds || 0) * 4;
      pts += (player.passing_interceptions || 0) * -2;

      pts += (player.rushing_yards || 0) * 0.1;
      pts += (player.rushing_tds || 0) * 6;

      pts += (player.receiving_yards || 0) * 0.1;
      pts += (player.receiving_tds || 0) * 6;
      pts += (player.receptions || 0) * 1;

      return pts;

    }

    /* =========================================================
    GENERATE BEST LINEUP
    ========================================================= */

    function generateBestLineup() {

    if (!players.length) return;

    const qb = players
        .filter(p => p.position === "QB")
        .sort((a, b) =>
        calculatePredictedFantasy(b) - calculatePredictedFantasy(a)
        )[0];

    const rbs = players
        .filter(p => p.position === "RB")
        .sort((a, b) =>
        calculatePredictedFantasy(b) - calculatePredictedFantasy(a)
        )
        .slice(0, 2);

    const wrs = players
        .filter(p => p.position === "WR")
        .sort((a, b) =>
        calculatePredictedFantasy(b) - calculatePredictedFantasy(a)
        )
        .slice(0, 3);

    const te = players
        .filter(p => p.position === "TE")
        .sort((a, b) =>
        calculatePredictedFantasy(b) - calculatePredictedFantasy(a)
        )[0];

    document.getElementById("qbSelect").value =
        `${qb.player_display_name} (${qb.recent_team})`;

    document.getElementById("rb1Select").value =
        `${rbs[0].player_display_name} (${rbs[0].recent_team})`;

    document.getElementById("rb2Select").value =
        `${rbs[1].player_display_name} (${rbs[1].recent_team})`;

    document.getElementById("wr1Select").value =
        `${wrs[0].player_display_name} (${wrs[0].recent_team})`;

    document.getElementById("wr2Select").value =
        `${wrs[1].player_display_name} (${wrs[1].recent_team})`;

    document.getElementById("wr3Select").value =
        `${wrs[2].player_display_name} (${wrs[2].recent_team})`;

    document.getElementById("teSelect").value =
        `${te.player_display_name} (${te.recent_team})`;

    updateTotals();

    alert("🏆 Best lineup generated using projected fantasy points!");

    }

    /* =========================================================
    CALCULATE TOTALS
    ========================================================= */

    function updateTotals() {

        const selectedNames = [

            document.getElementById("qbSelect").value,
            document.getElementById("rb1Select").value,
            document.getElementById("rb2Select").value,
            document.getElementById("wr1Select").value,
            document.getElementById("wr2Select").value,
            document.getElementById("wr3Select").value,
            document.getElementById("teSelect").value

        ];

        let totalFantasy = 0;
        let predicted = 0;

        let selectedPlayers = [];

        selectedNames.forEach(name => {

            const player = getPlayer(name);

            if (!player) return;

            selectedPlayers.push(player);

            totalFantasy += player.fantasy_points || 0;
            predicted += calculatePredictedFantasy(player);

        });

        // update totals
        document.getElementById("fantasyTotal").textContent =
            Math.round(totalFantasy);

        document.getElementById("fantasyPrediction").textContent =
            Math.round(predicted);

        const grade = getTeamGrade(totalFantasy);
        const feedback = generateTeamFeedback(selectedPlayers);

        const teamGradeEl = document.getElementById("teamGrade");
        const teamFeedbackEl = document.getElementById("teamFeedback");

        if (teamGradeEl) {
        teamGradeEl.textContent = grade;
        }

        if (teamFeedbackEl) {
        teamFeedbackEl.innerHTML =
            feedback.map(f => `<li>${f}</li>`).join("");
        }

    }

    /* =========================================================
    TREND ANALYSIS
    ========================================================= */

    function getTrend(player) {

    if (!player.fantasy_points) return "stable";

    if (player.fantasy_points > 250) return "up";
    if (player.fantasy_points < 120) return "down";

    return "stable";

    }

    /* =========================================================
    AI TEAM FEEDBACK
    ========================================================= */

    function generateTeamFeedback(selectedPlayers) {

    let feedback = [];

    let rbTotal = 0;
    let wrTotal = 0;

    selectedPlayers.forEach(player => {

        if (!player) return;

        const trend = getTrend(player);

        if (trend === "up") {
        feedback.push(`${player.player_display_name} is trending upward 📈`);
        }

        if (trend === "down") {
        feedback.push(`${player.player_display_name} is declining 📉`);
        }

        if (player.position === "RB") {
        rbTotal += player.fantasy_points || 0;
        }

        if (player.position === "WR") {
        wrTotal += player.fantasy_points || 0;
        }

    });

    // positional insights
    if (rbTotal < 300) {
        feedback.push("RB group is weak - consider upgrading.");
    }

    if (wrTotal > 500) {
        feedback.push("WR group is a strong advantage.");
    }

    return feedback;

    }

    /* =========================================================
    TEAM GRADE
    ========================================================= */

    function getTeamGrade(score) {

    if (score > 1400) return "A 🔥";
    if (score > 1200) return "B 👏";
    if (score > 1000) return "C 👌";
    if (score > 850) return "D ‼️";

    return "F 👎";

    }

    /* =========================================================
    SAVE TEAM
    ========================================================= */

    document.getElementById("saveTeamBtn").onclick = async () => {

      const teamName =
        document.getElementById("teamName").value.trim();

      if (!teamName) {
        alert("Please enter a team name.");
        return;
      }

      const team = {
        name: teamName,

        qb: document.getElementById("qbSelect").value,

        rb: [
          document.getElementById("rb1Select").value,
          document.getElementById("rb2Select").value
        ],

        wr: [
          document.getElementById("wr1Select").value,
          document.getElementById("wr2Select").value,
          document.getElementById("wr3Select").value
        ],

        te: document.getElementById("teSelect").value,

        fantasyPoints: Number(
          document.getElementById("fantasyTotal").textContent
        ),

        prediction: Number(
          document.getElementById("fantasyPrediction").textContent
        )

      };

      try {
        console.log("Saving Team:", team);
        const url = editingTeamId
        ? `http://localhost:3001/api/fantasy/update/${editingTeamId}`
        : "http://localhost:3001/api/fantasy/save";

        const method = editingTeamId ? "PUT" : "POST";

        const res = await fetch(url, {

        method: method,

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(team)

        });

        if (res.ok) {

          alert("Team Saved!");
          editingTeamId = null;
          document.getElementById("saveTeamBtn").textContent = "Save Team";  
          loadSavedTeams();
          document.getElementById("teamName").value = "";
          document
            .querySelectorAll("#fantasyBuilder input")
            .forEach(input => {

              if (input.id !== "teamName") {
                input.value = "";
              }
            });
          updateTotals();
        }

      } catch (err) {

        console.error(err);
        alert("Error saving team");
      }
    };

    /* =========================================================
    EVENT LISTENERS
    ========================================================= */

    const inputs = [

      "qbSelect",
      "rb1Select",
      "rb2Select",
      "wr1Select",
      "wr2Select",
      "wr3Select",
      "teSelect"

    ];

    inputs.forEach(id => {

      const el = document.getElementById(id);

      if (el) {
        el.addEventListener("input", updateTotals);
      }

    });

    const bestLineupBtn = document.getElementById("generateBestLineupBtn");

    if (bestLineupBtn) {
    bestLineupBtn.addEventListener("click", generateBestLineup);
    }

    const teamSearchInput = document.getElementById("teamSearch");

    if (teamSearchInput) {

    teamSearchInput.addEventListener("input", (e) => {

        loadSavedTeams(e.target.value);

    });

    }
    
    /* =========================================================
    LOAD SAVED TEAMS
    ========================================================= */

    async function loadSavedTeams(search = "") {

    try {

        const res = await fetch("http://localhost:3001/api/fantasy/all");
        const teams = await res.json();

        const container = document.getElementById("displaySavedTeams");

        if (!container) return;

        if (!teams.length) {

        container.innerHTML = "No saved teams yet.";
        return;

        }

        container.innerHTML = "";

        const filtered = teams.filter(team =>
            team.name.toLowerCase().includes(search.toLowerCase())
        );

        if (!filtered.length) {

        container.innerHTML = "No matching teams found.";
        return;
        }

        filtered.forEach(team => {

        const div = document.createElement("div");

        div.className = "saved-team";

        const teamPlayers = [
        getPlayer(team.qb),
        ...team.rb.map(getPlayer),
        ...team.wr.map(getPlayer),
        getPlayer(team.te)
        ];

        const grade = getTeamGrade(team.fantasyPoints);
        const feedback = generateTeamFeedback(teamPlayers);

        div.innerHTML = `

        <h4>${team.name}</h4>

        <p><strong>QB:</strong> ${team.qb}</p>
        <p><strong>RB:</strong> ${team.rb.join(", ")}</p>
        <p><strong>WR:</strong> ${team.wr.join(", ")}</p>
        <p><strong>TE:</strong> ${team.te}</p>

        <p><strong>Fantasy Points:</strong> ${team.fantasyPoints}</p>
        <p><strong>Prediction:</strong> ${team.prediction}</p>

        <p><strong>Team Grade:</strong> ${grade}</p>

        <h5>AI Feedback</h5>
        <ul>
            ${feedback.map(f => `<li>${f}</li>`).join("")}
        </ul>

        <button class="editTeamBtn" data-id="${team._id}">
            Edit
        </button>

        <button class="deleteTeamBtn" data-id="${team._id}">
            Delete
        </button>

        <hr>
        `;

            container.appendChild(div);

            /* DELETE BUTTON */
            div
            .querySelector(".deleteTeamBtn")
            .addEventListener("click", () => {

                deleteTeam(team._id);

            });

            /* EDIT BUTTON */
            div
            .querySelector(".editTeamBtn")
            .addEventListener("click", () => {

                editingTeamId = team._id;
                loadTeamIntoBuilder(team);
                document.getElementById("saveTeamBtn").textContent = "Update Team";
                
                const builder = document.getElementById("fantasyBuilder");

                builder.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                builder.classList.add("edit-highlight");
                setTimeout(() => {
                    builder.classList.remove("edit-highlight");
                }, 1000);
            });

        });

        } catch (err) {

            console.error("Error loading teams:", err);

        }

    }

    /* =============================
    DELETE TEAM
    ============================= */

    async function deleteTeam(id) {

    if (!confirm("Delete this team?")) return;

    try {

        await fetch(
        `http://localhost:3001/api/fantasy/delete/${id}`,
        { method: "DELETE" }
        );

        loadSavedTeams();

    } catch (err) {

        console.error(err);

    }

    }

    /* =============================
    LOAD TEAM INTO BUILDER
    ============================= */

    function loadTeamIntoBuilder(team) {

    document.getElementById("teamName").value = team.name;

    document.getElementById("qbSelect").value = team.qb;

    document.getElementById("rb1Select").value = team.rb[0];
    document.getElementById("rb2Select").value = team.rb[1];

    document.getElementById("wr1Select").value = team.wr[0];
    document.getElementById("wr2Select").value = team.wr[1];
    document.getElementById("wr3Select").value = team.wr[2];

    document.getElementById("teSelect").value = team.te;

    updateTotals(); // recalculates automatically

    }

    /* =========================================================
    INIT
    ========================================================= */

    loadPlayers();
    loadSavedTeams();

    });

})();
