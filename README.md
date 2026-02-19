# SMS Scheduling Application

A fully functional SMS Scheduling Application built with Expo (React Native) and Node.js (Express + Drizzle ORM + SQLite).

## Features

- **Device Management**: Automatically registers the current device and allows multiple devices to be listed.
- **Contact Management**:
  - Add contacts manually.
  - Bulk upload via Excel (.xlsx) or CSV.
  - Validation for phone numbers and duplicate removal.
- **SMS Scheduling**:
  - Write messages with a 20-word limit.
  - Live word counter and validation.
  - Schedule messages for a custom future date/time.
- **Send SMS**:
  - Background worker (node-cron) processes tasks.
  - Tracks status (Pending, Sent, Failed).
- **Dashboard**:
  - Summary stats (Total Contacts, Scheduled, Sent, Failed, Pending).
  - Export SMS logs to CSV.

## Project Structure

- `/app`: Expo Router screens (Dashboard, Contacts, Devices, Schedule, Logs).
- `/server`: Node.js Express backend and storage logic.
- `/shared`: Shared database schema and types.
- `/components`: Reusable UI components.
- `/lib`: Helper functions and context providers (Auth, Query Client).

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
The project uses SQLite for local development. Initialize the database schema:
```bash
npx drizzle-kit push
```

### 3. Run Backend Server
```bash
npm run server:dev
```
The server runs on `http://localhost:5000`.

### 4. Run Expo Frontend
```bash
npm start
# OR for web specifically:
npx expo start --web
```
The frontend runs on `http://localhost:8081`.

## Step-by-Step Local Testing Guide

1. **Register/Login**: Open the app and create an account or sign in.
2. **Register Device**: Navigate to the **Devices** tab. Your current device will be automatically registered.
3. **Add Contacts**:
   - Go to the **Contacts** tab.
   - Add a contact manually or upload a sample CSV/Excel file.
4. **Schedule SMS**:
   - Go to the **Schedule** tab.
   - Select a contact and a sending device.
   - Write a message (ensure it's under 20 words).
   - Set a delay (e.g., 1 minute) and click **Schedule Message**.
5. **Monitor Logs**:
   - Go to the **Logs** tab to see the "Pending" status.
   - Wait for the background worker (runs every minute) to process the task.
   - Refresh or wait for auto-update to see the status change to "Sent".
6. **Dashboard Stats**:
   - Check the **Dashboard** tab to see updated statistics and export the report if needed.

## Environment Variables
Create a `.env` file in the root if you want to customize settings:
- `PORT`: Server port (default: 5000)
- `DATABASE_URL`: Postgres URL (optional, defaults to local SQLite `sqlite.db`)
