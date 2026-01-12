
import { pgTable, text, serial, integer, boolean, timestamp, unique, jsonb, doublePrecision, date, varchar, char, bigserial, bigint, index } from 'drizzle-orm/pg-core';

// --- Users Domain ---
export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    channel: integer('channel').default(0).notNull(), // 0:GOOGLE, 1:APPLE, 2:EMAIL
    email: varchar('email', { length: 128 }).unique(),
    phone: varchar('phone', { length: 20 }).unique().notNull(),
    phone_country: varchar('phone_country', { length: 5 }).notNull(),
    phone_verified: boolean('phone_verified').default(false),
    account_id: varchar('account_id', { length: 30 }).unique().notNull(),
    nickname: varchar('nickname', { length: 20 }),
    bio: text('bio'),
    link: text('link'),
    profile_image: text('profile_image'),
    visible_rank: integer('visible_rank').default(100),
    birthdate: date('birthdate'),
    gender: char('gender', { length: 1 }), // M, F, N
    // Adding taste_cluster to support existing code in users.ts, though spec prefers users_taste table
    taste_cluster: varchar('taste_cluster', { length: 10 }),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
    account_id_idx: index('idx_users_account_id').on(table.account_id),
    email_idx: index('idx_users_email').on(table.email),
    phone_idx: index('idx_users_phone').on(table.phone),
}));

export const phone_verifications = pgTable('phone_verifications', {
    id: serial('id').primaryKey(),
    phone: varchar('phone', { length: 20 }).notNull(),
    country_code: varchar('country_code', { length: 5 }).notNull(),
    code: varchar('code', { length: 6 }).notNull(),
    expires_at: timestamp('expires_at').notNull(),
    attempts: integer('attempts').default(0),
    is_verified: boolean('is_verified').default(false),
    created_at: timestamp('created_at').defaultNow(),
    verified_at: timestamp('verified_at'),
}, (table) => ({
    phone_verified_idx: index('idx_phone_verify_phone').on(table.phone, table.is_verified),
}));

export const users_taste = pgTable('users_taste', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    taste_profile: jsonb('taste_profile'),
    cluster_profile: jsonb('cluster_profile'),
    avoid_food: jsonb('avoid_food'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
    user_id_idx: index('idx_users_taste_user_id').on(table.user_id),
}));

export const users_follow = pgTable('users_follow', {
    id: serial('id').primaryKey(),
    follower_id: integer('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    following_id: integer('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at').defaultNow(),
}, (table) => ({
    unique_follow: unique().on(table.follower_id, table.following_id),
    follower_idx: index('idx_follow_follower').on(table.follower_id),
    following_idx: index('idx_follow_following').on(table.following_id),
}));


// --- Shops Domain ---
export const shops = pgTable('shops', {
    id: serial('id').primaryKey(),
    catchtable_id: integer('catchtable_id'),
    catchtable_ref: text('catchtable_ref'),

    name: text('name').notNull(),
    description: text('description'),
    address: text('address'),
    address_region: text('address_region'),

    name_i18n: jsonb('name_i18n'),
    description_i18n: jsonb('description_i18n'),
    address_i18n: jsonb('address_i18n'),

    kind: text('kind'),
    food_kind: text('food_kind'),
    lat: doublePrecision('lat'),
    lon: doublePrecision('lon'),
    thumbnail_img: text('thumbnail_img'),
    sub_img: jsonb('sub_img'),
    menu: jsonb('menu'),
    status: integer('status').default(2),
    country_code: varchar('country_code', { length: 5 }),
    visibility: boolean('visibility').default(true),

    // Derived fields for matching
    estimated_taste: jsonb('estimated_taste'),
    taste_sample_count: integer('taste_sample_count').default(0),

    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
    food_kind_idx: index('idx_shops_food_kind').on(table.food_kind),
}));

// --- Content Domain ---
export const content = pgTable('content', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(), // 'review', 'post'
    img: jsonb('img'),
    video: jsonb('video'),
    text: text('text'),
    review_prop: jsonb('review_prop'), // { shop_id, visit_date, companions, satisfaction }
    keyword: jsonb('keyword'),
    visibility: boolean('visibility').default(true),
    is_deleted: boolean('is_deleted').default(false),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
    user_id_idx: index('idx_content_user').on(table.user_id),
    created_at_idx: index('idx_content_created').on(table.created_at),
}));

export const comments = pgTable('comments', {
    id: serial('id').primaryKey(),
    content_id: integer('content_id').notNull().references(() => content.id, { onDelete: 'cascade' }),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    parent_id: integer('parent_id'),
    mention_user_id: integer('mention_user_id').references(() => users.id),
    text: text('text'),
    img: jsonb('img'),
    video: jsonb('video'),
    is_deleted: boolean('is_deleted').default(false),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
    content_id_idx: index('idx_comments_content').on(table.content_id),
}));

export const likes = pgTable('likes', {
    id: serial('id').primaryKey(),
    target_type: varchar('target_type', { length: 20 }).notNull(), // 'content', 'comment'
    target_id: integer('target_id').notNull(),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at').defaultNow(),
}, (table) => ({
    unique_like: unique().on(table.target_type, table.target_id, table.user_id),
    target_idx: index('idx_likes_target').on(table.target_type, table.target_id),
}));

// --- Ranking & MyList Domain ---
export const users_wantstogo = pgTable('users_wantstogo', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    shop_id: integer('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    channel: text('channel'),
    folder: text('folder'),
    memo: text('memo'),
    visibility: boolean('visibility').default(true),
    is_deleted: boolean('is_deleted').default(false),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
    unique_wantstogo: unique().on(table.user_id, table.shop_id),
    user_id_idx: index('idx_wantstogo_user').on(table.user_id),
}));

export const users_ranking = pgTable('users_ranking', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    shop_id: integer('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    sort_key: doublePrecision('sort_key').notNull(), // Lower is better
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
    unique_ranking: unique().on(table.user_id, table.shop_id),
    user_sort_idx: index('idx_ranking_user_sort').on(table.user_id, table.sort_key),
}));

export const users_lists = pgTable('users_lists', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'manual', 'auto'
    title: text('title').notNull(),
    description: text('description'),
    img: text('img'),
    rules: jsonb('rules'),
    visibility: boolean('visibility').default(true),
    is_deleted: boolean('is_deleted').default(false),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

export const users_list_items = pgTable('users_list_items', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lists_id: integer('lists_id').notNull().references(() => users_lists.id, { onDelete: 'cascade' }),
    shops_id: integer('shops_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    content_id: integer('content_id').references(() => content.id),
    sort_key: doublePrecision('sort_key'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

// --- Gamification Domain ---
export const users_exp_totals = pgTable('users_exp_totals', {
    user_id: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    lifetime_xp: bigint('lifetime_xp', { mode: 'number' }).default(0),
    updated_at: timestamp('updated_at').defaultNow(),
}, (table) => ({
    xp_idx: index('idx_exp_totals_xp').on(table.lifetime_xp),
}));

export const users_exp_event = pgTable('users_exp_event', {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    event_type: text('event_type').notNull(),
    object_type: text('object_type').notNull(),
    object_id: integer('object_id').notNull(),
    delta_exp: integer('delta_exp').notNull(),
    created_at: timestamp('created_at').defaultNow(),
});

// --- Terms Domain ---
export const terms = pgTable('terms', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    code: varchar('code', { length: 50 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    content: text('content').notNull(),
    summary: text('summary'),
    is_required: boolean('is_required').default(true).notNull(),
    version: varchar('version', { length: 20 }).notNull(),
    country_code: varchar('country_code', { length: 5 }).default('ALL'),
    effective_date: date('effective_date').notNull(),
    is_active: boolean('is_active').default(true),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

export const user_term_agreements = pgTable('user_term_agreements', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    term_id: bigint('term_id', { mode: 'number' }).notNull().references(() => terms.id),
    term_version: varchar('term_version', { length: 20 }).notNull(),
    is_agreed: boolean('is_agreed').default(true).notNull(),
    agreed_at: timestamp('agreed_at').defaultNow(),
    ip_address: text('ip_address'),
    user_agent: text('user_agent'),
}, (table) => ({
    unique_agreement: unique().on(table.user_id, table.term_id, table.term_version),
}));

// --- Quiz/Clusters Domain (Support existing code) ---
export const clusters = pgTable('clusters', {
    id: serial('id').primaryKey(),
    cluster_id: integer('cluster_id').unique().notNull(),
    name: text('name').notNull(),
    tagline: text('tagline'),
    medoid_value: text('medoid_value'), // "0,0,0..."

    // name_i18n: jsonb('name_i18n'),
    // tagline_i18n: jsonb('tagline_i18n'),

    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

export const quiz_matches = pgTable('quiz_matches', {
    id: serial('id').primaryKey(),
    vector: text('vector').notNull(), // "0,0,0,0,0,0,0" (7 dims)
    cluster_id: integer('cluster_id').notNull(),
}, (table) => ({
    unique_vector: unique().on(table.vector),
}));
