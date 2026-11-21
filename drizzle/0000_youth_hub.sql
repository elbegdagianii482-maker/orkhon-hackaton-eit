CREATE TABLE profiles (
  id TEXT PRIMARY KEY NOT NULL,
  secret_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  age INTEGER,
  grade TEXT,
  bio TEXT
);
--> statement-breakpoint
CREATE TABLE clubs (
  id TEXT PRIMARY KEY NOT NULL,
  teacher_id TEXT NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity BETWEEN 1 AND 10000),
  schedule TEXT NOT NULL,
  fee INTEGER NOT NULL CHECK (fee >= 0),
  location TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX clubs_teacher ON clubs (teacher_id);
--> statement-breakpoint
-- Catalog examples use code-defined IDs. The API validates both those and published clubs.
CREATE TABLE enrollments (
  club_id TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES profiles(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (club_id, student_id)
);
--> statement-breakpoint
CREATE INDEX enrollments_student ON enrollments (student_id);
