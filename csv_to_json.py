import csv
import json

csv_file = 'stats_player_regpost_2022.csv'
json_file = 'stats_player_regpost_2022.json'

data = []

with open(csv_file, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        for key in row:
            try:
                if '.' in row[key]:
                    row[key] = float(row[key])
                else:
                    row[key] = int(row[key])
            except:
                pass
        data.append(row)

with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Converted {csv_file} → {json_file}")
