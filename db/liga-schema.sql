-- db/liga-schema.sql — учебная база «Лига»: футбольный чемпионат (клубы вымышленные).
-- Команды, игроки, матчи двухкругового турнира и забитые голы.

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS goals;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS teams;

-- Команды: название, город и год основания
CREATE TABLE teams (
  id      INTEGER PRIMARY KEY,
  name    TEXT    NOT NULL UNIQUE,
  city    TEXT    NOT NULL,
  founded INTEGER NOT NULL CHECK (founded BETWEEN 1900 AND 2026)
);

-- Игроки. position: вратарь, защитник, полузащитник, нападающий
CREATE TABLE players (
  id         INTEGER PRIMARY KEY,
  team_id    INTEGER NOT NULL REFERENCES teams(id),
  name       TEXT    NOT NULL,
  position   TEXT    NOT NULL CHECK (position IN ('вратарь', 'защитник', 'полузащитник', 'нападающий')),
  birth_year INTEGER NOT NULL
);

-- Матчи: тур, дата, хозяева (home), гости (away) и счёт
CREATE TABLE matches (
  id         INTEGER PRIMARY KEY,
  round      INTEGER NOT NULL CHECK (round > 0),
  match_date TEXT    NOT NULL CHECK (match_date = date(match_date)),
  home_id    INTEGER NOT NULL REFERENCES teams(id),
  away_id    INTEGER NOT NULL REFERENCES teams(id),
  home_goals INTEGER NOT NULL CHECK (home_goals >= 0),
  away_goals INTEGER NOT NULL CHECK (away_goals >= 0),
  CHECK (home_id <> away_id)
);

-- Голы: в каком матче, кто забил и на какой минуте
CREATE TABLE goals (
  id        INTEGER PRIMARY KEY,
  match_id  INTEGER NOT NULL REFERENCES matches(id),
  player_id INTEGER NOT NULL REFERENCES players(id),
  minute    INTEGER NOT NULL CHECK (minute BETWEEN 1 AND 90)
);

CREATE INDEX idx_players_team  ON players(team_id);
CREATE INDEX idx_matches_home  ON matches(home_id);
CREATE INDEX idx_matches_away  ON matches(away_id);
CREATE INDEX idx_goals_match   ON goals(match_id);
CREATE INDEX idx_goals_player  ON goals(player_id);
