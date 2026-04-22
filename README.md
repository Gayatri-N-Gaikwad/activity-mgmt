# Activity Management System

## 🚀 Overview
The **Activity Management System** is a comprehensive platform designed to streamline the academic lifecycle of student activities, attendance tracking, and marks management. It empowers faculty members with automated tools and visual analytics to enhance administrative efficiency and student performance tracking.

---

## 🛑 Problem Statement
In traditional academic settings, managing student activities and performance data is often fragmented and labor-intensive. Faculty members face several pain points:
- **Manual Data Entry**: Time-consuming manual entry of marks and attendance.
- **Error-Prone Bulk Uploads**: Difficulties in handling Excel-based marks distribution, especially when rubrics or subdivisions are missing.
- **Fragmented Attendance Tracking**: Challenges in updating marks for students who were previously marked absent.
- **Lack of Insights**: Absence of real-time visual analytics to monitor class performance trends and activity lifecycles.
- **Administrative Burden**: High overhead in generating reports and notifying students about their performance.

---

## ✨ Key Features
- **Smart Activity Creation**: Easily create activities with customizable marks subdivisions and rubrics.
- **Automated Marks Distribution**: Support for bulk marks upload via Excel with automatic fallback to default rubrics.
- **Faculty Statistics Dashboard**: 
    - Visual analytics for performance trends.
    - Student attendance and activity lifecycle tracking.
    - "To-Do" style pending marks reports.
- **Manual Marks Entry**: Direct interface for updating attendance and adding marks for previously absent students.
- **Seamless Communication**: Automated email notifications via Nodemailer and scheduled tasks using Node-cron.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React.js](https://reactjs.org/) (v19)
- **State Management & API**: [Axios](https://axios-http.com/)
- **Routing**: [React Router DOM](https://reactrouter.com/)
- **Visualizations**: [Recharts](https://recharts.org/) (Performance Trends & Analytics)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Modern, responsive CSS with a focus on professional aesthetics.

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Web Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) ODM
- **Authentication**: JWT (JSON Web Tokens) & Bcrypt.js
- **File Handling**: [ExcelJS](https://github.com/exceljs/exceljs), [XLSX](https://github.com/SheetJS/sheetjs), and [Multer](https://github.com/expressjs/multer)

### Services
- **Email Service**: [Nodemailer](https://nodemailer.com/)
- **Automation**: [Node-cron](https://github.com/node-cron/node-cron)
- **Document Parsing**: [PDF-parse](https://www.npmjs.com/package/pdf-parse)

---

## 📂 Project Structure
```text
activity-mgmt/
├── backend/            # Express.js server and API logic
│   ├── src/
│   │   ├── controllers/# Business logic
│   │   ├── models/     # Mongoose schemas (User, Activity, Marks, etc.)
│   │   ├── routes/     # API endpoints
│   │   └── utils/      # Helpers (Email, etc.)
├── frontend/           # React.js application
│   ├── src/
│   │   ├── components/ # Reusable UI elements
│   │   ├── pages/      # Dashboard, Create Activity, Add Marks, etc.
│   │   └── utils/      # API configurations and helpers
└── README.md           # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (Local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Gayatri-N-Gaikwad/activity-mgmt.git
   cd activity-mgmt
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   # Create a .env file and add your credentials (MONGO_URI, JWT_SECRET etc.)
   npm run dev
   ```

3. **Setup Frontend**
   ```bash
   cd ../frontend
   npm install
   npm start
   ```

---

## 📄 License
This project is licensed under the ISC License.
