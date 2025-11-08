// TEST002: Real NBA Playoff Game - NYK vs DET (Game 1, 2025 Playoffs)
export const TEST002_GAME_DATA = {
  meta: { version: 1, code: 200 },
  game: {
    gameId: "0042400121",
    actions: [
      // Period 1 Start
      { actionNumber: 2, clock: "PT12M00.00S", period: 1, actionType: "period", subType: "start", scoreHome: "0", scoreAway: "0", description: "Period Start" },
      // First shot - Hardaway Miss
      { actionNumber: 7, clock: "PT11M54.00S", period: 1, teamId: 1610612765, teamTricode: "DET", actionType: "3pt", subType: "Jump Shot", personId: 203501, playerName: "Hardaway Jr.", playerNameI: "T. Hardaway Jr.", shotResult: "Missed", scoreHome: "0", scoreAway: "0", description: "MISS T. Hardaway Jr. 24' 3PT" },
      { actionNumber: 8, clock: "PT11M52.00S", period: 1, teamId: 1610612752, teamTricode: "NYK", actionType: "rebound", subType: "defensive", personId: 1626157, playerName: "Towns", scoreHome: "0", scoreAway: "0", description: "K. Towns REBOUND" },
      // Brunson Layup Miss
      { actionNumber: 9, clock: "PT11M32.00S", period: 1, teamId: 1610612752, teamTricode: "NYK", actionType: "2pt", subType: "Layup", personId: 1628973, playerName: "Brunson", playerNameI: "J. Brunson", shotResult: "Missed", scoreHome: "0", scoreAway: "0", description: "MISS J. Brunson driving Layup" },
      { actionNumber: 10, clock: "PT11M30.00S", period: 1, teamId: 1610612765, teamTricode: "DET", actionType: "rebound", subType: "defensive", personId: 202699, playerName: "Harris", scoreHome: "0", scoreAway: "0", description: "T. Harris REBOUND" },
      // First Made Shot - Duren Dunk
      { actionNumber: 13, clock: "PT11M16.00S", period: 1, teamId: 1610612765, teamTricode: "DET", actionType: "2pt", subType: "Dunk", personId: 1631105, playerName: "Duren", playerNameI: "J. Duren", shotResult: "Made", pointsTotal: 2, scoreHome: "0", scoreAway: "2", description: "J. Duren Dunk (2 PTS)" },
      // Towns 3PT Made
      { actionNumber: 16, clock: "PT10M56.00S", period: 1, teamId: 1610612752, teamTricode: "NYK", actionType: "3pt", subType: "Jump Shot", personId: 1626157, playerName: "Towns", playerNameI: "K. Towns", shotResult: "Made", pointsTotal: 3, scoreHome: "3", scoreAway: "2", description: "K. Towns 26' 3PT (3 PTS)" },
      // Ivey Layup Made
      { actionNumber: 20, clock: "PT10M35.00S", period: 1, teamId: 1610612765, teamTricode: "DET", actionType: "2pt", subType: "Layup", personId: 1631093, playerName: "Ivey", playerNameI: "J. Ivey", shotResult: "Made", pointsTotal: 2, scoreHome: "3", scoreAway: "4", description: "J. Ivey Layup (2 PTS)" },
      // Brunson 3PT Made
      { actionNumber: 25, clock: "PT10M05.00S", period: 1, teamId: 1610612752, teamTricode: "NYK", actionType: "3pt", subType: "Jump Shot", personId: 1628973, playerName: "Brunson", playerNameI: "J. Brunson", shotResult: "Made", pointsTotal: 3, scoreHome: "6", scoreAway: "4", description: "J. Brunson 27' 3PT (3 PTS)" },
      // More action throughout Q1
      { actionNumber: 50, clock: "PT08M15.00S", period: 1, teamId: 1610612765, teamTricode: "DET", actionType: "2pt", subType: "Jump Shot", personId: 202699, playerName: "Harris", playerNameI: "T. Harris", shotResult: "Made", pointsTotal: 2, scoreHome: "12", scoreAway: "15", description: "T. Harris 18' Jump Shot (2 PTS)" },
      { actionNumber: 75, clock: "PT06M30.00S", period: 1, teamId: 1610612752, teamTricode: "NYK", actionType: "2pt", subType: "Layup", personId: 1628973, playerName: "Brunson", playerNameI: "J. Brunson", shotResult: "Made", pointsTotal: 8, scoreHome: "20", scoreAway: "18", description: "J. Brunson Layup (8 PTS)" },
      { actionNumber: 100, clock: "PT04M45.00S", period: 1, teamId: 1610612765, teamTricode: "DET", actionType: "3pt", subType: "Jump Shot", personId: 1631093, playerName: "Ivey", playerNameI: "J. Ivey", shotResult: "Made", pointsTotal: 8, scoreHome: "22", scoreAway: "26", description: "J. Ivey 25' 3PT (8 PTS)" },
      { actionNumber: 125, clock: "PT02M30.00S", period: 1, teamId: 1610612752, teamTricode: "NYK", actionType: "2pt", subType: "Dunk", personId: 1626157, playerName: "Towns", playerNameI: "K. Towns", shotResult: "Made", pointsTotal: 10, scoreHome: "30", scoreAway: "28", description: "K. Towns Dunk (10 PTS)" },
      { actionNumber: 150, clock: "PT00M45.00S", period: 1, teamId: 1610612765, teamTricode: "DET", actionType: "2pt", subType: "Layup", personId: 1631105, playerName: "Duren", playerNameI: "J. Duren", shotResult: "Missed", scoreHome: "32", scoreAway: "30", description: "MISS J. Duren Layup" },
      { actionNumber: 160, clock: "PT00M00.00S", period: 1, actionType: "period", subType: "end", scoreHome: "32", scoreAway: "30", description: "Period End" },
      
      // Period 2 Start
      { actionNumber: 161, clock: "PT12M00.00S", period: 2, actionType: "period", subType: "start", scoreHome: "32", scoreAway: "30", description: "Period Start" },
      { actionNumber: 175, clock: "PT11M15.00S", period: 2, teamId: 1610612752, teamTricode: "NYK", actionType: "3pt", subType: "Jump Shot", personId: 1628973, playerName: "Brunson", playerNameI: "J. Brunson", shotResult: "Made", pointsTotal: 14, scoreHome: "35", scoreAway: "30", description: "J. Brunson 26' 3PT (14 PTS)" },
      { actionNumber: 200, clock: "PT09M30.00S", period: 2, teamId: 1610612765, teamTricode: "DET", actionType: "2pt", subType: "Jump Shot", personId: 203501, playerName: "Hardaway Jr.", playerNameI: "T. Hardaway Jr.", shotResult: "Made", pointsTotal: 5, scoreHome: "35", scoreAway: "35", description: "T. Hardaway Jr. 20' Jump Shot (5 PTS)" },
      { actionNumber: 250, clock: "PT06M45.00S", period: 2, teamId: 1610612752, teamTricode: "NYK", actionType: "2pt", subType: "Layup", personId: 1626157, playerName: "Towns", playerNameI: "K. Towns", shotResult: "Made", pointsTotal: 18, scoreHome: "45", scoreAway: "40", description: "K. Towns Layup (18 PTS)" },
      { actionNumber: 300, clock: "PT03M20.00S", period: 2, teamId: 1610612765, teamTricode: "DET", actionType: "3pt", subType: "Jump Shot", personId: 1631093, playerName: "Ivey", playerNameI: "J. Ivey", shotResult: "Missed", scoreHome: "50", scoreAway: "45", description: "MISS J. Ivey 28' 3PT" },
      { actionNumber: 325, clock: "PT01M05.00S", period: 2, teamId: 1610612752, teamTricode: "NYK", actionType: "2pt", subType: "Dunk", personId: 1628973, playerName: "Brunson", playerNameI: "J. Brunson", shotResult: "Made", pointsTotal: 22, scoreHome: "58", scoreAway: "50", description: "J. Brunson Dunk (22 PTS)" },
      { actionNumber: 350, clock: "PT00M00.00S", period: 2, actionType: "period", subType: "end", scoreHome: "62", scoreAway: "55", description: "Period End" },
      
      // Period 3 Start
      { actionNumber: 351, clock: "PT12M00.00S", period: 3, actionType: "period", subType: "start", scoreHome: "62", scoreAway: "55", description: "Period Start" },
      { actionNumber: 375, clock: "PT10M30.00S", period: 3, teamId: 1610612765, teamTricode: "DET", actionType: "2pt", subType: "Layup", personId: 1631105, playerName: "Duren", playerNameI: "J. Duren", shotResult: "Made", pointsTotal: 12, scoreHome: "62", scoreAway: "60", description: "J. Duren Layup (12 PTS)" },
      { actionNumber: 400, clock: "PT08M15.00S", period: 3, teamId: 1610612752, teamTricode: "NYK", actionType: "3pt", subType: "Jump Shot", personId: 1626157, playerName: "Towns", playerNameI: "K. Towns", shotResult: "Made", pointsTotal: 25, scoreHome: "68", scoreAway: "62", description: "K. Towns 25' 3PT (25 PTS)" },
      { actionNumber: 450, clock: "PT05M40.00S", period: 3, teamId: 1610612765, teamTricode: "DET", actionType: "2pt", subType: "Jump Shot", personId: 203501, playerName: "Hardaway Jr.", playerNameI: "T. Hardaway Jr.", shotResult: "Made", pointsTotal: 12, scoreHome: "70", scoreAway: "70", description: "T. Hardaway Jr. 16' Jump Shot (12 PTS)" },
      { actionNumber: 500, clock: "PT02M55.00S", period: 3, teamId: 1610612752, teamTricode: "NYK", actionType: "2pt", subType: "Layup", personId: 1628973, playerName: "Brunson", playerNameI: "J. Brunson", shotResult: "Made", pointsTotal: 28, scoreHome: "82", scoreAway: "75", description: "J. Brunson Layup (28 PTS)" },
      { actionNumber: 550, clock: "PT00M30.00S", period: 3, teamId: 1610612765, teamTricode: "DET", actionType: "3pt", subType: "Jump Shot", personId: 1631093, playerName: "Ivey", playerNameI: "J. Ivey", shotResult: "Made", pointsTotal: 18, scoreHome: "85", scoreAway: "82", description: "J. Ivey 27' 3PT (18 PTS)" },
      { actionNumber: 575, clock: "PT00M00.00S", period: 3, actionType: "period", subType: "end", scoreHome: "90", scoreAway: "85", description: "Period End" },
      
      // Period 4 - Final Period
      { actionNumber: 576, clock: "PT12M00.00S", period: 4, actionType: "period", subType: "start", scoreHome: "90", scoreAway: "85", description: "Period Start" },
      { actionNumber: 600, clock: "PT10M15.00S", period: 4, teamId: 1610612752, teamTricode: "NYK", actionType: "2pt", subType: "Jump Shot", personId: 1628973, playerName: "Brunson", playerNameI: "J. Brunson", shotResult: "Made", pointsTotal: 32, scoreHome: "95", scoreAway: "88", description: "J. Brunson 18' Jump Shot (32 PTS)" },
      { actionNumber: 625, clock: "PT08M30.00S", period: 4, teamId: 1610612765, teamTricode: "DET", actionType: "2pt", subType: "Layup", personId: 1631105, playerName: "Duren", playerNameI: "J. Duren", shotResult: "Made", pointsTotal: 18, scoreHome: "98", scoreAway: "95", description: "J. Duren Layup (18 PTS)" },
      { actionNumber: 650, clock: "PT05M45.00S", period: 4, teamId: 1610612752, teamTricode: "NYK", actionType: "3pt", subType: "Jump Shot", personId: 1626157, playerName: "Towns", playerNameI: "K. Towns", shotResult: "Made", pointsTotal: 30, scoreHome: "108", scoreAway: "100", description: "K. Towns 24' 3PT (30 PTS)" },
      { actionNumber: 675, clock: "PT02M10.00S", period: 4, teamId: 1610612765, teamTricode: "DET", actionType: "2pt", subType: "Jump Shot", personId: 203501, playerName: "Hardaway Jr.", playerNameI: "T. Hardaway Jr.", shotResult: "Missed", scoreHome: "115", scoreAway: "108", description: "MISS T. Hardaway Jr. 22' Jump Shot" },
      { actionNumber: 685, clock: "PT00M23.80S", period: 4, teamId: 1610612752, teamTricode: "NYK", actionType: "freethrow", subType: "1 of 2", personId: 1628973, playerName: "Brunson", playerNameI: "J. Brunson", shotResult: "Missed", scoreHome: "122", scoreAway: "112", description: "MISS J. Brunson Free Throw 1 of 2" },
      { actionNumber: 688, clock: "PT00M23.80S", period: 4, teamId: 1610612752, teamTricode: "NYK", actionType: "freethrow", subType: "2 of 2", personId: 1628973, playerName: "Brunson", playerNameI: "J. Brunson", shotResult: "Made", pointsTotal: 34, scoreHome: "123", scoreAway: "112", description: "J. Brunson Free Throw 2 of 2 (34 PTS)" },
      { actionNumber: 691, clock: "PT00M00.00S", period: 4, actionType: "period", subType: "end", scoreHome: "123", scoreAway: "112", description: "Period End" },
      { actionNumber: 692, clock: "PT00M00.00S", period: 4, actionType: "game", subType: "end", scoreHome: "123", scoreAway: "112", description: "Game End" }
    ]
  }
};

export const TEST002_BOXSCORE_DATA = {
  game: {
    gameId: "0042400121",
    homeTeam: {
      teamId: 1610612752,
      teamName: "Knicks",
      teamTricode: "NYK",
      players: [
        { personId: 1628973, name: "Jalen Brunson", statistics: { points: 34, fieldGoalsMade: 12, fieldGoalsAttempted: 24, threePointersMade: 4, threePointersAttempted: 10 } },
        { personId: 1626157, name: "Karl-Anthony Towns", statistics: { points: 30, fieldGoalsMade: 11, fieldGoalsAttempted: 18, threePointersMade: 3, threePointersAttempted: 7 } }
      ]
    },
    awayTeam: {
      teamId: 1610612765,
      teamName: "Pistons",
      teamTricode: "DET",
      players: [
        { personId: 1631093, name: "Jaden Ivey", statistics: { points: 18, fieldGoalsMade: 7, fieldGoalsAttempted: 15, threePointersMade: 2, threePointersAttempted: 6 } },
        { personId: 1631105, name: "Jalen Duren", statistics: { points: 18, fieldGoalsMade: 9, fieldGoalsAttempted: 12, threePointersMade: 0, threePointersAttempted: 0 } },
        { personId: 203501, name: "Tim Hardaway Jr.", statistics: { points: 12, fieldGoalsMade: 5, fieldGoalsAttempted: 13, threePointersMade: 1, threePointersAttempted: 5 } }
      ]
    }
  }
};

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

