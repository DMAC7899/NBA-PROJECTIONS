
const DATA = JSON.parse(document.getElementById('app-data').textContent);
const TEAMS = DATA.teams;
const PLAYERS = DATA.players;
const LEAGUE_AVG = DATA.leagueAvg;

const TEAM_ORDER = Object.keys(TEAMS).sort((a,b)=> TEAMS[a].name.localeCompare(TEAMS[b].name));
// ---------- CURRENT-SEASON BLEND (added Nov 4, 2026) ----------
// Every player's pts/trb/ast/tpm/stl/blk/tov/mpg/fgp/ftp/usg field below is now a BLEND of two
// real data points, computed once at data-build time (not at render time) and baked directly
// into these top-level fields -- so computeProjection, the usage-redistribution model, and every
// season-averages display all pick it up automatically with no code changes required elsewhere:
//   1. p.ls  -- the player's prior baseline exactly as it was before this update (their real
//      2025-26 per-game production for almost everyone; a 2023-24/2024-25 games-played-weighted
//      blend for the 4 long-term injury returners; an early-game/preseason estimate for rookies).
//   2. p.cs  -- their real 2026-27 per-game production so far this season, pulled from
//      Basketball-Reference's per_game and advanced tables (Nov 4, 2026 pull -- p.csAsOf).
// The blend weight (p.csWeight, the share given to p.cs) grows with games actually played this
// season, since a handful of games is noisy but shouldn't be ignored once it exists:
//   weight_cs = games_2026_27 / (games_2026_27 + K),   K = 10 for returning players (so it's a
//   roughly 50/50 blend by game ~10, capped at 0.85 so last season's signal is never fully
//   zeroed out), K = 4 for this year's true rookies -- who have no real prior NBA season to
//   shrink toward at all (p.ls for a rookie is itself just an early-sample/preseason guess), so
//   once they've logged at least one real 2026-27 game we trust that fully instead (csWeight=1).
// A player with no Basketball-Reference match this season (hasn't played yet -- waived, injured,
// not yet recalled, etc.) keeps their untouched p.ls baseline as-is: p.cs is null, p.csWeight is 0.
// This replaces the "too in line with last season" static-baseline behavior flagged Nov 2026 --
// see usgBadge() below for how the blend is surfaced in the Usage% tooltip.


// ---------- DEFENSE VS POSITION (real, live-pulled from BettingPros + hashtagbasketball.com) ----------
// Format per row: POS,TEAM,PTS,FG%,FT%,3PM,REB,AST,STL,BLK,TOV allowed per game to that position.
// PTS/REB/AST/3PM/STL/BLK/TOV sourced from BettingPros' Defense vs. Position cheat sheet
// (bettingpros.com/nba/defense-vs-position, 2025-26 season, pulled Aug 27 2026). FG%/FT% are not
// published by that source, so they're retained from the prior hashtagbasketball.com pull.
const DVP_RAW = "PG,ATL,20.05,45.4,82.4,2.46,4.51,6.82,1.25,0.44,2.94;PG,BKN,17.8,45.8,79.9,2.19,4.45,6.13,1.33,0.41,2.66;PG,BOS,20.28,43.1,81.2,2.92,4.05,6.64,1.01,0.37,2.04;PG,CHA,19.25,44.4,83.7,2.29,4.04,6.19,1.21,0.33,2.11;PG,CHI,18.07,43.6,82.2,2.26,4.33,6.75,1.33,0.43,2.07;PG,CLE,19.01,43.6,80.1,2.39,4.02,6.4,1.36,0.38,2.39;PG,DAL,21.44,44.3,82.9,2.29,4.89,7.45,1.41,0.41,2.56;PG,DEN,18.84,43.9,80.7,2.29,4.74,6.47,1.22,0.57,2.04;PG,DET,18.13,42.2,80.2,2.13,4.22,5.41,1.42,0.46,2.76;PG,GSW,19.98,47.6,82.4,2.36,4.47,6.17,1.52,0.32,2.52;PG,HOU,18.31,43.5,76.2,2.29,4.09,5.75,1.15,0.47,2.66;PG,IND,21.12,47.3,83.8,2.15,5.04,6.11,1.35,0.29,2.25;PG,LAC,19.37,45.4,80.0,2.48,4.82,6.68,1.36,0.42,2.41;PG,LAL,18.78,46.8,81.6,2.13,3.9,7.52,1.28,0.39,2.53;PG,MEM,19.81,45.3,80.8,2.61,5.06,6.73,1.64,0.48,2.3;PG,MIA,20.46,44.4,86.3,2.66,4.99,6.84,1.3,0.48,2.73;PG,MIL,19.72,46.5,85.3,2.61,4.86,6.6,1.19,0.34,2.07;PG,MIN,20.57,44.0,80.1,2.13,4.99,6.42,1.12,0.24,2.71;PG,NOP,19.16,44.0,82.8,2.51,4.27,6.68,1.16,0.38,2.81;PG,NYK,18.34,42.8,79.1,2.33,3.72,5.42,1.26,0.44,2.47;PG,OKC,17.03,41.5,72.7,2.48,4.62,5.69,1.11,0.39,2.74;PG,ORL,22.2,46.4,78.3,2.42,4.55,6.38,1.3,0.38,2.71;PG,PHI,18.05,44.1,78.2,2.32,4.57,5.96,1.13,0.44,2.33;PG,PHX,19.71,44.1,83.5,1.92,4.38,5.72,1.33,0.43,2.98;PG,POR,19.93,44.6,84.4,2.23,4.31,5.78,1.54,0.39,2.61;PG,SAC,21.03,48.6,83.3,2.54,4.44,6.56,1.36,0.45,2.48;PG,SAS,20.58,43.1,80.8,2.35,4.47,6.05,1.27,0.52,2.41;PG,TOR,20.44,46.2,81.1,2.59,4.19,5.65,1.42,0.55,2.85;PG,UTA,20.13,47.0,87.1,2.47,4.69,6.81,1.31,0.64,2.37;PG,WAS,20.12,44.8,82.5,2.5,4.59,6.59,1.47,0.43,2.01;SG,ATL,17.55,46.0,83.2,2.34,4.69,3.38,1.15,0.36,2.06;SG,BKN,16.4,46.7,81.0,2.41,4.35,3.47,1.27,0.59,1.74;SG,BOS,16.72,42.2,78.0,2.28,4.55,3.76,0.79,0.43,1.56;SG,CHA,16.75,43.5,84.8,2.11,4.56,4.01,1.19,0.27,1.49;SG,CHI,17.73,44.6,81.8,2.14,4.67,3.85,1.47,0.57,1.73;SG,CLE,17.39,44.6,84.7,2.41,4.18,3.4,1.44,0.42,1.81;SG,DAL,17.96,47.0,81.3,2.31,4.91,3.95,1.39,0.39,1.44;SG,DEN,18.16,44.1,83.2,2.51,4.66,3.73,1.18,0.43,1.76;SG,DET,17.67,41.8,82.5,2.27,4.18,2.99,1.18,0.54,1.84;SG,GSW,17.22,47.1,82.2,2.24,4.73,4.03,1.28,0.28,2.08;SG,HOU,15.89,44.1,78.5,2.11,4.11,3.65,1.25,0.53,1.74;SG,IND,18.08,45.5,80.2,2.05,4.96,3.49,1.05,0.31,1.55;SG,LAC,18.23,45.8,82.7,2.72,4.18,3.72,1.24,0.38,1.79;SG,LAL,16.62,44.5,83.9,2.27,4.1,4.08,1.32,0.41,1.67;SG,MEM,18.59,46.1,78.8,2.39,4.94,4.07,1.56,0.52,1.9;SG,MIA,18.54,43.0,82.3,2.34,5.21,3.96,1.1,0.52,1.87;SG,MIL,16.88,45.9,81.8,2.59,4.94,3.6,1.21,0.46,1.53;SG,MIN,16.63,42.9,82.1,2.07,4.61,3.58,1.08,0.36,1.69;SG,NOP,18.64,47.1,79.4,2.49,4.93,3.92,1.24,0.42,1.99;SG,NYK,16.86,44.9,81.3,2.47,4.88,3.78,1.14,0.36,1.93;SG,OKC,16.77,43.8,77.3,2.32,4.98,3.71,1.09,0.41,2.26;SG,ORL,17.6,45.6,83.7,2.38,4.65,3.62,1.1,0.42,1.89;SG,PHI,17.95,44.7,84.3,2.28,4.83,4.04,1.07,0.36,1.67;SG,PHX,17.09,45.3,82.5,2.08,4.62,3.08,1.07,0.37,2.22;SG,POR,16.87,44.7,81.9,2.17,4.49,3.42,1.46,0.41,1.99;SG,SAC,18.37,46.5,83.5,2.46,4.16,4.04,1.44,0.35,1.92;SG,SAS,17.22,42.4,83.3,2.45,4.73,3.55,1.13,0.48,1.79;SG,TOR,17.36,43.5,82.8,2.41,4.21,3.75,1.18,0.45,2.15;SG,UTA,18.47,46.7,79.5,2.53,4.91,4.19,1.29,0.56,1.83;SG,WAS,17.88,45.1,83.6,2.3,4.41,4.21,1.53,0.37,1.59;SF,ATL,19.94,45.3,84.4,2.13,5.98,3.25,1.43,0.69,2.03;SF,BKN,18.54,49.7,80.5,2.03,5.57,3.88,1.29,0.66,1.92;SF,BOS,15.86,43.3,80.6,1.89,5.74,2.63,0.8,0.31,1.54;SF,CHA,17.9,46.3,78.3,1.88,5.56,3.35,1.07,0.59,1.87;SF,CHI,19.29,46.8,77.4,2.23,6.64,3.7,1.2,0.65,1.95;SF,CLE,17.61,45.6,79.8,1.95,5.63,3.42,1.18,0.57,1.8;SF,DAL,18.45,44.9,78.9,1.87,5.55,3.95,1.22,0.5,1.87;SF,DEN,19.78,45.1,78.6,2.06,6.0,3.88,1.03,0.62,1.79;SF,DET,18.91,43.4,77.6,2.09,5.42,2.76,1.13,0.7,2.24;SF,GSW,18.73,45.0,87.0,1.94,5.57,3.67,1.18,0.49,2.62;SF,HOU,19.22,44.9,81.6,1.91,5.54,3.54,1.34,0.61,1.84;SF,IND,18.72,49.2,78.6,1.76,6.3,3.34,1.29,0.63,1.7;SF,LAC,18.54,44.6,81.0,1.92,5.15,3.5,1.09,0.44,2.22;SF,LAL,18.99,46.1,79.1,1.95,5.62,3.46,1.29,0.44,1.96;SF,MEM,19.43,48.2,82.8,2.06,6.12,3.46,1.09,0.62,1.84;SF,MIA,19.45,46.7,81.1,2.52,5.92,3.37,1.28,0.69,1.96;SF,MIL,19.08,44.6,77.0,2.17,6.02,3.55,1.13,0.59,1.82;SF,MIN,18.73,44.6,78.8,1.97,5.6,3.2,1.24,0.62,1.88;SF,NOP,19.67,46.5,76.1,2.12,6.08,3.43,1.12,0.72,1.7;SF,NYK,18.89,44.7,76.8,2.21,5.98,3.23,1.01,0.59,1.85;SF,OKC,17.29,41.7,79.3,2.08,6.18,3.17,1.03,0.55,2.11;SF,ORL,19.09,45.2,80.0,1.82,5.83,3.52,1.22,0.88,1.94;SF,PHI,18.97,45.1,81.2,1.84,5.56,3.91,0.91,0.52,2.27;SF,PHX,18.67,46.3,76.5,1.98,5.43,3.37,1.07,0.49,1.94;SF,POR,18.15,45.2,80.9,1.81,6.28,3.07,1.59,0.71,1.79;SF,SAC,18.54,49.2,78.4,2.06,4.57,3.42,0.93,0.28,1.98;SF,SAS,17.7,44.6,79.2,1.89,5.66,3.3,1.1,0.51,1.86;SF,TOR,16.98,45.9,80.0,1.85,5.53,3.24,1.0,0.68,2.05;SF,UTA,20.5,47.1,78.7,2.28,5.91,4.65,1.19,0.54,1.97;SF,WAS,18.87,49.2,81.5,2.16,5.96,3.84,1.44,0.59,2.03;PF,ATL,17.26,49.1,74.9,1.67,7.62,3.55,0.97,0.91,1.97;PF,BKN,18.26,52.7,71.2,1.37,7.03,3.72,1.11,0.94,2.28;PF,BOS,17.34,46.7,77.2,2.11,6.46,3.17,0.6,0.49,1.86;PF,CHA,19.9,50.0,78.0,1.92,6.64,3.85,0.93,0.61,1.93;PF,CHI,21.31,52.1,75.1,1.97,7.36,3.9,1.2,0.95,1.85;PF,CLE,18.99,48.4,76.8,1.65,7.37,3.98,1.02,0.83,2.0;PF,DAL,18.75,50.4,72.0,1.93,6.65,3.05,0.98,0.9,1.93;PF,DEN,18.82,49.3,72.6,1.94,7.2,4.12,0.97,0.78,1.81;PF,DET,19.89,46.3,78.0,1.91,6.98,3.64,1.27,1.3,2.56;PF,GSW,18.87,48.4,76.0,1.86,7.43,3.33,1.02,0.71,2.18;PF,HOU,17.18,47.5,73.7,1.69,6.06,2.86,1.06,0.79,1.76;PF,IND,19.68,50.4,71.7,1.84,8.3,3.46,1.11,0.97,1.9;PF,LAC,16.66,47.6,77.0,1.68,6.25,3.3,1.11,0.76,1.78;PF,LAL,17.01,51.4,75.3,1.85,7.18,2.94,1.11,0.76,1.84;PF,MEM,18.57,48.9,74.2,1.94,6.88,3.14,1.11,0.78,1.96;PF,MIA,19.15,49.0,74.9,1.88,7.68,3.63,1.12,0.91,2.24;PF,MIL,18.32,49.6,75.1,2.23,6.98,3.65,0.87,0.81,1.98;PF,MIN,17.07,51.0,77.2,1.83,7.2,2.6,0.96,0.78,1.92;PF,NOP,17.33,46.8,74.5,1.88,7.32,3.57,1.08,1.28,1.9;PF,NYK,18.11,48.6,73.7,1.99,6.22,3.37,0.99,0.61,2.15;PF,OKC,17.91,45.2,70.4,2.12,7.62,3.43,1.17,0.85,2.09;PF,ORL,16.71,50.7,76.3,1.38,6.57,2.88,1.18,0.92,1.66;PF,PHI,17.83,50.4,74.0,1.56,7.44,3.49,0.89,0.88,2.33;PF,PHX,16.93,46.5,77.2,1.62,6.77,3.03,1.13,0.71,2.06;PF,POR,17.05,48.6,74.6,1.59,6.52,3.13,1.41,0.89,2.21;PF,SAC,18.66,48.8,79.4,1.74,6.43,3.58,1.07,0.72,2.02;PF,SAS,15.7,47.7,77.2,1.71,6.54,2.9,1.1,0.69,1.74;PF,TOR,17.62,48.4,76.6,1.75,7.27,3.16,1.0,0.92,2.15;PF,UTA,18.5,51.5,75.2,1.72,6.89,4.15,1.21,0.86,2.03;PF,WAS,19.93,51.5,73.4,1.84,7.24,3.76,1.36,0.81,1.97;C,ATL,16.2,54.8,71.9,0.6,10.6,3.1,1.0,0.9,2.0;C,BKN,15.4,58.2,74.2,0.4,8.9,2.4,1.2,1.5,1.4;C,BOS,17.2,47.9,70.0,1.4,9.3,3.5,0.8,0.9,1.9;C,CHA,16.9,51.7,72.5,1.3,8.2,2.8,0.9,1.3,1.3;C,CHI,18.3,55.4,69.7,1.1,9.7,4.1,1.0,1.7,1.2;C,CLE,15.4,52.8,75.1,0.9,9.6,2.8,1.2,1.2,1.7;C,DAL,17.0,54.9,70.6,0.7,10.0,3.8,0.9,1.3,1.8;C,DEN,15.0,55.9,66.9,0.8,9.2,3.1,0.8,1.0,1.4;C,DET,14.7,52.1,73.2,1.1,8.9,3.0,1.1,1.6,1.9;C,GSW,16.8,54.6,71.1,0.9,9.6,3.9,1.1,0.8,1.5;C,HOU,15.6,52.9,65.6,0.9,9.9,3.2,1.0,1.4,1.8;C,IND,17.1,56.3,71.7,0.6,10.3,3.1,0.9,1.2,1.7;C,LAC,15.9,53.6,76.6,0.7,9.8,2.9,1.0,1.2,1.8;C,LAL,15.6,57.3,75.4,0.6,9.0,3.8,1.1,0.9,2.3;C,MEM,17.1,57.5,70.2,1.1,11.3,4.8,0.9,1.5,2.8;C,MIA,14.4,54.1,75.4,0.7,10.0,3.0,0.7,1.0,1.7;C,MIL,16.7,54.0,70.0,0.7,9.3,2.6,1.2,1.1,1.7;C,MIN,18.1,51.8,71.1,1.1,9.8,4.6,0.8,1.0,2.1;C,NOP,17.6,56.5,73.4,0.8,10.2,3.4,1.1,1.4,1.6;C,NYK,15.6,52.1,77.2,1.3,8.4,2.6,0.8,1.1,1.7;C,OKC,14.4,48.1,68.5,0.8,10.1,4.0,0.7,1.0,2.0;C,ORL,15.1,53.9,70.2,0.5,9.8,3.0,0.8,1.2,2.1;C,PHI,15.1,52.7,71.9,1.0,9.7,2.6,0.9,1.4,2.0;C,PHX,16.0,56.6,71.7,0.9,10.7,4.0,0.9,1.1,2.3;C,POR,19.4,54.8,71.2,1.4,9.9,3.7,1.3,1.6,1.9;C,SAC,19.6,57.2,69.6,1.0,10.7,3.4,1.1,1.5,1.6;C,SAS,17.6,49.1,74.0,1.1,9.6,4.1,0.9,1.3,1.4;C,TOR,15.4,53.1,74.3,0.8,9.1,2.7,1.0,1.1,1.5;C,UTA,17.5,58.1,66.7,1.1,10.4,3.9,1.1,1.7,2.1;C,WAS,19.8,57.2,77.5,1.1,11.8,3.0,0.9,1.8,2.2";
const DVP_CODE_MAP = {GS:'GSW', NO:'NOP', NY:'NYK', PHO:'PHX', SA:'SAS'};

// ---------- EARLY 2026-27 SEASON DEFENSE-VS-POSITION (BettingPros.com, live in-season data) ----------
// Same 5-position grain and same site family as DVP_RAW above, but for the CURRENT, IN-PROGRESS
// 2026-27 season (pulled Oct 27 2026, after each team had played roughly 3-6 games). This is a
// real signal -- personnel/scheme changes show up immediately -- but a 3-6 game sample is noisy
// (see e.g. UTA allowing 41.4 PPG to opposing PGs, or WAS allowing just 15.6 -- almost certainly
// small-sample artifacts, not durable team identity). So this is blended into dvpMult() at a
// deliberately small weight (15%) alongside the full-season 2025-26 DVP_RAW signal (85%), not used
// on its own. No FG%/FT% columns exist on this source, so those two stats are unaffected by this
// blend and still come from DVP_RAW alone. Re-pull periodically as the sample grows through the
// season.
const DVP_EARLY_RAW = "PG,ATL,14.97,5.19,7.94,2.13,2.13,0.61,4.88;PG,BKN,22.21,7.18,10.12,2.28,1.96,1.3,4.9;PG,BOS,22.77,3.75,6.16,2.94,1.07,1.07,5.09;PG,CHA,18.41,5.22,8.64,2.27,0.9,0.22,3.18;PG,CHI,28.37,6.76,9.37,5.98,2.86,0.52,5.2;PG,CLE,27.32,4.31,8.98,3.59,1.79,0.0,4.67;PG,DAL,22.18,4.28,9.57,2.77,3.52,1.0,3.27;PG,DEN,25.86,7.05,6.27,4.31,1.17,0.78,3.91;PG,DET,27.46,7.56,4.77,2.78,1.59,1.59,0.79;PG,GSW,34.2,7.98,10.48,3.64,3.19,0.68,5.7;PG,HOU,25.53,4.25,5.85,3.19,1.86,0.0,4.78;PG,IND,24.76,3.21,5.46,4.5,1.28,1.28,3.21;PG,LAC,28.66,6.45,6.05,1.21,2.42,0.8,6.86;PG,LAL,37.49,6.98,10.66,4.04,2.57,0.0,7.35;PG,MEM,30.15,6.17,8.4,2.71,0.98,0.49,2.47;PG,MIA,27.41,6.99,8.11,3.91,1.67,0.83,5.03;PG,MIL,22.89,4.62,11.79,2.31,1.61,0.23,1.85;PG,MIN,19.8,4.88,8.13,2.17,2.17,0.81,3.79;PG,NOP,32.14,3.78,11.34,4.09,1.89,0.31,3.46;PG,NYK,19.39,5.28,7.64,2.93,2.64,0.88,2.64;PG,OKC,17.55,7.16,8.4,2.47,1.23,0.0,3.95;PG,ORL,23.06,6.95,9.15,2.92,2.19,0.73,4.02;PG,PHI,25.73,7.63,6.78,3.39,1.97,1.13,4.8;PG,PHX,28.82,6.29,6.78,2.9,3.14,0.48,4.6;PG,POR,25.39,6.25,4.29,1.56,3.12,0.78,4.29;PG,SAC,28.83,4.24,9.1,2.73,1.21,0.3,2.42;PG,SAS,25.17,6.74,7.52,3.37,2.33,0.77,3.37;PG,TOR,21.97,6.12,10.8,3.6,1.8,1.08,5.04;PG,UTA,41.36,6.12,9.49,4.9,2.75,0.3,3.37;PG,WAS,15.56,6.94,9.17,1.11,1.11,0.0,1.11;SG,ATL,21.55,7.6,4.56,2.78,2.02,0.76,4.05;SG,BKN,27.19,4.2,5.32,5.04,0.84,0.56,4.48;SG,BOS,21.8,4.9,4.65,4.9,2.69,0.49,3.43;SG,CHA,22.45,5.18,3.88,3.23,2.15,0.86,2.8;SG,CHI,26.94,7.78,6.07,2.65,2.08,0.94,3.22;SG,CLE,23.48,6.12,4.59,3.31,2.55,0.76,3.31;SG,DAL,22.67,5.92,5.15,3.09,2.06,0.0,1.03;SG,DEN,21.41,5.79,6.55,2.77,3.77,1.0,2.26;SG,DET,14.78,4.92,4.45,3.05,1.17,0.46,2.81;SG,GSW,24.12,6.03,4.34,3.37,1.92,0.48,3.61;SG,HOU,22.03,5.84,4.24,3.71,1.59,0.26,1.59;SG,IND,20.23,7.33,8.0,2.22,2.22,1.11,2.66;SG,LAC,25.48,7.11,6.71,3.16,3.35,0.19,4.54;SG,LAL,14.84,7.04,5.28,1.0,2.76,0.25,4.27;SG,MEM,20.63,5.8,3.8,2.4,1.8,0.6,3.0;SG,MIA,31.87,8.51,4.52,5.43,1.08,0.72,3.44;SG,MIL,25.06,7.22,2.76,3.82,1.48,1.48,2.54;SG,MIN,21.64,6.18,5.21,4.05,1.93,0.57,2.7;SG,NOP,21.06,5.78,4.95,0.82,1.23,0.0,1.23;SG,NYK,15.6,4.85,1.04,2.77,0.34,0.34,1.38;SG,OKC,22.72,7.88,5.56,2.55,2.08,0.69,3.47;SG,ORL,22.55,7.14,4.91,3.34,2.0,0.89,2.0;SG,PHI,18.8,8.39,4.05,1.88,1.01,0.86,3.03;SG,PHX,22.89,3.52,4.93,5.63,1.4,0.7,2.11;SG,POR,17.02,3.4,2.97,2.97,0.85,1.27,2.55;SG,SAC,23.7,8.61,5.11,4.04,3.23,0.8,3.23;SG,SAS,20.04,9.57,4.78,3.29,1.79,1.19,2.39;SG,TOR,25.55,6.08,3.4,3.16,1.21,0.24,4.13;SG,UTA,23.43,8.32,5.69,3.06,1.97,0.87,2.4;SG,WAS,29.41,6.3,4.55,4.02,1.75,0.87,2.8;SF,ATL,22.95,7.4,4.44,3.2,0.98,1.72,4.44;SF,BKN,19.21,6.14,3.07,3.07,1.15,0.76,2.69;SF,BOS,19.11,15.45,5.69,1.62,2.03,1.21,3.65;SF,CHA,20.52,9.65,3.01,2.71,3.92,0.9,3.62;SF,CHI,26.1,13.78,4.4,3.22,2.93,0.29,3.52;SF,CLE,24.43,11.4,2.93,2.28,2.6,0.32,2.28;SF,DAL,20.96,7.47,4.98,2.28,1.66,1.24,2.9;SF,DEN,29.75,10.11,6.06,2.88,0.86,0.28,3.17;SF,DET,16.36,7.51,7.51,1.32,0.44,0.88,2.21;SF,GSW,18.78,7.15,3.57,1.78,1.19,1.49,2.08;SF,HOU,22.54,6.79,4.83,1.96,3.04,0.17,2.32;SF,IND,21.52,9.77,1.98,1.98,1.82,0.99,1.32;SF,LAC,12.91,4.3,3.76,1.61,2.69,1.07,1.61;SF,LAL,20.15,11.57,2.23,2.23,1.49,0.37,0.74;SF,MEM,21.02,10.84,4.2,3.09,1.54,1.54,3.76;SF,MIA,17.38,9.78,7.33,1.08,2.98,1.9,2.98;SF,MIL,26.17,7.43,3.85,2.75,2.47,1.37,2.2;SF,MIN,18.4,6.45,2.86,0.95,2.15,1.43,3.1;SF,NOP,14.03,7.87,4.1,1.02,1.02,0.68,1.71;SF,NYK,25.86,9.05,4.2,4.84,0.96,1.29,2.26;SF,OKC,23.57,7.93,2.64,3.84,1.68,1.2,3.36;SF,ORL,24.41,6.38,3.0,2.62,2.25,0.75,2.25;SF,PHI,19.43,8.94,4.0,2.46,1.54,1.23,3.39;SF,PHX,31.12,10.24,6.69,3.93,1.57,0.78,2.75;SF,POR,12.42,9.49,0.73,0.73,0.0,0.0,1.46;SF,SAC,25.11,10.19,5.82,2.18,1.81,0.0,2.18;SF,SAS,21.27,8.83,4.41,2.4,0.8,1.2,2.4;SF,TOR,19.51,9.43,2.27,0.65,1.95,2.27,6.83;SF,UTA,20.55,5.91,1.4,3.09,2.25,0.56,1.68;SF,WAS,22.46,7.98,2.66,2.36,1.77,0.0,2.95;PF,ATL,26.61,10.36,4.67,2.43,1.21,1.21,3.45;PF,BKN,26.98,14.32,6.05,4.4,1.65,0.82,2.75;PF,BOS,17.85,11.62,4.56,1.66,1.24,0.83,2.49;PF,CHA,29.4,11.43,4.66,2.8,1.86,0.46,3.03;PF,CHI,27.94,12.36,6.18,2.41,1.07,1.07,1.88;PF,CLE,22.54,10.5,4.63,2.16,0.92,1.23,3.08;PF,DAL,28.54,10.52,5.61,3.04,1.16,0.93,3.5;PF,DEN,21.35,11.03,3.2,2.49,1.42,2.13,2.84;PF,DET,33.74,11.87,4.06,4.68,3.43,0.93,1.87;PF,GSW,20.91,8.05,5.0,2.61,2.17,0.43,2.83;PF,HOU,20.95,8.61,7.17,2.0,2.0,0.86,4.3;PF,IND,25.87,10.53,6.31,3.31,2.4,0.3,4.51;PF,LAC,15.25,6.86,1.14,2.67,1.14,0.76,0.76;PF,LAL,25.28,7.22,2.4,3.61,2.0,0.0,2.0;PF,MEM,15.42,9.25,3.39,1.54,1.85,2.15,3.7;PF,MIA,22.31,9.88,2.02,4.31,1.52,1.01,2.02;PF,MIL,24.44,11.12,3.7,2.18,2.61,1.96,3.05;PF,MIN,20.29,10.46,4.69,1.49,1.7,1.49,3.2;PF,NOP,24.48,10.24,2.74,3.49,1.74,0.74,2.49;PF,NYK,29.02,12.12,9.18,1.83,1.46,0.36,2.2;PF,OKC,16.78,10.45,2.75,2.47,0.82,0.55,3.02;PF,ORL,24.59,17.85,5.95,2.77,1.19,0.0,2.77;PF,PHI,22.37,13.05,3.1,1.55,0.93,1.24,2.79;PF,PHX,15.33,9.28,4.43,2.82,0.8,0.4,2.42;PF,POR,17.95,6.52,2.17,0.0,1.63,1.08,1.08;PF,SAC,18.13,11.47,3.7,3.7,1.48,1.85,2.59;PF,SAS,18.79,8.28,2.54,0.95,1.59,1.91,2.54;PF,TOR,15.81,13.92,1.58,1.58,2.53,1.26,5.06;PF,UTA,21.54,9.45,3.59,2.26,1.7,1.32,2.45;PF,WAS,25.88,15.58,3.43,1.58,3.16,1.05,4.22;C,ATL,23.36,14.17,6.3,0.78,2.36,1.31,3.41;C,BKN,27.12,11.22,5.14,1.4,2.8,3.27,4.2;C,BOS,25.46,14.24,3.02,1.72,0.86,0.43,3.88;C,CHA,19.29,10.68,4.75,1.78,0.59,2.07,2.67;C,CHI,19.69,9.84,2.12,0.79,0.79,2.92,2.66;C,CLE,17.5,16.31,1.98,1.19,0.79,0.79,3.18;C,DAL,21.25,15.69,4.25,1.3,0.98,2.28,4.57;C,DEN,17.97,12.73,4.86,1.49,0.37,1.12,2.99;C,DET,14.46,10.85,4.7,0.36,2.53,2.53,3.97;C,GSW,21.0,12.2,5.67,0.56,1.13,3.12,2.55;C,HOU,19.4,12.93,3.52,0.88,1.17,2.35,2.93;C,IND,25.23,19.25,5.64,0.99,2.32,2.98,2.98;C,LAC,21.82,15.78,5.03,0.33,2.35,2.35,3.02;C,LAL,20.46,8.66,5.2,1.04,2.08,1.73,4.5;C,MEM,18.12,12.18,3.12,0.93,1.87,3.74,3.12;C,MIA,15.74,17.45,4.79,0.68,1.36,1.71,2.39;C,MIL,23.6,15.97,5.44,0.72,1.81,0.72,2.54;C,MIN,22.54,12.52,3.22,1.43,1.43,1.78,2.14;C,NOP,30.66,15.33,4.99,1.66,0.99,2.99,4.33;C,NYK,18.64,13.11,5.17,2.07,1.38,3.79,3.1;C,OKC,20.97,11.22,4.43,1.47,1.47,3.54,4.43;C,ORL,22.26,13.43,6.52,0.0,0.38,1.15,3.83;C,PHI,23.29,19.08,2.91,1.61,0.97,3.88,4.52;C,PHX,23.21,20.89,3.31,0.99,0.33,1.65,3.64;C,POR,25.51,17.0,6.37,1.06,1.06,0.53,4.25;C,SAC,28.38,16.79,2.79,1.19,1.19,2.79,1.99;C,SAS,27.59,12.41,6.43,0.91,2.29,2.29,4.13;C,TOR,18.63,16.5,3.72,0.53,1.06,1.06,1.06;C,UTA,16.52,10.81,1.5,1.2,0.6,2.4,2.7;C,WAS,17.06,12.79,3.98,1.42,0.85,1.42,2.55";
const DVP_EARLY = {byTeam:{}, leagueAvgByPos:{}};
(function buildDvpEarly(){
  const statKeys = ['pts','reb','ast','tpm','stl','blk','tov'];
  DVP_EARLY_RAW.split(';').forEach(row=>{
    const f = row.split(',');
    const pos = f[0];
    const team = f[1];
    const vals = f.slice(2).map(Number);
    if(!DVP_EARLY.byTeam[team]) DVP_EARLY.byTeam[team] = {};
    const rec = {};
    statKeys.forEach((k,i)=> rec[k]=vals[i]);
    DVP_EARLY.byTeam[team][pos] = rec;
  });
  const positions = ['PG','SG','SF','PF','C'];
  positions.forEach(pos=>{
    const avg = {};
    statKeys.forEach(k=>{
      const all = Object.values(DVP_EARLY.byTeam).map(t=>t[pos][k]);
      avg[k] = all.reduce((a,b)=>a+b,0)/all.length;
    });
    DVP_EARLY.leagueAvgByPos[pos] = avg;
  });
})();

// ---------- HEAD COACHES & DEFENSIVE SCHEME CARRYOVER (researched live, Oct 2 2026) ----------
// Current 2026-27 head coach per team, tenure, and (for the 6 coaches new to their team this
// offseason) their prior stop and a researched characterization of what defensive identity they're
// bringing with them. This is qualitative color shown on the Defensive Profile tab, not a wholesale
// rewrite of real DRtg data. A small, explicitly-flagged numeric nudge (COACH_ADJ below) is applied
// only to the two clearest, multi-year-track-record cases (see Methodology for the exact weighting).
const COACH_DATA = {"ATL":{"coach":"Quin Snyder","tenure":"4th season","new":false,"prevTeam":null,"scheme":"Drop-coverage paint protection (Snyder's Utah trademark), still installing in Atlanta","note":"Built one of the league's most efficient drop-coverage defenses in Utah for years; Atlanta's defense has improved steadily but hasn't fully matched that peak yet given less rim-protection talent."},"BOS":{"coach":"Joe Mazzulla","tenure":"4th season","new":false,"prevTeam":null,"scheme":"Switch-everything, point-of-attack pressure, elite closeout discipline","note":""},"BKN":{"coach":"Jordi Fernandez","tenure":"3rd season","new":false,"prevTeam":null,"scheme":"Aggressive, young, still-developing identity; emphasizes ball pressure","note":"First-time HC (former Denver/Sacramento assistant); Nets defense remains a rebuilding work in progress."},"CHA":{"coach":"Charles Lee","tenure":"3rd season","new":false,"prevTeam":null,"scheme":"Drop-coverage lineage from his Milwaukee (Budenholzer) and Atlanta assistant days","note":""},"CHI":{"coach":"Tiago Splitter","tenure":"1st season (new)","new":true,"prevTeam":"POR (interim, 2025-26)","scheme":"Still forming \u2014 inherited Chicago's roster with no prior HC track record of his own","note":"Splitter was Portland's interim HC for the back half of 2025-26 after Chauncey Billups' departure; too short a sample to characterize an independent scheme. No numeric projection adjustment applied."},"CLE":{"coach":"Kenny Atkinson","tenure":"3rd season","new":false,"prevTeam":null,"scheme":"Positionally disciplined, switch-light, pack-the-paint structure","note":""},"DAL":{"coach":"Dusty May","tenure":"1st season (new)","new":true,"prevTeam":"Michigan (college)","scheme":"Unknown in the NBA \u2014 college hire with no NBA defensive track record to carry over","note":"May won the 2025 NCAA title at Michigan but has zero NBA coaching experience, so there's no prior-team NBA defensive data to project forward. No numeric projection adjustment applied \u2014 flagged as a pure unknown."},"DEN":{"coach":"David Adelman","tenure":"2nd season (full-time)","new":false,"prevTeam":null,"scheme":"Inherited Michael Malone's Jokic-anchored, switch-heavy scheme; first full season as permanent HC","note":""},"DET":{"coach":"J.B. Bickerstaff","tenure":"3rd season","new":false,"prevTeam":null,"scheme":"Physical, toughness-first, pack-line identity","note":""},"GSW":{"coach":"Steve Kerr","tenure":"13th season","new":false,"prevTeam":null,"scheme":"Disciplined switching, help-and-recover, historically more offense-than-defense-first","note":""},"HOU":{"coach":"Ime Udoka","tenure":"4th season","new":false,"prevTeam":null,"scheme":"Physical, Popovich-lineage defensive-identity-first coaching","note":""},"IND":{"coach":"Rick Carlisle","tenure":"6th season","new":false,"prevTeam":null,"scheme":"Historically offense/pace-oriented; defense has been more middling under him","note":""},"LAC":{"coach":"Tyronn Lue","tenure":"7th season","new":false,"prevTeam":null,"scheme":"Switch-heavy, veteran scheme discipline","note":""},"LAL":{"coach":"JJ Redick","tenure":"3rd season","new":false,"prevTeam":null,"scheme":"Still building an independent defensive identity in his 2nd full season","note":""},"MEM":{"coach":"Tuomas Iisalo","tenure":"2nd season","new":false,"prevTeam":null,"scheme":"High-pressure, position-less, European-influenced system still taking root","note":""},"MIA":{"coach":"Erik Spoelstra","tenure":"19th season","new":false,"prevTeam":null,"scheme":"Multiple-scheme, frequent zone mixing, discipline-first culture","note":""},"MIL":{"coach":"Taylor Jenkins","tenure":"1st season (new)","new":true,"prevTeam":"MEM (2019-2025)","scheme":"Fast, ball-pressure-heavy, turnover-forcing defense anchored by a rim-protecting big (Jaren Jackson Jr. in Memphis)","note":"Jenkins built Memphis into a top-10 defense for several years around Jaren Jackson Jr.'s rim protection and an aggressive, high-steal, trapping scheme (started his career as a Milwaukee assistant under Budenholzer, so this is a literal return). Small projection nudge applied to MIL \u2014 regressed heavily since Milwaukee's returning personnel (built around Giannis Antetokounmpo at the 5) differs from the Jackson-anchored Memphis teams."},"MIN":{"coach":"Chris Finch","tenure":"6th season","new":false,"prevTeam":null,"scheme":"Elite Gobert-anchored drop coverage + physical point-of-attack wings (McDaniels, Edwards) \u2014 a top-3 D in 2025-26","note":""},"NOP":{"coach":"Jamahl Mosley","tenure":"1st season (new)","new":true,"prevTeam":"ORL (2021-2026)","scheme":"Physical, switch-heavy, length-at-every-position defense that ranked top-5 in the NBA in multiple seasons in Orlando","note":"Mosley's Orlando defenses (Banchero/Wagner/Suggs/Carter length) were consistently elite over his 5 seasons there. Small projection nudge applied to NOP \u2014 heavily regressed since New Orleans' current roster doesn't have Orlando's size/length profile."},"NYK":{"coach":"Mike Brown","tenure":"2nd season","new":false,"prevTeam":null,"scheme":"Pack-line, positionally disciplined scheme carried over from his Sacramento tenure","note":""},"OKC":{"coach":"Mark Daigneault","tenure":"7th season","new":false,"prevTeam":null,"scheme":"Historically elite swarming, deflection- and turnover-forcing scheme with length at every spot","note":""},"ORL":{"coach":"Sean Sweeney","tenure":"1st season (new)","new":true,"prevTeam":"SAS (Associate HC, 2025-26)","scheme":"No singular prior system of his own \u2014 spent 2021-25 under Jason Kidd in Dallas, then 2025-26 as associate HC for a Wembanyama-anchored Spurs defense that reached the 2026 Finals","note":"Sweeney inherits an Orlando roster that already had one of the NBA's best defensive identities under outgoing coach Jamahl Mosley (elite length at every position) \u2014 that identity is a function of personnel as much as scheme, so it likely persists regardless of coaching change. Sweeney's own most recent stop (Spurs associate HC) was built around Victor Wembanyama's rim protection, a luxury Orlando doesn't have. No numeric nudge applied in either direction \u2014 net effect treated as a wash given Orlando's personnel-driven D should hold regardless."},"PHI":{"coach":"Nick Nurse","tenure":"4th season","new":false,"prevTeam":null,"scheme":"Versatile, creative, 'scheme of the week' \u2014 frequent zone looks, Toronto-era reputation","note":""},"PHX":{"coach":"Jordan Ott","tenure":"2nd season","new":false,"prevTeam":null,"scheme":"First full season after taking over mid-cycle; scheme identity still forming","note":""},"POR":{"coach":"Micah Nori","tenure":"1st season (new)","new":true,"prevTeam":"MIN (lead assistant, 2021-2026)","scheme":"Co-architect of Minnesota's Gobert-anchored, top-3 (2025-26) drop-coverage/rim-protection defense as Chris Finch's lead assistant for 5 seasons","note":"Nori was Minnesota's defensive-strategy voice under Finch during the Wolves' run to one of the NBA's best defenses, built around Rudy Gobert's rim protection and physical wing defenders. Portland's own personnel (Deandre Ayton at center, less proven wing defenders) is a weaker starting point than Minnesota's, so any carryover is more philosophy than immediate results. Small projection nudge applied to POR \u2014 the smallest of the three, given Nori was an assistant rather than the de facto play-caller."},"SAC":{"coach":"Doug Christie","tenure":"2nd season","new":false,"prevTeam":null,"scheme":"Still-forming identity after taking over mid-2025-26","note":""},"SAS":{"coach":"Mitch Johnson","tenure":"2nd season","new":false,"prevTeam":null,"scheme":"Victor Wembanyama-anchored elite rim protection; aggressive, high-event defense that carried San Antonio to the 2026 Finals","note":""},"TOR":{"coach":"Darko Rajakovic","tenure":"4th season","new":false,"prevTeam":null,"scheme":"Still-developing identity, emphasizes ball pressure and length","note":""},"UTA":{"coach":"Will Hardy","tenure":"5th season","new":false,"prevTeam":null,"scheme":"Versatile rebuilding scheme, youth-driven","note":""},"WAS":{"coach":"Brian Keefe","tenure":"3rd season","new":false,"prevTeam":null,"scheme":"Young, rebuilding roster; defense has typically ranked near the bottom of the league","note":""}};
const COACH_ADJ = {
  // oppAbbr -> small multiplier on that team's defMult (see computeProjection). <1 = slightly tougher
  // D than raw DRtg alone implies, reflecting an incoming coach's own multi-year defensive track record.
  // Deliberately tiny and tightly clamped — DRtg itself (real, sourced data) stays untouched.
  NOP: {mult: 0.985, label: "Mosley scheme-continuity nudge"},
  MIL: {mult: 0.99, label: "Jenkins scheme-continuity nudge"},
  POR: {mult: 0.995, label: "Nori scheme-continuity nudge (assistant-level, smallest weight)"},
};

// ---------- CRAFTEDNBA "PLAYER TRAITS" INDIVIDUAL MATCHUP ADJUSTMENT (added Oct 8, 2026; generalized
// to all 5 positions Oct 8, 2026 per follow-up request) ----------
// User-requested feature: craftednba.com publishes CraftedDPM ("Crafted Defensive Plus-Minus"), a
// plus-minus-style defensive rating documented at craftednba.com/glossary as a weighted blend of five
// public defensive metrics (DARKO, LEBRON, DRIP, BPM, and LA3 RAPM — see Methodology for the exact
// weights). It also publishes the offensive mirror, CraftedOPM, built the same way from five offensive
// plus-minus metrics. Both were reviewed to understand how CraftedNBA derives them before building this.
//
// The specific ask: team-wide Defense-vs-Position (DVP_RAW above) already tells you that, say, Utah
// allows below-average scoring to centers as a group — but it can't tell you that an elite INDIVIDUAL
// defender (a Rudy Gobert at the rim, or a lockdown wing/guard on the perimeter) suppresses a matched-up
// player's shot quality far more than a replacement-level backup at that same spot would. Originally
// built for centers only (the "centre vs. Rudy Gobert" example); generalized below to all five positions
// per the follow-up ask ("when a SG is facing a great defending guard and it's the no.1 matchup"), which
// also adds a second real effect: how hard a defense leans into a specific individual matchup in the
// first place depends on whether the offensive player is actually that team's featured option at their
// spot — a team's clear #1 scoring guard draws the other team's best perimeter defender far more
// often/consistently than its third guard off the bench does, so the whole effect is scaled by a
// usage-based "primacy" factor below (CRAFTED_PRIMACY), not applied uniformly to every player at a spot.
//
// CRAFTED_DEF_BY_POS[bucket][team] = that team's best currently-active (non-"Out") CraftedDPM value at
// that position bucket, pulled live from craftednba.com/player-traits/defense (Minutes Played and %tile
// filters both set to 0 to unlock the full ~419-player league dataset, Oct 8 2026 snapshot) and matched
// BY PLAYER NAME to this tool's own PLAYERS roster/position data — deliberately NOT using
// craftednba.com's own team tags, which were cross-checked against our own audited rosters and found to
// be stale for several players (e.g. that site still had Ivica Zubac tagged to Indiana and Karl-Anthony
// Towns to New York). Players currently marked "Out" (see p.inj) are excluded from being a team's
// representative defender at a spot — e.g. Utah's Jusuf Nurkic (2.5 DPM, elite) is injured as of this
// snapshot, so Utah's C value below correctly falls back to Jaxson Hayes (0.7) instead.
//
// CraftedNBA's own leaderboard only buckets players into four groups — PG, SG, SF, and C; there's no
// separate PF bucket in their data at all. craftedBucketForPlayer() below maps this tool's PF-tagged
// players into whichever of those four buckets actually fits their game: a stretch 4 who already shoots
// a real number of 3s (tpm >= 1.0/game) is treated like a wing (SF bucket, since that's who typically
// guards him on switches), while a traditional post/roll 4 is treated like a big (C bucket). The same
// fallback also quietly fixes a real position-tag mismatch already in this tool's own data — Phoenix's
// Oso Ighodaro is tagged PF here but plays as a true center (and CraftedNBA tags him C); the tpm<1.0 rule
// correctly routes him into the C bucket for matchup purposes either way. A handful of generic 'G'/'F'/
// 'GF' bench tags map to the nearest bucket (G→SG, F/GF→SF). A few real, healthy players are simply
// absent from CraftedNBA's own 419-player snapshot entirely (e.g. Michael Porter Jr., Draymond Green,
// Jerami Grant weren't found there as of this pull, likely an artifact of their offseason team moves not
// yet being reflected in CraftedNBA's own data) — those teams' bucket values are just left undefined
// below, which safely no-ops the adjustment for that team/bucket rather than guessing.
//
// CRAFTED_POS_STATS[bucket] = {avg, std}: the mean and population standard deviation of CraftedDPM across
// every player CraftedNBA itself tags with that bucket in the same 419-player snapshot — used to turn
// a team's raw DPM value into a clamped z-score (how many standard deviations better/worse than an
// average defender at that spot). Note guard/wing averages run slightly negative (e.g. SG avg -0.35) —
// CraftedDPM is zero-centered on OFFENSIVE-POSSESSION-weighted value, not re-centered per bucket, so a
// "replacement-level" perimeter defender actually grades out a bit below zero on this scale; the z-score
// conversion handles that automatically since it's relative to each bucket's own distribution.
const CRAFTED_DEF_BY_POS = {
  PG: {"OKC":1.8,"SAS":0.4,"DET":0.7,"BOS":0.9,"DEN":-0.5,"NYK":0.6,"LAL":0.2,"CLE":1,"HOU":1.6,"MIN":0.2,"PHX":0.5,"TOR":0.7,"ATL":-0.2,"POR":0.7,"ORL":2.8,"LAC":2.1,"PHI":-0.4,"GSW":1.2,"NOP":-0.8,"DAL":-0.4,"MEM":1.1,"UTA":-2,"CHA":-1.4,"MIA":0.9,"MIL":1.1,"CHI":-0.2,"BKN":-0.1,"IND":0.2,"WAS":-1},
  SG: {"OKC":3.8,"SAS":0.6,"DET":2,"BOS":2.4,"DEN":0.3,"NYK":2.2,"LAL":2.8,"CLE":0.1,"HOU":2.2,"MIN":0.9,"PHX":1.4,"TOR":0.4,"ATL":2.1,"ORL":0.1,"LAC":0,"PHI":0.5,"GSW":1.4,"NOP":-0.3,"DAL":-0.7,"MEM":0,"SAC":0.2,"UTA":1.4,"CHA":1.1,"MIA":2.1,"MIL":0.6,"CHI":-0.4,"BKN":1.5,"IND":-0.7,"WAS":0.2},
  SF: {"OKC":3.9,"SAS":0.8,"DET":3.5,"BOS":1.6,"DEN":1,"NYK":2,"LAL":0.6,"CLE":0,"HOU":0.4,"MIN":1.4,"PHX":0.8,"TOR":1.5,"ATL":0.8,"POR":1,"ORL":0.7,"PHI":-1,"NOP":2.3,"DAL":1.2,"SAC":-1.1,"UTA":-1.2,"CHA":0.5,"MIA":0.3,"MIL":-0.7,"CHI":-0.7,"IND":-0.2,"WAS":0},
  C: {"OKC":3.7,"SAS":5.3,"DET":0.7,"BOS":3.2,"DEN":2.5,"NYK":0.7,"LAL":1.6,"CLE":2.2,"HOU":2.5,"MIN":4.4,"PHX":2.4,"TOR":2.3,"ATL":2.3,"POR":2.6,"ORL":2.1,"LAC":1.5,"PHI":1,"GSW":1.1,"NOP":1.1,"DAL":2.7,"MEM":2.4,"SAC":1.8,"UTA":0.7,"CHA":1.3,"MIA":2.3,"MIL":1.2,"CHI":1.3,"BKN":2.1,"IND":1.7,"WAS":1.9},
};
const CRAFTED_POS_STATS = {
  PG: {avg:-0.1386, std:1.1396},
  SG: {avg:-0.3479, std:1.0029},
  SF: {avg:-0.0541, std:1.1001},
  C:  {avg:0.9223,  std:1.2744},
};

// See the big comment block above for the PF→bucket heuristic and the G/F/GF fallback.
function craftedBucketForPlayer(player){
  const seg = (player.pos||'').split('-')[0];
  if(seg === 'PG') return 'PG';
  if(seg === 'SG' || seg === 'G') return 'SG';
  if(seg === 'SF' || seg === 'F' || seg === 'GF') return 'SF';
  if(seg === 'C') return 'C';
  if(seg === 'PF') return (player.tpm||0) >= 1.0 ? 'SF' : 'C';
  return null;
}

// CRAFTED_PRIMACY[player.id] = how much of the full matchup-adjustment effect this specific player gets,
// based on their Usage Rate rank among their OWN teammates who share the same crafted bucket — the
// team's highest-usage player at a spot (its real #1 option there) gets the full effect, the next-highest
// gets just over half, and everyone else gets a small residual effect (a plausible defense still sometimes
// has its best defender switch onto a complementary player, just not as the primary assignment). Computed
// once at load from the same PLAYERS array used everywhere else in this tool.
const CRAFTED_PRIMACY = {};
(function buildCraftedPrimacy(){
  const byTeamBucket = {};
  PLAYERS.forEach(p => {
    const bucket = craftedBucketForPlayer(p);
    if(!bucket) return;
    const key = p.t + '|' + bucket;
    (byTeamBucket[key] = byTeamBucket[key] || []).push(p);
  });
  Object.keys(byTeamBucket).forEach(key => {
    const list = byTeamBucket[key].slice().sort((a,b) => (b.usg||0) - (a.usg||0));
    list.forEach((p, i) => { CRAFTED_PRIMACY[p.id] = i===0 ? 1.0 : (i===1 ? 0.55 : 0.3); });
  });
})();

// Returns multipliers {fgp, pts, ast, tpm, tov} for an offensive player facing oppAbbr's best active
// defender at their own crafted bucket, scaled by CRAFTED_PRIMACY (see above). z = how many std devs
// above/below an average defender at that bucket oppAbbr's best active defender grades out at (clamped
// to +-2 so one extreme outlier, e.g. Wembanyama, doesn't blow past the clamped bands below); ez is that
// z further scaled down for anyone who isn't their own team's clear #1 at the spot.
//
// The C-bucket effect keeps the original "rim protector" framing: efficiency (fgp) suppressed the most
// since rim shots are the most directly contested, a smaller secondary suppression on raw scoring volume
// (pts), and part of that lost value explicitly redirected into assists (scaled by the player's own
// existing ast rate — a genuine passing big like Jokic redirects far more than a pure roll man) and
// into 3PM for players who already show a real stretch-shooting profile (scaled by their own tpm rate) —
// modeling a center settling for the pass or stepping out rather than forcing a contested rim look.
//
// The perimeter buckets (PG/SG/SF) work differently, per the follow-up request: a great perimeter
// defender doesn't make an SG a better 3-point shooter the way an elite rim protector pushes a center
// toward jumpers — there's no "step out and space the floor" redirect on the perimeter, since the
// player's already out there. Instead it's suppression without redirect on fgp/pts/tpm, PLUS a turnover
// bump (elite on-ball/point-of-attack defenders force more empty possessions), plus a modest assist
// suppression that's largest for point guards specifically (ball pressure disrupts the read that creates
// easy assists more than it disrupts an off-ball wing's assist opportunities).
function craftedMatchupAdjust(player, oppAbbr){
  const neutral = {fgp:1, pts:1, ast:1, tpm:1, tov:1};
  const bucket = craftedBucketForPlayer(player);
  if(!bucket) return neutral;
  const defVal = CRAFTED_DEF_BY_POS[bucket] && CRAFTED_DEF_BY_POS[bucket][oppAbbr];
  if(defVal === undefined) return neutral;
  const stats = CRAFTED_POS_STATS[bucket];
  const z = Math.max(-2, Math.min(2, (defVal - stats.avg) / stats.std));
  const primacy = CRAFTED_PRIMACY[player.id] !== undefined ? CRAFTED_PRIMACY[player.id] : 0.3;
  const ez = z * primacy;

  if(bucket === 'C'){
    const passFactor = Math.max(0, Math.min(1.5, (player.ast||0) / 3.0));
    const spaceFactor = Math.max(0, Math.min(1.5, (player.tpm||0) / 1.5));
    return {
      fgp: Math.max(0.90, Math.min(1.10, 1 - 0.05*ez)),
      pts: Math.max(0.93, Math.min(1.07, 1 - 0.035*ez)),
      ast: Math.max(0.94, Math.min(1.12, 1 + 0.04*ez*passFactor)),
      tpm: Math.max(0.94, Math.min(1.15, 1 + 0.06*ez*spaceFactor)),
      tov: 1,
    };
  }
  if(bucket === 'SF'){
    const spaceFactor = Math.max(0.3, Math.min(1.5, (player.tpm||0) / 1.5));
    return {
      fgp: Math.max(0.92, Math.min(1.08, 1 - 0.04*ez)),
      pts: Math.max(0.94, Math.min(1.06, 1 - 0.03*ez)),
      ast: Math.max(0.95, Math.min(1.05, 1 - 0.015*ez)),
      tpm: Math.max(0.92, Math.min(1.08, 1 - 0.03*ez*spaceFactor)),
      tov: Math.max(0.95, Math.min(1.10, 1 + 0.03*ez)),
    };
  }
  // PG or SG.
  const astEffect = bucket === 'PG' ? 0.035 : 0.015;
  return {
    fgp: Math.max(0.92, Math.min(1.08, 1 - 0.04*ez)),
    pts: Math.max(0.94, Math.min(1.06, 1 - 0.035*ez)),
    ast: Math.max(0.93, Math.min(1.07, 1 - astEffect*ez)),
    tpm: Math.max(0.90, Math.min(1.10, 1 - 0.045*ez)),
    tov: Math.max(0.95, Math.min(1.12, 1 + 0.035*ez)),
  };
}

// ---------- 2-YEAR DEFENSE-VS-POSITION TREND (Dunkest.com, 2024-25 & 2025-26 seasons) ----------
// Coarser 3-group (Guards/Forwards/Centers) positional splits, pulled live from dunkest.com's
// Defense vs Position tool for both of the last two completed seasons. Used for the Methodology-
// documented cross-check against the BettingPros-sourced DVP_RAW table above (which recalibrated
// DVP_RAW — see Methodology) and to power the "2-Year DvP Trend" panel on the Defensive Profile tab.
// Format: DVP_TREND[team][group][STAT] = [2024-25 value, 2025-26 value, delta (25-26 minus 24-25)].
const DVP_TREND = {"ATL":{"Guards":{"PTS":[18.9,18.8,-0.1],"REB":[4.6,4.6,0.0],"AST":[5.1,5.1,0.0],"STL":[1.4,1.2,-0.2],"BLK":[0.4,0.4,0.0],"TOV":[2.5,2.5,0.0],"3PM":[2.7,2.4,-0.3]},"Forwards":{"PTS":[20.3,18.6,-1.7],"REB":[6.9,6.8,-0.1],"AST":[3.9,3.4,-0.5],"STL":[1.1,1.2,0.1],"BLK":[0.9,0.8,-0.1],"TOV":[2.2,2.0,-0.2],"3PM":[2.2,1.9,-0.3]},"Centers":{"PTS":[16.3,16.2,-0.1],"REB":[9.2,10.6,1.4],"AST":[3.1,3.1,0.0],"STL":[1.3,1.0,-0.3],"BLK":[1.2,0.9,-0.3],"TOV":[1.7,2.0,0.3],"3PM":[0.8,0.6,-0.2]}},"BKN":{"Guards":{"PTS":[18.2,17.1,-1.1],"REB":[4.3,4.4,0.1],"AST":[5.5,4.8,-0.7],"STL":[1.3,1.3,0.0],"BLK":[0.4,0.5,0.1],"TOV":[2.2,2.2,0.0],"3PM":[2.4,2.3,-0.1]},"Forwards":{"PTS":[17.3,18.4,1.1],"REB":[6.7,6.3,-0.4],"AST":[3.6,3.8,0.2],"STL":[1.1,1.2,0.1],"BLK":[0.9,0.8,-0.1],"TOV":[2.0,2.1,0.1],"3PM":[1.7,1.7,0.0]},"Centers":{"PTS":[18.8,15.4,-3.4],"REB":[10.9,8.9,-2.0],"AST":[2.4,2.4,0.0],"STL":[1.0,1.2,0.2],"BLK":[1.7,1.5,-0.2],"TOV":[1.8,1.4,-0.4],"3PM":[1.1,0.4,-0.7]}},"BOS":{"Guards":{"PTS":[18.4,18.5,0.1],"REB":[4.7,4.3,-0.4],"AST":[4.8,5.2,0.4],"STL":[1.2,0.9,-0.3],"BLK":[0.3,0.4,0.1],"TOV":[2.0,1.8,-0.2],"3PM":[2.3,2.6,0.3]},"Forwards":{"PTS":[16.7,16.6,-0.1],"REB":[7.0,6.1,-0.9],"AST":[3.1,2.9,-0.2],"STL":[0.9,0.7,-0.2],"BLK":[0.5,0.4,-0.1],"TOV":[1.6,1.7,0.1],"3PM":[1.9,2.0,0.1]},"Centers":{"PTS":[14.1,17.2,3.1],"REB":[10.0,9.3,-0.7],"AST":[3.5,3.5,0.0],"STL":[0.5,0.8,0.3],"BLK":[1.0,0.9,-0.1],"TOV":[1.4,1.9,0.5],"3PM":[0.7,1.4,0.7]}},"CHA":{"Guards":{"PTS":[18.3,18.0,-0.3],"REB":[4.6,4.3,-0.3],"AST":[4.7,5.1,0.4],"STL":[1.2,1.2,0.0],"BLK":[0.5,0.3,-0.2],"TOV":[2.0,1.8,-0.2],"3PM":[2.5,2.2,-0.3]},"Forwards":{"PTS":[17.8,18.9,1.1],"REB":[6.6,6.1,-0.5],"AST":[3.6,3.6,0.0],"STL":[1.1,1.0,-0.1],"BLK":[0.8,0.6,-0.2],"TOV":[1.8,1.9,0.1],"3PM":[1.9,1.9,0.0]},"Centers":{"PTS":[17.1,16.9,-0.2],"REB":[10.5,8.2,-2.3],"AST":[2.8,2.8,0.0],"STL":[1.1,0.9,-0.2],"BLK":[1.2,1.3,0.1],"TOV":[1.6,1.3,-0.3],"3PM":[1.1,1.3,0.2]}},"CHI":{"Guards":{"PTS":[19.5,17.9,-1.6],"REB":[4.6,4.5,-0.1],"AST":[5.7,5.3,-0.4],"STL":[1.2,1.4,0.2],"BLK":[0.4,0.5,0.1],"TOV":[1.8,1.9,0.1],"3PM":[2.8,2.2,-0.6]},"Forwards":{"PTS":[19.1,20.3,1.2],"REB":[7.1,7.0,-0.1],"AST":[3.3,3.8,0.5],"STL":[1.0,1.2,0.2],"BLK":[0.7,0.8,0.1],"TOV":[1.7,1.9,0.2],"3PM":[1.7,2.1,0.4]},"Centers":{"PTS":[17.6,18.3,0.7],"REB":[10.8,9.7,-1.1],"AST":[4.1,4.1,0.0],"STL":[1.1,1.0,-0.1],"BLK":[1.5,1.7,0.2],"TOV":[1.3,1.2,-0.1],"3PM":[0.8,1.1,0.3]}},"CLE":{"Guards":{"PTS":[18.7,18.2,-0.5],"REB":[4.3,4.1,-0.2],"AST":[4.9,4.9,0.0],"STL":[1.1,1.4,0.3],"BLK":[0.3,0.4,0.1],"TOV":[2.2,2.1,-0.1],"3PM":[2.6,2.4,-0.2]},"Forwards":{"PTS":[18.8,18.3,-0.5],"REB":[6.8,6.5,-0.3],"AST":[3.5,3.7,0.2],"STL":[1.2,1.1,-0.1],"BLK":[0.6,0.7,0.1],"TOV":[1.9,1.9,0.0],"3PM":[1.9,1.8,-0.1]},"Centers":{"PTS":[14.3,15.4,1.1],"REB":[10.1,9.6,-0.5],"AST":[2.8,2.8,0.0],"STL":[0.7,1.2,0.5],"BLK":[1.2,1.2,0.0],"TOV":[1.4,1.7,0.3],"3PM":[0.8,0.9,0.1]}},"DAL":{"Guards":{"PTS":[18.4,19.7,1.3],"REB":[4.7,4.9,0.2],"AST":[5.0,5.7,0.7],"STL":[1.2,1.4,0.2],"BLK":[0.4,0.4,0.0],"TOV":[1.9,2.0,0.1],"3PM":[2.3,2.3,0.0]},"Forwards":{"PTS":[18.5,18.6,0.1],"REB":[6.4,6.1,-0.3],"AST":[3.4,3.5,0.1],"STL":[0.9,1.1,0.2],"BLK":[0.6,0.7,0.1],"TOV":[1.8,1.9,0.1],"3PM":[1.8,1.9,0.1]},"Centers":{"PTS":[19.1,17.0,-2.1],"REB":[11.2,10.0,-1.2],"AST":[3.8,3.8,0.0],"STL":[1.2,0.9,-0.3],"BLK":[1.2,1.3,0.1],"TOV":[2.0,1.8,-0.2],"3PM":[0.7,0.7,0.0]}},"DEN":{"Guards":{"PTS":[19.8,18.5,-1.3],"REB":[4.1,4.7,0.6],"AST":[5.9,5.1,-0.8],"STL":[1.2,1.2,0.0],"BLK":[0.6,0.5,-0.1],"TOV":[2.1,1.9,-0.2],"3PM":[2.8,2.4,-0.4]},"Forwards":{"PTS":[18.0,19.3,1.3],"REB":[6.6,6.6,0.0],"AST":[3.6,4.0,0.4],"STL":[1.1,1.0,-0.1],"BLK":[0.9,0.7,-0.2],"TOV":[1.6,1.8,0.2],"3PM":[1.8,2.0,0.2]},"Centers":{"PTS":[16.0,15.0,-1.0],"REB":[10.2,9.2,-1.0],"AST":[3.1,3.1,0.0],"STL":[1.2,0.8,-0.4],"BLK":[1.2,1.0,-0.2],"TOV":[1.6,1.4,-0.2],"3PM":[0.7,0.8,0.1]}},"DET":{"Guards":{"PTS":[19.0,17.9,-1.1],"REB":[4.1,4.2,0.1],"AST":[4.3,4.2,-0.1],"STL":[1.4,1.3,-0.1],"BLK":[0.4,0.5,0.1],"TOV":[2.2,2.3,0.1],"3PM":[2.7,2.2,-0.5]},"Forwards":{"PTS":[18.9,19.4,0.5],"REB":[6.5,6.2,-0.3],"AST":[3.2,3.2,0.0],"STL":[1.2,1.2,0.0],"BLK":[0.7,1.0,0.3],"TOV":[1.9,2.4,0.5],"3PM":[2.1,2.0,-0.1]},"Centers":{"PTS":[17.1,14.7,-2.4],"REB":[10.0,8.9,-1.1],"AST":[3.0,3.0,0.0],"STL":[0.9,1.1,0.2],"BLK":[1.8,1.6,-0.2],"TOV":[1.9,1.9,0.0],"3PM":[1.4,1.1,-0.3]}},"GSW":{"Guards":{"PTS":[17.4,18.6,1.2],"REB":[4.7,4.6,-0.1],"AST":[4.9,5.1,0.2],"STL":[1.2,1.4,0.2],"BLK":[0.6,0.3,-0.3],"TOV":[2.5,2.3,-0.2],"3PM":[2.3,2.3,0.0]},"Forwards":{"PTS":[18.6,18.8,0.2],"REB":[6.2,6.5,0.3],"AST":[3.1,3.5,0.4],"STL":[0.9,1.1,0.2],"BLK":[0.8,0.6,-0.2],"TOV":[1.9,2.4,0.5],"3PM":[2.0,1.9,-0.1]},"Centers":{"PTS":[14.8,16.8,2.0],"REB":[10.6,9.6,-1.0],"AST":[3.9,3.9,0.0],"STL":[1.2,1.1,-0.1],"BLK":[1.4,0.8,-0.6],"TOV":[2.0,1.5,-0.5],"3PM":[0.7,0.9,0.2]}},"HOU":{"Guards":{"PTS":[19.2,17.1,-2.1],"REB":[4.5,4.1,-0.4],"AST":[4.8,4.7,-0.1],"STL":[1.2,1.2,0.0],"BLK":[0.4,0.5,0.1],"TOV":[2.3,2.2,-0.1],"3PM":[2.4,2.2,-0.2]},"Forwards":{"PTS":[16.9,18.2,1.3],"REB":[6.2,5.8,-0.4],"AST":[2.8,3.2,0.4],"STL":[1.0,1.2,0.2],"BLK":[1.0,0.7,-0.3],"TOV":[1.8,1.8,0.0],"3PM":[1.7,1.8,0.1]},"Centers":{"PTS":[13.2,15.6,2.4],"REB":[9.8,9.9,0.1],"AST":[3.2,3.2,0.0],"STL":[1.0,1.0,0.0],"BLK":[1.5,1.4,-0.1],"TOV":[1.4,1.8,0.4],"3PM":[0.7,0.9,0.2]}},"IND":{"Guards":{"PTS":[18.8,19.6,0.8],"REB":[4.3,5.0,0.7],"AST":[4.8,4.8,0.0],"STL":[1.0,1.2,0.2],"BLK":[0.4,0.3,-0.1],"TOV":[2.2,1.9,-0.3],"3PM":[2.6,2.1,-0.5]},"Forwards":{"PTS":[18.5,19.2,0.7],"REB":[6.9,7.3,0.4],"AST":[3.2,3.4,0.2],"STL":[1.1,1.2,0.1],"BLK":[0.6,0.8,0.2],"TOV":[2.1,1.8,-0.3],"3PM":[1.8,1.8,0.0]},"Centers":{"PTS":[16.0,17.1,1.1],"REB":[11.0,10.3,-0.7],"AST":[3.1,3.1,0.0],"STL":[1.0,0.9,-0.1],"BLK":[1.0,1.2,0.2],"TOV":[1.9,1.7,-0.2],"3PM":[0.6,0.6,0.0]}},"LAC":{"Guards":{"PTS":[16.8,18.8,2.0],"REB":[4.2,4.5,0.3],"AST":[4.7,5.2,0.5],"STL":[1.3,1.3,0.0],"BLK":[0.3,0.4,0.1],"TOV":[2.2,2.1,-0.1],"3PM":[2.4,2.6,0.2]},"Forwards":{"PTS":[17.2,17.6,0.4],"REB":[6.7,5.7,-1.0],"AST":[3.2,3.4,0.2],"STL":[1.2,1.1,-0.1],"BLK":[0.6,0.6,0.0],"TOV":[2.2,2.0,-0.2],"3PM":[1.8,1.8,0.0]},"Centers":{"PTS":[14.1,15.9,1.8],"REB":[9.4,9.8,0.4],"AST":[2.9,2.9,0.0],"STL":[1.1,1.0,-0.1],"BLK":[1.5,1.2,-0.3],"TOV":[1.8,1.8,0.0],"3PM":[1.1,0.7,-0.4]}},"LAL":{"Guards":{"PTS":[18.1,17.7,-0.4],"REB":[4.4,4.0,-0.4],"AST":[5.6,5.8,0.2],"STL":[1.2,1.3,0.1],"BLK":[0.3,0.4,0.1],"TOV":[2.2,2.1,-0.1],"3PM":[2.5,2.2,-0.3]},"Forwards":{"PTS":[17.7,18.0,0.3],"REB":[6.2,6.4,0.2],"AST":[3.1,3.2,0.1],"STL":[1.2,1.2,0.0],"BLK":[0.6,0.6,0.0],"TOV":[1.8,1.9,0.1],"3PM":[1.9,1.9,0.0]},"Centers":{"PTS":[14.5,15.6,1.1],"REB":[10.4,9.0,-1.4],"AST":[3.8,3.8,0.0],"STL":[0.8,1.1,0.3],"BLK":[1.2,0.9,-0.3],"TOV":[1.7,2.3,0.6],"3PM":[0.5,0.6,0.1]}},"MEM":{"Guards":{"PTS":[18.1,19.2,1.1],"REB":[4.1,5.0,0.9],"AST":[5.0,5.4,0.4],"STL":[1.4,1.6,0.2],"BLK":[0.5,0.5,0.0],"TOV":[2.2,2.1,-0.1],"3PM":[2.3,2.5,0.2]},"Forwards":{"PTS":[18.9,19.0,0.1],"REB":[7.1,6.5,-0.6],"AST":[3.8,3.3,-0.5],"STL":[1.0,1.1,0.1],"BLK":[0.9,0.7,-0.2],"TOV":[1.9,1.9,0.0],"3PM":[2.2,2.0,-0.2]},"Centers":{"PTS":[16.3,17.1,0.8],"REB":[10.0,11.3,1.3],"AST":[4.8,4.8,0.0],"STL":[1.0,0.9,-0.1],"BLK":[1.5,1.5,0.0],"TOV":[2.0,2.8,0.8],"3PM":[1.0,1.1,0.1]}},"MIA":{"Guards":{"PTS":[17.6,19.5,1.9],"REB":[4.6,5.1,0.5],"AST":[5.3,5.4,0.1],"STL":[1.3,1.2,-0.1],"BLK":[0.4,0.5,0.1],"TOV":[2.0,2.3,0.3],"3PM":[2.6,2.5,-0.1]},"Forwards":{"PTS":[17.7,19.3,1.6],"REB":[6.8,6.8,0.0],"AST":[3.3,3.5,0.2],"STL":[0.9,1.2,0.3],"BLK":[0.6,0.8,0.2],"TOV":[1.8,2.1,0.3],"3PM":[2.1,2.2,0.1]},"Centers":{"PTS":[15.3,14.4,-0.9],"REB":[10.0,10.0,0.0],"AST":[3.0,3.0,0.0],"STL":[0.8,0.7,-0.1],"BLK":[1.4,1.0,-0.4],"TOV":[1.7,1.7,0.0],"3PM":[1.0,0.7,-0.3]}},"MIL":{"Guards":{"PTS":[18.8,18.3,-0.5],"REB":[5.1,4.9,-0.2],"AST":[5.3,5.1,-0.2],"STL":[1.0,1.2,0.2],"BLK":[0.3,0.4,0.1],"TOV":[1.9,1.8,-0.1],"3PM":[2.5,2.6,0.1]},"Forwards":{"PTS":[16.4,18.7,2.3],"REB":[6.7,6.5,-0.2],"AST":[2.9,3.6,0.7],"STL":[1.1,1.0,-0.1],"BLK":[0.6,0.7,0.1],"TOV":[1.8,1.9,0.1],"3PM":[1.9,2.2,0.3]},"Centers":{"PTS":[16.0,16.7,0.7],"REB":[9.6,9.3,-0.3],"AST":[2.6,2.6,0.0],"STL":[1.0,1.2,0.2],"BLK":[0.9,1.1,0.2],"TOV":[1.8,1.7,-0.1],"3PM":[0.9,0.7,-0.2]}},"MIN":{"Guards":{"PTS":[18.3,18.6,0.3],"REB":[4.4,4.8,0.4],"AST":[4.9,5.0,0.1],"STL":[1.2,1.1,-0.1],"BLK":[0.4,0.3,-0.1],"TOV":[2.2,2.2,0.0],"3PM":[2.4,2.1,-0.3]},"Forwards":{"PTS":[18.1,17.9,-0.2],"REB":[6.6,6.4,-0.2],"AST":[3.0,2.9,-0.1],"STL":[1.1,1.1,0.0],"BLK":[0.7,0.7,0.0],"TOV":[1.9,1.9,0.0],"3PM":[1.9,1.9,0.0]},"Centers":{"PTS":[16.4,18.1,1.7],"REB":[9.3,9.8,0.5],"AST":[4.6,4.6,0.0],"STL":[0.9,0.8,-0.1],"BLK":[1.5,1.0,-0.5],"TOV":[2.2,2.1,-0.1],"3PM":[0.7,1.1,0.4]}},"NOP":{"Guards":{"PTS":[18.2,18.9,0.7],"REB":[4.4,4.6,0.2],"AST":[5.5,5.3,-0.2],"STL":[1.5,1.2,-0.3],"BLK":[0.4,0.4,0.0],"TOV":[2.1,2.4,0.3],"3PM":[2.5,2.5,0.0]},"Forwards":{"PTS":[18.0,18.5,0.5],"REB":[6.4,6.7,0.3],"AST":[3.5,3.5,0.0],"STL":[1.3,1.1,-0.2],"BLK":[0.7,1.0,0.3],"TOV":[1.8,1.8,0.0],"3PM":[2.1,2.0,-0.1]},"Centers":{"PTS":[17.8,17.6,-0.2],"REB":[11.2,10.2,-1.0],"AST":[3.4,3.4,0.0],"STL":[0.7,1.1,0.4],"BLK":[1.6,1.4,-0.2],"TOV":[1.6,1.6,0.0],"3PM":[0.7,0.8,0.1]}},"NYK":{"Guards":{"PTS":[18.9,17.6,-1.3],"REB":[4.4,4.3,-0.1],"AST":[4.9,4.6,-0.3],"STL":[1.1,1.2,0.1],"BLK":[0.5,0.4,-0.1],"TOV":[2.3,2.2,-0.1],"3PM":[2.3,2.4,0.1]},"Forwards":{"PTS":[18.4,18.5,0.1],"REB":[6.3,6.1,-0.2],"AST":[3.3,3.3,0.0],"STL":[1.0,1.0,0.0],"BLK":[0.7,0.6,-0.1],"TOV":[2.0,2.0,0.0],"3PM":[2.2,2.1,-0.1]},"Centers":{"PTS":[13.4,15.6,2.2],"REB":[9.1,8.4,-0.7],"AST":[2.6,2.6,0.0],"STL":[0.9,0.8,-0.1],"BLK":[1.5,1.1,-0.4],"TOV":[1.9,1.7,-0.2],"3PM":[0.6,1.3,0.7]}},"OKC":{"Guards":{"PTS":[16.6,16.9,0.3],"REB":[4.7,4.8,0.1],"AST":[4.6,4.7,0.1],"STL":[0.9,1.1,0.2],"BLK":[0.5,0.4,-0.1],"TOV":[2.4,2.5,0.1],"3PM":[2.3,2.4,0.1]},"Forwards":{"PTS":[16.6,17.6,1.0],"REB":[6.8,6.9,0.1],"AST":[2.8,3.3,0.5],"STL":[1.0,1.1,0.1],"BLK":[0.8,0.7,-0.1],"TOV":[2.0,2.1,0.1],"3PM":[2.2,2.1,-0.1]},"Centers":{"PTS":[16.4,14.4,-2.0],"REB":[11.5,10.1,-1.4],"AST":[4.0,4.0,0.0],"STL":[0.8,0.7,-0.1],"BLK":[1.4,1.0,-0.4],"TOV":[2.2,2.0,-0.2],"3PM":[0.8,0.8,0.0]}},"ORL":{"Guards":{"PTS":[18.0,19.9,1.9],"REB":[4.6,4.6,0.0],"AST":[4.4,5.0,0.6],"STL":[1.1,1.2,0.1],"BLK":[0.3,0.4,0.1],"TOV":[2.4,2.3,-0.1],"3PM":[2.0,2.4,0.4]},"Forwards":{"PTS":[16.3,17.9,1.6],"REB":[6.4,6.2,-0.2],"AST":[2.6,3.2,0.6],"STL":[1.0,1.2,0.2],"BLK":[0.7,0.9,0.2],"TOV":[2.0,1.8,-0.2],"3PM":[1.6,1.6,0.0]},"Centers":{"PTS":[14.5,15.1,0.6],"REB":[9.8,9.8,0.0],"AST":[3.0,3.0,0.0],"STL":[1.1,0.8,-0.3],"BLK":[0.9,1.2,0.3],"TOV":[2.4,2.1,-0.3],"3PM":[0.6,0.5,-0.1]}},"PHI":{"Guards":{"PTS":[18.4,18.0,-0.4],"REB":[4.8,4.7,-0.1],"AST":[5.4,5.0,-0.4],"STL":[1.2,1.1,-0.1],"BLK":[0.4,0.4,0.0],"TOV":[2.5,2.0,-0.5],"3PM":[2.6,2.3,-0.3]},"Forwards":{"PTS":[18.8,18.4,-0.4],"REB":[6.7,6.5,-0.2],"AST":[3.6,3.7,0.1],"STL":[1.0,0.9,-0.1],"BLK":[0.7,0.7,0.0],"TOV":[2.1,2.3,0.2],"3PM":[2.0,1.7,-0.3]},"Centers":{"PTS":[14.6,15.1,0.5],"REB":[10.1,9.7,-0.4],"AST":[2.6,2.6,0.0],"STL":[1.1,0.9,-0.2],"BLK":[1.6,1.4,-0.2],"TOV":[2.3,2.0,-0.3],"3PM":[0.9,1.0,0.1]}},"PHX":{"Guards":{"PTS":[18.3,18.4,0.1],"REB":[4.7,4.5,-0.2],"AST":[5.3,4.4,-0.9],"STL":[1.3,1.2,-0.1],"BLK":[0.4,0.4,0.0],"TOV":[1.8,2.6,0.8],"3PM":[2.5,2.0,-0.5]},"Forwards":{"PTS":[18.4,17.8,-0.6],"REB":[6.3,6.1,-0.2],"AST":[3.5,3.2,-0.3],"STL":[1.0,1.1,0.1],"BLK":[0.6,0.6,0.0],"TOV":[1.7,2.0,0.3],"3PM":[2.2,1.8,-0.4]},"Centers":{"PTS":[19.1,16.0,-3.1],"REB":[10.8,10.7,-0.1],"AST":[4.0,4.0,0.0],"STL":[0.9,0.9,0.0],"BLK":[1.0,1.1,0.1],"TOV":[1.7,2.3,0.6],"3PM":[0.9,0.9,0.0]}},"POR":{"Guards":{"PTS":[19.5,18.4,-1.1],"REB":[4.5,4.4,-0.1],"AST":[4.5,4.6,0.1],"STL":[1.4,1.5,0.1],"BLK":[0.4,0.4,0.0],"TOV":[2.3,2.3,0.0],"3PM":[2.5,2.2,-0.3]},"Forwards":{"PTS":[18.2,17.6,-0.6],"REB":[6.6,6.4,-0.2],"AST":[3.5,3.1,-0.4],"STL":[1.3,1.5,0.2],"BLK":[0.9,0.8,-0.1],"TOV":[2.0,2.0,0.0],"3PM":[1.9,1.7,-0.2]},"Centers":{"PTS":[16.8,19.4,2.6],"REB":[9.6,9.9,0.3],"AST":[3.7,3.7,0.0],"STL":[0.9,1.3,0.4],"BLK":[1.4,1.6,0.2],"TOV":[1.9,1.9,0.0],"3PM":[1.0,1.4,0.4]}},"SAC":{"Guards":{"PTS":[18.7,19.7,1.0],"REB":[4.5,4.3,-0.2],"AST":[5.2,5.3,0.1],"STL":[1.2,1.4,0.2],"BLK":[0.3,0.4,0.1],"TOV":[2.2,2.2,0.0],"3PM":[2.6,2.5,-0.1]},"Forwards":{"PTS":[18.1,18.6,0.5],"REB":[6.5,5.5,-1.0],"AST":[3.6,3.5,-0.1],"STL":[1.1,1.0,-0.1],"BLK":[0.7,0.5,-0.2],"TOV":[1.7,2.0,0.3],"3PM":[2.1,1.9,-0.2]},"Centers":{"PTS":[16.9,19.6,2.7],"REB":[10.2,10.7,0.5],"AST":[3.4,3.4,0.0],"STL":[1.0,1.1,0.1],"BLK":[1.2,1.5,0.3],"TOV":[1.5,1.6,0.1],"3PM":[0.7,1.0,0.3]}},"SAS":{"Guards":{"PTS":[18.5,18.9,0.4],"REB":[5.0,4.6,-0.4],"AST":[5.9,4.8,-1.1],"STL":[1.2,1.2,0.0],"BLK":[0.3,0.5,0.2],"TOV":[2.2,2.1,-0.1],"3PM":[2.8,2.4,-0.4]},"Forwards":{"PTS":[19.1,16.7,-2.4],"REB":[6.9,6.1,-0.8],"AST":[3.6,3.1,-0.5],"STL":[1.0,1.1,0.1],"BLK":[0.6,0.6,0.0],"TOV":[1.8,1.8,0.0],"3PM":[2.1,1.8,-0.3]},"Centers":{"PTS":[18.1,17.6,-0.5],"REB":[10.7,9.6,-1.1],"AST":[4.1,4.1,0.0],"STL":[0.9,0.9,0.0],"BLK":[1.2,1.3,0.1],"TOV":[1.4,1.4,0.0],"3PM":[0.9,1.1,0.2]}},"TOR":{"Guards":{"PTS":[18.7,18.9,0.2],"REB":[4.5,4.2,-0.3],"AST":[4.7,4.7,0.0],"STL":[1.4,1.3,-0.1],"BLK":[0.4,0.5,0.1],"TOV":[2.1,2.5,0.4],"3PM":[2.4,2.5,0.1]},"Forwards":{"PTS":[18.1,17.3,-0.8],"REB":[6.6,6.4,-0.2],"AST":[3.7,3.2,-0.5],"STL":[1.2,1.0,-0.2],"BLK":[0.8,0.8,0.0],"TOV":[2.1,2.1,0.0],"3PM":[1.8,1.8,0.0]},"Centers":{"PTS":[16.8,15.4,-1.4],"REB":[11.0,9.1,-1.9],"AST":[2.7,2.7,0.0],"STL":[0.9,1.0,0.1],"BLK":[1.9,1.1,-0.8],"TOV":[1.8,1.5,-0.3],"3PM":[1.0,0.8,-0.2]}},"UTA":{"Guards":{"PTS":[20.2,19.3,-0.9],"REB":[4.5,4.8,0.3],"AST":[5.8,5.5,-0.3],"STL":[1.4,1.3,-0.1],"BLK":[0.6,0.6,0.0],"TOV":[1.7,2.1,0.4],"3PM":[2.9,2.5,-0.4]},"Forwards":{"PTS":[18.1,19.5,1.4],"REB":[6.2,6.4,0.2],"AST":[3.5,4.4,0.9],"STL":[1.2,1.2,0.0],"BLK":[0.8,0.7,-0.1],"TOV":[1.6,2.0,0.4],"3PM":[2.0,2.0,0.0]},"Centers":{"PTS":[18.2,17.5,-0.7],"REB":[10.3,10.4,0.1],"AST":[3.9,3.9,0.0],"STL":[1.3,1.1,-0.2],"BLK":[1.7,1.7,0.0],"TOV":[1.8,2.1,0.3],"3PM":[1.1,1.1,0.0]}},"WAS":{"Guards":{"PTS":[18.7,19.0,0.3],"REB":[4.9,4.5,-0.4],"AST":[5.1,5.4,0.3],"STL":[1.5,1.5,0.0],"BLK":[0.4,0.4,0.0],"TOV":[1.9,1.8,-0.1],"3PM":[2.6,2.4,-0.2]},"Forwards":{"PTS":[19.4,19.4,0.0],"REB":[7.3,6.6,-0.7],"AST":[3.6,3.8,0.2],"STL":[1.2,1.4,0.2],"BLK":[0.7,0.7,0.0],"TOV":[1.6,2.0,0.4],"3PM":[2.0,2.0,0.0]},"Centers":{"PTS":[19.2,19.8,0.6],"REB":[11.1,11.8,0.7],"AST":[3.0,3.0,0.0],"STL":[0.7,0.9,0.2],"BLK":[1.4,1.8,0.4],"TOV":[1.6,2.2,0.6],"3PM":[0.8,1.1,0.3]}}};
const DVP_TREND_GROUP_FOR_POS = {PG:'Guards', SG:'Guards', SF:'Forwards', PF:'Forwards', C:'Centers'};

const DVP = {byTeam:{}, leagueAvgByPos:{}};
(function buildDVP(){
  const statKeys = ['pts','fgp','ftp','tpm','reb','ast','stl','blk','tov'];
  DVP_RAW.split(';').forEach(row=>{
    const f = row.split(',');
    const pos = f[0];
    const team = DVP_CODE_MAP[f[1]] || f[1];
    const vals = f.slice(2).map(Number);
    if(!DVP.byTeam[team]) DVP.byTeam[team] = {};
    const rec = {};
    statKeys.forEach((k,i)=> rec[k]=vals[i]);
    DVP.byTeam[team][pos] = rec;
  });
  const positions = ['PG','SG','SF','PF','C'];
  positions.forEach(pos=>{
    const avg = {};
    statKeys.forEach(k=>{
      const all = Object.values(DVP.byTeam).map(t=>t[pos][k]);
      avg[k] = all.reduce((a,b)=>a+b,0)/all.length;
    });
    DVP.leagueAvgByPos[pos] = avg;
  });
})();

// Position-specific matchup multiplier for a given stat: how much this opponent allows to this
// position, vs. the league average allowed to that position. This is the real per-position
// replacement for a generic team-wide defensive rating.
function dvpMult(oppAbbr, pos, statKey){
  const team = DVP.byTeam[oppAbbr];
  const posGroup = (pos||'').split('-')[0]; // handle combo-listed positions like "PG-SG" by using the primary
  if(!team || !team[posGroup]) return 1.0;
  const allowed = team[posGroup][statKey];
  const avg = DVP.leagueAvgByPos[posGroup][statKey];
  if(!avg) return 1.0;
  let m = allowed / avg;

  // Blend in the small, noisy-but-real 2026-27-so-far signal (DVP_EARLY, BettingPros) at a 15%
  // weight alongside the full 2025-26 season (85%) -- see DVP_EARLY's own comment above for why
  // the weight is kept small. Only the 7 stats BettingPros publishes (pts/reb/ast/tpm/stl/blk/tov)
  // get this blend; fgp/ftp fall through untouched since no current-season source exists for them.
  const earlyTeam = DVP_EARLY.byTeam[oppAbbr];
  if(earlyTeam && earlyTeam[posGroup] && earlyTeam[posGroup][statKey] !== undefined){
    const earlyAllowed = earlyTeam[posGroup][statKey];
    const earlyAvg = DVP_EARLY.leagueAvgByPos[posGroup][statKey];
    if(earlyAvg){
      const mEarly = earlyAllowed / earlyAvg;
      m = m*0.85 + mEarly*0.15;
    }
  }

  return Math.max(0.75, Math.min(1.30, m));
}

// ---------- OPPONENT RANK vs POSITION (all stat categories) + PACE TIERS ----------
// Rank 1 = stingiest defense at that position/stat (allows the least), rank 30 = most generous.
// DVP_RANK_ALL[statKey][pos][team] = 1-30 rank. DVP_RANK kept as an alias to the 'pts' slice
// since that's what existing code (oppRankBadge, etc.) already reads.
const STAT_KEYS_ALL = ['pts','reb','ast','tpm','stl','blk','tov','fgp','ftp'];
const STAT_LABELS = {pts:'PTS', reb:'REB', ast:'AST', tpm:'3PM', stl:'STL', blk:'BLK', tov:'TOV', fgp:'FG%', ftp:'FT%'};
const DVP_RANK_ALL = {}; // statKey -> pos -> {team -> rank 1-30}
(function buildDvpRank(){
  STAT_KEYS_ALL.forEach(statKey=>{
    DVP_RANK_ALL[statKey] = {};
    ['PG','SG','SF','PF','C'].forEach(pos=>{
      const teams = Object.keys(DVP.byTeam);
      const sorted = teams.slice().sort((a,b)=> DVP.byTeam[a][pos][statKey] - DVP.byTeam[b][pos][statKey]);
      DVP_RANK_ALL[statKey][pos] = {};
      sorted.forEach((team,i)=> DVP_RANK_ALL[statKey][pos][team] = i+1);
    });
  });
})();
const DVP_RANK = DVP_RANK_ALL.pts; // pos -> {team -> rank 1-30}, back-compat alias used by oppRankBadge

// Pace rank 1 = fastest team in the league, 30 = slowest.
const PACE_RANK = {};
(function buildPaceRank(){
  const teams = Object.keys(TEAMS);
  const sorted = teams.slice().sort((a,b)=> TEAMS[b].pace - TEAMS[a].pace);
  sorted.forEach((team,i)=> PACE_RANK[team] = i+1);
})();

// Offensive rank 1 = best real 2025-26 Offensive Rating in the league, 30 = worst. Feeds offBadge
// and the own-team offense multiplier in computeProjection (see Methodology, Oct 7 2026 update).
const ORTG_RANK = {};
(function buildOrtgRank(){
  const teams = Object.keys(TEAMS);
  const sorted = teams.slice().sort((a,b)=> TEAMS[b].ortg - TEAMS[a].ortg);
  sorted.forEach((team,i)=> ORTG_RANK[team] = i+1);
})();

function ordinal(n){
  const s = ['th','st','nd','rd'], v = n%100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

// Badge showing where oppAbbr ranks defending `pos` (by real PTS allowed to that position).
function oppRankBadge(oppAbbr, pos){
  const posGroup = (pos||'').split('-')[0];
  const rank = DVP_RANK[posGroup] && DVP_RANK[posGroup][oppAbbr];
  if(!rank) return '—';
  const cls = rank<=10 ? 'rk-tough' : (rank>=21 ? 'rk-favorable' : 'rk-mid');
  return `<span class="badge ${cls}" title="${oppAbbr} ranks ${ordinal(rank)} of 30 in PTS allowed to ${posGroup} (1 = toughest defense)">${ordinal(rank)} vs ${posGroup}</span>`;
}

// Badge showing oppAbbr's real 2025-26 pace tier (fast/avg/slow) with the actual pace number.
function paceBadge(oppAbbr){
  const team = TEAMS[oppAbbr];
  const rank = PACE_RANK[oppAbbr];
  if(!team || !rank) return '—';
  let cls, label;
  if(rank<=10){ cls='pace-fast'; label='FAST'; }
  else if(rank>=21){ cls='pace-slow'; label='SLOW'; }
  else { cls='pace-avg'; label='AVG'; }
  return `<span class="badge ${cls}" title="${oppAbbr} ranks ${ordinal(rank)} of 30 in pace (${fmt(team.pace,1)} poss/48)">${label} (${fmt(team.pace,1)})</span>`;
}

// Badge showing teamAbbr's real 2025-26 offensive tier (elite/avg/weak) with the actual ORtg number.
// This is the player's own team, not the opponent — see the own-team offense multiplier in
// computeProjection and the Methodology tab (Oct 7, 2026 update) for how this feeds the projection.
function offBadge(teamAbbr){
  const team = TEAMS[teamAbbr];
  const rank = ORTG_RANK[teamAbbr];
  if(!team || !rank) return '—';
  let cls, label;
  if(rank<=10){ cls='pace-fast'; label='ELITE OFF'; }
  else if(rank>=21){ cls='pace-slow'; label='WEAK OFF'; }
  else { cls='pace-avg'; label='AVG OFF'; }
  return `<span class="badge ${cls}" title="${teamAbbr} ranks ${ordinal(rank)} of 30 in Offensive Rating (${fmt(team.ortg,1)})">${label} (${fmt(team.ortg,1)})</span>`;
}

function fmt(n, d){ if(n===null||n===undefined||isNaN(n)) return '—'; return n.toFixed(d===undefined?1:d); }
function round5(n){ return Math.round(n*2)/2; }

// ---------- PROJECTION ENGINE ----------
// Mirrors the multiplier-chain approach used in Dmac's NFL Projections tool:
// baseline (real prior-season per-game production) x a chain of real-context multipliers
// (opponent defensive strength, pace, home/away, rest/back-to-back).
function computeProjection(player, game, teamAbbr){
  const oppAbbr = game.opp;
  const opp = TEAMS[oppAbbr];
  const own = TEAMS[teamAbbr];
  if(!opp || !own) return null;

  // Opponent defensive-strength multiplier: tougher (lower) DRtg suppresses scoring-related stats.
  // This generic team-wide signal is now used only as a minority blend partner alongside the real
  // position-specific DvP data below (DvP is the far more precise matchup signal).
  const drtgDiff = (opp.drtg - LEAGUE_AVG.drtg) / LEAGUE_AVG.drtg;
  let defMult = 1 + 1.3*drtgDiff;
  // Tiny, explicitly-flagged coaching scheme-continuity nudge (see COACH_ADJ above and Methodology) —
  // applied before the clamp so it can never push defMult past the existing real-data clamp range.
  const coachAdj = COACH_ADJ[oppAbbr];
  if(coachAdj) defMult *= coachAdj.mult;
  defMult = Math.max(0.84, Math.min(1.20, defMult));

  // Pace multiplier: faster combined pace between the two teams inflates counting stats via more possessions.
  const paceAvg = (own.pace + opp.pace) / 2;
  let paceMult = paceAvg / LEAGUE_AVG.pace;
  paceMult = Math.max(0.92, Math.min(1.10, paceMult));

  // Own-team offense multiplier (added Oct 7, 2026 — see Methodology): a player's own team's real
  // 2025-26 Offensive Rating vs. league average, as a modest boost/penalty on the most offense-
  // system-dependent counting stats (points, assists, 3PM). Deliberately damped to roughly half the
  // coefficient used for opponent defense, and clamped to a tighter band, because a player's baseline
  // is already their own real production playing in that team's system — this multiplier exists mainly
  // to capture (a) the ~100+ players who changed teams this offseason, whose baseline was produced on a
  // DIFFERENT team's offense than the one they're now projected on, and (b) modest further pace/shot-
  // quality effects on top of the raw baseline. It is not meant to re-apply the full size of that signal
  // a second time for players still on their original team.
  const ortgDiff = (own.ortg - LEAGUE_AVG.ortg) / LEAGUE_AVG.ortg;
  let offMult = 1 + 0.6*ortgDiff;
  offMult = Math.max(0.92, Math.min(1.10, offMult));

  // Home/away multiplier.
  const siteMult = game.home ? 1.02 : 0.98;

  // Rest / back-to-back multiplier.
  let restMult = 1.0;
  if(game.b2b) restMult = 0.94;
  else if(game.restDays >= 3) restMult = 1.02;

  const combo = defMult * paceMult * siteMult * restMult;

  // Real per-position Defense-vs-Position multiplier for a given stat, blended 70/30 with the
  // generic team-wide defMult (DvP is the primary signal since it's opponent x position specific;
  // the small defMult weight smooths over any single-position sample noise in the DvP table), then
  // layered with pace/site/rest exactly like the old generic combo.
  const playerPos = player.pos;
  // CraftedNBA individual matchup adjustment (Oct 8, 2026, generalized to all positions — see
  // CRAFTED_DEF_BY_POS / craftedMatchupAdjust above and Methodology).
  const rim = craftedMatchupAdjust(player, oppAbbr);
  function dvpCombo(statKey){
    const dvp = dvpMult(oppAbbr, playerPos, statKey);
    const blendedDef = dvp*0.7 + defMult*0.3;
    return blendedDef * paceMult * siteMult * restMult;
  }

  // offMult is applied only to the three stats most tied to a team's own offensive system/shot
  // quality (points, assists, 3PM) — not to rebounds, steals, blocks, turnovers, or FG%, which are
  // driven far more by individual role and the opponent matchup than by the player's own team's
  // scoring environment.
  const ptsCombo = dvpCombo('pts') * offMult * rim.pts;
  const trbCombo = dvpCombo('reb');
  const astCombo = dvpCombo('ast') * offMult * rim.ast;
  const tpmCombo = dvpCombo('tpm') * offMult * rim.tpm;
  const stlComboRaw = dvpCombo('stl');
  const blkCombo = dvpCombo('blk');
  const tovCombo = dvpCombo('tov') * rim.tov;
  const fgpCombo = dvpCombo('fgp') * rim.fgp;

  const pts = player.pts * ptsCombo;
  const trb = player.trb * trbCombo;
  const ast = player.ast * astCombo;
  const tpm = player.tpm * tpmCombo;
  const stl = player.stl * (stlComboRaw*0.9 + 0.1); // steals lean slightly less on the defensive multiplier
  const blk = player.blk * blkCombo;
  // Turnovers committed by this position vs. this defense — real DvP data, not the old inverse-defMult proxy.
  const tov = player.tov * tovCombo;
  const min = player.mpg * (game.b2b ? 0.97 : 1.0) * (game.restDays>=3?1.01:1.0);
  // Shooting efficiency (FG%) is far less matchup-sensitive than volume; damp the DvP-based multiplier heavily.
  const effMult = 1 + (fgpCombo-1)*0.35;
  const fgp = Math.max(0.30, Math.min(0.75, player.fgp * effMult));
  const ftp = player.ftp; // free throw shooting is essentially matchup-independent

  return {
    opp: oppAbbr, oppName: opp.name, home: game.home, date: game.date,
    restDays: game.restDays, b2b: game.b2b,
    min, pts, trb, ast, tpm, stl, blk, tov, fgp, ftp,
    pra: pts+trb+ast, pa: pts+ast, ra: trb+ast, pr: pts+trb,
    defMult, paceMult, offMult, siteMult, restMult, combo, rimAdjust: rim,
  };
}

// "Market-consistent line" proxy for a stat: the player's own season baseline, rounded to the nearest
// half point (see Methodology tab for why this — not a scraped live sportsbook numbers — is used).
function lineFor(player, statKey){
  const base = {pts:player.pts, trb:player.trb, ast:player.ast, tpm:player.tpm, stl:player.stl,
    blk:player.blk, tov:player.tov, pra:player.pts+player.trb+player.ast,
    pa:player.pts+player.ast, ra:player.trb+player.ast, pr:player.pts+player.trb}[statKey];
  return round5(base);
}

function edgeCell(proj, line){
  const edge = proj - line;
  const cls = Math.abs(edge) < 0.4 ? 'edge-flat' : (edge > 0 ? 'edge-pos' : 'edge-neg');
  const sign = edge > 0 ? '+' : '';
  return `<span class="${cls}">${sign}${fmt(edge,1)}</span>`;
}

function usgBadge(p){
  if(p.usg===null || p.usg===undefined) return '—';
  const cls = p.usg>=26 ? 'usg-hi' : (p.usg<18 ? 'usg-lo' : 'usg-mid');
  // See the CURRENT-SEASON BLEND block above (Nov 4, 2026): p.csWeight>0 means this number is a
  // blend of the real 2025-26 (or rookie/blend) baseline with real 2026-27 games played so far.
  let title;
  if(p.csWeight >= 0.999){
    title = `Real 2026-27 Usage Rate through Gm ${p.cs.g} — no prior NBA season to blend (rookie), Basketball-Reference`;
  } else if(p.csWeight > 0){
    const csPct = Math.round(p.csWeight*100);
    title = `Current-season blend: ${csPct}% weight on real 2026-27 USG% through Gm ${p.cs.g}, ${100-csPct}% on the ${p.usgProxy?'estimated':'real'} 2025-26 baseline — Basketball-Reference`;
  } else {
    title = p.usgProxy ? 'Estimated — no 2025-26 NBA minutes to pull real USG% from (injury return or 2026 rookie)' : "Real 2025-26 Usage Rate, Basketball-Reference";
  }
  return `<span class="badge ${cls}" title="${title}">${fmt(p.usg,1)}%${p.usgProxy?' *':''}</span>`;
}

// ---------- INJURY REPORT ----------
// p.inj = {status, note, as_of} when a current designation exists, sourced from NBA.com/ESPN/CBS
// Sports/team reporting during the Sept 2026 research pass. Not every player has one — absence
// means no current Out/Doubtful/Questionable/Day-To-Day/Recovering tag was found, not necessarily
// full health. See Methodology for how this is sourced and how stale it can get.
function injuryBadgeShort(p){
  if(!p.inj || !p.inj.status) return '';
  const cls = p.inj.status==='Out' ? 'inj-out' : 'inj-q';
  const label = p.inj.status==='Day-To-Day' ? 'DTD' : p.inj.status.toUpperCase().slice(0,4);
  return ` <span class="badge ${cls}" title="${p.inj.note} (as of ${p.inj.as_of})">${label}</span>`;
}
function injuryDetailHTML(p){
  if(!p.inj || !p.inj.status) return '';
  const cls = p.inj.status==='Out' ? 'inj-out' : 'inj-q';
  return `<div class="small-muted" style="margin-top:6px"><span class="badge ${cls}">${p.inj.status}</span> ${p.inj.note} <span style="opacity:.7">(as of ${p.inj.as_of})</span></div>`;
}

// ---------- USAGE REDISTRIBUTION ("teammates OUT" simulation) ----------
// When one or more teammates are marked OUT, their vacated production (minutes, shots,
// playmaking) is redistributed across the real remaining rostered teammates, weighted by each
// teammate's own real 2025-26 Usage Rate (a proxy for "how much of the offense already runs
// through them"), with a bonus for teammates who share an OUT player's primary position (who
// typically inherit the specific role, not just general touches). Multiple OUT players are
// handled by running this same per-player model once for EACH OUT player (against a roster that
// excludes every currently-OUT player, so none of them can absorb each other's minutes) and
// summing the resulting gains — i.e. a teammate's bump from a second OUT starter stacks on top
// of their bump from the first, rather than the two being shared out of one combined pool. This
// is a heuristic estimate, not a guarantee — real NBA usage redistribution varies by coach, game
// plan, and who else is available. See Methodology for the full model.
function usageWeight(p){
  return (typeof p.usg === 'number' && p.usg>0) ? p.usg : 15;
}

function usageRedistributionMulti(player, outPlayers, teamAbbr){
  const outs = (outPlayers||[]).filter(op=>op && op.id!==player.id);
  if(!outs.length) return null;
  const outIds = new Set(outs.map(op=>op.id));
  const roster = playersForTeam(teamAbbr).filter(p=>!outIds.has(p.id));
  if(!roster.length) return null;

  const REDIST = 0.75; // fraction of each OUT player's own production assumed absorbed by the roster (rest is simply lost possessions/pace, not fully backfilled)
  const totals = {extraMin:0, ptsGain:0, trbGain:0, astGain:0, tpmGain:0, stlGain:0, blkGain:0, tovGain:0, shares:[]};

  outs.forEach(outPlayer=>{
    const outPos = (outPlayer.pos||'').split('-')[0];
    const weighted = roster.map(p=>{
      let w = usageWeight(p);
      if((p.pos||'').split('-')[0]===outPos) w *= 1.3;
      return {p, w};
    });
    const totalW = weighted.reduce((a,x)=>a+x.w,0);
    const mine = weighted.find(x=>x.p.id===player.id);
    if(!mine || !totalW) return;
    const share = mine.w / totalW;
    totals.shares.push({name: outPlayer.n, share});

    const samePos = (player.pos||'').split('-')[0]===outPos;
    const astMult = samePos ? 1.15 : 0.85; // ball-handling load transfers more to same-position teammates

    totals.extraMin += outPlayer.mpg * share * 0.6;
    totals.ptsGain += outPlayer.pts * share * REDIST;
    totals.trbGain += outPlayer.trb * share * REDIST * 0.85;
    totals.astGain += outPlayer.ast * share * REDIST * astMult;
    totals.tpmGain += outPlayer.tpm * share * REDIST * 0.8;
    totals.stlGain += outPlayer.stl * share * REDIST * 0.5;
    totals.blkGain += outPlayer.blk * share * REDIST * 0.5;
    totals.tovGain += outPlayer.tov * share * REDIST * 0.6;
  });

  if(!totals.shares.length) return null;
  // Cap total added minutes once, across all OUT players combined, so stacking multiple absences
  // can never push a player past a realistic ceiling.
  totals.extraMin = Math.max(0, Math.min(40 - player.mpg, totals.extraMin));
  return totals;
}

// Formats the per-OUT-player usage-share breakdown from usageRedistributionMulti() for the
// on-screen banner, e.g. "~18% of Luka Doncic's, ~9% of Austin Reaves's".
function shareSummaryText(delta){
  if(!delta || !delta.shares || !delta.shares.length) return '';
  return delta.shares.map(s=>`~${fmt(s.share*100,0)}% of ${s.name}'s`).join(', ');
}

// Applies a usageRedistributionMulti() delta on top of a normal computeProjection() result.
function applyRedistribution(proj, delta){
  if(!delta) return proj;
  const min = Math.min(40, proj.min + delta.extraMin);
  const pts = proj.pts + delta.ptsGain;
  const trb = proj.trb + delta.trbGain;
  const ast = proj.ast + delta.astGain;
  const tpm = proj.tpm + delta.tpmGain;
  const stl = proj.stl + delta.stlGain;
  const blk = proj.blk + delta.blkGain;
  const tov = proj.tov + delta.tovGain;
  return Object.assign({}, proj, {
    min, pts, trb, ast, tpm, stl, blk, tov,
    pra: pts+trb+ast, pa: pts+ast, ra: trb+ast, pr: pts+trb,
  });
}

// ---------- UI: TABS ----------
document.querySelectorAll('nav.tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('main > section').forEach(s=>s.classList.add('hidden'));
    document.getElementById('tab-'+btn.dataset.tab).classList.remove('hidden');
  });
});

document.querySelectorAll('nav.subtabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav.subtabs button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.subtab-panel').forEach(s=>s.classList.add('hidden'));
    document.getElementById('slateSub-'+btn.dataset.subtab).classList.remove('hidden');
  });
});

// ---------- PLAYER TAB ----------
const playerTeamFilter = document.getElementById('playerTeamFilter');
const playerSelect = document.getElementById('playerSelect');
const playerSearch = document.getElementById('playerSearch');
const playerOutSelect = document.getElementById('playerOutSelect');

// Populates the "Simulate: teammates OUT" multi-select with the given player's real rostered
// teammates, preserving whichever teammates are already checked across re-populates (this runs
// on every re-render, since toggling the OUT list itself triggers a re-render).
function populateOutSelect(selectEl, player){
  if(!player){ selectEl.innerHTML = ''; return; }
  const teammates = playersForTeam(player.t).filter(p=>p.id!==player.id);
  const prevSelected = new Set(Array.from(selectEl.selectedOptions||[]).map(o=>o.value));
  selectEl.innerHTML = teammates.map(p=>`<option value="${p.id}">${p.n} (${fmt(p.usg,1)}% USG)</option>`).join('');
  Array.from(selectEl.options).forEach(o=>{ if(prevSelected.has(o.value)) o.selected = true; });
}

// Reads the currently-checked ids out of a "teammates OUT" multi-select.
function selectedOutIds(selectEl){
  return Array.from(selectEl.selectedOptions||[]).map(o=>parseInt(o.value)).filter(v=>!isNaN(v));
}

function populateTeamSelects(){
  [playerTeamFilter, document.getElementById('rosterTeamSelect'), document.getElementById('slateTeamSelect'),
   document.getElementById('dvpTeamSelect'), document.getElementById('histTeamSelect')].forEach(sel=>{
    sel.innerHTML = '<option value="ALL">All Teams</option>' + TEAM_ORDER.map(a=>`<option value="${a}">${TEAMS[a].name}</option>`).join('');
  });
  ['rosterTeamSelect','slateTeamSelect','dvpTeamSelect','histTeamSelect'].forEach(id=>{
    document.getElementById(id).querySelector('option[value=ALL]').remove();
  });
}
populateTeamSelects();

function playersForTeam(abbr){
  let list = PLAYERS.filter(p=>p.mpg>0);
  if(abbr && abbr!=='ALL') list = list.filter(p=>p.t===abbr);
  return list.sort((a,b)=> b.pts - a.pts);
}

function populatePlayerSelect(){
  const teamAbbr = playerTeamFilter.value;
  const q = playerSearch.value.trim().toLowerCase();
  let list = playersForTeam(teamAbbr);
  if(q) list = list.filter(p=>p.n.toLowerCase().includes(q));
  playerSelect.innerHTML = list.map(p=>`<option value="${p.id}">${p.n} (${TEAMS[p.t] ? TEAMS[p.t].name : p.t})</option>`).join('');
  if(list.length) renderPlayerDetail(list[0].id);
  else document.getElementById('playerDetail').innerHTML = '<div class="panel">No players match.</div>';
}
playerTeamFilter.addEventListener('change', populatePlayerSelect);
playerSearch.addEventListener('input', populatePlayerSelect);
playerSelect.addEventListener('change', ()=> renderPlayerDetail(parseInt(playerSelect.value)));
playerOutSelect.addEventListener('change', ()=> renderPlayerDetail(parseInt(playerSelect.value)));

function renderPlayerDetail(id){
  const p = PLAYERS.find(x=>x.id===id);
  if(!p) return;
  const team = TEAMS[p.t];
  const sch = team ? team.sch : [];

  populateOutSelect(playerOutSelect, p);
  const outIds = selectedOutIds(playerOutSelect);
  const outPlayers = outIds.map(id=>PLAYERS.find(x=>x.id===id)).filter(Boolean);
  const delta = outPlayers.length ? usageRedistributionMulti(p, outPlayers, p.t) : null;

  const rows = sch.map(g=>{
    let proj = computeProjection(p, g, p.t);
    if(!proj) return '';
    if(delta) proj = applyRedistribution(proj, delta);
    const siteBadge = g.home ? '<span class="badge home">HOME</span>' : '<span class="badge away">AWAY</span>';
    const b2bBadge = g.b2b ? '<span class="badge b2b">B2B</span>' : '';
    return `<tr>
      <td class="name-cell">${g.date}</td>
      <td>${siteBadge}${b2bBadge}</td>
      <td>${g.opp}</td>
      <td>${oppRankBadge(g.opp, p.pos)}</td>
      <td>${paceBadge(g.opp)}</td>
      <td>${fmt(proj.min,1)}</td>
      <td>${fmt(proj.pts,1)}</td>
      <td>${fmt(proj.trb,1)}</td>
      <td>${fmt(proj.ast,1)}</td>
      <td>${fmt(proj.tpm,1)}</td>
      <td>${fmt(proj.stl,1)}</td>
      <td>${fmt(proj.blk,1)}</td>
      <td>${fmt(proj.tov,1)}</td>
      <td>${fmt(proj.fgp*100,1)}%</td>
      <td>${fmt(proj.ftp*100,1)}%</td>
      <td>${fmt(proj.pra,1)}</td>
      <td>${fmt(proj.pa,1)}</td>
      <td>${fmt(proj.ra,1)}</td>
      <td>${fmt(proj.pr,1)}</td>
      <td>${edgeCell(proj.pts, lineFor(p,'pts'))}</td>
      <td>${edgeCell(proj.trb, lineFor(p,'trb'))}</td>
      <td>${edgeCell(proj.ast, lineFor(p,'ast'))}</td>
      <td>${edgeCell(proj.pra, lineFor(p,'pra'))}</td>
    </tr>`;
  }).join('');

  const seasonAvg = (key)=>{
    const vals = sch.map(g=>{
      let proj = computeProjection(p,g,p.t);
      if(delta) proj = applyRedistribution(proj, delta);
      return proj[key];
    });
    return vals.reduce((a,b)=>a+b,0)/vals.length;
  };

  const outBanner = outPlayers.length ? `<div class="out-banner">Simulating <b>${outPlayers.map(x=>x.n).join(', ')}</b> OUT — ${p.n} is projected to absorb ${shareSummaryText(delta)} usage share (weighted by real Usage Rate and position match).</div>` : '';

  document.getElementById('playerDetail').innerHTML = `
    ${outBanner}
    <div class="panel">
      <div class="player-header">
        <h2>${p.n}</h2>
        <span class="tag">${p.pos}</span>
        <span class="tag">${team ? team.name : p.t}</span>
        <span class="tag">Age ${fmt(p.age,0)}</span>
        <span class="tag">Usage ${usgBadge(p)}</span>
        <span class="tag">Team ${offBadge(p.t)}</span>
        <span class="tag">${p.bs==='rookie' ? 'Rookie — no NBA games played' : `${p.bs}: ${fmt(p.g,0)} GP, ${fmt(p.mpg,1)} MPG`}</span>
        ${(p.src!==p.t && p.bs!=='rookie') ? `<span class="tag">${p.bs} baseline via ${p.src} roster; now on ${p.t} for 2026-27</span>` : ''}
      </div>
      ${injuryDetailHTML(p)}
      ${p.note ? `<div class="small-muted" style="margin-top:6px">${p.note}</div>` : ''}
      <div class="stat-grid">
        <div class="stat-box"><div class="v">${fmt(seasonAvg('pts'),1)}</div><div class="l">Proj PTS/G</div></div>
        <div class="stat-box"><div class="v">${fmt(seasonAvg('trb'),1)}</div><div class="l">Proj REB/G</div></div>
        <div class="stat-box"><div class="v">${fmt(seasonAvg('ast'),1)}</div><div class="l">Proj AST/G</div></div>
        <div class="stat-box"><div class="v">${fmt(seasonAvg('tpm'),1)}</div><div class="l">Proj 3PM/G</div></div>
        <div class="stat-box"><div class="v">${fmt(seasonAvg('stl'),1)}</div><div class="l">Proj STL/G</div></div>
        <div class="stat-box"><div class="v">${fmt(seasonAvg('blk'),1)}</div><div class="l">Proj BLK/G</div></div>
        <div class="stat-box"><div class="v">${fmt(seasonAvg('pra'),1)}</div><div class="l">Proj PRA/G</div></div>
      </div>
      <div class="small-muted">${p.bs==='rookie' ? 'Rookie debut-season estimate' : `${p.bs} real baseline`}: ${fmt(p.pts,1)} PTS / ${fmt(p.trb,1)} REB / ${fmt(p.ast,1)} AST / ${fmt(p.tpm,1)} 3PM per game on ${fmt(p.mpg,1)} MPG (FG% ${fmt(p.fgp*100,1)}, FT% ${fmt(p.ftp*100,1)}). "Line" columns are this baseline rounded to the nearest half-point. "Edge" = matchup-adjusted projection minus that baseline line.</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="name-cell">Date</th><th>Site</th><th>Opp</th><th>Opp Rk vPos</th><th>Pace</th><th>MIN</th>
          <th>PTS</th><th>REB</th><th>AST</th><th>3PM</th><th>STL</th><th>BLK</th><th>TOV</th><th>FG%</th><th>FT%</th>
          <th>PRA</th><th>PA</th><th>RA</th><th>PR</th>
          <th>PTS Edge</th><th>REB Edge</th><th>AST Edge</th><th>PRA Edge</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

populatePlayerSelect();

// ---------- ROSTER TAB ----------
const rosterTeamSelect = document.getElementById('rosterTeamSelect');
rosterTeamSelect.addEventListener('change', renderRoster);
function renderRoster(){
  const abbr = rosterTeamSelect.value;
  const team = TEAMS[abbr];
  const list = playersForTeam(abbr);
  const rows = list.map(p=>`<tr>
    <td class="name-cell"><a class="player-link" data-pid="${p.id}">${p.n}</a>${injuryBadgeShort(p)}</td>
    <td>${p.pos}</td><td>${fmt(p.age,0)}</td><td>${fmt(p.g,0)}</td><td>${fmt(p.mpg,1)}</td>
    <td>${usgBadge(p)}</td>
    <td>${fmt(p.pts,1)}</td><td>${fmt(p.trb,1)}</td><td>${fmt(p.ast,1)}</td><td>${fmt(p.tpm,1)}</td>
    <td>${fmt(p.stl,1)}</td><td>${fmt(p.blk,1)}</td><td>${fmt(p.tov,1)}</td>
    <td>${fmt(p.fgp*100,1)}%</td><td>${fmt(p.ftp*100,1)}%</td>
    ${p.bs==='rookie' ? '<td class="small-muted">Rookie</td>' : (p.bs!=='2025-26' ? '<td class="small-muted">'+p.bs+'</td>' : (p.src!==p.t ? '<td class="small-muted">via '+p.src+'</td>' : '<td></td>'))}
  </tr>`).join('');
  document.getElementById('rosterOut').innerHTML = `
    <div class="panel">
      <h2>${team.name} — 2026-27</h2>
      <div class="small-muted">2025-26 team context: ${team.w}-${team.l}, Pace ${fmt(team.pace,1)}, ORtg ${fmt(team.ortg,1)}, DRtg ${fmt(team.drtg,1)}, Net ${team.netrtg>0?'+':''}${fmt(team.netrtg,1)}</div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th class="name-cell">Player</th><th>Pos</th><th>Age</th><th>GP</th><th>MPG</th><th>USG%</th>
      <th>PTS</th><th>REB</th><th>AST</th><th>3PM</th><th>STL</th><th>BLK</th><th>TOV</th><th>FG%</th><th>FT%</th><th>Note</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  document.querySelectorAll('#rosterOut .player-link').forEach(el=>{
    el.addEventListener('click', ()=>{
      const pid = parseInt(el.dataset.pid);
      document.querySelector('nav.tabs button[data-tab=player]').click();
      playerTeamFilter.value='ALL'; playerSearch.value='';
      populatePlayerSelect();
      playerSelect.value = pid;
      renderPlayerDetail(pid);
    });
  });
}
rosterTeamSelect.value = TEAM_ORDER[0];
renderRoster();

// ---------- SLATE FINDER TAB ----------
const slateTeamSelect = document.getElementById('slateTeamSelect');
const slateGameSelect = document.getElementById('slateGameSelect');
const slateOutSelect = document.getElementById('slateOutSelect');
slateTeamSelect.addEventListener('change', ()=>{ populateSlateGames(); populateSlateOutSelect(); renderSlate(); });
slateGameSelect.addEventListener('change', renderSlate);
slateOutSelect.addEventListener('change', renderSlate);

function populateSlateGames(){
  const abbr = slateTeamSelect.value;
  const team = TEAMS[abbr];
  slateGameSelect.innerHTML = team.sch.map((g,i)=>`<option value="${i}">${g.date} — ${g.home?'vs':'@'} ${TEAMS[g.opp]?TEAMS[g.opp].name:g.opp}${g.b2b?' (B2B)':''}</option>`).join('');
}
function populateSlateOutSelect(){
  const abbr = slateTeamSelect.value;
  const roster = playersForTeam(abbr);
  const prevSelected = new Set(Array.from(slateOutSelect.selectedOptions||[]).map(o=>o.value));
  slateOutSelect.innerHTML = roster.map(p=>`<option value="${p.id}">${p.n} (${fmt(p.usg,1)}% USG)</option>`).join('');
  Array.from(slateOutSelect.options).forEach(o=>{ if(prevSelected.has(o.value)) o.selected = true; });
}
function renderSlate(){
  const abbr = slateTeamSelect.value;
  const team = TEAMS[abbr];
  const idx = parseInt(slateGameSelect.value||0);
  const g = team.sch[idx];
  if(!g){ document.getElementById('slateOut').innerHTML=''; return; }
  const roster = playersForTeam(abbr);
  const outIds = selectedOutIds(slateOutSelect);
  const outIdSet = new Set(outIds);
  const outPlayers = roster.filter(p=>outIdSet.has(p.id));
  const rows = roster.map(p=>{
    if(outIdSet.has(p.id)){
      return `<tr style="opacity:.55">
        <td class="name-cell"><a class="player-link" data-pid="${p.id}">${p.n}</a> <span class="badge away">OUT</span></td>
        <td>${p.pos}</td><td>—</td><td colspan="9" class="small-muted">Marked out — not projected. Teammates below are adjusted to absorb their usage.</td>
      </tr>`;
    }
    let proj = computeProjection(p, g, abbr);
    const delta = outPlayers.length ? usageRedistributionMulti(p, outPlayers, abbr) : null;
    if(delta) proj = applyRedistribution(proj, delta);
    return `<tr>
      <td class="name-cell"><a class="player-link" data-pid="${p.id}">${p.n}</a>${injuryBadgeShort(p)}</td>
      <td>${p.pos}</td>
      <td>${oppRankBadge(g.opp, p.pos)}</td>
      <td>${fmt(proj.min,1)}</td>
      <td>${fmt(proj.pts,1)}</td><td>${edgeCell(proj.pts, lineFor(p,'pts'))}</td>
      <td>${fmt(proj.trb,1)}</td><td>${edgeCell(proj.trb, lineFor(p,'trb'))}</td>
      <td>${fmt(proj.ast,1)}</td><td>${edgeCell(proj.ast, lineFor(p,'ast'))}</td>
      <td>${fmt(proj.tpm,1)}</td>
      <td>${fmt(proj.pra,1)}</td><td>${edgeCell(proj.pra, lineFor(p,'pra'))}</td>
    </tr>`;
  }).join('');
  const opp = TEAMS[g.opp];
  const outBanner = outPlayers.length ? `<div class="out-banner">Simulating <b>${outPlayers.map(x=>x.n).join(', ')}</b> OUT for this game — remaining ${team.name} players below have their MIN/PTS/REB/AST/3PM/TOV adjusted upward based on real Usage Rate share and position match. Heuristic estimate.</div>` : '';
  document.getElementById('slateOut').innerHTML = `
    ${outBanner}
    <div class="panel">
      <h2>${team.name} ${g.home?'vs':'@'} ${opp.name} — ${g.date}</h2>
      <div class="small-muted">${g.home?'Home':'Away'} game${g.b2b?' · second night of a back-to-back':''} · rest days: ${g.restDays} &nbsp;|&nbsp;
      ${team.name} pace ${paceBadge(abbr)} &nbsp;vs&nbsp; ${opp.name} pace ${paceBadge(g.opp)} &nbsp;|&nbsp;
      ${team.name} offense ${offBadge(abbr)} &nbsp;vs&nbsp; ${opp.name} defense DRtg ${fmt(opp.drtg,1)}</div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th class="name-cell">Player</th><th>Pos</th><th>Opp Rk vPos</th><th>MIN</th>
      <th>PTS</th><th>Edge</th><th>REB</th><th>Edge</th><th>AST</th><th>Edge</th><th>3PM</th><th>PRA</th><th>Edge</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  document.querySelectorAll('#slateOut .player-link').forEach(el=>{
    el.addEventListener('click', ()=>{
      const pid = parseInt(el.dataset.pid);
      document.querySelector('nav.tabs button[data-tab=player]').click();
      playerTeamFilter.value='ALL'; playerSearch.value='';
      populatePlayerSelect();
      playerSelect.value = pid;
      renderPlayerDetail(pid);
    });
  });
}
slateTeamSelect.value = TEAM_ORDER[0];
populateSlateGames();
populateSlateOutSelect();
renderSlate();

// ---------- DEFENSIVE PROFILE TAB ----------
const dvpTeamSelect = document.getElementById('dvpTeamSelect');
dvpTeamSelect.addEventListener('change', renderDvpProfile);

function dvpRankCls(rank){
  return rank<=10 ? 'rk-tough' : (rank>=21 ? 'rk-favorable' : 'rk-mid');
}
function dvpRankBadgeFor(statKey, pos, teamAbbr){
  const rank = DVP_RANK_ALL[statKey][pos][teamAbbr];
  if(!rank) return '—';
  return `<span class="badge ${dvpRankCls(rank)}">${ordinal(rank)}</span>`;
}
const DVP_STAT_COLS = ['pts','reb','ast','tpm','stl','blk','tov','fgp','ftp'];

function renderDvpProfile(){
  const abbr = dvpTeamSelect.value;
  const team = TEAMS[abbr];
  const positions = ['PG','SG','SF','PF','C'];

  const rows = positions.map(pos=>{
    const rec = DVP.byTeam[abbr][pos];
    const cells = DVP_STAT_COLS.map(sk=>{
      const val = (sk==='fgp'||sk==='ftp') ? fmt(rec[sk],1)+'%' : fmt(rec[sk],1);
      return `<td>${val} ${dvpRankBadgeFor(sk,pos,abbr)}</td>`;
    }).join('');
    return `<tr><td class="name-cell">${pos}</td>${cells}</tr>`;
  }).join('');

  // Formats a raw DvP value the same way the grid above does (percent for FG%/FT%, else 1 decimal).
  function dvpValFmt(sk, v){ return (sk==='fgp'||sk==='ftp') ? fmt(v,1)+'%' : fmt(v,1); }
  const dvpUnit = (sk)=> (sk==='fgp'||sk==='ftp') ? '' : '/gm';

  // One clean, aligned row: position/stat on the left, the real number (bold) + league avg (muted)
  // + a short rank badge on the right — replaces the old wordy "(gives up a lot)" / "(stingy)" tags.
  function weakRowHTML(w, cls){
    return `<div class="weak-row">
      <span class="weak-label">${w.pos} — ${STAT_LABELS[w.sk]}</span>
      <span class="weak-num">
        <b>${dvpValFmt(w.sk,w.val)}</b>${dvpUnit(w.sk)}
        <span class="small-muted">vs ${dvpValFmt(w.sk,w.avg)} avg</span>
        <span class="badge ${cls}">${ordinal(w.rank)}</span>
      </span>
    </div>`;
  }

  // Every (position, stat) combo where this team ranks 24th-30th (most generous) — the clearest matchups to attack.
  const weak = [];
  positions.forEach(pos=> DVP_STAT_COLS.forEach(sk=>{
    const rank = DVP_RANK_ALL[sk][pos][abbr];
    if(rank>=24) weak.push({pos, sk, rank, val: DVP.byTeam[abbr][pos][sk], avg: DVP.leagueAvgByPos[pos][sk]});
  }));
  weak.sort((a,b)=> b.rank - a.rank);
  const weakList = weak.slice(0,10).map(w=>weakRowHTML(w,'rk-favorable')).join('')
    || '<div class="small-muted">No standout weaknesses (24th-30th) at any position/stat — a fairly balanced defense.</div>';

  // Every combo where this team ranks 1st-7th (stingiest) — the matchups to avoid.
  const tough = [];
  positions.forEach(pos=> DVP_STAT_COLS.forEach(sk=>{
    const rank = DVP_RANK_ALL[sk][pos][abbr];
    if(rank<=7) tough.push({pos, sk, rank, val: DVP.byTeam[abbr][pos][sk], avg: DVP.leagueAvgByPos[pos][sk]});
  }));
  tough.sort((a,b)=> a.rank - b.rank);
  const toughList = tough.slice(0,10).map(w=>weakRowHTML(w,'rk-tough')).join('')
    || '<div class="small-muted">No standout strengths (1st-7th) at any position/stat.</div>';

  document.getElementById('dvpOut').innerHTML = `
    <div class="panel">
      <h2>${team.name} — What They Give Up, By Position</h2>
      <div class="small-muted">Team pace ${paceBadge(abbr)} · DRtg ${fmt(team.drtg,1)}</div>
    </div>
    <div class="table-wrap dvp-grid"><table>
      <thead><tr><th class="name-cell">Pos</th>${DVP_STAT_COLS.map(sk=>`<th>${STAT_LABELS[sk]}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div class="panel" style="margin-top:14px">
      <h3 style="margin-top:0">Biggest Weaknesses — best matchups to attack</h3>
      <div class="weak-list">${weakList}</div>
    </div>
    <div class="panel">
      <h3 style="margin-top:0">Biggest Strengths — toughest matchups to avoid</h3>
      <div class="weak-list">${toughList}</div>
    </div>
    ${coachPanelHTML(abbr)}
    ${trendPanelHTML(abbr)}`;
}

// Head coach + defensive scheme card, with the researched carryover note for the 6 coaches new to
// their team this offseason (see COACH_DATA / COACH_ADJ above and the Methodology tab).
function coachPanelHTML(abbr){
  const c = COACH_DATA[abbr];
  if(!c) return '';
  const newBadge = c.new ? '<span class="badge b2b">NEW 2026-27</span>' : '';
  const prevLine = c.new && c.prevTeam ? `<div class="small-muted" style="margin-top:4px">Previously: ${c.prevTeam}</div>` : '';
  const adj = COACH_ADJ[abbr];
  const adjLine = '';
  return `<div class="panel" style="margin-top:14px">
    <h3 style="margin-top:0">Head Coach &amp; Defensive Scheme ${newBadge}</h3>
    <div><b>${c.coach}</b> <span class="small-muted">— ${c.tenure}</span></div>
    ${prevLine}
    <div style="margin-top:8px">${c.scheme}</div>
    ${c.note ? `<div class="small-muted" style="margin-top:8px">${c.note}</div>` : ''}
    ${adjLine}
  </div>`;
}

// 2-year (2024-25 → 2025-26) Defense-vs-Position trend, sourced live from dunkest.com, at the
// coarser Guards/Forwards/Centers grain (see DVP_TREND above). Green = defense tightened YoY
// (allowing less), red = defense loosened YoY (allowing more); TOV is inverted (forcing more TOV is
// good defense, so a positive delta there is colored green, not red).
function trendPanelHTML(abbr){
  const groups = ['Guards','Forwards','Centers'];
  const stats = ['PTS','REB','AST','3PM','STL','BLK','TOV'];
  const teamTrend = DVP_TREND[abbr];
  if(!teamTrend) return '';
  const rows = [];
  groups.forEach(g=>{
    stats.forEach(s=>{
      const d = teamTrend[g] && teamTrend[g][s];
      if(!d) return;
      const [v24, v25, delta] = d;
      const goodDirection = s==='TOV' ? delta>0 : delta<0; // forcing more TOV is good; allowing less of everything else is good
      const cls = Math.abs(delta) < 0.15 ? 'small-muted' : (goodDirection ? 'trend-good' : 'trend-bad');
      const arrow = Math.abs(delta) < 0.15 ? '→' : (delta<0 ? '↓' : '↑');
      rows.push(`<tr><td class="name-cell">${g}</td><td>${s}</td><td>${fmt(v24,1)}</td><td>${fmt(v25,1)}</td><td class="${cls}">${arrow} ${delta>0?'+':''}${fmt(delta,1)}</td></tr>`);
    });
  });
  return `<div class="panel" style="margin-top:14px">
    <h3 style="margin-top:0">2-Year DvP Trend (2024-25 → 2025-26)</h3>
    <div class="table-wrap"><table>
      <thead><tr><th class="name-cell">Group</th><th>Stat</th><th>24-25</th><th>25-26</th><th>Δ YoY</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table></div>
  </div>`;
}
function team_name_for_trend(abbr){ return TEAMS[abbr] ? TEAMS[abbr].name : abbr; }
dvpTeamSelect.value = TEAM_ORDER[0];
renderDvpProfile();

// ---------- SLATE: GAMES BY DATE ----------
const byDateSelect = document.getElementById('byDateSelect');
byDateSelect.addEventListener('change', renderByDate);

function allSlateDates(){
  const set = new Set();
  Object.values(TEAMS).forEach(t=> t.sch.forEach(g=> set.add(g.date)));
  return Array.from(set).sort();
}
function gamesOnDate(date){
  const games = [];
  Object.entries(TEAMS).forEach(([abbr,t])=>{
    t.sch.forEach(g=>{
      if(g.date===date && g.home) games.push({home:abbr, away:g.opp, date, b2bHome:g.b2b, restHome:g.restDays});
    });
  });
  return games;
}
// The single (position, stat) combo where this team is most generous, across PTS/REB/AST — a fast "who do they give up the most to" read.
function teamWeakestSpot(abbr){
  let best = null;
  ['PG','SG','SF','PF','C'].forEach(pos=>{
    ['pts','reb','ast'].forEach(sk=>{
      const rank = DVP_RANK_ALL[sk][pos][abbr];
      if(!best || rank>best.rank) best = {pos, sk, rank, val: DVP.byTeam[abbr][pos][sk], avg: DVP.leagueAvgByPos[pos][sk]};
    });
  });
  return best;
}
function populateByDate(){
  byDateSelect.innerHTML = allSlateDates().map(d=>`<option value="${d}">${d}</option>`).join('');
}
function renderByDate(){
  const date = byDateSelect.value;
  const games = gamesOnDate(date);
  if(!games.length){ document.getElementById('byDateOut').innerHTML = '<div class="panel">No games found for this date.</div>'; return; }
  const html = games.map(g=>{
    const home = TEAMS[g.home], away = TEAMS[g.away];
    const homeWeak = teamWeakestSpot(g.home);
    const awayWeak = teamWeakestSpot(g.away);
    return `<div class="panel">
      <div class="row" style="justify-content:space-between">
        <h2 style="margin:0">${away.name} @ ${home.name}</h2>
        ${g.b2bHome ? '<span class="badge b2b">Home team B2B</span>' : ''}
      </div>
      <div class="small-muted" style="margin-top:6px">${home.name} pace ${paceBadge(g.home)} &nbsp;vs&nbsp; ${away.name} pace ${paceBadge(g.away)} &nbsp;|&nbsp; ${home.name} offense ${offBadge(g.home)} &nbsp;vs&nbsp; ${away.name} offense ${offBadge(g.away)}</div>
      <div class="row" style="margin-top:10px;gap:28px">
        <div><b>${home.name}</b> gives up most to: ${homeWeak.pos} ${STAT_LABELS[homeWeak.sk]} — <b>${fmt(homeWeak.val,1)}</b>/gm <span class="small-muted">(avg ${fmt(homeWeak.avg,1)})</span> <span class="badge rk-favorable">${ordinal(homeWeak.rank)}</span></div>
        <div><b>${away.name}</b> gives up most to: ${awayWeak.pos} ${STAT_LABELS[awayWeak.sk]} — <b>${fmt(awayWeak.val,1)}</b>/gm <span class="small-muted">(avg ${fmt(awayWeak.avg,1)})</span> <span class="badge rk-favorable">${ordinal(awayWeak.rank)}</span></div>
      </div>
      <div class="row" style="margin-top:10px">
        <a class="player-link byDateGo" data-team="${g.home}">${home.name} full slate →</a>
        <a class="player-link byDateGo" data-team="${g.away}">${away.name} full slate →</a>
      </div>
    </div>`;
  }).join('');
  document.getElementById('byDateOut').innerHTML = html;
  document.querySelectorAll('#byDateOut .byDateGo').forEach(el=>{
    el.addEventListener('click', ()=>{
      const team = el.dataset.team;
      document.querySelector('nav.subtabs button[data-subtab=matchup]').click();
      slateTeamSelect.value = team;
      populateSlateGames(); populateSlateOutSelect();
      const idx = TEAMS[team].sch.findIndex(g=>g.date===date);
      if(idx>=0) slateGameSelect.value = idx;
      renderSlate();
    });
  });
}
populateByDate();
byDateSelect.value = allSlateDates()[0];
renderByDate();

// ---------- SLATE: HISTORY VS OPPONENT ----------
const histTeamSelect = document.getElementById('histTeamSelect');
const histPlayerSelect = document.getElementById('histPlayerSelect');
const histOppSelect = document.getElementById('histOppSelect');
histTeamSelect.addEventListener('change', ()=>{ populateHistPlayers(); populateHistOpp(); renderHistory(); });
histPlayerSelect.addEventListener('change', ()=>{ populateHistOpp(); renderHistory(); });
histOppSelect.addEventListener('change', renderHistory);

function populateHistPlayers(){
  const abbr = histTeamSelect.value;
  histPlayerSelect.innerHTML = playersForTeam(abbr).map(p=>`<option value="${p.id}">${p.n}</option>`).join('');
}
function populateHistOpp(){
  const pid = parseInt(histPlayerSelect.value);
  const p = PLAYERS.find(x=>x.id===pid);
  if(!p){ histOppSelect.innerHTML=''; return; }
  const team = TEAMS[p.t];
  const opps = Array.from(new Set(team.sch.map(g=>g.opp))).sort((a,b)=> (TEAMS[a]?TEAMS[a].name:a).localeCompare(TEAMS[b]?TEAMS[b].name:b));
  histOppSelect.innerHTML = opps.map(o=>`<option value="${o}">${TEAMS[o]?TEAMS[o].name:o}</option>`).join('');
}
function renderHistory(){
  const pid = parseInt(histPlayerSelect.value);
  const p = PLAYERS.find(x=>x.id===pid);
  const oppAbbr = histOppSelect.value;
  if(!p || !oppAbbr){ document.getElementById('histOut').innerHTML=''; return; }
  const team = TEAMS[p.t];
  const meetings = team.sch.filter(g=>g.opp===oppAbbr);
  if(!meetings.length){ document.getElementById('histOut').innerHTML = '<div class="panel">No scheduled meetings found.</div>'; return; }
  const rows = meetings.map(g=>{
    const proj = computeProjection(p, g, p.t);
    const siteBadge = g.home ? '<span class="badge home">HOME</span>' : '<span class="badge away">AWAY</span>';
    return `<tr>
      <td class="name-cell">${g.date}</td>
      <td>${siteBadge}</td>
      <td>${oppRankBadge(g.opp, p.pos)}</td>
      <td>${fmt(proj.min,1)}</td>
      <td>${fmt(proj.pts,1)}</td>
      <td>${fmt(proj.trb,1)}</td>
      <td>${fmt(proj.ast,1)}</td>
      <td>${fmt(proj.tpm,1)}</td>
      <td>${fmt(proj.pra,1)}</td>
    </tr>`;
  }).join('');
  const avgKey = (k)=> meetings.map(g=>computeProjection(p,g,p.t)[k]).reduce((a,b)=>a+b,0)/meetings.length;
  document.getElementById('histOut').innerHTML = `
    <div class="panel">
      <h2>${p.n} vs ${TEAMS[oppAbbr] ? TEAMS[oppAbbr].name : oppAbbr} — ${meetings.length} meeting${meetings.length===1?'':'s'} in 2026-27</h2>
      <div class="small-muted">Average across these meetings: ${fmt(avgKey('pts'),1)} PTS / ${fmt(avgKey('trb'),1)} REB / ${fmt(avgKey('ast'),1)} AST.</div>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th class="name-cell">Date</th><th>Site</th><th>Opp Rk vPos</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>3PM</th><th>PRA</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}
histTeamSelect.value = TEAM_ORDER[0];
populateHistPlayers();
populateHistOpp();
renderHistory();


// ===== BETTING TAB (added Oct 27 2026 -- see Methodology) =====
const BETTING_SLATE = {"asOf":"2026-11-05T21:02:49+11:00","source":"sportsbet.com.au","note":"Covers sportsbet.com.au's NBA player-prop board (Points/Rebounds/Assists/Threes) for today's Melbourne-date slate (2 games); bet365 odds are not included. Both games were pre-game (not yet live) at pull time.","games":[{"awayAbbr":"ORL","homeAbbr":"PHX","date":"2026-11-05","live":false,"url":"https://www.sportsbet.com.au/betting/basketball-us/nba/orlando-magic-at-phoenix-suns-11123370","props":{"pts":{"Anthony Black":[[5,1.01],[10,1.17],[15,1.84],[20,4],[25,9.5],[30,34]],"Desmond Bane":[[10,1.03],[15,1.22],[20,1.77],[25,3.31],[30,6.5],[35,12],[40,41]],"Franz Wagner":[[15,1.1],[20,1.38],[25,2.22],[30,4.5],[35,8.5],[40,15]],"Tristan da Silva":[[5,1.05],[10,1.44],[15,2.74],[20,6],[25,12]],"Wendell Carter Jr.":[[5,1.04],[10,1.43],[15,3.13],[20,8]],"Jase Richardson":[[5,1.14],[10,2.1],[15,5.4],[20,13]],"Jamal Cain":[[5,1.46],[10,3.8],[15,10]],"Devin Booker":[[15,1.04],[20,1.25],[25,1.79],[30,3.14],[35,6],[40,12],[45,41]],"Dillon Brooks":[[10,1.11],[15,1.56],[20,2.98],[25,6],[30,13]],"Jalen Green":[[10,1.13],[15,1.57],[20,3],[25,6],[30,12]],"Miles Bridges":[[10,1.11],[15,1.53],[20,2.89],[25,6],[30,12]],"Khaman Maluach":[[5,1.6],[10,5.2],[15,14]]},"reb":{"Anthony Black":[[4,1.53],[6,3.45],[8,8.5],[10,21]],"Desmond Bane":[[4,1.54],[6,3.45],[8,9.5],[10,21]],"Franz Wagner":[[4,1.13],[6,1.66],[8,3.32],[10,6],[12,13]],"Tristan da Silva":[[4,1.48],[6,3.24],[8,8.5],[10,17]],"Wendell Carter Jr.":[[4,1.02],[6,1.13],[8,1.47],[10,2.14],[12,4],[14,8],[16,13]],"Jase Richardson":[[4,3.2],[6,10]],"Devin Booker":[[4,1.67],[6,4.25],[8,11]],"Dillon Brooks":[[4,1.57],[6,3.69],[8,9.5]],"Jalen Green":[[4,1.9],[6,5.2],[8,12]],"Khaman Maluach":[[4,1.25],[6,2.01],[8,4],[10,7.5],[12,13]],"Miles Bridges":[[4,1.1],[6,1.51],[8,2.81],[10,5.2],[12,11]]},"ast":{"Franz Wagner":[[4,1.06],[6,1.38],[8,2.45],[10,4.8],[12,10],[14,41]],"Devin Booker":[[2,1.03],[4,1.35],[6,2.61],[8,6],[10,12]],"Anthony Black":[[2,1.06],[4,1.58],[6,3.7],[8,9.5]],"Desmond Bane":[[2,1.13],[4,2.08],[6,5.9],[8,14]],"Jase Richardson":[[2,1.3],[4,3.35],[6,10]],"Tristan da Silva":[[2,1.73],[4,6]],"Wendell Carter Jr.":[[2,1.86],[4,7.5]],"Dillon Brooks":[[2,1.35],[4,3.7],[6,11]],"Jalen Green":[[2,1.17],[4,2.44],[6,6.5],[8,17]],"Miles Bridges":[[2,1.22],[4,2.7],[6,7.75]]},"tpm":{"Anthony Black":[[1,1.15],[2,1.77],[3,3.4],[4,7.75],[5,17]],"Desmond Bane":[[1,1.02],[2,1.14],[3,1.51],[4,2.3],[5,4],[6,7],[7,14],[8,26]],"Tristan da Silva":[[1,1.05],[2,1.33],[3,1.96],[4,3.3],[5,6],[6,12],[7,23]],"Franz Wagner":[[1,1.21],[2,2.12],[3,4.5],[4,10.5]],"Jamal Cain":[[1,1.48],[2,3.15],[4,19]],"Jase Richardson":[[1,1.44],[2,3.05]],"Wendell Carter Jr.":[[1,1.62],[2,4]],"Devin Booker":[[1,1.14],[2,1.79],[3,3.45],[4,7.75],[5,17]],"Dillon Brooks":[[1,1.11],[2,1.62],[3,2.9],[4,6],[5,14]],"Jalen Green":[[1,1.11],[2,1.62],[3,2.85],[4,6],[5,14]],"Miles Bridges":[[1,1.1],[2,1.59],[3,2.8],[4,5.75],[5,13],[6,31]]}}},{"awayAbbr":"MIA","homeAbbr":"GSW","date":"2026-11-05","live":false,"url":"https://www.sportsbet.com.au/betting/basketball-us/nba/miami-heat-at-golden-state-warriors-11123369","props":{"pts":{"Bam Adebayo":[[10,1.01],[15,1.14],[20,1.54],[25,2.54],[30,5.2],[35,9.5],[40,15]],"Giannis Antetokounmpo":[[15,1.02],[20,1.13],[25,1.36],[30,1.89],[35,3.05],[40,5.2],[45,9.5],[50,13]],"Brandin Podziemski":[[10,1.11],[15,1.59],[20,3.12],[25,7],[30,14]],"Stephen Curry":[[15,1.03],[20,1.17],[25,1.53],[30,2.42],[35,4.6],[40,8.5],[45,14],[50,67]],"Yaxel Lendeborg":[[10,1.02],[15,1.2],[20,1.81],[25,3.45],[30,7.5],[35,13]],"De'Anthony Melton":[[5,1.1],[10,1.73],[15,4],[20,10]],"Georges Niang":[[5,1.25],[10,2.73],[15,7],[20,21]],"Will Richard":[[5,1.35],[10,3.66],[15,10]],"Draymond Green":[[5,1.52],[10,5.2],[15,15]]},"reb":{"Giannis Antetokounmpo":[[6,1.02],[8,1.11],[10,1.28],[12,1.76],[14,2.86],[16,5.2]],"Bam Adebayo":[[6,1.06],[8,1.28],[10,1.69],[12,2.84],[14,5.2],[16,9.5]],"Yaxel Lendeborg":[[4,1.04],[6,1.3],[8,2.04],[10,3.7],[12,7.5],[14,13]],"Brandin Podziemski":[[4,1.28],[6,2.29],[8,5.4],[10,11]],"Draymond Green":[[4,1.28],[6,2.23],[8,5.2],[10,10]],"De'Anthony Melton":[[4,1.93],[6,5.2],[8,12]],"Georges Niang":[[4,2.04],[6,5.2],[8,12]],"Stephen Curry":[[4,1.87],[6,4.65],[8,12]],"Will Richard":[[4,2.67],[6,8.5]]},"ast":{"Giannis Antetokounmpo":[[4,1.13],[6,1.65],[8,3.28],[10,6],[12,12]],"Bam Adebayo":[[2,1.06],[4,1.65],[6,3.96],[8,9.5]],"Stephen Curry":[[2,1.02],[4,1.3],[6,2.42],[8,5.7],[10,12]],"Brandin Podziemski":[[2,1.06],[4,1.59],[6,3.69],[8,9.5]],"Yaxel Lendeborg":[[2,1.08],[4,1.72],[6,4.3],[8,10]],"De'Anthony Melton":[[2,1.41],[4,3.96],[6,10]]},"tpm":{"Stephen Curry":[[1,1.01],[2,1.05],[3,1.23],[4,1.63],[5,2.4],[6,3.75],[7,6.5],[8,13],[9,23],[10,56]],"Brandin Podziemski":[[1,1.07],[2,1.42],[3,2.35],[4,4.6],[5,9.75],[6,23]],"Bam Adebayo":[[1,1.26],[2,2.2],[3,4.9],[4,13]],"Yaxel Lendeborg":[[1,1.11],[2,1.6],[3,2.9],[4,6.25],[5,14]],"De'Anthony Melton":[[1,1.22],[2,2.03],[3,4.3],[4,10.5],[5,26]],"Georges Niang":[[1,1.25],[2,2.18],[3,4.6],[4,11.5],[5,26]],"Will Richard":[[1,1.33],[2,2.6],[3,6.25],[4,15]]}}}]};

// Market key (as scraped from Sportsbet) -> this tool's own projected-stat field name.
const BETTING_MARKET_STAT = {pts:'pts', reb:'trb', ast:'ast', tpm:'tpm'};
const BETTING_MARKET_LABEL = {pts:'Points', reb:'Rebounds', ast:'Assists', tpm:'Threes'};
// Rough coefficient-of-variation per stat (sd as a fraction of the mean), used only to turn a
// projected mean into a over/under probability for a specific Sportsbet line. These are generic
// game-to-game volatility estimates for an NBA player's box-score stats, not fit to this specific
// player -- good enough to rank "where's the edge", not a claim of statistical precision.
const BETTING_STAT_CV = {pts:0.32, trb:0.38, ast:0.42, tpm:0.62};

// Standard normal CDF via the Abramowitz-Stegun erf approximation (good to ~1e-7).
function erf(x){
  const sign = x < 0 ? -1 : 1; x = Math.abs(x);
  const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
  const t = 1/(1+p*x);
  const y = 1 - (((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);
  return sign*y;
}
function normCdf(z){ return 0.5*(1+erf(z/Math.SQRT2)); }

// P(stat >= line) given a projected mean, using a normal approximation with a continuity
// correction (since "line+" on Sportsbet means "line or more", a discrete count).
function probOverLine(mean, line, statKey){
  const cv = BETTING_STAT_CV[statKey] || 0.4;
  const sd = Math.max(mean*cv, statKey==='pts' ? 2.5 : 1.0);
  const z = (line - 0.5 - mean) / sd;
  const p = 1 - normCdf(z);
  return Math.max(0.01, Math.min(0.99, p));
}

// Strips accents/diacritics, periods, apostrophes and casing so small spelling differences
// between Sportsbet's player names and this tool's own roster don't block a match.
function normName(s){
  return (s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
}
function findPlayerInGame(game, sbName){
  const teams = [game.awayAbbr, game.homeAbbr];
  const target = normName(sbName);
  let candidates = PLAYERS.filter(p=> teams.includes(p.t));
  let hit = candidates.find(p=> normName(p.n)===target);
  if(hit) return hit;
  // fall back to a loose "starts with" match in case one side carries an extra suffix the other lacks
  hit = candidates.find(p=> normName(p.n).startsWith(target) || target.startsWith(normName(p.n)));
  return hit || null;
}

// Builds the real schedule-game object (with its real restDays/b2b) for this player on this date,
// so betting projections run through the exact same computeProjection() as every other tab.
function bettingGameFor(player, bGame){
  const sch = TEAMS[player.t] && TEAMS[player.t].sch.find(g=>g.date===bGame.date);
  return sch || null;
}

// Real (not simulated) teammates currently marked Out on this player's own roster -- the same
// p.inj.status field the injury badges use, kept fresh by the daily update scheduled task.
function bettingOutTeammatesFor(player){
  return playersForTeam(player.t).filter(p => p.id!==player.id && p.inj && p.inj.status==='Out');
}

function bettingProjFor(player, bGame){
  const g = bettingGameFor(player, bGame);
  if(!g) return null;
  const base = computeProjection(player, g, player.t);
  // Automatically factor in real confirmed-Out teammates' vacated minutes/usage (the same
  // usageRedistributionMulti/applyRedistribution model as the Player tab's "teammates OUT"
  // simulator), so a real current injury on this player's own team feeds the betting projection
  // without Damien having to flip the simulator by hand for every matchup.
  const outTeammates = bettingOutTeammatesFor(player);
  if(!outTeammates.length) return base;
  const delta = usageRedistributionMulti(player, outTeammates, player.t);
  if(!delta) return base;
  const adjusted = applyRedistribution(base, delta);
  adjusted.outContext = {names: outTeammates.map(p=>p.n), shareText: shareSummaryText(delta)};
  return adjusted;
}

// Flattens the full BETTING_SLATE into one row per (game, market, player, line) -- this is the
// complete dataset every Sportsbet line rolls up into; nothing is dropped here, only the
// "Best Plays" view below filters/sorts a copy of it for display.
function bettingAllRows(){
  const rows = [];
  BETTING_SLATE.games.forEach((bGame, gameIdx)=>{
    Object.entries(bGame.props).forEach(([market, players])=>{
      const statKey = BETTING_MARKET_STAT[market];
      Object.entries(players).forEach(([sbName, rungs])=>{
        const player = findPlayerInGame(bGame, sbName);
        const proj = player ? bettingProjFor(player, bGame) : null;
        const statVal = proj ? proj[statKey] : null;
        rungs.forEach(([line, odds])=>{
          const impliedProb = 1/odds;
          const ourProb = statVal!==null ? probOverLine(statVal, line, statKey) : null;
          const edge = ourProb!==null ? ourProb - impliedProb : null;
          rows.push({gameIdx, bGame, market, statKey, sbName, player, proj, statVal, line, odds, impliedProb, ourProb, edge});
        });
      });
    });
  });
  return rows;
}

function pctStr(p){ return p===null||p===undefined ? '—' : fmt(p*100,0)+'%'; }

function bettingMatchupLabel(bGame){
  const away = TEAMS[bGame.awayAbbr] ? TEAMS[bGame.awayAbbr].name : bGame.awayAbbr;
  const home = TEAMS[bGame.homeAbbr] ? TEAMS[bGame.homeAbbr].name : bGame.homeAbbr;
  return `${away} @ ${home}`;
}

// ---------- BEST PLAYS (additive ranking on top of the full dataset below -- never a substitute) ----------
function renderBestPlays(){
  const scope = bestPlaysGameSelect.value;
  const scoped = scope !== 'all' && scope !== '' && scope !== undefined;
  let rows = bettingAllRows().filter(r=> r.edge!==null);
  if(scoped) rows = rows.filter(r=> String(r.gameIdx) === scope);
  rows.sort((a,b)=> b.edge - a.edge);
  const limit = scoped ? 15 : 20;
  let top = rows.filter(r=> r.edge >= 0.05 && r.odds >= 1.25 && r.odds <= 15).slice(0, limit);
  // A single game has far fewer rows than the whole slate -- if nothing clears the
  // sitewide 5pp "standout" bar, still surface the game's best available edges rather
  // than showing an empty panel, clearly labeled as below the usual bar.
  let belowBar = false;
  if(scoped && !top.length && rows.length){
    top = rows.slice(0, 10);
    belowBar = true;
  }
  if(!top.length){
    document.getElementById('bestPlaysOut').innerHTML = '<div class="small-muted">No standout edges found in the current slate/odds.</div>';
    return;
  }
  const bodyRows = top.map(r=>{
    const edgeCls = r.edge >= 0.12 ? 'edge-pos' : (r.edge >= 0.05 ? 'edge-flat' : 'edge-neg');
    return `<tr>
      <td class="name-cell">${r.player.n} <span class="small-muted">(${r.player.t})</span>${r.proj && r.proj.outContext ? ` <span class="badge inj-q" title="Teammate(s) currently Out: ${r.proj.outContext.names.join(', ')} -- ${r.proj.outContext.shareText} of their production redistributed into this projection">+OUT</span>` : ''}</td>
      <td>${bettingMatchupLabel(r.bGame)}</td>
      <td>${BETTING_MARKET_LABEL[r.market]} ${r.line}+</td>
      <td>${oppRankBadge(r.player.t===r.bGame.homeAbbr ? r.bGame.awayAbbr : r.bGame.homeAbbr, r.player.pos)}</td>
      <td>${fmt(r.statVal,1)}</td>
      <td>${fmt(r.odds,2)}</td>
      <td>${pctStr(r.impliedProb)}</td>
      <td>${pctStr(r.ourProb)}</td>
      <td class="${edgeCls}">${r.edge>=0?'+':''}${fmt(r.edge*100,1)}pp</td>
    </tr>`;
  }).join('');
  const belowBarNote = belowBar ? '<div class="small-muted" style="margin-bottom:6px">No edge in this game cleared the usual 5pp "standout" bar -- showing this game\'s best available edges instead.</div>' : '';
  document.getElementById('bestPlaysOut').innerHTML = `${belowBarNote}<div class="table-wrap"><table>
    <thead><tr><th class="name-cell">Player</th><th>Game</th><th>Market</th><th>Opp Rk vPos</th><th>Our Proj</th><th>Odds</th><th>Implied%</th><th>Our Prob%</th><th>Edge</th></tr></thead>
    <tbody>${bodyRows}</tbody>
  </table></div>`;
}

// ---------- FULL LADDERS (every player, every line Sportsbet publishes -- the complete dataset) ----------
const bettingGameSelect = document.getElementById('bettingGameSelect');
const bettingMarketSelect = document.getElementById('bettingMarketSelect');
const bestPlaysGameSelect = document.getElementById('bestPlaysGameSelect');
function populateBettingGameSelect(){
  const gameOptions = BETTING_SLATE.games.map((g,i)=>`<option value="${i}">${bettingMatchupLabel(g)}${g.live?' (live at scrape)':''}</option>`).join('');
  bettingGameSelect.innerHTML = gameOptions;
  bestPlaysGameSelect.innerHTML = `<option value="all">All Games (Best Plays Today)</option>` + gameOptions;
}
function renderBettingLadders(){
  const gameIdx = parseInt(bettingGameSelect.value);
  const market = bettingMarketSelect.value;
  const bGame = BETTING_SLATE.games[gameIdx];
  if(!bGame){ document.getElementById('bettingLaddersOut').innerHTML=''; return; }
  const players = bGame.props[market] || {};
  const statKey = BETTING_MARKET_STAT[market];
  const blocks = Object.entries(players).map(([sbName, rungs])=>{
    const player = findPlayerInGame(bGame, sbName);
    const proj = player ? bettingProjFor(player, bGame) : null;
    const statVal = proj ? proj[statKey] : null;
    const oppAbbr = player ? (player.t===bGame.homeAbbr ? bGame.awayAbbr : bGame.homeAbbr) : null;
    const rowsHtml = rungs.map(([line, odds])=>{
      const impliedProb = 1/odds;
      const ourProb = statVal!==null ? probOverLine(statVal, line, statKey) : null;
      const edge = ourProb!==null ? ourProb - impliedProb : null;
      const edgeCls = edge===null ? '' : (edge>=0.05 ? 'edge-pos' : (edge<=-0.05 ? 'edge-neg' : 'edge-flat'));
      return `<tr>
        <td>${line}+</td>
        <td>${fmt(odds,2)}</td>
        <td>${pctStr(impliedProb)}</td>
        <td>${pctStr(ourProb)}</td>
        <td class="${edgeCls}">${edge===null?'—':(edge>=0?'+':'')+fmt(edge*100,1)+'pp'}</td>
      </tr>`;
    }).join('');
    const outNote = (proj && proj.outContext) ? ` <span class="small-muted">(teammate(s) Out -- ${proj.outContext.names.join(', ')} -- ${proj.outContext.shareText} of their production redistributed in)</span>` : '';
    const header = player
      ? `${player.n} <span class="small-muted">(${player.t}, ${player.pos})</span> ${injuryBadgeShort(player)} — proj ${fmt(statVal,1)} ${BETTING_MARKET_LABEL[market].toLowerCase()} ${oppRankBadge(oppAbbr, player.pos)}${outNote}`
      : `${sbName} <span class="small-muted">(not in this tool's player database — raw Sportsbet odds shown, no projection/edge)</span>`;
    return `<div class="panel" style="margin-top:10px">
      <div style="margin-bottom:6px">${header}</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Line</th><th>Odds</th><th>Implied%</th><th>Our Prob%</th><th>Edge</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table></div>
    </div>`;
  }).join('');
  document.getElementById('bettingLaddersOut').innerHTML = blocks || '<div class="small-muted">No props for this market in this game.</div>';
}
bettingGameSelect.addEventListener('change', renderBettingLadders);
bettingMarketSelect.addEventListener('change', renderBettingLadders);
bestPlaysGameSelect.addEventListener('change', renderBestPlays);
populateBettingGameSelect();
renderBettingLadders();
renderBestPlays();
document.getElementById('bettingAsOf').textContent = `Odds as of ${BETTING_SLATE.asOf} · ${BETTING_SLATE.source}`;

