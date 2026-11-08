-- db/maktab-schema.sql — учебная база «Мактаб»: школа в Душанбе.
-- Классы, ученики, предметы и оценки (по пятибалльной системе, 2–5).

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS classes;

-- Классы и их классные руководители
CREATE TABLE classes (
  id      INTEGER PRIMARY KEY,
  name    TEXT NOT NULL UNIQUE,
  teacher TEXT NOT NULL
);

-- Ученики. gender: 'м' или 'ж'. phone может быть NULL — номер не указан
CREATE TABLE students (
  id         INTEGER PRIMARY KEY,
  name       TEXT    NOT NULL CHECK (length(trim(name)) > 0),
  class_id   INTEGER NOT NULL REFERENCES classes(id),
  gender     TEXT    NOT NULL CHECK (gender IN ('м', 'ж')),
  birth_date TEXT    NOT NULL CHECK (birth_date = date(birth_date)),
  phone      TEXT
);

-- Предметы и часы в неделю
CREATE TABLE subjects (
  id             INTEGER PRIMARY KEY,
  name           TEXT    NOT NULL UNIQUE,
  hours_per_week INTEGER NOT NULL CHECK (hours_per_week BETWEEN 1 AND 8)
);

-- Оценки: кто, по какому предмету, какая и когда
CREATE TABLE grades (
  id         INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id),
  subject_id INTEGER NOT NULL REFERENCES subjects(id),
  grade      INTEGER NOT NULL CHECK (grade BETWEEN 2 AND 5),
  graded_on  TEXT    NOT NULL CHECK (graded_on = date(graded_on))
);

CREATE INDEX idx_students_class  ON students(class_id);
CREATE INDEX idx_grades_student  ON grades(student_id);
CREATE INDEX idx_grades_subject  ON grades(subject_id);
