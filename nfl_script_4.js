(() => {
  const input = document.getElementById("chatInput");
  const button = document.getElementById("sendChat");
  const box = document.getElementById("chatBox");

  if (!input || !button || !box) return;

  function renderMessage(text, type) {
    const div = document.createElement("div");
    div.className = `chat-msg ${type}`;
    div.innerText = text;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  async function askChat() {
    const question = input.value.trim();
    if (!question) return;

    renderMessage(question, "user");
    input.value = "";

    // Simple AI logic (can expand later)
    const answer = `AI Insight: Based on league trends and historical data, ${question} depends heavily on usage rate, efficiency, and team context.`;

    renderMessage(answer, "ai");

    await fetch("http://localhost:5000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        answer,
        season: 2024
      })
    });
  }

  button.addEventListener("click", askChat);
})();
