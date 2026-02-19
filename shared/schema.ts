import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  deviceId: text("device_id").notNull().unique(),
  name: text("name").notNull(),
  status: text("status").notNull().default("online"),
  lastSeen: integer("last_seen", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  phoneNumber: text("phone_number").notNull().unique(),
  name: text("name"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const smsTasks = sqliteTable("sms_tasks", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  deviceId: text("device_id").references(() => devices.id),
  contactId: text("contact_id").notNull().references(() => contacts.id),
  content: text("content").notNull(),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, failed
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const insertDeviceSchema = createInsertSchema(devices).pick({
  deviceId: true,
  name: true,
  status: true,
});

export const insertContactSchema = createInsertSchema(contacts).pick({
  phoneNumber: true,
  name: true,
});

export const insertSmsTaskSchema = createInsertSchema(smsTasks).pick({
  deviceId: true,
  contactId: true,
  content: true,
  scheduledAt: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export type InsertSmsTask = z.infer<typeof insertSmsTaskSchema>;
export type SmsTask = typeof smsTasks.$inferSelect;

// Legacy messages table
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  senderId: text("sender_id").notNull().references(() => users.id),
  receiverId: text("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull(),
  status: text("status").notNull().default("pending"),
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  senderId: true,
  receiverId: true,
  content: true,
  scheduledAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
