import { pgTable, text, serial, integer, boolean, timestamp, varchar, date } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    channel: integer("channel").notNull().default(0), // 0:GOOGLE, 1:APPLE, 2:EMAIL
    email: varchar("email", { length: 128 }).unique(),
    phone: varchar("phone", { length: 20 }).unique().notNull(),
    phone_country: varchar("phone_country", { length: 5 }).notNull(),
    phone_verified: boolean("phone_verified").default(false),
    account_id: varchar("account_id", { length: 30 }).unique().notNull(),
    nickname: varchar("nickname", { length: 20 }),
    bio: text("bio"),
    link: text("link"),
    profile_image: text("profile_image"),
    visible_rank: integer("visible_rank").default(100),
    birthdate: date("birthdate"),
    gender: varchar("gender", { length: 1 }), // M, F, N
    taste_cluster: varchar("taste_cluster", { length: 50 }),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
});

export const terms = pgTable("terms", {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    summary: text("summary"),
    is_required: boolean("is_required").notNull().default(true),
    version: varchar("version", { length: 20 }).notNull(),
    country_code: varchar("country_code", { length: 5 }).default('ALL'),
    effective_date: date("effective_date").notNull(),
    is_active: boolean("is_active").default(true),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
});

export const clusters = pgTable("clusters", {
    id: serial("id").primaryKey(),
    cluster_id: integer("cluster_id").unique().notNull(), // Logical ID from JSON
    name: varchar("name", { length: 100 }).notNull(),
    tagline: text("tagline"),
    medoid_value: varchar("medoid_value", { length: 100 }),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
});

// Using vector as PK because it is unique and used for lookup
export const quiz_matches = pgTable("quiz_matches", {
    vector: varchar("vector", { length: 50 }).primaryKey(), // "-2,-2,-2,..."
    cluster_id: integer("cluster_id").notNull(), // FK to clusters.cluster_id logically (not enforced if not seeded yet)
});
