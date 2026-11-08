-- db/safar-schema.sql — учебная база «Сафар»: междугородние автобусы по Таджикистану.
-- Города, маршруты между ними, рейсы и купленные билеты.

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS cities;

-- Города и их регион (Душанбе, РРП, Согд, Хатлон, ГБАО)
CREATE TABLE cities (
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL UNIQUE,
  region TEXT NOT NULL CHECK (region IN ('Душанбе', 'РРП', 'Согд', 'Хатлон', 'ГБАО'))
);

-- Маршрут: из какого города в какой, расстояние и цена билета в сомони
CREATE TABLE routes (
  id           INTEGER PRIMARY KEY,
  from_city_id INTEGER NOT NULL REFERENCES cities(id),
  to_city_id   INTEGER NOT NULL REFERENCES cities(id),
  distance_km  INTEGER NOT NULL CHECK (distance_km > 0),
  price        REAL    NOT NULL CHECK (price > 0),
  CHECK (from_city_id <> to_city_id)
);

-- Рейс: маршрут, время отправления ('ГГГГ-ММ-ДД ЧЧ:ММ'), автобус и число мест
CREATE TABLE trips (
  id        INTEGER PRIMARY KEY,
  route_id  INTEGER NOT NULL REFERENCES routes(id),
  depart_at TEXT    NOT NULL,
  bus       TEXT    NOT NULL,
  seats     INTEGER NOT NULL CHECK (seats > 0)
);

-- Билет: рейс, пассажир и место
CREATE TABLE tickets (
  id        INTEGER PRIMARY KEY,
  trip_id   INTEGER NOT NULL REFERENCES trips(id),
  passenger TEXT    NOT NULL,
  seat      INTEGER NOT NULL CHECK (seat > 0),
  UNIQUE (trip_id, seat)
);

CREATE INDEX idx_routes_from   ON routes(from_city_id);
CREATE INDEX idx_routes_to     ON routes(to_city_id);
CREATE INDEX idx_trips_route   ON trips(route_id);
CREATE INDEX idx_tickets_trip  ON tickets(trip_id);
