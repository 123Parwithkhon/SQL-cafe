// lib/schema.ts — учебные базы: структура для автодополнения, справки и ER-схемы.
// Должна совпадать с db/*-schema.sql.

export type DbName = 'chaikhana' | 'bazaar' | 'maktab' | 'safar' | 'liga';
export const DB_NAMES: DbName[] = ['chaikhana', 'bazaar', 'maktab', 'safar', 'liga'];
export const DEFAULT_DB: DbName = 'chaikhana';

export const isDbName = (v: unknown): v is DbName => DB_NAMES.includes(v as DbName);

/** Файл базы в public/ (браузер загружает его, сервер читает с диска) */
export const DB_FILES: Record<DbName, string> = {
  chaikhana: 'chaikhana.sqlite',
  bazaar: 'bazaar.sqlite',
  maktab: 'maktab.sqlite',
  safar: 'safar.sqlite',
  liga: 'liga.sqlite',
};

export const SCHEMAS: Record<DbName, Record<string, string[]>> = {
  chaikhana: {
    visitors: ['id', 'name', 'age', 'city'],
    tables: ['id', 'seats', 'by_window'],
    teas: ['id', 'name', 'type', 'price'],
    orders: ['id', 'visitor_id', 'table_id', 'order_date', 'total'],
    order_items: ['order_id', 'tea_id', 'quantity'],
  },
  bazaar: {
    vendors: ['id', 'name', 'bazaar', 'since'],
    products: ['id', 'name', 'category', 'unit', 'price'],
    sales: ['id', 'vendor_id', 'product_id', 'sale_date', 'qty'],
  },
  maktab: {
    classes: ['id', 'name', 'teacher'],
    students: ['id', 'name', 'class_id', 'gender', 'birth_date', 'phone'],
    subjects: ['id', 'name', 'hours_per_week'],
    grades: ['id', 'student_id', 'subject_id', 'grade', 'graded_on'],
  },
  safar: {
    cities: ['id', 'name', 'region'],
    routes: ['id', 'from_city_id', 'to_city_id', 'distance_km', 'price'],
    trips: ['id', 'route_id', 'depart_at', 'bus', 'seats'],
    tickets: ['id', 'trip_id', 'passenger', 'seat'],
  },
  liga: {
    teams: ['id', 'name', 'city', 'founded'],
    players: ['id', 'team_id', 'name', 'position', 'birth_year'],
    matches: ['id', 'round', 'match_date', 'home_id', 'away_id', 'home_goals', 'away_goals'],
    goals: ['id', 'match_id', 'player_id', 'minute'],
  },
};

/** Совместимость со старым кодом */
export const CHAIKHANA_SCHEMA = SCHEMAS.chaikhana;
