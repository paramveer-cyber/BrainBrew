import { pgTable, text, timestamp, integer, uuid, jsonb, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  googleId: text("google_id").unique().notNull(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  refreshToken: text("refresh_token"),
  googleAccessToken: text("google_access_token"),
  googleTokenExpiry: timestamp("google_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 20 }).unique().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chapters = pgTable("chapters", {
  id: uuid("id").defaultRandom().primaryKey(),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  classLevel: varchar("class_level", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id),
  difficulty: varchar("difficulty", { length: 20 }).notNull(), // easy|medium|difficult|extreme
  questionText: text("question_text").notNull(),
  options: jsonb("options"), // array of strings for MCQ
  answer: text("answer").notNull(),
  explanation: text("explanation"),
  marks: integer("marks").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const generatedTests = pgTable("generated_tests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  subjectId: uuid("subject_id").notNull().references(() => subjects.id),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  classLevel: varchar("class_level", { length: 20 }).notNull(),
  config: jsonb("config").notNull(), // { easy, medium, difficult, extreme }
  questionIds: jsonb("question_ids").notNull(), // array of question ids
  title: varchar("title", { length: 300 }),
  status: varchar("status", { length: 20 }).default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});