-- db/schema.sql — учебная база «Чайхана» (SQLite / sql.js)
-- Пересоздаёт все таблицы с нуля. Запуск: npm run db:seed

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS teas;
DROP TABLE IF EXISTS tables;
DROP TABLE IF EXISTS visitors;

-- Посетители. age и city могут быть NULL (нужно для заданий на IS NULL)
CREATE TABLE visitors (
  id    INTEGER PRIMARY KEY,
  name  TEXT    NOT NULL CHECK (length(trim(name)) > 0),
  age   INTEGER CHECK (age BETWEEN 7 AND 120),
  city  TEXT
);

-- Столики. by_window: 1 — у окна, 0 — нет (в SQLite нет типа BOOLEAN)
CREATE TABLE tables (
  id        INTEGER PRIMARY KEY,
  seats     INTEGER NOT NULL CHECK (seats BETWEEN 1 AND 20),
  by_window INTEGER NOT NULL DEFAULT 0 CHECK (by_window IN (0, 1))
);

-- Чаи. Цена в сомони, кратна 0.5 — суммы считаются без ошибок округления
CREATE TABLE teas (
  id    INTEGER PRIMARY KEY,
  name  TEXT    NOT NULL UNIQUE,
  type  TEXT    NOT NULL CHECK (type IN ('зеленый', 'черный')),
  price REAL    NOT NULL CHECK (price > 0)
);

-- Заказы. total = сумма quantity * price по позициям (пересчитывается в seed.sql)
CREATE TABLE orders (
  id         INTEGER PRIMARY KEY,
  visitor_id INTEGER NOT NULL REFERENCES visitors(id),
  table_id   INTEGER NOT NULL REFERENCES tables(id),
  order_date TEXT    NOT NULL CHECK (order_date = date(order_date)),
  total      REAL    NOT NULL DEFAULT 0 CHECK (total >= 0)
);

-- Состав заказа: один чай в заказе встречается один раз
CREATE TABLE order_items (
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tea_id   INTEGER NOT NULL REFERENCES teas(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (order_id, tea_id)
);

CREATE INDEX idx_orders_visitor   ON orders(visitor_id);
CREATE INDEX idx_orders_table     ON orders(table_id);
CREATE INDEX idx_order_items_tea  ON order_items(tea_id);
