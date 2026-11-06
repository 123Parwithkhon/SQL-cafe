-- db/bazaar-schema.sql — вторая учебная база «Бозор» для финального экзамена.
-- Студент её не видел: экзамен проверяет, что он понял SQL, а не выучил «Чайхану».

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS vendors;

-- Продавцы. since — год, с которого торгует (может быть NULL)
CREATE TABLE vendors (
  id     INTEGER PRIMARY KEY,
  name   TEXT    NOT NULL CHECK (length(trim(name)) > 0),
  bazaar TEXT    NOT NULL CHECK (bazaar IN ('Корвон', 'Шохмансур', 'Панчшанбе', 'Мехргон')),
  since  INTEGER CHECK (since BETWEEN 1970 AND 2026)
);

-- Товары. Цена в сомони за единицу (unit)
CREATE TABLE products (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('фрукты', 'овощи', 'сухофрукты', 'специи')),
  unit     TEXT NOT NULL CHECK (unit IN ('кг', 'пучок', 'шт')),
  price    REAL NOT NULL CHECK (price > 0)
);

-- Продажи: кто, что, когда и сколько (qty — в единицах товара)
CREATE TABLE sales (
  id         INTEGER PRIMARY KEY,
  vendor_id  INTEGER NOT NULL REFERENCES vendors(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  sale_date  TEXT    NOT NULL CHECK (sale_date = date(sale_date)),
  qty        REAL    NOT NULL CHECK (qty > 0)
);

CREATE INDEX idx_sales_vendor  ON sales(vendor_id);
CREATE INDEX idx_sales_product ON sales(product_id);
