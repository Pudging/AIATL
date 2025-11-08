import json
from nba_api.stats.endpoints import leaguedashplayerstats
from nba_api.stats.static import players

SEASON = "2024-25"   # Change this for future seasons

def get_all_player_stats():
    # Fetch season totals for all players
    stats = leaguedashplayerstats.LeagueDashPlayerStats(
        season=SEASON,
        per_mode_detailed="Totals"
    ).get_dict()

    # Extract headers + rows
    headers = stats["resultSets"][0]["headers"]
    rows = stats["resultSets"][0]["rowSet"]

    # Convert rows to list of dicts
    players_stats = [dict(zip(headers, row)) for row in rows]

    return players_stats

def main():
    all_stats = get_all_player_stats()

    # Save as JSON
    with open("all_player_stats.json", "w") as f:
        json.dump(all_stats, f, indent=2)

    print(f"Exported {len(all_stats)} players → all_player_stats.json")

if __name__ == "__main__":
    main()