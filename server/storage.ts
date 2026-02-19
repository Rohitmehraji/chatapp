import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, and, or, lt, desc, sql } from "drizzle-orm";
import Database from "better-sqlite3";
import {
  type User,
  type InsertUser,
  type Message,
  type InsertMessage,
  type Device,
  type InsertDevice,
  type Contact,
  type InsertContact,
  type SmsTask,
  type InsertSmsTask,
  users,
  messages,
  devices,
  contacts,
  smsTasks,
} from "@shared/schema";

const sqlite = new Database("sqlite.db");
export const db = drizzle(sqlite);

// Initialize tables if they don't exist (Drizzle push is preferred but this is a quick fix for local dev)
// Note: In a real project you'd use drizzle-kit push

// Users
export async function getUser(id: string): Promise<User | undefined> {
  const result = db.select().from(users).where(eq(users.id, id)).get();
  return result;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = db.select().from(users).where(eq(users.email, email)).get();
  return result;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const result = db.select().from(users).where(eq(users.username, username)).get();
  return result;
}

export async function createUser(user: InsertUser): Promise<User> {
  const result = db.insert(users).values(user).returning().get();
  return result;
}

// Devices
export async function getAllDevices(): Promise<Device[]> {
  return db.select().from(devices).orderBy(desc(devices.createdAt)).all();
}

export async function getDeviceByDeviceId(deviceId: string): Promise<Device | undefined> {
  const result = db.select().from(devices).where(eq(devices.deviceId, deviceId)).get();
  return result;
}

export async function createDevice(device: InsertDevice): Promise<Device> {
  const result = db.insert(devices).values(device).returning().get();
  return result;
}

export async function updateDeviceSeen(id: string): Promise<void> {
  db.update(devices)
    .set({ lastSeen: new Date() })
    .where(eq(devices.id, id))
    .run();
}

// Contacts
export async function getAllContacts(): Promise<Contact[]> {
  return db.select().from(contacts).orderBy(desc(contacts.createdAt)).all();
}

export async function getContactByPhone(phone: string): Promise<Contact | undefined> {
  const result = db.select().from(contacts).where(eq(contacts.phoneNumber, phone)).get();
  return result;
}

export async function createContact(contact: InsertContact): Promise<Contact> {
  const result = db.insert(contacts).values(contact).returning().get();
  return result;
}

export async function createContacts(contactsList: InsertContact[]): Promise<Contact[]> {
  if (contactsList.length === 0) return [];
  const results: Contact[] = [];
  for (const c of contactsList) {
    try {
      const res = db.insert(contacts).values(c).onConflictDoNothing().returning().get();
      if (res) results.push(res);
    } catch (e) {
      // Ignore duplicates
    }
  }
  return results;
}

// SMS Tasks
export async function createSmsTask(task: InsertSmsTask): Promise<SmsTask> {
  const result = db.insert(smsTasks).values(task).returning().get();
  return result;
}

export async function getAllSmsTasks(): Promise<(SmsTask & { contact: Contact | null; device: Device | null })[]> {
  const result = db
    .select({
      task: smsTasks,
      contact: contacts,
      device: devices,
    })
    .from(smsTasks)
    .leftJoin(contacts, eq(smsTasks.contactId, contacts.id))
    .leftJoin(devices, eq(smsTasks.deviceId, devices.id))
    .orderBy(desc(smsTasks.createdAt))
    .all();

  return result.map((r) => ({
    ...r.task,
    contact: r.contact,
    device: r.device,
  }));
}

export async function getPendingSmsTasks(): Promise<SmsTask[]> {
  const now = new Date();
  return db
    .select()
    .from(smsTasks)
    .where(and(eq(smsTasks.status, "pending"), lt(smsTasks.scheduledAt, now)))
    .all();
}

export async function updateSmsTaskStatus(id: string, status: string, error?: string): Promise<void> {
  db.update(smsTasks)
    .set({ status, error: error || null })
    .where(eq(smsTasks.id, id))
    .run();
}

// Stats
export async function getDashboardStats() {
  const totalContacts = db.select({ count: sql<number>`count(*)` }).from(contacts).get();
  const totalSmsScheduled = db.select({ count: sql<number>`count(*)` }).from(smsTasks).get();
  const totalSent = db
    .select({ count: sql<number>`count(*)` })
    .from(smsTasks)
    .where(eq(smsTasks.status, "sent"))
    .get();
  const totalFailed = db
    .select({ count: sql<number>`count(*)` })
    .from(smsTasks)
    .where(eq(smsTasks.status, "failed"))
    .get();
  const totalPending = db
    .select({ count: sql<number>`count(*)` })
    .from(smsTasks)
    .where(eq(smsTasks.status, "pending"))
    .get();

  return {
    totalContacts: Number(totalContacts?.count || 0),
    totalSmsScheduled: Number(totalSmsScheduled?.count || 0),
    totalSent: Number(totalSent?.count || 0),
    totalFailed: Number(totalFailed?.count || 0),
    totalPending: Number(totalPending?.count || 0),
  };
}

// Compatibility with existing messages logic
export async function createMessage(message: InsertMessage): Promise<Message> {
  const result = db.insert(messages).values({
    ...message,
    status: "pending",
  }).returning().get();
  return result;
}

export async function getMessagesForUser(userId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
    .orderBy(desc(messages.createdAt))
    .all();
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
    .orderBy(messages.createdAt)
    .all();
}

export async function deliverScheduledMessages(): Promise<number> {
  const now = new Date();
  const result = db
    .update(messages)
    .set({ status: "delivered" })
    .where(and(eq(messages.status, "pending"), lt(messages.scheduledAt, now)))
    .returning()
    .all();
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
    .orderBy(desc(messages.createdAt))
    .all();
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
    .orderBy(desc(messages.createdAt))
    .all();
}
