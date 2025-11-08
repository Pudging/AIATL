// Function to get test game data at a specific timestamp (0-6 representing actions)
export function getTestGameDataAtTimestamp(timestamp: number) {
  console.log(`[TEST GAME] Getting data for timestamp: ${timestamp}`);
  
  const allActions = [
      {
        actionNumber: 245,
        clock: "PT05M23.00S",
        period: 2,
        teamId: 1610612738,
        teamTricode: "BOS",
        personId: 1628369,
        playerName: "Jayson Tatum",
        playerNameI: "J. Tatum",
        actionType: "shot",
        shotResult: "Made",
        subType: "Jump Shot",
        points: 2,
        scoreHome: 58,
        scoreAway: 62,
        description: "Tatum 15' Jump Shot (18 PTS)"
      },
      {
        actionNumber: 244,
        clock: "PT05M45.00S",
        period: 2,
        teamId: 1610612747,
        teamTricode: "LAL",
        personId: 2544,
        playerName: "LeBron James",
        playerNameI: "L. James",
        actionType: "shot",
        shotResult: "Missed",
        subType: "3PT Jump Shot",
        points: 0,
        scoreHome: 58,
        scoreAway: 60,
        description: "James 26' 3PT Jump Shot Missed"
      },
      {
        actionNumber: 243,
        clock: "PT06M12.00S",
        period: 2,
        teamId: 1610612738,
        teamTricode: "BOS",
        personId: 203935,
        playerName: "Jaylen Brown",
        playerNameI: "J. Brown",
        actionType: "shot",
        shotResult: "Made",
        subType: "Layup",
        points: 2,
        scoreHome: 58,
        scoreAway: 60,
        description: "Brown Driving Layup (14 PTS)"
      },
      {
        actionNumber: 242,
        clock: "PT06M34.00S",
        period: 2,
        teamId: 1610612747,
        teamTricode: "LAL",
        personId: 1629027,
        playerName: "Anthony Davis",
        playerNameI: "A. Davis",
        actionType: "shot",
        shotResult: "Made",
        subType: "Dunk",
        points: 2,
        scoreHome: 58,
        scoreAway: 58,
        description: "Davis Alley Oop Dunk (16 PTS)"
      },
      {
        actionNumber: 241,
        clock: "PT07M01.00S",
        period: 2,
        teamId: 1610612738,
        teamTricode: "BOS",
        personId: 1628369,
        playerName: "Jayson Tatum",
        playerNameI: "J. Tatum",
        actionType: "shot",
        shotResult: "Made",
        subType: "3PT Jump Shot",
        points: 3,
        scoreHome: 56,
        scoreAway: 58,
        description: "Tatum 24' 3PT Jump Shot (16 PTS)"
      },
      {
        actionNumber: 240,
        clock: "PT07M23.00S",
        period: 2,
        teamId: 1610612747,
        teamTricode: "LAL",
        personId: 2544,
        playerName: "LeBron James",
        playerNameI: "L. James",
        actionType: "rebound",
        description: "James Defensive Rebound"
      },
      {
        actionNumber: 239,
        clock: "PT07M25.00S",
        period: 2,
        teamId: 1610612738,
        teamTricode: "BOS",
        personId: 203935,
        playerName: "Jaylen Brown",
        playerNameI: "J. Brown",
        actionType: "shot",
        shotResult: "Missed",
        subType: "Jump Shot",
        points: 0,
        scoreHome: 56,
        scoreAway: 55,
        description: "Brown 18' Jump Shot Missed"
      }
  ];

  // Reverse to get chronological order (oldest to newest)
  const chronologicalActions = [...allActions].reverse();
  
  // Return actions up to the timestamp
  const actionsUpToTimestamp = chronologicalActions.slice(0, Math.min(timestamp + 1, chronologicalActions.length));
  const lastAction = actionsUpToTimestamp[actionsUpToTimestamp.length - 1];
  
  console.log(`[TEST GAME] Returning ${actionsUpToTimestamp.length} actions, last action:`, lastAction?.description);

  return {
    gameId: "TEST001",
    game: {
      period: 2,
      gameClock: lastAction?.clock || "PT05M23.00S",
      homeTeam: {
        teamId: 1610612747,
        teamName: "Lakers",
        teamTricode: "LAL",
        score: lastAction?.scoreHome || 56
      },
      awayTeam: {
        teamId: 1610612738,
        teamName: "Celtics",
        teamTricode: "BOS",
        score: lastAction?.scoreAway || 55
      },
      actions: actionsUpToTimestamp
    }
  };
}

export const TEST_GAME_DATA = getTestGameDataAtTimestamp(6);

export const TEST_BOXSCORE_DATA = {
  game: {
    homeTeam: {
      teamId: 1610612747,
      teamName: "Lakers",
      teamTricode: "LAL",
      players: [
        {
          personId: 2544,
          name: "LeBron James",
          nameI: "L. James",
          jerseyNum: "23",
          position: "F",
          teamTricode: "LAL",
          statistics: {
            points: 22,
            fieldGoalsMade: 8,
            fieldGoalsAttempted: 15,
            threePointersMade: 2,
            threePointersAttempted: 6,
            assists: 7,
            rebounds: 6
          }
        },
        {
          personId: 1629027,
          name: "Anthony Davis",
          nameI: "A. Davis",
          jerseyNum: "3",
          position: "F-C",
          teamTricode: "LAL",
          statistics: {
            points: 18,
            fieldGoalsMade: 7,
            fieldGoalsAttempted: 12,
            threePointersMade: 0,
            threePointersAttempted: 1,
            assists: 3,
            rebounds: 11
          }
        }
      ]
    },
    awayTeam: {
      teamId: 1610612738,
      teamName: "Celtics",
      teamTricode: "BOS",
      players: [
        {
          personId: 1628369,
          name: "Jayson Tatum",
          nameI: "J. Tatum",
          jerseyNum: "0",
          position: "F",
          teamTricode: "BOS",
          statistics: {
            points: 24,
            fieldGoalsMade: 9,
            fieldGoalsAttempted: 18,
            threePointersMade: 3,
            threePointersAttempted: 8,
            assists: 5,
            rebounds: 8
          }
        },
        {
          personId: 203935,
          name: "Jaylen Brown",
          nameI: "J. Brown",
          jerseyNum: "7",
          position: "G-F",
          teamTricode: "BOS",
          statistics: {
            points: 20,
            fieldGoalsMade: 8,
            fieldGoalsAttempted: 14,
            threePointersMade: 2,
            threePointersAttempted: 5,
            assists: 4,
            rebounds: 5
          }
        }
      ]
    }
  }
};

