import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  decimal,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "owner", "admin", "founder"]);
export const planEnum = pgEnum("plan", ["free", "pro"]);
export const businessStatusEnum = pgEnum("business_status", ["pending", "approved", "rejected"]);
export const dayEnum = pgEnum("day", ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]);
export const truckTypeEnum = pgEnum("truck_type", ["food"]);

// Avatar and subscription plan only make sense for food truck owners — regular
// users, admins and the founder never have either, so those columns live on
// the separate `ownerProfiles` table below instead of cluttering every account.
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

// One-to-one extension of `users`, only ever populated for accounts with
// role = "owner" (truck owners). Holds the profile picture and the
// subscription plan/expiry — none of which apply to users, admins or the founder.
export const ownerProfiles = pgTable("owner_profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  avatar: text("avatar"),
  plan: planEnum("plan").default("free").notNull(),
  planExpiresAt: timestamp("plan_expires_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  nameFa: varchar("name_fa", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 100 }),
  color: varchar("color", { length: 50 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  logo: text("logo"),
  coverImage: text("cover_image"),
  truckType: truckTypeEnum("truck_type").notNull().default("food"),
  city: varchar("city", { length: 100 }).default("تهران").notNull(),
  locationText: text("location_text").notNull(),
  locationLink: text("location_link"),
  phone: varchar("phone", { length: 50 }),
  instagram: varchar("instagram", { length: 100 }),
  website: varchar("website", { length: 255 }),
  // Private ownership-verification photo of the actual truck, uploaded during onboarding.
  // It is NEVER exposed through public endpoints — only admins/founder see it when reviewing
  // a submission, so they can confirm the business is real before approving it.
  verificationPhoto: text("verification_photo"),
  status: businessStatusEnum("status").default("pending").notNull(),
  isOpen: boolean("is_open").default(false).notNull(),
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0"),
  reviewCount: integer("review_count").default(0),
  views: integer("views").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const businessCategories = pgTable("business_categories", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const businessHours = pgTable("business_hours", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  day: dayEnum("day").notNull(),
  openTime: varchar("open_time", { length: 10 }),
  closeTime: varchar("close_time", { length: 10 }),
  isClosed: boolean("is_closed").default(false).notNull(),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 0 }).notNull(),
  image: text("image"),
  isAvailable: boolean("is_available").default(true).notNull(),
  category: varchar("category", { length: 100 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const businessPhotos = pgTable("business_photos", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: varchar("caption", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  // One review per user per business — enforced at the database level.
  oneReviewPerUserPerBusiness: uniqueIndex("reviews_business_user_unique").on(table.businessId, table.userId),
}));

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});


