// ER-схема учебной базы: таблицы, первичные (PK) и внешние (FK) ключи, связи.
// highlight — таблицы задания подсвечиваются, остальные приглушены.
// Чистый SVG: без библиотек, чётко на любом экране, на телефоне — горизонтальная прокрутка.
import { SCHEMAS, type DbName } from '@/lib/schema';

const BOX_W = 150;
const HEAD_H = 28;
const ROW_H = 22;

type Link = { from: [string, string]; to: [string, string]; d: string };
type Diagram = {
  layout: Record<string, { x: number; y: number }>;
  pk: Record<string, string[]>;
  fk: Record<string, string[]>;
  links: (rowY: (t: string, c: string) => number, left: (t: string) => number, right: (t: string) => number) => Link[];
};

const DIAGRAMS: Record<DbName, Diagram> = {
  chaikhana: {
    // Связующие orders и order_items — в центре
    layout: {
      visitors: { x: 20, y: 20 },
      orders: { x: 210, y: 20 },
      tables: { x: 20, y: 230 },
      order_items: { x: 210, y: 230 },
      teas: { x: 400, y: 230 },
    },
    pk: { visitors: ['id'], tables: ['id'], teas: ['id'], orders: ['id'], order_items: ['order_id', 'tea_id'] },
    fk: { orders: ['visitor_id', 'table_id'], order_items: ['order_id', 'tea_id'] },
    // Линии подобраны так, чтобы не пересекаться
    links: (rowY, left, right) => [
      { from: ['orders', 'visitor_id'], to: ['visitors', 'id'], d: `M${left('orders')},${rowY('orders', 'visitor_id')} H190 V${rowY('visitors', 'id')} H${right('visitors')}` },
      { from: ['orders', 'table_id'], to: ['tables', 'id'], d: `M${left('orders')},${rowY('orders', 'table_id')} H185 V${rowY('tables', 'id')} H${right('tables')}` },
      { from: ['order_items', 'order_id'], to: ['orders', 'id'], d: `M${right('order_items')},${rowY('order_items', 'order_id')} H380 V${rowY('orders', 'id')} H${right('orders')}` },
      { from: ['order_items', 'tea_id'], to: ['teas', 'id'], d: `M${right('order_items')},${rowY('order_items', 'tea_id')} H390 V${rowY('teas', 'id')} H${left('teas')}` },
    ],
  },
  bazaar: {
    layout: { vendors: { x: 20, y: 20 }, sales: { x: 210, y: 20 }, products: { x: 400, y: 20 } },
    pk: { vendors: ['id'], products: ['id'], sales: ['id'] },
    fk: { sales: ['vendor_id', 'product_id'] },
    links: (rowY, left, right) => [
      { from: ['sales', 'vendor_id'], to: ['vendors', 'id'], d: `M${left('sales')},${rowY('sales', 'vendor_id')} H190 V${rowY('vendors', 'id')} H${right('vendors')}` },
      { from: ['sales', 'product_id'], to: ['products', 'id'], d: `M${right('sales')},${rowY('sales', 'product_id')} H380 V${rowY('products', 'id')} H${left('products')}` },
    ],
  },
  maktab: {
    // Цепочка слева направо: классы ← ученики ← оценки → предметы
    layout: { classes: { x: 20, y: 20 }, students: { x: 210, y: 20 }, grades: { x: 400, y: 20 }, subjects: { x: 590, y: 20 } },
    pk: { classes: ['id'], students: ['id'], subjects: ['id'], grades: ['id'] },
    fk: { students: ['class_id'], grades: ['student_id', 'subject_id'] },
    links: (rowY, left, right) => [
      { from: ['students', 'class_id'], to: ['classes', 'id'], d: `M${left('students')},${rowY('students', 'class_id')} H190 V${rowY('classes', 'id')} H${right('classes')}` },
      { from: ['grades', 'student_id'], to: ['students', 'id'], d: `M${left('grades')},${rowY('grades', 'student_id')} H380 V${rowY('students', 'id')} H${right('students')}` },
      { from: ['grades', 'subject_id'], to: ['subjects', 'id'], d: `M${right('grades')},${rowY('grades', 'subject_id')} H570 V${rowY('subjects', 'id')} H${left('subjects')}` },
    ],
  },
  safar: {
    // Маршрут ссылается на города дважды: откуда и куда
    layout: { cities: { x: 20, y: 20 }, routes: { x: 210, y: 20 }, trips: { x: 400, y: 20 }, tickets: { x: 590, y: 20 } },
    pk: { cities: ['id'], routes: ['id'], trips: ['id'], tickets: ['id'] },
    fk: { routes: ['from_city_id', 'to_city_id'], trips: ['route_id'], tickets: ['trip_id'] },
    links: (rowY, left, right) => [
      { from: ['routes', 'from_city_id'], to: ['cities', 'id'], d: `M${left('routes')},${rowY('routes', 'from_city_id')} H192 V${rowY('cities', 'id')} H${right('cities')}` },
      { from: ['routes', 'to_city_id'], to: ['cities', 'id'], d: `M${left('routes')},${rowY('routes', 'to_city_id')} H184 V${rowY('cities', 'id') + 4} H${right('cities')}` },
      { from: ['trips', 'route_id'], to: ['routes', 'id'], d: `M${left('trips')},${rowY('trips', 'route_id')} H380 V${rowY('routes', 'id')} H${right('routes')}` },
      { from: ['tickets', 'trip_id'], to: ['trips', 'id'], d: `M${left('tickets')},${rowY('tickets', 'trip_id')} H570 V${rowY('trips', 'id')} H${right('trips')}` },
    ],
  },
  liga: {
    // Матч ссылается на команды дважды: хозяева и гости
    layout: { teams: { x: 20, y: 20 }, players: { x: 210, y: 20 }, matches: { x: 210, y: 190 }, goals: { x: 400, y: 20 } },
    pk: { teams: ['id'], players: ['id'], matches: ['id'], goals: ['id'] },
    fk: { players: ['team_id'], matches: ['home_id', 'away_id'], goals: ['match_id', 'player_id'] },
    links: (rowY, left, right) => [
      { from: ['players', 'team_id'], to: ['teams', 'id'], d: `M${left('players')},${rowY('players', 'team_id')} H192 V${rowY('teams', 'id')} H${right('teams')}` },
      { from: ['matches', 'home_id'], to: ['teams', 'id'], d: `M${left('matches')},${rowY('matches', 'home_id')} H186 V${rowY('teams', 'id') + 4} H${right('teams')}` },
      { from: ['matches', 'away_id'], to: ['teams', 'id'], d: `M${left('matches')},${rowY('matches', 'away_id')} H180 V${rowY('teams', 'id') + 8} H${right('teams')}` },
      { from: ['goals', 'player_id'], to: ['players', 'id'], d: `M${left('goals')},${rowY('goals', 'player_id')} H380 V${rowY('players', 'id')} H${right('players')}` },
      { from: ['goals', 'match_id'], to: ['matches', 'id'], d: `M${left('goals')},${rowY('goals', 'match_id')} H390 V${rowY('matches', 'id')} H${right('matches')}` },
    ],
  },
};

export function ErSchema({ db = 'chaikhana', highlight = [], title }: { db?: DbName; highlight?: string[]; title: string }) {
  const schema = SCHEMAS[db];
  const { layout, pk, fk, links } = DIAGRAMS[db];
  const rowY = (t: string, c: string) => layout[t].y + HEAD_H + schema[t].indexOf(c) * ROW_H + ROW_H / 2;
  const left = (t: string) => layout[t].x;
  const right = (t: string) => layout[t].x + BOX_W;
  const active = (t: string) => highlight.length === 0 || highlight.includes(t);
  const height = Math.max(...Object.keys(layout).map((t) => layout[t].y + HEAD_H + schema[t].length * ROW_H)) + 20;
  const markerId = `er-arrow-${db}`;
  const width = Math.max(...Object.values(layout).map((p) => p.x + BOX_W)) + 20;

  return (
    <div className="result-scroll rounded-xl border border-cream-dark bg-white/70">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="block w-full font-mono lg:min-w-0" style={{ minWidth: Math.round(width * 0.9) }}>
        <title>{title}</title>
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#5b6573" />
          </marker>
        </defs>

        {links(rowY, left, right).map((link) => {
          const on = active(link.from[0]) && active(link.to[0]);
          return (
            <path
              key={link.d}
              d={link.d}
              fill="none"
              stroke={on ? '#c8552c' : '#b9b3a8'}
              strokeWidth={on ? 1.8 : 1.2}
              strokeDasharray={on ? undefined : '4 3'}
              markerEnd={`url(#${markerId})`}
            />
          );
        })}

        {Object.entries(layout).map(([table, { x, y }]) => {
          const on = active(table);
          const columns = schema[table];
          return (
            <g key={table} opacity={on ? 1 : 0.55}>
              <rect x={x} y={y} width={BOX_W} height={HEAD_H + columns.length * ROW_H} rx="8" fill="#fffdf8" stroke={on ? '#c8552c' : '#cfc6b6'} strokeWidth={on ? 1.6 : 1} />
              <path d={`M${x},${y + HEAD_H} V${y + 8} Q${x},${y} ${x + 8},${y} H${x + BOX_W - 8} Q${x + BOX_W},${y} ${x + BOX_W},${y + 8} V${y + HEAD_H} Z`} fill={on ? '#1d3557' : '#8b94a3'} />
              <text x={x + 10} y={y + 19} fill="#f5ede0" fontSize="13" fontWeight="700">{table}</text>
              {columns.map((column, i) => {
                const cy = y + HEAD_H + i * ROW_H;
                const isPk = pk[table]?.includes(column);
                const isFk = fk[table]?.includes(column);
                return (
                  <g key={column}>
                    {i > 0 && <line x1={x} x2={x + BOX_W} y1={cy} y2={cy} stroke="#eee5d6" />}
                    <text x={x + 10} y={cy + 15} fontSize="12" fill="#1f2a37" fontWeight={isPk ? 700 : 400}>{column}</text>
                    {(isPk || isFk) && (
                      <text x={x + BOX_W - 8} y={cy + 15} fontSize="9" textAnchor="end" fill={isPk ? '#b07d22' : '#2a7f62'} fontWeight="700">
                        {isPk && isFk ? 'PK FK' : isPk ? 'PK' : 'FK'}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
