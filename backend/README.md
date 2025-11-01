activity-mgmt-backend/
├─ src/
│  ├─ config/
│  │   ├─ db.js               # MongoDB connection
│  │   └─ mailer.js           # Nodemailer setup
│  ├─ models/
│  │   ├─ User.js
│  │   ├─ Class.js
│  │   ├─ Subject.js
│  │   ├─ Activity.js
│  │   ├─ Rubric.js
│  │   └─ Marks.js
│  ├─ controllers/
│  │   ├─ authController.js
│  │   ├─ activityController.js
│  │   └─ marksController.js
│  ├─ routes/
│  │   ├─ authRoutes.js
│  │   ├─ activityRoutes.js
│  │   └─ marksRoutes.js
│  ├─ middlewares/
│  │   ├─ authMiddleware.js
│  │   └─ roleMiddleware.js
│  ├─ utils/
│  │   ├─ sendEmail.js
│  │   └─ errorHandler.js
│  ├─ seed/
│  │   └─ seedData.js
│  └─ app.js
├─ .env
├─ package.json
├─ .gitignore
└─ README.md
