/* ============================================================
NFL SCRIPT 5 – NFL CHAT AI TAB (Updated for Bubble UI + Predictions)
============================================================ */

(() => {
  console.log("NFL Chat module loaded");

  document.addEventListener("DOMContentLoaded", () => {

    const chatInput = document.getElementById("chatInput");
    const chatButton = document.getElementById("chatButton");
    const chatOutput = document.getElementById("chatOutput");
    const recentContainer = document.getElementById("recentQuestions"); // fixed ID

    if (!chatInput || !chatButton || !chatOutput) {
      console.log("NFL Chat elements not found.");
      return;
    }

    /* =========================================
    RECENT SEARCH STORAGE (Last 6)
    ========================================= */
    function saveRecentSearch(query) {
      let searches = JSON.parse(localStorage.getItem("nflRecentSearches")) || [];
      searches = searches.filter(s => s !== query);
      searches.unshift(query);
      if (searches.length > 6) searches = searches.slice(0, 6);
      localStorage.setItem("nflRecentSearches", JSON.stringify(searches));
      renderRecentSearches();
    }

    function renderRecentSearches() {
      if (!recentContainer) return;
      const searches = JSON.parse(localStorage.getItem("nflRecentSearches")) || [];
      recentContainer.innerHTML = "";
      searches.forEach(search => {
        const btn = document.createElement("button");
        btn.classList.add("recent-btn");
        btn.textContent = search;
        btn.addEventListener("click", () => {
          chatInput.value = search;
          sendMessage();
        });
        recentContainer.appendChild(btn);
      });
    }

    renderRecentSearches();

    /* =========================================
    ADD MESSAGE TO CHAT WINDOW
    ========================================= */
    function addMessage(text, sender) {
      const messageDiv = document.createElement("div");
      messageDiv.classList.add(sender === "user" ? "user-msg" : "ai-msg", "chat-message");
      messageDiv.textContent = text;
      chatOutput.appendChild(messageDiv);
      chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    /* =========================================
    SEND MESSAGE TO BACKEND
    ========================================= */
    async function sendMessage() {
      const message = chatInput.value.trim();
      if (!message) return;

      chatButton.disabled = true;

      // Add user message bubble
      addMessage(message, "user");
      saveRecentSearch(message);
      chatInput.value = "";

      // Add thinking bubble
      const thinkingDiv = document.createElement("div");
      thinkingDiv.classList.add("ai-msg", "chat-message");
      thinkingDiv.textContent = "Thinking...";
      chatOutput.appendChild(thinkingDiv);
      chatOutput.scrollTop = chatOutput.scrollHeight;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message })
        });

        if (!response.ok) throw new Error("Server error");

        const data = await response.json();
        chatOutput.removeChild(thinkingDiv);

        // Handle backend responses
        if (data.type === "player") {
          renderPlayerStats(data.data);
        } else if (data.type === "comparison") {
          renderComparison(data.data);
        } else if (data.reply) {
          addMessage(data.reply, "ai");
        } else {
          addMessage("AI returned an unexpected response.", "ai");
        }

      } catch (error) {
        console.error("Chat error:", error);
        if (chatOutput.contains(thinkingDiv)) chatOutput.removeChild(thinkingDiv);
        addMessage("⚠️ Unable to connect to server. Make sure backend is running.", "ai");
      }

      chatButton.disabled = false;
    }

    /* =========================================
    RENDER PLAYER STATS CLEANLY
    ========================================= */
    function renderPlayerStats(data) {
      let output = `📊 ${data.player_display_name} (${data.season}) – ${data.position}\n\n`;

      if (data.passing_yards !== undefined) output += `Passing Yards: ${data.passing_yards}\n`;
      if (data.passing_tds !== undefined) output += `Passing TDs: ${data.passing_tds}\n`;
      if (data.rushing_yards !== undefined) output += `Rushing Yards: ${data.rushing_yards}\n`;
      if (data.rushing_tds !== undefined) output += `Rushing TDs: ${data.rushing_tds}\n`;
      if (data.receiving_yards !== undefined) output += `Receiving Yards: ${data.receiving_yards}\n`;
      if (data.receiving_tds !== undefined) output += `Receiving TDs: ${data.receiving_tds}\n`;
      if (data.receptions !== undefined) output += `Receptions: ${data.receptions}\n`;
      if (data.targets !== undefined) output += `Targets: ${data.targets}\n`;

      // Defensive stats
      if (data.def_interceptions !== undefined) output += `Interceptions: ${data.def_interceptions}\n`;
      if (data.def_tackles_solo !== undefined) output += `Solo Tackles: ${data.def_tackles_solo}\n`;
      if (data.def_sacks !== undefined) output += `Sacks: ${data.def_sacks}\n`;
      if (data.def_pass_defended !== undefined) output += `Passes Defended: ${data.def_pass_defended}\n`;
      if (data.def_tackle_assists !== undefined) output += `Assist Tackles: ${data.def_tackle_assists}\n`;
      if (data.def_fumbles_forced !== undefined) output += `Forced Fumbles: ${data.def_fumbles_forced}\n`;

      addMessage(output, "ai");
    }

    /* =========================================
    RENDER COMPARISON
    ========================================= */
    function renderComparison(data) {
      const p1 = data.player1;
      const p2 = data.player2;

      let output = `⚔️ Player Comparison\n\n`;

      output += `${p1.player_display_name} (${p1.season})\n`;
      if (p1.passing_yards) output += `Passing Yards: ${p1.passing_yards}\n`;
      if (p1.rushing_yards) output += `Rushing Yards: ${p1.rushing_yards}\n`;
      if (p1.receiving_yards) output += `Receiving Yards: ${p1.receiving_yards}\n`;
      if (p1.def_interceptions) output += `Interceptions: ${p1.def_interceptions}\n`;
      output += "\n";

      output += `${p2.player_display_name} (${p2.season})\n`;
      if (p2.passing_yards) output += `Passing Yards: ${p2.passing_yards}\n`;
      if (p2.rushing_yards) output += `Rushing Yards: ${p2.rushing_yards}\n`;
      if (p2.receiving_yards) output += `Receiving Yards: ${p2.receiving_yards}\n`;
      if (p2.def_interceptions) output += `Interceptions: ${p2.def_interceptions}\n`;

      addMessage(output, "ai");
    }

    /* =========================================
    EVENT LISTENERS
    ========================================= */
    chatButton.addEventListener("click", sendMessage);

    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });

    /* =========================================
    SUGGESTED QUESTIONS DROPDOWN
    ========================================= */
    const chatSuggestions = document.getElementById("chatSuggestions");

    if (chatSuggestions) {
      chatSuggestions.addEventListener("change", () => {
        const selectedQuestion = chatSuggestions.value.trim();

        if (!selectedQuestion) return;

        chatInput.value = selectedQuestion;
        chatInput.focus();

        // Optional: auto-send immediately
        // sendMessage();

        chatSuggestions.selectedIndex = 0;
      });
    }

  });

})();
