import json

files = [
    "stats_player_regpost_2022.json",
    "stats_player_regpost_2023.json",
    "stats_player_regpost_2024.json",
    "stats_player_regpost_2025.json"
]

merged = []

for file in files:
    with open(file, "r", encoding="utf-8") as f:
        data = json.load(f)
        merged.extend(data)

with open("stats_players_all.json", "w", encoding="utf-8") as f:
    json.dump(merged, f, indent=2)

print("Merged JSON created: stats_players_all.json")
