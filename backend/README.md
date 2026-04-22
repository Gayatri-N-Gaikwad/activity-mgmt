# Activity Management System - Backend

This is the backend API for the Activity Management System, built with Node.js and Express.

## 🚀 Key Features
- **RESTful API**: Structured endpoints for users, activities, marks, and rubrics.
- **Excel Processing**: Handles complex marks distribution and bulk uploads using ExcelJS and XLSX.
- **Automated Tasks**: Scheduled notifications and data processing via Node-cron.
- **Secure Auth**: Role-based access control with JWT and Bcrypt.

## 🛠️ Tech Stack
- **Node.js & Express**: Server framework.
- **MongoDB & Mongoose**: Database and ODM.
- **Nodemailer**: Email communication.
- **ExcelJS/XLSX**: Spreadsheet manipulation.

## 📂 Structure
- `src/controllers`: Business logic and request handling.
- `src/models`: Database schemas.
- `src/routes`: API endpoint definitions.
- `src/utils`: Helper functions for Email, and PDF parsing.
- `src/config`: Database and mailer configurations.

## 🏃 Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env`:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   ```
3. Start the server:
   ```bash
   npm run dev
   ```

## 🔗 Related
- [Root Documentation](../README.md)
- [Frontend Documentation](../frontend/README.md)
