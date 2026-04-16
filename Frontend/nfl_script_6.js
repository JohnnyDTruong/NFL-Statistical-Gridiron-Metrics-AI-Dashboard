/* ============================================================
NFL SCRIPT 6 – NFL PLAYER GALLERY TAB W/ HEADSHOTS
============================================================ */

(() => {

document.addEventListener("DOMContentLoaded", () => {
    const seasonSelect = document.getElementById("gallerySeasonSelect");
    const teamSelect = document.getElementById("galleryTeamSelect");
    const positionSelect = document.getElementById("galleryPositionSelect");
    const galleryGrid = document.getElementById("playerGalleryGrid");

    if (!seasonSelect || !teamSelect || !positionSelect || !galleryGrid) return;

    function getAllPlayers() {
    return window.allPlayers || [];
    }

    function renderGallery() {
    const season = seasonSelect.value;
    const team = teamSelect.value;
    const position = positionSelect.value;

    let filtered = getAllPlayers().filter(player =>
        (!season || String(player.season) === season) &&
        (!team || player.recent_team === team) &&
        (!position || player.position === position || player.position_group === position)
    );

    const uniquePlayers = [];
    const seen = new Set();

    filtered.forEach(player => {
        const key = `${player.player_id}-${player.season}`;
        if (!seen.has(key)) {
        seen.add(key);
        uniquePlayers.push(player);
        }
    });

    uniquePlayers.sort((a, b) =>
        a.player_display_name.localeCompare(b.player_display_name)
    );

    if (!uniquePlayers.length) {
        galleryGrid.innerHTML = `<p style="text-align:center;">No players found for the selected filters.</p>`;
        return;
    }

    galleryGrid.innerHTML = uniquePlayers.map(player => `
        <div class="player-card">
        <img src="${player.headshot_url}" alt="${player.player_display_name}" loading="lazy">
        <h3>${player.player_display_name}</h3>
        <p>${player.position} • ${player.recent_team} • ${player.season}</p>
        </div>
    `).join("");
    }

    seasonSelect.addEventListener("change", renderGallery);
    teamSelect.addEventListener("change", renderGallery);
    positionSelect.addEventListener("change", renderGallery);

    renderGallery();
});

})();