// lib/schema.ts — учебные базы: структура для автодополнения, справки и ER-схемы.
// Должна совпадать с db/schema.sql и db/bazaar-schema.sql.

export type DbName = 'chaikhana' | 'bazaar';
export const DB_NAMES: DbName[] = ['chaikhana', 'bazaar'];
export const DEFAULT_DB: DbName = 'chaikhana';

export const isDbName = (v: unknown): v is DbName => v === 'chaikhana' || v === 'bazaar';

/** Файл базы в public/ (браузер загружает его, сервер читает с диска) */
export const DB_FILES: Record<DbName, string> = { chaikhana: 'chaikhana.sqlite', bazaar: 'bazaar.sqlite' };

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
};

/** Совместимость со старым кодом */
export const CHAIKHANA_SCHEMA = SCHEMAS.chaikhana;
