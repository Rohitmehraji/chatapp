import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, or, lt, desc } from "drizzle-orm";
import { Pool } from "pg";
import {
  type User,
  type InsertUser,
  type Message,
  type InsertMessage,
  users,
  messages,
} from "@shared/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export async function getUser(id: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.id, id));
  return result[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.email, email));
  return result[0];
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.username, username));
  return result[0];
}

export async function createUser(user: InsertUser): Promise<User> {
  const result = await db.insert(users).values(user).returning();
  return result[0];
}

export async function getAllUsers(): Promise<User[]> {
  return db.select().from(users);
}

export async function createMessage(message: InsertMessage): Promise<Message> {
  const result = await db.insert(messages).values({
    ...message,
    status: "pending",
  }).returning();
  return result[0];
}

export async function getMessagesForUser(userId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
    .orderBy(desc(messages.createdAt));
}

export async function getMessagesBetweenUsers(
  userId1: string,
  userId2: string
): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      )
    )
    .orderBy(messages.createdAt);
}

export async function deliverScheduledMessages(): Promise<number> {
  const now = new Date();
  const result = await db
    .update(messages)
    .set({ status: "delivered" })
    .where(and(eq(messages.status, "pending"), lt(messages.scheduledAt, now)))
    .returning();
  return result.length;
}

export async function getPendingMessagesForUser(userId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.status, "pending"),
        or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
      )
    )
    .orderBy(desc(messages.createdAt));
}

export async function getDeliveredMessagesForUser(userId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.status, "delivered"),
        or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
      )
    )
    .orderBy(desc(messages.createdAt));
}
