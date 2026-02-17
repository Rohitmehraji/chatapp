import type { Express } from "express";
import { createServer, type Server } from "node:http";
import bcrypt from "bcryptjs";
import {
  createUser,
  getUserByEmail,
  getUser,
  getAllUsers,
  createMessage,
  getMessagesBetweenUsers,
  deliverScheduledMessages,
  getPendingMessagesForUser,
  getDeliveredMessagesForUser,
} from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await createUser({
        username,
        email,
        password: hashedPassword,
      });

      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error: any) {
      if (error?.constraint === "users_username_unique") {
        return res.status(409).json({ message: "Username already taken" });
      }
      console.error("Register error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/users", async (_req, res) => {
    try {
      const allUsers = await getAllUsers();
      const safeUsers = allUsers.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
      }));
      return res.json(safeUsers);
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json({
        id: user.id,
        username: user.username,
        email: user.email,
      });
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { senderId, receiverId, content } = req.body;
      if (!senderId || !receiverId || !content) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const scheduledAt = new Date(Date.now() + 5 * 60 * 1000);

      const message = await createMessage({
        senderId,
        receiverId,
        content,
        scheduledAt,
      });

      return res.json(message);
    } catch (error) {
      console.error("Send message error:", error);
      return res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get("/api/messages/:userId1/:userId2", async (req, res) => {
    try {
      const msgs = await getMessagesBetweenUsers(
        req.params.userId1,
        req.params.userId2
      );
      return res.json(msgs);
    } catch (error) {
      console.error("Get messages error:", error);
      return res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/pending/:userId", async (req, res) => {
    try {
      const msgs = await getPendingMessagesForUser(req.params.userId);
      return res.json(msgs);
    } catch (error) {
      console.error("Get pending error:", error);
      return res.status(500).json({ message: "Failed to fetch pending messages" });
    }
  });

  app.get("/api/messages/delivered/:userId", async (req, res) => {
    try {
      const msgs = await getDeliveredMessagesForUser(req.params.userId);
      return res.json(msgs);
    } catch (error) {
      console.error("Get delivered error:", error);
      return res.status(500).json({ message: "Failed to fetch delivered messages" });
    }
  });

  setInterval(async () => {
    try {
      const count = await deliverScheduledMessages();
      if (count > 0) {
        console.log(`Delivered ${count} scheduled messages`);
      }
    } catch (error) {
      console.error("Scheduler error:", error);
    }
  }, 10000);

  const httpServer = createServer(app);
  return httpServer;
}
