// content/lessons.ts — теория по темам курса (русский + таджикский).
// Разметка в тексте: `код`, **жирный**, пустая строка — новый абзац.
// sql — пример, который можно выполнить на странице; after — SELECT, показывающий результат изменения.
import type { Topic } from '@/lib/course';
import type { DbName } from '@/lib/schema';

export type LessonSection = {
  title_ru: string;
  title_tj: string;
  ru: string;
  tj: string;
  sql?: string;
  after?: string;
  /** Пример специально показывает ошибку (например, нарушение внешнего ключа) */
  expectError?: boolean;
  /** Показать ER-схему базы в этом разделе */
  schema?: boolean;
  /** Сравнение диалектов: строки таблицы «SQLite / MySQL / PostgreSQL» (не выполняются) */
  dialects?: DialectRow[];
};

export type DialectRow = { label_ru: string; label_tj: string; sqlite: string; mysql: string; postgres: string };

export type Lesson = {
  topic: Topic;
  minutes: number;
  title_ru: string;
  title_tj: string;
  /** База для примеров урока; по умолчанию — «Чайхана» */
  db?: DbName;
  sections: LessonSection[];
};

export const LESSONS: Lesson[] = [
  {
    topic: 'intro',
    minutes: 3,
    title_ru: 'Что такое база данных',
    title_tj: 'Пойгоҳи додаҳо чист',
    sections: [
      {
        title_ru: 'Таблицы, строки и столбцы',
        title_tj: 'Ҷадвалҳо, сатрҳо ва сутунҳо',
        ru: 'База данных — это набор **таблиц**. Каждая таблица похожа на лист Excel: **строки** — это записи (один чай, один гость), **столбцы** — их свойства (название, цена).\n\nВ нашей «Чайхане» пять таблиц: `visitors` (гости), `tables` (столики), `teas` (чаи), `orders` (заказы) и `order_items` (что входит в заказ).',
        tj: 'Пойгоҳи додаҳо — маҷмӯи **ҷадвалҳо** аст. Ҳар ҷадвал ба варақи Excel монанд аст: **сатрҳо** — сабтҳо (як чой, як меҳмон), **сутунҳо** — хосиятҳои онҳо (ном, нарх).\n\nДар «Чойхона»-и мо панҷ ҷадвал ҳаст: `visitors` (меҳмонон), `tables` (мизҳо), `teas` (чойҳо), `orders` (фармоишҳо) ва `order_items` (таркиби фармоиш).',
        sql: 'SELECT * FROM teas LIMIT 5',
      },
      {
        title_ru: 'SQL — язык вопросов к базе',
        title_tj: 'SQL — забони саволҳо ба база',
        ru: 'SQL описывает, **что** нужно получить, а не **как**. Ключевые слова (`SELECT`, `FROM`) принято писать заглавными, но регистр не важен — запрос ниже тоже работает.',
        tj: 'SQL тасвир мекунад, ки **чӣ** гирифтан лозим аст, на **чӣ тавр**. Калимаҳои калидӣ (`SELECT`, `FROM`)-ро одатан бо ҳарфҳои калон менависанд, вале ин муҳим нест — дархости поён ҳам кор мекунад.',
        sql: 'select name, price from teas limit 3',
      },
      {
        title_ru: 'Связи между таблицами',
        title_tj: 'Робитаҳои байни ҷадвалҳо',
        ru: 'Таблицы связаны через **ключи**. В заказе хранится не имя гостя, а его номер: `orders.visitor_id` указывает на `visitors.id`. Таблица `order_items` связывает заказы с чаями: какой чай и сколько чайников в каком заказе.',
        tj: 'Ҷадвалҳо тавассути **калидҳо** алоқаманданд. Дар фармоиш на номи меҳмон, балки рақами ӯ нигоҳ дошта мешавад: `orders.visitor_id` ба `visitors.id` ишора мекунад. Ҷадвали `order_items` фармоишҳоро бо чойҳо мепайвандад: кадом чой ва чанд чойник дар кадом фармоиш.',
        sql: 'SELECT * FROM order_items LIMIT 5',
        schema: true,
      },
    ],
  },
  {
    topic: 'select',
    minutes: 5,
    title_ru: 'SELECT: выбираем данные',
    title_tj: 'SELECT: интихоби маълумот',
    sections: [
      {
        title_ru: 'Столбцы и звёздочка',
        title_tj: 'Сутунҳо ва ситорача',
        ru: 'Шаблон любого запроса: `SELECT столбцы FROM таблица`. Звёздочка `*` означает «все столбцы», но в реальных проектах лучше перечислять нужные — так быстрее и понятнее.',
        tj: 'Қолаби ҳар дархост: `SELECT сутунҳо FROM ҷадвал`. Ситорача `*` маънои «ҳамаи сутунҳо»-ро дорад, вале дар лоиҳаҳои воқеӣ беҳтар аст сутунҳои лозимиро номбар кунед — ин тезтар ва фаҳмотар аст.',
        sql: 'SELECT name, price FROM teas',
      },
      {
        title_ru: 'DISTINCT — без повторов',
        title_tj: 'DISTINCT — бе такрор',
        ru: '`DISTINCT` убирает одинаковые строки из результата. Обратите внимание: `NULL` (город не указан) тоже попадает в список как отдельное значение.',
        tj: '`DISTINCT` сатрҳои якхеларо аз натиҷа хориҷ мекунад. Диққат диҳед: `NULL` (шаҳр нишон дода нашудааст) низ ҳамчун қимати алоҳида ба рӯйхат медарояд.',
        sql: 'SELECT DISTINCT city FROM visitors',
      },
      {
        title_ru: 'LIMIT — только первые строки',
        title_tj: 'LIMIT — танҳо сатрҳои аввал',
        ru: '`LIMIT n` оставляет первые n строк. Пишется в самом конце запроса.',
        tj: '`LIMIT n` n сатри аввалро мегузорад. Дар охири дархост навишта мешавад.',
        sql: 'SELECT * FROM orders LIMIT 3',
      },
      {
        title_ru: 'Выражения и псевдонимы',
        title_tj: 'Ифодаҳо ва тахаллусҳо',
        ru: 'В `SELECT` можно считать: `price * 2`. Через `AS` столбцу даётся понятное имя. Строки склеиваются оператором `||`.',
        tj: 'Дар `SELECT` ҳисоб кардан мумкин аст: `price * 2`. Бо `AS` ба сутун номи фаҳмо дода мешавад. Сатрҳо бо оператори `||` пайваст мешаванд.',
        sql: "SELECT name AS tea, price * 2 AS double_price, name || ' (' || type || ')' AS menu_item FROM teas LIMIT 5",
      },
    ],
  },
  {
    topic: 'where',
    minutes: 7,
    title_ru: 'WHERE: фильтруем строки',
    title_tj: 'WHERE: филтри сатрҳо',
    sections: [
      {
        title_ru: 'Сравнения',
        title_tj: 'Муқоисаҳо',
        ru: '`WHERE` оставляет только строки, где условие истинно. Операторы: `=`, `<>` (не равно), `<`, `>`, `<=`, `>=`. Текст пишется в **одинарных** кавычках: `\'зеленый\'`.',
        tj: '`WHERE` танҳо сатрҳоеро мегузорад, ки шарт дар онҳо дуруст аст. Операторҳо: `=`, `<>` (баробар нест), `<`, `>`, `<=`, `>=`. Матн дар нохунакҳои **якка** навишта мешавад: `\'зеленый\'`.',
        sql: 'SELECT name, price FROM teas WHERE price > 25',
      },
      {
        title_ru: 'AND, OR, NOT и скобки',
        title_tj: 'AND, OR, NOT ва қавсҳо',
        ru: '`AND` — оба условия, `OR` — хотя бы одно, `NOT` — отрицание. `AND` выполняется раньше `OR`, поэтому смешанные условия заключайте в скобки.',
        tj: '`AND` — ҳарду шарт, `OR` — ақаллан яке, `NOT` — инкор. `AND` пеш аз `OR` иҷро мешавад, бинобар ин шартҳои омехтаро дар қавс гиред.',
        sql: "SELECT name, type, price FROM teas WHERE (type = 'зеленый' AND price < 10) OR price > 30",
      },
      {
        title_ru: 'IN и BETWEEN',
        title_tj: 'IN ва BETWEEN',
        ru: '`IN (a, b, c)` — значение из списка. `BETWEEN a AND b` — диапазон, **включая** обе границы.',
        tj: '`IN (a, b, c)` — қимат аз рӯйхат. `BETWEEN a AND b` — фосила, **бо ҳамроҳии** ҳарду ҳад.',
        sql: "SELECT name, city, age FROM visitors WHERE city IN ('Хорог', 'Куляб') AND age BETWEEN 20 AND 40",
      },
      {
        title_ru: 'LIKE — поиск по шаблону',
        title_tj: 'LIKE — ҷустуҷӯ аз рӯи қолаб',
        ru: '`%` — любое количество любых символов, `_` — ровно один символ. Важно: в SQLite `LIKE` не различает регистр только для латиницы, а для **кириллицы различает**: `\'%чай%\'` не найдёт «Чай».',
        tj: '`%` — ҳар миқдори аломатҳо, `_` — маҳз як аломат. Муҳим: дар SQLite `LIKE` ҳарфҳои калон ва хурдро танҳо барои лотинӣ фарқ намекунад, барои **кириллӣ фарқ мекунад**: `\'%чай%\'` «Чай»-ро намеёбад.',
        sql: "SELECT name FROM teas WHERE name LIKE '%чай%' OR name LIKE 'Чой%'",
      },
      {
        title_ru: 'NULL — неизвестное значение',
        title_tj: 'NULL — қимати номаълум',
        ru: '`NULL` — это не ноль и не пустая строка, а «неизвестно». Любое сравнение с ним даёт `NULL`, поэтому `age = NULL` не найдёт ничего. Используйте `IS NULL` и `IS NOT NULL`.\n\n**Ловушка:** `city <> \'Душанбе\'` не вернёт гостей без города — для них результат сравнения `NULL`, и `WHERE` их отбрасывает.',
        tj: '`NULL` — на сифр ва на сатри холӣ, балки «номаълум» аст. Ҳар муқоиса бо он `NULL` медиҳад, бинобар ин `age = NULL` ҳеҷ чиз намеёбад. `IS NULL` ва `IS NOT NULL`-ро истифода баред.\n\n**Дом:** `city <> \'Душанбе\'` меҳмонони бе шаҳрро барнамегардонад — барои онҳо натиҷаи муқоиса `NULL` аст ва `WHERE` онҳоро партофта мешавад.',
        sql: 'SELECT name, age, city FROM visitors WHERE age IS NULL OR city IS NULL',
      },
    ],
  },
  {
    topic: 'order',
    minutes: 4,
    title_ru: 'ORDER BY: сортировка',
    title_tj: 'ORDER BY: мураттабсозӣ',
    sections: [
      {
        title_ru: 'По возрастанию и убыванию',
        title_tj: 'Аз рӯи афзоиш ва камшавӣ',
        ru: '`ORDER BY столбец` сортирует по возрастанию (`ASC` — можно не писать), `DESC` — по убыванию.',
        tj: '`ORDER BY сутун` аз рӯи афзоиш мураттаб мекунад (`ASC` — навиштан шарт нест), `DESC` — аз рӯи камшавӣ.',
        sql: 'SELECT name, price FROM teas ORDER BY price DESC',
      },
      {
        title_ru: 'Несколько столбцов',
        title_tj: 'Якчанд сутун',
        ru: 'Второй столбец решает «ничьи» по первому. У каждого столбца своё направление.',
        tj: 'Сутуни дуюм «баробарӣ»-ро аз рӯи сутуни якум ҳал мекунад. Ҳар сутун самти худро дорад.',
        sql: 'SELECT id, seats, by_window FROM tables ORDER BY seats DESC, id',
      },
      {
        title_ru: 'Топ-N и страницы: LIMIT и OFFSET',
        title_tj: 'Топ-N ва саҳифаҳо: LIMIT ва OFFSET',
        ru: '`ORDER BY ... LIMIT 3` — три лучших. `OFFSET 3` пропускает первые три — так делают постраничный вывод.\n\nБез `ORDER BY` порядок строк **не гарантирован**. `NULL` в SQLite считается меньше любого значения.',
        tj: '`ORDER BY ... LIMIT 3` — се беҳтарин. `OFFSET 3` се сатри аввалро мегузаронад — ҳамин тавр саҳифа ба саҳифа нишон медиҳанд.\n\nБе `ORDER BY` тартиби сатрҳо **кафолат дода намешавад**. `NULL` дар SQLite аз ҳар қимат хурдтар ҳисоб мешавад.',
        sql: 'SELECT id, total FROM orders ORDER BY total DESC LIMIT 3 OFFSET 3',
      },
    ],
  },
  {
    topic: 'functions',
    minutes: 7,
    title_ru: 'Функции и CASE',
    title_tj: 'Функсияҳо ва CASE',
    sections: [
      {
        title_ru: 'Строки',
        title_tj: 'Сатрҳо',
        ru: '`LENGTH(s)` — длина, `SUBSTR(s, начало, длина)` — часть строки, `INSTR(s, подстрока)` — позиция, `REPLACE(s, что, на_что)`. В SQLite `UPPER`/`LOWER` работают только с латиницей.',
        tj: '`LENGTH(s)` — дарозӣ, `SUBSTR(s, оғоз, дарозӣ)` — қисми сатр, `INSTR(s, зерсатр)` — мавқеъ, `REPLACE(s, чӣ, ба_чӣ)`. Дар SQLite `UPPER`/`LOWER` танҳо бо лотинӣ кор мекунанд.',
        sql: "SELECT name, LENGTH(name) AS len, SUBSTR(name, 1, INSTR(name, ' ') - 1) AS first_name FROM visitors LIMIT 5",
      },
      {
        title_ru: 'Числа',
        title_tj: 'Ададҳо',
        ru: '`ROUND(x, n)` округляет до n знаков. **Ловушка:** деление целых даёт целое: `7 / 2 = 3`. Пишите `7 / 2.0` или умножайте на `100.0`.',
        tj: '`ROUND(x, n)` то n рақам яклухт мекунад. **Дом:** тақсими ададҳои бутун адади бутун медиҳад: `7 / 2 = 3`. `7 / 2.0` нависед ё ба `100.0` зарб кунед.',
        sql: 'SELECT 7 / 2 AS int_div, 7 / 2.0 AS real_div, ROUND(10 / 3.0, 2) AS rounded',
      },
      {
        title_ru: 'Даты',
        title_tj: 'Санаҳо',
        ru: 'В SQLite даты хранятся текстом `ГГГГ-ММ-ДД`. `strftime(\'%m\', d)` — месяц, `\'%Y\'` — год, `\'%w\'` — день недели (0 — воскресенье). `date(d, \'+7 day\')` сдвигает дату, `julianday(d2) - julianday(d1)` — разница в днях.',
        tj: 'Дар SQLite санаҳо ҳамчун матни `СССС-ММ-РР` нигоҳ дошта мешаванд. `strftime(\'%m\', d)` — моҳ, `\'%Y\'` — сол, `\'%w\'` — рӯзи ҳафта (0 — якшанбе). `date(d, \'+7 day\')` санаро мекӯчонад, `julianday(d2) - julianday(d1)` — фарқ бо рӯзҳо.',
        sql: "SELECT order_date, strftime('%m', order_date) AS month, strftime('%w', order_date) AS weekday, date(order_date, '+7 day') AS week_later FROM orders LIMIT 5",
      },
      {
        title_ru: 'COALESCE — замена NULL',
        title_tj: 'COALESCE — ивази NULL',
        ru: '`COALESCE(a, b, ...)` возвращает первое значение, которое не `NULL`.',
        tj: '`COALESCE(a, b, ...)` аввалин қиматеро, ки `NULL` нест, бармегардонад.',
        sql: "SELECT name, COALESCE(city, 'не указан') AS city FROM visitors WHERE city IS NULL",
      },
      {
        title_ru: 'CASE — «если … то …»',
        title_tj: 'CASE — «агар … пас …»',
        ru: '`CASE WHEN условие THEN значение ... ELSE ... END`. Условия проверяются сверху вниз, срабатывает первое подходящее.',
        tj: '`CASE WHEN шарт THEN қимат ... ELSE ... END`. Шартҳо аз боло ба поён санҷида мешаванд, аввалинаш, ки мувофиқ аст, кор мекунад.',
        sql: "SELECT name, price, CASE WHEN price < 10 THEN 'дешевый' WHEN price <= 20 THEN 'средний' ELSE 'дорогой' END AS category FROM teas LIMIT 8",
      },
    ],
  },
  {
    topic: 'aggregate',
    minutes: 8,
    title_ru: 'Агрегация и GROUP BY',
    title_tj: 'Агрегатсия ва GROUP BY',
    sections: [
      {
        title_ru: 'Агрегатные функции',
        title_tj: 'Функсияҳои агрегатӣ',
        ru: '`COUNT`, `SUM`, `AVG`, `MIN`, `MAX` сворачивают много строк в одно значение. `COUNT(*)` считает строки, а `COUNT(столбец)` — только значения, которые **не NULL**.',
        tj: '`COUNT`, `SUM`, `AVG`, `MIN`, `MAX` сатрҳои зиёдро ба як қимат ҷамъ мекунанд. `COUNT(*)` сатрҳоро ҳисоб мекунад, `COUNT(сутун)` — танҳо қиматҳое, ки **NULL нестанд**.',
        sql: 'SELECT COUNT(*) AS all_rows, COUNT(age) AS with_age, COUNT(DISTINCT city) AS cities, ROUND(AVG(age), 1) AS avg_age FROM visitors',
      },
      {
        title_ru: 'GROUP BY — по группам',
        title_tj: 'GROUP BY — аз рӯи гурӯҳҳо',
        ru: '`GROUP BY` делит строки на группы, и агрегат считается для каждой. В `SELECT` пишут только столбцы группировки и агрегаты.',
        tj: '`GROUP BY` сатрҳоро ба гурӯҳҳо ҷудо мекунад ва агрегат барои ҳар кадом ҳисоб мешавад. Дар `SELECT` танҳо сутунҳои гурӯҳбандӣ ва агрегатҳоро менависанд.',
        sql: 'SELECT type, COUNT(*) AS teas_count, ROUND(AVG(price), 2) AS avg_price FROM teas GROUP BY type',
      },
      {
        title_ru: 'HAVING против WHERE',
        title_tj: 'HAVING ба муқобили WHERE',
        ru: '`WHERE` фильтрует **строки до** группировки, `HAVING` — **группы после** неё. Условие на `COUNT(*)` или `SUM(...)` — всегда в `HAVING`.',
        tj: '`WHERE` **сатрҳоро пеш аз** гурӯҳбандӣ филтр мекунад, `HAVING` — **гурӯҳҳоро пас аз** он. Шарт бар `COUNT(*)` ё `SUM(...)` — ҳамеша дар `HAVING`.',
        sql: 'SELECT visitor_id, COUNT(*) AS orders_count, SUM(total) AS spent FROM orders GROUP BY visitor_id HAVING COUNT(*) > 1',
      },
      {
        title_ru: 'Порядок выполнения запроса',
        title_tj: 'Тартиби иҷрои дархост',
        ru: 'База выполняет части запроса не в том порядке, в каком они написаны: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`. Поэтому псевдоним из `SELECT` можно использовать в `ORDER BY`, но по стандарту нельзя в `WHERE`.',
        tj: 'База қисмҳои дархостро на бо он тартибе, ки навишта шудаанд, иҷро мекунад: `FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`. Бинобар ин тахаллуси `SELECT`-ро дар `ORDER BY` истифода бурдан мумкин аст, вале аз рӯи стандарт дар `WHERE` не.',
        sql: "SELECT strftime('%Y-%m', order_date) AS month, SUM(total) AS revenue FROM orders GROUP BY month ORDER BY revenue DESC",
      },
    ],
  },
  {
    topic: 'join',
    minutes: 8,
    title_ru: 'JOIN: соединяем таблицы',
    title_tj: 'JOIN: пайвасти ҷадвалҳо',
    sections: [
      {
        title_ru: 'INNER JOIN',
        title_tj: 'INNER JOIN',
        ru: '`JOIN ... ON условие` склеивает строки двух таблиц, у которых условие истинно. Короткие псевдонимы таблиц (`o`, `v`) делают запрос читаемым.',
        tj: '`JOIN ... ON шарт` сатрҳои ду ҷадвалро, ки шарт дар онҳо дуруст аст, мепайвандад. Тахаллусҳои кӯтоҳи ҷадвалҳо (`o`, `v`) дархостро хонотар мекунанд.',
        sql: 'SELECT o.id, v.name, o.total FROM orders o JOIN visitors v ON v.id = o.visitor_id LIMIT 5',
      },
      {
        title_ru: 'Цепочка соединений',
        title_tj: 'Занҷири пайвастҳо',
        ru: 'JOIN-ы можно ставить подряд: заказ → позиции → чаи. Каждый `ON` описывает, как связать новую таблицу с уже присоединёнными.',
        tj: 'JOIN-ҳоро паи ҳам гузоштан мумкин аст: фармоиш → мавқеъҳо → чойҳо. Ҳар `ON` тасвир мекунад, ки ҷадвали навро бо ҷадвалҳои аллакай пайвастшуда чӣ тавр бояд пайваст.',
        sql: 'SELECT o.id, t.name, oi.quantity FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN teas t ON t.id = oi.tea_id WHERE o.id = 3',
      },
      {
        title_ru: 'LEFT JOIN — сохранить всех',
        title_tj: 'LEFT JOIN — ҳамаро нигоҳ доштан',
        ru: '`LEFT JOIN` оставляет **все** строки левой таблицы. Где пары нет — столбцы правой будут `NULL`. Так ищут «тех, у кого нет»: `WHERE правая.id IS NULL`.',
        tj: '`LEFT JOIN` **ҳамаи** сатрҳои ҷадвали чапро нигоҳ медорад. Дар ҷое, ки ҷуфт нест — сутунҳои ҷадвали рост `NULL` мешаванд. Ҳамин тавр «онҳое, ки надоранд»-ро меҷӯянд: `WHERE рост.id IS NULL`.',
        sql: 'SELECT v.name, o.id AS order_id FROM visitors v LEFT JOIN orders o ON o.visitor_id = v.id WHERE o.id IS NULL',
      },
      {
        title_ru: 'Ловушка COUNT после LEFT JOIN',
        title_tj: 'Доми COUNT пас аз LEFT JOIN',
        ru: 'После `LEFT JOIN` пустой столик даёт одну строку с `NULL`. `COUNT(*)` посчитает её как 1, а `COUNT(o.id)` — правильно, как 0.\n\nТаблицу можно соединить **саму с собой** (самосоединение) — нужны два разных псевдонима.',
        tj: 'Пас аз `LEFT JOIN` мизи холӣ як сатр бо `NULL` медиҳад. `COUNT(*)` онро 1 ҳисоб мекунад, `COUNT(o.id)` — дуруст, 0.\n\nҶадвалро бо **худаш** пайвастан мумкин аст — ду тахаллуси гуногун лозим аст.',
        sql: 'SELECT t.id, COUNT(*) AS wrong_count, COUNT(o.id) AS orders_count FROM tables t LEFT JOIN orders o ON o.table_id = t.id GROUP BY t.id ORDER BY orders_count LIMIT 5',
      },
    ],
  },
  {
    topic: 'subquery',
    minutes: 7,
    title_ru: 'Подзапросы',
    title_tj: 'Зердархостҳо',
    sections: [
      {
        title_ru: 'Скалярный подзапрос',
        title_tj: 'Зердархости скалярӣ',
        ru: 'Запрос в скобках, который возвращает одно значение, можно использовать как число.',
        tj: 'Дархост дар қавс, ки як қимат бармегардонад, мисли адад истифода мешавад.',
        sql: 'SELECT name, price FROM teas WHERE price > (SELECT AVG(price) FROM teas)',
      },
      {
        title_ru: 'IN и NOT IN',
        title_tj: 'IN ва NOT IN',
        ru: 'Подзапрос может вернуть список для `IN`. **Ловушка:** если в списке есть `NULL`, `NOT IN` вернёт пустой результат. Безопаснее `NOT EXISTS`.',
        tj: 'Зердархост метавонад рӯйхатро барои `IN` баргардонад. **Дом:** агар дар рӯйхат `NULL` бошад, `NOT IN` натиҷаи холӣ медиҳад. `NOT EXISTS` бехатартар аст.',
        sql: 'SELECT name FROM teas WHERE id NOT IN (SELECT tea_id FROM order_items)',
      },
      {
        title_ru: 'EXISTS и коррелированные подзапросы',
        title_tj: 'EXISTS ва зердархостҳои вобаста',
        ru: 'Коррелированный подзапрос ссылается на строку внешнего запроса (`v.id`) и выполняется для каждой строки. `EXISTS` истинно, если подзапрос вернул хоть одну строку.',
        tj: 'Зердархости вобаста ба сатри дархости берунӣ (`v.id`) ишора мекунад ва барои ҳар сатр иҷро мешавад. `EXISTS` дуруст аст, агар зердархост ақаллан як сатр баргардонад.',
        sql: 'SELECT v.name FROM visitors v WHERE EXISTS (SELECT 1 FROM orders o WHERE o.visitor_id = v.id AND o.total > 120)',
      },
      {
        title_ru: 'Подзапрос во FROM и в SELECT',
        title_tj: 'Зердархост дар FROM ва дар SELECT',
        ru: 'Подзапрос во `FROM` — это временная таблица, к которой можно применить ещё один агрегат. Подзапрос в `SELECT` считает значение для каждой строки.',
        tj: 'Зердархост дар `FROM` — ҷадвали муваққатӣ аст, ки ба он боз як агрегат татбиқ кардан мумкин аст. Зердархост дар `SELECT` барои ҳар сатр қимат ҳисоб мекунад.',
        sql: 'SELECT ROUND(AVG(spent), 2) AS avg_spent FROM (SELECT visitor_id, SUM(total) AS spent FROM orders GROUP BY visitor_id)',
      },
    ],
  },
  {
    topic: 'set',
    minutes: 4,
    title_ru: 'UNION, INTERSECT, EXCEPT',
    title_tj: 'UNION, INTERSECT, EXCEPT',
    sections: [
      {
        title_ru: 'UNION и UNION ALL',
        title_tj: 'UNION ва UNION ALL',
        ru: '`UNION` объединяет результаты двух запросов и убирает дубли, `UNION ALL` — оставляет (и работает быстрее). Число и порядок столбцов должны совпадать.',
        tj: '`UNION` натиҷаҳои ду дархостро муттаҳид мекунад ва такрорҳоро хориҷ мекунад, `UNION ALL` — нигоҳ медорад (ва тезтар кор мекунад). Шумора ва тартиби сутунҳо бояд мувофиқ бошанд.',
        sql: 'SELECT city FROM visitors WHERE age < 20 UNION SELECT city FROM visitors WHERE age > 50',
      },
      {
        title_ru: 'INTERSECT и EXCEPT',
        title_tj: 'INTERSECT ва EXCEPT',
        ru: '`INTERSECT` — строки, которые есть в обоих результатах. `EXCEPT` — строки первого, которых нет во втором. `ORDER BY` пишется один раз, в самом конце.',
        tj: '`INTERSECT` — сатрҳое, ки дар ҳарду натиҷа ҳастанд. `EXCEPT` — сатрҳои якум, ки дар дуюм нестанд. `ORDER BY` як бор, дар охир навишта мешавад.',
        sql: "SELECT tea_id FROM order_items WHERE quantity >= 4 INTERSECT SELECT id FROM teas WHERE type = 'черный'",
      },
    ],
  },
  {
    topic: 'modify',
    minutes: 6,
    title_ru: 'Изменение данных',
    title_tj: 'Тағйири маълумот',
    sections: [
      {
        title_ru: 'INSERT — добавить строки',
        title_tj: 'INSERT — илова кардани сатрҳо',
        ru: '`INSERT INTO таблица (столбцы) VALUES (значения)`. Столбец `id` можно не указывать — SQLite назначит следующий номер. Несколько строк: `VALUES (...), (...)`.\n\nВсе примеры здесь меняют только копию базы в вашем браузере.',
        tj: '`INSERT INTO ҷадвал (сутунҳо) VALUES (қиматҳо)`. Сутуни `id`-ро нишон надодан мумкин аст — SQLite рақами навбатиро таъин мекунад. Якчанд сатр: `VALUES (...), (...)`.\n\nҲамаи мисолҳо дар ин ҷо танҳо нусхаи базаро дар браузери шумо тағйир медиҳанд.',
        sql: "INSERT INTO teas (name, type, price) VALUES ('Зеленый с жасмином и мятой', 'зеленый', 19)",
        after: 'SELECT * FROM teas ORDER BY id DESC LIMIT 3',
      },
      {
        title_ru: 'UPDATE — изменить',
        title_tj: 'UPDATE — тағйир додан',
        ru: '`UPDATE таблица SET столбец = значение WHERE условие`. **Без WHERE изменятся все строки!** Хорошая привычка: сначала выполнить `SELECT` с тем же `WHERE`.',
        tj: '`UPDATE ҷадвал SET сутун = қимат WHERE шарт`. **Бе WHERE ҳамаи сатрҳо тағйир меёбанд!** Одати хуб: аввал `SELECT`-ро бо ҳамон `WHERE` иҷро кунед.',
        sql: "UPDATE teas SET price = price + 2 WHERE type = 'зеленый'",
        after: "SELECT name, price FROM teas WHERE type = 'зеленый' LIMIT 5",
      },
      {
        title_ru: 'DELETE и внешние ключи',
        title_tj: 'DELETE ва калидҳои берунӣ',
        ru: '`DELETE FROM таблица WHERE условие`. Внешние ключи защищают целостность: удалить гостя, у которого есть заказы, нельзя — база вернёт ошибку `FOREIGN KEY constraint failed`. Попробуйте.',
        tj: '`DELETE FROM ҷадвал WHERE шарт`. Калидҳои берунӣ яклухтии маълумотро ҳифз мекунанд: меҳмонеро, ки фармоиш дорад, нест кардан мумкин нест — база хатои `FOREIGN KEY constraint failed` медиҳад. Санҷед.',
        sql: 'DELETE FROM visitors WHERE id = 1',
        expectError: true,
      },
      {
        title_ru: 'Каскадное удаление и UPSERT',
        title_tj: 'Несткунии каскадӣ ва UPSERT',
        ru: 'У `order_items.order_id` указано `ON DELETE CASCADE`: при удалении заказа его позиции удаляются сами.\n\n`INSERT ... ON CONFLICT(столбец) DO UPDATE` — «добавить, а если уже есть — обновить».',
        tj: 'Дар `order_items.order_id` `ON DELETE CASCADE` нишон дода шудааст: ҳангоми нест кардани фармоиш мавқеъҳои он худ нест мешаванд.\n\n`INSERT ... ON CONFLICT(сутун) DO UPDATE` — «илова кун, агар аллакай бошад — нав кун».',
        sql: 'DELETE FROM orders WHERE id = 1',
        after: 'SELECT COUNT(*) AS items_left FROM order_items WHERE order_id = 1',
      },
    ],
  },
  {
    topic: 'cte',
    minutes: 6,
    title_ru: 'CTE и рекурсия',
    title_tj: 'CTE ва рекурсия',
    sections: [
      {
        title_ru: 'WITH — именованный подзапрос',
        title_tj: 'WITH — зердархости номдор',
        ru: '`WITH имя AS (запрос)` даёт подзапросу имя, и дальше к нему обращаются как к таблице. Сложный запрос превращается в понятные шаги. CTE можно перечислить через запятую — каждый следующий видит предыдущие.',
        tj: '`WITH ном AS (дархост)` ба зердархост ном медиҳад ва минбаъд ба он мисли ҷадвал муроҷиат мекунанд. Дархости мураккаб ба қадамҳои фаҳмо табдил меёбад. CTE-ҳоро бо вергул номбар кардан мумкин аст — ҳар яки навбатӣ қаблиҳоро мебинад.',
        sql: 'WITH spending AS (SELECT visitor_id, SUM(total) AS spent FROM orders GROUP BY visitor_id) SELECT v.name, s.spent FROM spending s JOIN visitors v ON v.id = s.visitor_id ORDER BY s.spent DESC LIMIT 5',
      },
      {
        title_ru: 'WITH RECURSIVE',
        title_tj: 'WITH RECURSIVE',
        ru: 'Рекурсивный CTE состоит из **якоря** (стартовые строки) и **шага**, который ссылается на сам CTE, соединённых `UNION ALL`. Условие остановки в шаге обязательно — иначе запрос будет бесконечным и упадёт по таймауту.',
        tj: 'CTE-и рекурсивӣ аз **лангар** (сатрҳои ибтидоӣ) ва **қадам**, ки ба худи CTE ишора мекунад, иборат аст, ки бо `UNION ALL` пайваст шудаанд. Шарти қатъ дар қадам ҳатмист — вагарна дархост беохир мешавад ва бо таймаут қатъ мегардад.',
        sql: 'WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n WHERE x < 5) SELECT x FROM n',
      },
      {
        title_ru: 'Календарь без пропусков',
        title_tj: 'Тақвими бе холигӣ',
        ru: 'Частое применение рекурсии — сгенерировать все даты периода и присоединить к ним данные через `LEFT JOIN`, чтобы дни без заказов не пропали из отчёта.',
        tj: 'Истифодаи маъмули рекурсия — тавлиди ҳамаи санаҳои давра ва пайвасти маълумот ба онҳо бо `LEFT JOIN`, то рӯзҳои бе фармоиш аз ҳисобот гум нашаванд.',
        sql: "WITH RECURSIVE days(day) AS (SELECT '2026-09-01' UNION ALL SELECT date(day, '+1 day') FROM days WHERE day < '2026-09-07') SELECT d.day, COUNT(o.id) AS orders_count FROM days d LEFT JOIN orders o ON o.order_date = d.day GROUP BY d.day",
      },
    ],
  },
  {
    topic: 'window',
    minutes: 8,
    title_ru: 'Оконные функции',
    title_tj: 'Функсияҳои равзанавӣ',
    sections: [
      {
        title_ru: 'OVER — агрегат без схлопывания',
        title_tj: 'OVER — агрегат бе ҷамъ кардани сатрҳо',
        ru: '`GROUP BY` сворачивает строки в одну. Оконная функция с `OVER (...)` считает то же самое, но **сохраняет каждую строку**: рядом с ценой чая можно показать среднюю цену по меню.',
        tj: '`GROUP BY` сатрҳоро ба як сатр ҷамъ мекунад. Функсияи равзанавӣ бо `OVER (...)` ҳамонро ҳисоб мекунад, вале **ҳар сатрро нигоҳ медорад**: дар паҳлӯи нархи чой нархи миёнаи менюро нишон додан мумкин аст.',
        sql: 'SELECT name, price, ROUND(AVG(price) OVER (), 2) AS avg_all FROM teas LIMIT 6',
      },
      {
        title_ru: 'PARTITION BY и ORDER BY в окне',
        title_tj: 'PARTITION BY ва ORDER BY дар равзана',
        ru: '`PARTITION BY` делит строки на независимые окна (например, по типу чая). `ORDER BY` внутри `OVER` задаёт порядок в окне — он нужен для рангов и накопительных сумм.',
        tj: '`PARTITION BY` сатрҳоро ба равзанаҳои мустақил тақсим мекунад (масалан, аз рӯи навъи чой). `ORDER BY` дар дохили `OVER` тартибро дар равзана муайян мекунад — он барои рангҳо ва ҷамъҳои афзоянда лозим аст.',
        sql: 'SELECT name, type, price, ROUND(AVG(price) OVER (PARTITION BY type), 2) AS avg_in_type FROM teas',
      },
      {
        title_ru: 'ROW_NUMBER, RANK, DENSE_RANK',
        title_tj: 'ROW_NUMBER, RANK, DENSE_RANK',
        ru: 'При равных ценах: `ROW_NUMBER` даёт разные номера (1, 2, 3), `RANK` — одинаковые с пропуском (1, 2, 2, 4), `DENSE_RANK` — одинаковые без пропуска (1, 2, 2, 3).',
        tj: 'Ҳангоми нархҳои баробар: `ROW_NUMBER` рақамҳои гуногун медиҳад (1, 2, 3), `RANK` — якхела бо гузариш (1, 2, 2, 4), `DENSE_RANK` — якхела бе гузариш (1, 2, 2, 3).',
        sql: 'SELECT name, price, ROW_NUMBER() OVER (ORDER BY price) AS row_num, RANK() OVER (ORDER BY price) AS rnk, DENSE_RANK() OVER (ORDER BY price) AS dense FROM teas LIMIT 10',
      },
      {
        title_ru: 'LAG, LEAD и накопительные суммы',
        title_tj: 'LAG, LEAD ва ҷамъҳои афзоянда',
        ru: '`LAG(x)` — значение из предыдущей строки окна, `LEAD(x)` — из следующей. `SUM(x) OVER (ORDER BY ...)` — нарастающий итог. Рамка `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` — скользящее окно из трёх строк.',
        tj: '`LAG(x)` — қимат аз сатри қаблии равзана, `LEAD(x)` — аз сатри навбатӣ. `SUM(x) OVER (ORDER BY ...)` — ҷамъи афзоянда. Чаҳорчӯбаи `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` — равзанаи лағжанда аз се сатр.',
        sql: 'SELECT id, order_date, total, LAG(total) OVER (ORDER BY order_date, id) AS prev_total, SUM(total) OVER (ORDER BY order_date, id) AS running_total FROM orders LIMIT 8',
      },
      {
        title_ru: 'Окно нельзя в WHERE',
        title_tj: 'Равзанаро дар WHERE истифода бурдан мумкин нест',
        ru: 'Оконные функции считаются после `WHERE`, поэтому отфильтровать по ним напрямую нельзя. Решение — посчитать окно в CTE, а фильтровать снаружи.',
        tj: 'Функсияҳои равзанавӣ пас аз `WHERE` ҳисоб мешаванд, бинобар ин мустақиман аз рӯи онҳо филтр кардан мумкин нест. Роҳи ҳал — равзанаро дар CTE ҳисоб карда, берун филтр кардан.',
        sql: 'WITH ranked AS (SELECT name, type, price, ROW_NUMBER() OVER (PARTITION BY type ORDER BY price) AS rn FROM teas) SELECT type, name, price FROM ranked WHERE rn = 1',
      },
    ],
  },
  {
    topic: 'analytics',
    minutes: 6,
    title_ru: 'Аналитика: продвинутые приёмы',
    title_tj: 'Таҳлил: усулҳои пешрафта',
    sections: [
      {
        title_ru: 'Топ-N в каждой группе',
        title_tj: 'Топ-N дар ҳар гурӯҳ',
        ru: 'Самый частый вопрос на собеседовании. Схема: `ROW_NUMBER() OVER (PARTITION BY группа ORDER BY метрика DESC)` в CTE, снаружи `WHERE rn <= N`. Та же схема с `ORDER BY дата DESC` и `rn = 1` даёт «последнюю запись в группе».',
        tj: 'Саволи маъмултарин дар мусоҳиба. Нақша: `ROW_NUMBER() OVER (PARTITION BY гурӯҳ ORDER BY метрика DESC)` дар CTE, берун `WHERE rn <= N`. Ҳамин нақша бо `ORDER BY сана DESC` ва `rn = 1` «сабти охирин дар гурӯҳ»-ро медиҳад.',
        sql: 'WITH ranked AS (SELECT visitor_id, id, order_date, ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY order_date DESC, id DESC) AS rn FROM orders) SELECT visitor_id, id, order_date FROM ranked WHERE rn = 1 LIMIT 8',
      },
      {
        title_ru: 'Условная агрегация (сводная таблица)',
        title_tj: 'Агрегатсияи шартӣ (ҷадвали ҷамъбастӣ)',
        ru: '`SUM(CASE WHEN условие THEN значение ELSE 0 END)` — каждый такой столбец считает только «свои» строки. Так строят сводные таблицы: строки — категории, столбцы — периоды.',
        tj: '`SUM(CASE WHEN шарт THEN қимат ELSE 0 END)` — ҳар чунин сутун танҳо сатрҳои «худ»-ро ҳисоб мекунад. Ҳамин тавр ҷадвалҳои ҷамъбастӣ месозанд: сатрҳо — категорияҳо, сутунҳо — давраҳо.',
        sql: "SELECT v.city, SUM(CASE WHEN strftime('%m', o.order_date) = '09' THEN o.total ELSE 0 END) AS september, SUM(CASE WHEN strftime('%m', o.order_date) = '10' THEN o.total ELSE 0 END) AS october FROM orders o JOIN visitors v ON v.id = o.visitor_id WHERE v.city IS NOT NULL GROUP BY v.city",
      },
      {
        title_ru: 'Пропуски и острова',
        title_tj: 'Холигиҳо ва ҷазираҳо',
        ru: 'Как найти серии идущих подряд дней? Если пронумеровать уникальные даты по порядку, то в серии разность `julianday(дата) − номер` **одинакова**. Группируя по ней, получаем «острова».',
        tj: 'Силсилаи рӯзҳои пай дар пайро чӣ тавр ёфтан мумкин? Агар санаҳои беназирро бо тартиб рақамгузорӣ кунем, дар силсила фарқи `julianday(сана) − рақам` **якхела** аст. Аз рӯи он гурӯҳбандӣ карда, «ҷазираҳо»-ро мегирем.',
        sql: 'WITH d AS (SELECT DISTINCT order_date AS day FROM orders) SELECT day, ROW_NUMBER() OVER (ORDER BY day) AS n, julianday(day) - ROW_NUMBER() OVER (ORDER BY day) AS island FROM d LIMIT 10',
      },
      {
        title_ru: 'Медиана и накопленная доля',
        title_tj: 'Медиана ва ҳиссаи ҷамъшуда',
        ru: 'В SQLite нет `MEDIAN`: пронумеруйте значения и возьмите среднее средних строк. Накопленная доля для ABC-анализа: `SUM(x) OVER (ORDER BY x DESC) * 100.0 / SUM(x) OVER ()`.',
        tj: 'Дар SQLite `MEDIAN` нест: қиматҳоро рақамгузорӣ карда, миёнаи сатрҳои мобайниро гиред. Ҳиссаи ҷамъшуда барои таҳлили ABC: `SUM(x) OVER (ORDER BY x DESC) * 100.0 / SUM(x) OVER ()`.',
        sql: 'SELECT id, total, ROUND(SUM(total) OVER (ORDER BY total DESC, id) * 100.0 / SUM(total) OVER (), 1) AS cum_share FROM orders LIMIT 10',
      },
    ],
  },
];

LESSONS.push(
  {
    topic: 'maktab',
    minutes: 3,
    title_ru: 'Практикум: школа «Мактаб»',
    title_tj: 'Амалиёт: мактаби «Мактаб»',
    db: 'maktab',
    sections: [
      {
        title_ru: 'Новая база — школа',
        title_tj: 'Базаи нав — мактаб',
        ru: 'Закрепим функции и группировку на новых данных. В школе есть классы (`classes`), ученики (`students`), предметы (`subjects`) и оценки (`grades`) — от 2 до 5. Все задания этого практикума решаются запросом к одной таблице.',
        tj: 'Функсияҳо ва гурӯҳбандиро дар маълумоти нав мустаҳкам мекунем. Дар мактаб синфҳо (`classes`), хонандагон (`students`), фанҳо (`subjects`) ва баҳоҳо (`grades`) — аз 2 то 5 ҳастанд. Ҳамаи машқҳои ин амалиёт бо дархост ба як ҷадвал ҳал мешаванд.',
        schema: true,
        sql: 'SELECT * FROM students LIMIT 5',
      },
      {
        title_ru: 'Средний балл',
        title_tj: 'Баҳои миёна',
        ru: 'Оценки — числа, поэтому с ними работают агрегаты: `AVG`, `MIN`, `MAX`. Средний балл почти всегда дробный — округляйте его через `ROUND(..., 2)`.',
        tj: 'Баҳоҳо — рақамҳо мебошанд, бинобар ин бо онҳо агрегатҳо кор мекунанд: `AVG`, `MIN`, `MAX`. Баҳои миёна қариб ҳамеша касрӣ аст — онро бо `ROUND(..., 2)` яклухт кунед.',
        sql: 'SELECT student_id, COUNT(*) AS cnt, ROUND(AVG(grade), 2) AS avg_grade FROM grades GROUP BY student_id LIMIT 5',
      },
    ],
  },
  {
    topic: 'safar',
    minutes: 3,
    title_ru: 'Практикум: автобусы «Сафар»',
    title_tj: 'Амалиёт: автобусҳои «Сафар»',
    db: 'safar',
    sections: [
      {
        title_ru: 'Новая база — автобусы',
        title_tj: 'Базаи нав — автобусҳо',
        ru: 'Закрепим соединения и подзапросы. Города (`cities`) связаны маршрутами (`routes`), по маршрутам ходят рейсы (`trips`), на рейсы покупают билеты (`tickets`).',
        tj: 'Пайвастҳо ва зерпурсишҳоро мустаҳкам мекунем. Шаҳрҳо (`cities`) бо масирҳо (`routes`) пайваст шудаанд, дар масирҳо сафарҳо (`trips`) мераванд, барои сафарҳо чипта (`tickets`) мехаранд.',
        schema: true,
        sql: 'SELECT * FROM routes LIMIT 5',
      },
      {
        title_ru: 'Одна таблица — дважды',
        title_tj: 'Як ҷадвал — ду бор',
        ru: 'В маршруте два города — откуда (`from_city_id`) и куда (`to_city_id`). Чтобы получить оба названия, присоедините `cities` два раза под разными псевдонимами.',
        tj: 'Дар масир ду шаҳр ҳаст — аз куҷо (`from_city_id`) ва ба куҷо (`to_city_id`). Барои гирифтани ҳарду ном `cities`-ро ду бор бо тахаллусҳои гуногун пайваст кунед.',
        sql: 'SELECT a.name AS from_city, b.name AS to_city, r.price FROM routes r JOIN cities a ON a.id = r.from_city_id JOIN cities b ON b.id = r.to_city_id LIMIT 5',
      },
    ],
  },
  {
    topic: 'liga',
    minutes: 4,
    title_ru: 'Практикум: футбольная «Лига»',
    title_tj: 'Амалиёт: «Лига»-и футбол',
    db: 'liga',
    sections: [
      {
        title_ru: 'Новая база — чемпионат',
        title_tj: 'Базаи нав — чемпионат',
        ru: 'Закрепим CTE и оконные функции. Шесть команд (`teams`) сыграли двухкруговой турнир: 30 матчей (`matches`) по 10 турам. Голы записаны в `goals` — счёт каждого матча совпадает с числом его голов.',
        tj: 'CTE ва функсияҳои тирезагиро мустаҳкам мекунем. Шаш даста (`teams`) мусобиқаи дудавра бозиданд: 30 бозӣ (`matches`) дар 10 давр. Голҳо дар `goals` навишта шудаанд — ҳисоби ҳар бозӣ бо шумораи голҳояш мувофиқ аст.',
        schema: true,
        sql: 'SELECT * FROM matches LIMIT 6',
      },
      {
        title_ru: 'Матч глазами каждой команды',
        title_tj: 'Бозӣ аз нигоҳи ҳар даста',
        ru: 'В матче две команды: хозяева (`home_id`) и гости (`away_id`). Для турнирной таблицы удобно превратить матч в две строки — по одной на команду — через `UNION ALL`. Тогда «забито» и «пропущено» у всех в одних и тех же столбцах.',
        tj: 'Дар бозӣ ду даста ҳаст: мизбонон (`home_id`) ва меҳмонон (`away_id`). Барои ҷадвали мусобиқа бозиро ба ду сатр — барои ҳар даста як сатр — тавассути `UNION ALL` табдил додан қулай аст. Он гоҳ «задашуда» ва «гузаронидашуда» дар ҳама дар ҳамон сутунҳо мешаванд.',
        sql: 'SELECT home_id AS team_id, home_goals AS gf, away_goals AS ga FROM matches WHERE round = 1 UNION ALL SELECT away_id, away_goals, home_goals FROM matches WHERE round = 1',
      },
    ],
  },
  {
    topic: 'final',
    minutes: 4,
    title_ru: 'Финал: незнакомая база «Бозор»',
    title_tj: 'Финал: базаи ношиноси «Бозор»',
    db: 'bazaar',
    sections: [
      {
        title_ru: 'Новая база — те же приёмы',
        title_tj: 'Базаи нав — ҳамон усулҳо',
        ru: 'В финале — база, которую вы ещё не видели: продавцы четырёх базаров Душанбе (`vendors`), товары (`products`) и продажи (`sales`). Если вы поняли SQL, а не выучили «Чайхану» наизусть, все приёмы сработают и здесь.',
        tj: 'Дар финал — базае, ки шумо ҳанӯз надидаед: фурӯшандагони чор бозори Душанбе (`vendors`), молҳо (`products`) ва фурӯш (`sales`). Агар шумо SQL-ро фаҳмида бошед, на «Чойхона»-ро аз ёд карда бошед, ҳамаи усулҳо дар ин ҷо ҳам кор мекунанд.',
        schema: true,
        sql: 'SELECT * FROM vendors',
      },
      {
        title_ru: 'Как разбираться в незнакомой базе',
        title_tj: 'Чӣ тавр базаи ношиносро фаҳмидан',
        ru: '1. Посмотрите схему: какие таблицы и как они связаны.\n\n2. Загляните в каждую таблицу через `LIMIT 5`: какие там значения, есть ли `NULL`.\n\n3. Сложный запрос стройте по шагам: сначала JOIN, потом фильтр, потом группировка — и проверяйте промежуточный результат.',
        tj: '1. Схемаро бинед: кадом ҷадвалҳо ҳастанд ва чӣ тавр алоқаманданд.\n\n2. Ба ҳар ҷадвал бо `LIMIT 5` нигоҳ кунед: чӣ қиматҳо ҳастанд, `NULL` ҳаст ё не.\n\n3. Дархости мураккабро қадам ба қадам созед: аввал JOIN, баъд филтр, баъд гурӯҳбандӣ — ва натиҷаи мобайниро санҷед.',
        sql: 'SELECT * FROM sales LIMIT 5',
      },
      {
        title_ru: 'Выручка = количество × цена',
        title_tj: 'Даромад = миқдор × нарх',
        ru: 'В `sales` нет суммы — только количество `qty`. Цена хранится в `products`. Чтобы посчитать выручку, соедините таблицы и перемножьте.',
        tj: 'Дар `sales` маблағ нест — танҳо миқдори `qty`. Нарх дар `products` нигоҳ дошта мешавад. Барои ҳисоби даромад ҷадвалҳоро пайваст карда, зарб кунед.',
        sql: 'SELECT s.id, p.name, s.qty, p.price, s.qty * p.price AS amount FROM sales s JOIN products p ON p.id = s.product_id LIMIT 8',
      },
    ],
  },
  {
    topic: 'dialects',
    minutes: 6,
    title_ru: 'SQL на работе: MySQL и PostgreSQL',
    title_tj: 'SQL дар кор: MySQL ва PostgreSQL',
    sections: [
      {
        title_ru: 'Один язык — разные диалекты',
        title_tj: 'Як забон — лаҳҷаҳои гуногун',
        ru: 'Основа SQL одинакова везде: `SELECT`, `WHERE`, `JOIN`, `GROUP BY` вы будете писать так же. Но у каждой СУБД есть свои особенности. В тренажёре мы используем **SQLite**, а на работе в регионе вы чаще встретите **MySQL** (сайты, интернет-магазины) и **PostgreSQL** (банки, финтех, госсистемы). Ниже — то, на чём чаще всего спотыкаются.',
        tj: 'Асоси SQL дар ҳама ҷо якхела аст: `SELECT`, `WHERE`, `JOIN`, `GROUP BY`-ро ҳамин тавр менависед. Вале ҳар СИПД хусусиятҳои худро дорад. Дар тренажёр мо **SQLite**-ро истифода мебарем, вале дар кор дар минтақа шумо бештар **MySQL** (сайтҳо, мағозаҳои интернетӣ) ва **PostgreSQL** (бонкҳо, финтех, низомҳои давлатӣ)-ро мебинед. Дар поён — он чизе, ки бештар дар он пешпо мехӯранд.',
      },
      {
        title_ru: 'Строки и поиск',
        title_tj: 'Сатрҳо ва ҷустуҷӯ',
        ru: 'Самая коварная разница — склейка строк: в MySQL оператор `||` по умолчанию означает «ИЛИ», и запрос молча вернёт 0 или 1.',
        tj: 'Фарқи аз ҳама маккорона — пайвасти сатрҳо: дар MySQL оператори `||` бо пешфарз маънои «Ё»-ро дорад ва дархост хомӯшона 0 ё 1 бармегардонад.',
        dialects: [
          { label_ru: 'Склеить строки', label_tj: 'Пайвасти сатрҳо', sqlite: "name || ' (' || type || ')'", mysql: "CONCAT(name, ' (', type, ')')", postgres: "name || ' (' || type || ')'" },
          { label_ru: 'Поиск без учёта регистра', label_tj: 'Ҷустуҷӯ бе фарқи ҳарфҳо', sqlite: "LOWER(name) LIKE '%чай%'", mysql: "name LIKE '%чай%'  -- уже без регистра", postgres: "name ILIKE '%чай%'" },
          { label_ru: 'Кавычки для имён', label_tj: 'Нохунак барои номҳо', sqlite: '"order"', mysql: '`order`', postgres: '"order"' },
        ],
      },
      {
        title_ru: 'Ограничение строк и даты',
        title_tj: 'Маҳдудияти сатрҳо ва санаҳо',
        ru: '`LIMIT` есть в SQLite, MySQL и PostgreSQL, а в Microsoft SQL Server (часто в банках) пишут `SELECT TOP 10 ...`. С датами различий больше всего — функции называются по-разному в каждой системе.',
        tj: '`LIMIT` дар SQLite, MySQL ва PostgreSQL ҳаст, вале дар Microsoft SQL Server (аксар вақт дар бонкҳо) `SELECT TOP 10 ...` менависанд. Бо санаҳо фарқ аз ҳама зиёд аст — функсияҳо дар ҳар низом номҳои гуногун доранд.',
        dialects: [
          { label_ru: 'Первые 10 строк', label_tj: '10 сатри аввал', sqlite: 'LIMIT 10', mysql: 'LIMIT 10', postgres: 'LIMIT 10  -- или FETCH FIRST 10 ROWS ONLY' },
          { label_ru: 'Год и месяц', label_tj: 'Сол ва моҳ', sqlite: "strftime('%Y-%m', d)", mysql: "DATE_FORMAT(d, '%Y-%m')", postgres: "to_char(d, 'YYYY-MM')" },
          { label_ru: 'Год числом', label_tj: 'Сол бо адад', sqlite: "CAST(strftime('%Y', d) AS INTEGER)", mysql: 'YEAR(d)', postgres: 'EXTRACT(YEAR FROM d)' },
          { label_ru: 'Плюс 7 дней', label_tj: 'Плюс 7 рӯз', sqlite: "date(d, '+7 day')", mysql: 'DATE_ADD(d, INTERVAL 7 DAY)', postgres: "d + INTERVAL '7 days'" },
          { label_ru: 'Сегодня', label_tj: 'Имрӯз', sqlite: "date('now')", mysql: 'CURDATE()', postgres: 'CURRENT_DATE' },
        ],
      },
      {
        title_ru: 'Таблицы и изменение данных',
        title_tj: 'Ҷадвалҳо ва тағйири маълумот',
        ru: 'Автоматический номер `id` и «вставить или обновить» записываются по-разному. Типы тоже отличаются: в SQLite нет настоящего `BOOLEAN` — только 0 и 1.',
        tj: 'Рақами худкори `id` ва «илова кун ё нав кун» гуногун навишта мешаванд. Навъҳо низ фарқ мекунанд: дар SQLite `BOOLEAN`-и ҳақиқӣ нест — танҳо 0 ва 1.',
        dialects: [
          { label_ru: 'Автонумерация id', label_tj: 'Рақамгузории худкори id', sqlite: 'id INTEGER PRIMARY KEY', mysql: 'id INT AUTO_INCREMENT PRIMARY KEY', postgres: 'id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY' },
          { label_ru: 'Добавить или обновить', label_tj: 'Илова ё навсозӣ', sqlite: 'ON CONFLICT(name) DO UPDATE SET price = excluded.price', mysql: 'ON DUPLICATE KEY UPDATE price = VALUES(price)', postgres: 'ON CONFLICT(name) DO UPDATE SET price = EXCLUDED.price' },
          { label_ru: 'Логический тип', label_tj: 'Навъи мантиқӣ', sqlite: 'by_window INTEGER  -- 0 / 1', mysql: 'by_window BOOLEAN  -- = TINYINT(1)', postgres: 'by_window BOOLEAN  -- true / false' },
        ],
      },
      {
        title_ru: 'Числа и NULL',
        title_tj: 'Ададҳо ва NULL',
        ru: 'Деление целых: в SQLite и PostgreSQL `7 / 2` даст 3, а в MySQL — 3.5. `COALESCE` работает везде — пользуйтесь им, а не `IFNULL` или `ISNULL`, и запрос будет переносимым.',
        tj: 'Тақсими ададҳои бутун: дар SQLite ва PostgreSQL `7 / 2` 3 медиҳад, дар MySQL бошад — 3.5. `COALESCE` дар ҳама ҷо кор мекунад — онро истифода баред, на `IFNULL` ё `ISNULL`, ва дархост интиқолпазир мешавад.',
        dialects: [
          { label_ru: '7 / 2', label_tj: '7 / 2', sqlite: '3', mysql: '3.5000', postgres: '3' },
          { label_ru: 'Дробное деление', label_tj: 'Тақсими касрӣ', sqlite: '7 / 2.0', mysql: '7 / 2', postgres: '7 / 2.0' },
          { label_ru: 'Замена NULL', label_tj: 'Ивази NULL', sqlite: "COALESCE(city, '—')", mysql: "COALESCE(city, '—')", postgres: "COALESCE(city, '—')" },
        ],
        sql: 'SELECT 7 / 2 AS sqlite_int, 7 / 2.0 AS sqlite_real',
      },
    ],
  },
);

export function getLesson(topic: string): Lesson | undefined {
  return LESSONS.find((l) => l.topic === topic);
}
