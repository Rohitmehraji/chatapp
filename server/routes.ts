import type { Express } from "express";
import { createServer, type Server } from "node:http";
import bcrypt from "bcryptjs";
import multer from "multer";
import * as XLSX from "xlsx";
import { parse as parseCsv } from "csv-parse/sync";
import cron from "node-cron";
import {
  createUser,
  getUserByEmail,
  getUser,
  getAllUsers,
  createMessage,
  getMessagesBetweenUsers,
  getAllDevices,
  getDeviceByDeviceId,
  createDevice,
  updateDeviceSeen,
  getAllContacts,
  getContactByPhone,
  createContact,
  createContacts,
  createSmsTask,
  getAllSmsTasks,
  getPendingSmsTasks,
  updateSmsTaskStatus,
  getDashboardStats,
} from "./storage";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth Routes
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

  // Device Routes
  app.get("/api/devices", async (_req, res) => {
    try {
      const devices = await getAllDevices();
      return res.json(devices);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.post("/api/devices", async (req, res) => {
    try {
      const { deviceId, name } = req.body;
      if (!deviceId || !name) {
        return res.status(400).json({ message: "Device ID and name required" });
      }

      let device = await getDeviceByDeviceId(deviceId);
      if (!device) {
        device = await createDevice({ deviceId, name, status: "online" });
      } else {
        await updateDeviceSeen(device.id);
      }
      return res.json(device);
    } catch (error) {
      console.error("Device register error:", error);
      return res.status(500).json({ message: "Failed to register device" });
    }
  });

  // Contact Routes
  app.get("/api/contacts", async (_req, res) => {
    try {
      const contacts = await getAllContacts();
      return res.json(contacts);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const { phoneNumber, name } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number required" });
      }
      // Simple validation
      if (!/^\+?[\d\s-]{10,}$/.test(phoneNumber)) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }

      const existing = await getContactByPhone(phoneNumber);
      if (existing) {
        return res.json(existing);
      }

      const contact = await createContact({ phoneNumber, name });
      return res.json(contact);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.post("/api/contacts/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      let data: any[] = [];
      const filename = req.file.originalname.toLowerCase();

      if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet);
      } else if (filename.endsWith(".csv")) {
        data = parseCsv(req.file.buffer, {
          columns: true,
          skip_empty_lines: true,
        });
      } else {
        return res.status(400).json({ message: "Unsupported file format" });
      }

      const contactsToCreate = data
        .map((row: any) => {
          const phoneNumber = String(row.phoneNumber || row.phone || row.Mobile || "").trim();
          const name = String(row.name || row.Name || "").trim();
          return { phoneNumber, name };
        })
        .filter((c) => /^\+?[\d\s-]{10,}$/.test(c.phoneNumber));

      if (contactsToCreate.length === 0) {
        return res.status(400).json({ message: "No valid contacts found in file" });
      }

      const created = await createContacts(contactsToCreate);
      return res.json({ message: `Successfully imported ${created.length} contacts`, count: created.length });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ message: "Failed to process file" });
    }
  });

  // SMS Task Routes
  app.get("/api/schedules", async (_req, res) => {
    try {
      const tasks = await getAllSmsTasks();
      return res.json(tasks);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post("/api/schedules", async (req, res) => {
    try {
      const { deviceId, contactId, content, scheduledAt } = req.body;
      if (!contactId || !content || !scheduledAt) {
        return res.status(400).json({ message: "Contact, content, and schedule time required" });
      }

      // Word count validation
      const wordCount = content.trim().split(/\s+/).length;
      if (wordCount > 20) {
        return res.status(400).json({ message: "Message cannot exceed 20 words" });
      }

      const task = await createSmsTask({
        deviceId,
        contactId,
        content,
        scheduledAt: new Date(scheduledAt),
        status: "pending",
      });

      return res.json(task);
    } catch (error) {
      console.error("Create schedule error:", error);
      return res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  // Stats Routes
  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await getDashboardStats();
      return res.json(stats);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/stats/export", async (_req, res) => {
    try {
      const tasks = await getAllSmsTasks();
      const csvRows = [
        ["ID", "Contact", "Phone", "Content", "Scheduled At", "Status", "Error"],
      ];

      tasks.forEach((t) => {
        csvRows.push([
          t.id,
          t.contact?.name || "",
          t.contact?.phoneNumber || "",
          t.content.replace(/"/g, '""'),
          t.scheduledAt.toISOString(),
          t.status,
          t.error || "",
        ]);
      });

      const csvContent = csvRows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=sms_report.csv");
      return res.send(csvContent);
    } catch (error) {
      return res.status(500).json({ message: "Failed to export report" });
    }
  });

  // Legacy/Chat Routes (optional to keep)
  app.post("/api/messages", async (req, res) => {
    try {
      const { senderId, receiverId, content } = req.body;
      if (!senderId || !receiverId || !content) {
        return res.status(400).json({ message: "All fields are required" });
      }
      const scheduledAt = new Date(Date.now() + 5 * 60 * 1000);
      const message = await createMessage({ senderId, receiverId, content, scheduledAt });
      return res.json(message);
    } catch (error) {
      return res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Background Worker
  cron.schedule("* * * * *", async () => {
    try {
      const pendingTasks = await getPendingSmsTasks();
      for (const task of pendingTasks) {
        console.log(`Processing SMS task ${task.id} to contact ${task.contactId}`);
        // Simulate sending SMS
        // In a real scenario, you'd call Twilio here or push to a device
        try {
          // Mock success
          await updateSmsTaskStatus(task.id, "sent");
          console.log(`Successfully sent SMS task ${task.id}`);
        } catch (err: any) {
          await updateSmsTaskStatus(task.id, "failed", err.message);
          console.error(`Failed to send SMS task ${task.id}:`, err);
        }
      }
    } catch (error) {
      console.error("Cron error:", error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
