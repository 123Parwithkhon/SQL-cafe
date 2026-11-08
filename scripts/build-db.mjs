// scripts/build-db.mjs — собирает учебные базы и проверяет целостность данных:
//   public/chaikhana.sqlite ← db/schema.sql + db/seed.sql          (основной курс)
//   public/bazaar.sqlite    ← db/bazaar-schema.sql + db/bazaar-seed.sql (финальный экзамен)
//   public/maktab.sqlite, safar.sqlite, liga.sqlite ← db/<имя>-schema.sql + db/<имя>-seed.sql (практикумы)
// Запуск: npm run db:seed
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, rmSync, mkdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public');

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

// Проверки, общие для любой базы: [описание, SQL, ожидание]
const COMMON = [
  ['integrity_check', 'PRAGMA integrity_check', (v) => v === 'ok'],
  ['внешние ключи целы', 'SELECT COUNT(*) FROM pragma_foreign_key_check', (v) => v === 0],
];

const DATABASES = [
  {
    file: 'chaikhana.sqlite',
    title: 'Чайхана',
    sources: ['schema.sql', 'seed.sql'],
    checks: [
      ['visitors: 30–50 строк', 'SELECT COUNT(*) FROM visitors', (v) => v >= 30 && v <= 50],
      ['tables: 30–50 строк', 'SELECT COUNT(*) FROM tables', (v) => v >= 30 && v <= 50],
      ['teas: 30–50 строк', 'SELECT COUNT(*) FROM teas', (v) => v >= 30 && v <= 50],
      ['orders: 30–50 строк', 'SELECT COUNT(*) FROM orders', (v) => v >= 30 && v <= 50],
      ['в каждом заказе есть позиции',
        'SELECT COUNT(*) FROM orders o WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id)', (v) => v === 0],
      ['orders.total совпадает с позициями',
        `SELECT COUNT(*) FROM orders o
         WHERE o.total <> (SELECT SUM(oi.quantity * t.price) FROM order_items oi JOIN teas t ON t.id = oi.tea_id WHERE oi.order_id = o.id)`,
        (v) => v === 0],
      ['есть NULL в age', 'SELECT COUNT(*) FROM visitors WHERE age IS NULL', (v) => v > 0],
      ['есть NULL в city', 'SELECT COUNT(*) FROM visitors WHERE city IS NULL', (v) => v > 0],
      ['есть посетители без заказов',
        'SELECT COUNT(*) FROM visitors v LEFT JOIN orders o ON o.visitor_id = v.id WHERE o.id IS NULL', (v) => v > 0],
      ['есть столики без заказов',
        'SELECT COUNT(*) FROM tables t LEFT JOIN orders o ON o.table_id = t.id WHERE o.id IS NULL', (v) => v > 0],
      ['есть незаказанные чаи',
        'SELECT COUNT(*) FROM teas t LEFT JOIN order_items oi ON oi.tea_id = t.id WHERE oi.order_id IS NULL', (v) => v > 0],
      ['есть оба типа чая', 'SELECT COUNT(DISTINCT type) FROM teas', (v) => v === 2],
    ],
  },
  {
    file: 'bazaar.sqlite',
    title: 'Бозор',
    sources: ['bazaar-schema.sql', 'bazaar-seed.sql'],
    checks: [
      ['vendors: 10+ строк', 'SELECT COUNT(*) FROM vendors', (v) => v >= 10],
      ['products: 20+ строк', 'SELECT COUNT(*) FROM products', (v) => v >= 20],
      ['sales: 50+ строк', 'SELECT COUNT(*) FROM sales', (v) => v >= 50],
      ['все 4 базара', 'SELECT COUNT(DISTINCT bazaar) FROM vendors', (v) => v === 4],
      ['все 4 категории', 'SELECT COUNT(DISTINCT category) FROM products', (v) => v === 4],
      ['есть продавец без продаж',
        'SELECT COUNT(*) FROM vendors v LEFT JOIN sales s ON s.vendor_id = v.id WHERE s.id IS NULL', (v) => v > 0],
      ['есть непроданный товар',
        'SELECT COUNT(*) FROM products p LEFT JOIN sales s ON s.product_id = p.id WHERE s.id IS NULL', (v) => v > 0],
      ['есть NULL в since', 'SELECT COUNT(*) FROM vendors WHERE since IS NULL', (v) => v > 0],
    ],
  },
  {
    file: 'maktab.sqlite',
    title: 'Мактаб',
    sources: ['maktab-schema.sql', 'maktab-seed.sql'],
    checks: [
      ['students: 30', 'SELECT COUNT(*) FROM students', (v) => v === 30],
      ['grades: 150+', 'SELECT COUNT(*) FROM grades', (v) => v >= 150],
      ['есть круглые отличники', 'SELECT COUNT(*) FROM (SELECT student_id FROM grades GROUP BY student_id HAVING MIN(grade) = 5)', (v) => v >= 2],
      ['есть ученики с 2+ двойками', 'SELECT COUNT(*) FROM (SELECT student_id FROM grades GROUP BY student_id HAVING SUM(grade = 2) >= 2)', (v) => v >= 2],
      ['есть NULL в phone', 'SELECT COUNT(*) FROM students WHERE phone IS NULL', (v) => v > 0],
      ['есть предмет без оценок',
        'SELECT COUNT(*) FROM subjects s LEFT JOIN grades g ON g.subject_id = s.id WHERE g.id IS NULL', (v) => v > 0],
    ],
  },
  {
    file: 'safar.sqlite',
    title: 'Сафар',
    sources: ['safar-schema.sql', 'safar-seed.sql'],
    checks: [
      ['routes: 15+', 'SELECT COUNT(*) FROM routes', (v) => v >= 15],
      ['trips: 50+', 'SELECT COUNT(*) FROM trips', (v) => v >= 50],
      ['есть рейсы без билетов',
        'SELECT COUNT(*) FROM trips t WHERE NOT EXISTS (SELECT 1 FROM tickets k WHERE k.trip_id = t.id)', (v) => v > 0],
      ['есть города без маршрутов',
        'SELECT COUNT(*) FROM cities c WHERE NOT EXISTS (SELECT 1 FROM routes r WHERE r.from_city_id = c.id OR r.to_city_id = c.id)', (v) => v > 0],
      ['места на рейсе не превышены',
        'SELECT COUNT(*) FROM trips t WHERE (SELECT COUNT(*) FROM tickets k WHERE k.trip_id = t.id) > t.seats', (v) => v === 0],
    ],
  },
  {
    file: 'liga.sqlite',
    title: 'Лига',
    sources: ['liga-schema.sql', 'liga-seed.sql'],
    checks: [
      ['30 матчей', 'SELECT COUNT(*) FROM matches', (v) => v === 30],
      ['счёт совпадает с голами',
        `SELECT COUNT(*) FROM matches m WHERE m.home_goals + m.away_goals <> (SELECT COUNT(*) FROM goals g WHERE g.match_id = m.id)`, (v) => v === 0],
      ['голы хозяев забиты игроками хозяев',
        `SELECT COUNT(*) FROM matches m WHERE m.home_goals <> (SELECT COUNT(*) FROM goals g JOIN players p ON p.id = g.player_id WHERE g.match_id = m.id AND p.team_id = m.home_id)`, (v) => v === 0],
      ['каждая команда сыграла 10 матчей',
        'SELECT COUNT(*) FROM teams t WHERE (SELECT COUNT(*) FROM matches m WHERE t.id IN (m.home_id, m.away_id)) <> 10', (v) => v === 0],
    ],
  },
];

mkdirSync(outDir, { recursive: true });

for (const { file, title, sources, checks } of DATABASES) {
  const outPath = path.join(outDir, file);
  rmSync(outPath, { force: true });
  const db = new DatabaseSync(outPath);

  try {
    const [schema, seed] = sources.map((f) => readFileSync(path.join(root, 'db', f), 'utf8'));
    db.exec(schema);
    db.exec('BEGIN');
    db.exec(seed);
    db.exec('COMMIT');
  } catch (err) {
    if (db.isTransaction) db.exec('ROLLBACK');
    db.close();
    rmSync(outPath, { force: true });
    fail(`Ошибка SQL в базе «${title}»: ${err.message}`);
  }

  const one = (sql) => Object.values(db.prepare(sql).get())[0];
  console.log(`Проверка базы «${title}»:`);
  let failed = 0;
  for (const [label, sql, ok] of [...COMMON, ...checks]) {
    const value = one(sql);
    const passed = ok(value);
    if (!passed) failed++;
    console.log(`  ${passed ? '✓' : '✗'} ${label} (${value})`);
  }
  db.exec('VACUUM');
  db.close();

  if (failed > 0) {
    rmSync(outPath, { force: true });
    fail(`База «${title}»: проверок провалено: ${failed}. Файл удалён.`);
  }
  console.log(`✓ public/${file} (${(statSync(outPath).size / 1024).toFixed(1)} КБ)\n`);
}
