# Activity Management System

## Functional, Technical, and Process Documentation

**Project Location:** `D:\Internship\activity-mgmt`

**Purpose of this document:**
This document combines the functional specification, technical specification, process flow, screen-wise behavior, business rules, validations, and operational notes for the Activity Management System in a single reference.

---

## 1. Project Overview

The Activity Management System is a role-based academic workflow application used to manage class-wise subject allocation, activity creation, scheduling, mark entry, mark breakdowns, analytics, and administrative setup.

The system is designed to support the following operations:

- Academic year setup and tracking
- Class, subject, faculty, and teaching assignment management
- Activity creation, editing, scheduling, and deletion
- Marks upload and evaluation
- Activity status updates with controlled transitions
- Role-specific dashboards and analytics
- Notification and email-driven workflow for activity changes
- Excel-based bulk import for selected admin operations

The application is organized around role-based access so that each user sees only the screens and actions relevant to their permission level.

---

## 2. User Roles

The system currently supports the following roles:

- `admin`
- `Faculty`
- `Coordinator`
- `HOD`
- `student` support exists in the backend domain, but the current UI focus is on staff roles

### 2.1 Admin

Admin users manage master data and system-wide academic configuration.

### 2.2 Faculty

Faculty users manage activities assigned to them, update details, schedule work, and upload marks.

### 2.3 Coordinator

Coordinator users see subject-coordination analytics and subject-linked activity information.

### 2.4 HOD

HOD users review division-level analytics, faculty performance, allocation summaries, and activity oversight.

---

## 3. Technology Stack

### 3.1 Frontend

- React
- React Router
- Axios-based API layer
- Custom CSS styling
- Font Awesome icons

### 3.2 Backend

- Node.js
- Express.js
- MongoDB
- Mongoose ODM
- Multer for file uploads
- Nodemailer/email service layer
- Excel processing utilities for bulk import and marks upload

### 3.3 Data Storage

- MongoDB collections for users, classes, subjects, faculty directory, teaching assignments, activities, rubrics, marks, notifications, and academic years

### 3.4 File/Document Handling

- Excel upload for supported bulk admin operations
- PDF upload for model answer documents during conducted-status confirmation
- Excel export for marks and activity-related data where supported

---

## 4. Application Modules

### 4.1 Authentication and Access Control

- Login page
- First-login password reset
- Protected routes based on authentication state and role
- Role-based dashboard redirection

### 4.2 Admin Module

- Admin dashboard
- Admin activity list
- Academic year setup
- Class management
- Subject management
- Faculty management
- Teaching assignment management
- Bulk assignment upload

### 4.3 Activity Module

- View all activities
- Create activity
- Edit activity
- Schedule activity
- Add marks
- View activity details
- Update activity status

### 4.4 Faculty Analytics Module

- Faculty home overview
- Assigned subject cards
- Ongoing activity submissions
- Academic calendar preview

### 4.5 Coordinator and HOD Analytics Modules

- Coordinator dashboard and subject analytics
- HOD dashboard and allocation/overview analytics
- HOD activity list

---

## 5. Screen-Wise Functional Specification

## 5.1 Login Screen

**Route:** `/login`

### Purpose

Authenticate the user and route them to the correct home/dashboard based on role.

### Functional Behavior

- User enters email and password
- System validates credentials
- On success, user is redirected to the appropriate landing route
- On failure, an error toast is shown

### Validations

- Email and password are required
- Invalid credentials are rejected
- Feedback is shown through toast notifications

---

## 5.2 First Login Reset Password Screen

**Route:** `/reset-password-first-login`

### Purpose

Allow first-time users to set a new password.

### Functional Behavior

- User enters and confirms the new password
- System updates the password securely
- After success, user is redirected or allowed to continue login flow

### Validations

- Password fields must be filled
- Password and confirmation must match
- Server-side validation is enforced

---

## 5.3 Common Home Routing

**Route:** `/`

### Purpose

Automatically redirect authenticated users to their role-based home page.

### Functional Behavior

- If not authenticated, user is sent to login
- If authenticated, user is redirected based on role

### Role Redirection

- Admin -> admin dashboard/home
- Faculty -> faculty home
- Coordinator -> coordinator analytics/home
- HOD -> HOD dashboard/home

---

## 5.4 Admin Home / Dashboard

**Route:** `/admin`

### Purpose

Provide admin-level live allocation overview and system status.

### Screen Content

- Academic year chip
- Year-wise allocation cards
- Live allocation status chart/bar section
- Faculty capacity summary
- Quick analytics

### Functional Behavior

- Pulls live data from classes, subjects, faculties, and teaching assignments
- Shows subject allocation coverage per year
- Displays overall allocation percentage
- Supports refresh

### Admin Dashboard Usage

This page is used for summary analytics only. Detailed admin operations are performed in the Admin Management screens.

---

## 5.5 Admin Activity List

**Route:** `/admin/activities`

### Purpose

Allow admin users to monitor activities system-wide.

### Functional Behavior

- View activities in a table
- Inspect activity metadata
- Access status and action columns

---

## 5.6 Admin Management Screen

**Route:** `/admin`

### Purpose

Manage the core academic structures.

### Functional Behavior

The admin screen supports management of:

- Academic year
- Classes
- Subjects
- Faculty records
- Teaching assignments
- Bulk assignment upload

### Bulk Assignment Upload

- Excel upload is supported
- The feature can map assignments in bulk
- The system supports validation and overwrite handling
- The upload workflow is intended for timetable-driven or spreadsheet-driven assignment entry

---

## 5.7 Faculty Home

**Route:** `/dashboard` or faculty landing route via role redirect

### Purpose

Show the faculty user a live teaching overview.

### Screen Content

- Assigned subject cards
- Ongoing activity submissions table
- Teaching metrics panel
- Academic calendar panel

### Functional Behavior

- Shows the faculty member’s assigned subjects
- Displays activity count per subject
- Shows pending and ongoing submissions
- Displays upcoming scheduled items
- Refreshes live data periodically

---

## 5.8 Activities List

**Route:** `/activities`

### Purpose

Central table for managing faculty activities.

### Screen Content

- Activity name
- Description
- Rubric criteria summary
- Schedule date
- Status dropdown
- Edit link
- Marks link
- Download link
- Delete action

### Functional Behavior

- Shows only activities relevant to the logged-in user’s role and ownership rules
- Status can be updated using controlled transitions
- Conducted status requires model answer PDF upload and confirmation
- Marks updated status is restricted by prior workflow rules

---

## 5.9 Create Activity Screen

**Route:** `/activity/create`

### Purpose

Allow faculty/coordinator/HOD/admin users to create a new activity.

### Screen Content

- Activity name
- Description
- Schedule date and time
- Subject/class assignment selector
- Total marks field
- Marks breakdown editor
- Add subdivision button

### Functional Behavior

- A new activity is created for a selected teaching assignment
- Mark subdivisions can be created optionally
- If subdivisions are omitted, the system creates a default total marks subdivision
- Email notification can be triggered after creation where applicable

### Validations

- Name and description are required
- Schedule date must be valid and in the future
- Assignment must exist
- Total marks must be a positive number
- Subdivision titles cannot be empty
- Subdivision marks cannot be empty or invalid
- Sum of subdivision marks must equal total marks

---

## 5.10 Edit Activity Screen

**Route:** `/activity/edit/:id`

### Purpose

Allow editing of activity details and marks breakdown.

### Screen Content

- Activity name
- Description
- Schedule date and time
- Total marks
- Editable marks breakdown

### Functional Behavior

- Existing activity details are loaded
- Existing subdivisions are loaded
- Subdivision rows are editable when the activity is still editable
- Total marks and subdivision total are validated together
- After a conducted/updated state, marks editing is restricted

### Validations

- If marks are editable, total marks must be valid
- Subdivision titles must be present
- Subdivision marks must be positive numbers
- Sum of subdivision marks must equal total marks
- After marks are already graded, breakdown editing is blocked
- After conduct/update completion, marks editing is blocked

---

## 5.11 Schedule Activity Screen

**Route:** `/activity/schedule/:id`

### Purpose

Allow scheduling of an activity to a future time.

### Functional Behavior

- User selects schedule date/time
- Activity gets scheduled and reminders may be triggered

### Validations

- Activity cannot be scheduled in the past
- Conducted/Marks_Updated activities cannot be rescheduled in restricted cases

---

## 5.12 Add Marks Screen

**Route:** `/marks/activity/:activityId`

### Purpose

Enter marks for students against a specific activity.

### Functional Behavior

- Load student list for the activity’s class
- Load mark subdivisions or rubric criteria
- Enter marks per student
- Upload marks in Excel where supported

### Validations

- Student and activity links must exist
- Uploaded marks files must be valid Excel format
- Marks must respect subdivision/rubric limits
- Error rows are reported where applicable

---

## 5.13 Activity Details Screen

**Route:** `/activity/details/:id`

### Purpose

Show complete activity information, rubric, and breakdown transparency.

### Functional Behavior

- View activity metadata
- View mark subdivisions
- View rubric or total mark summary
- Display transparency-oriented information only

---

## 5.14 HOD Dashboard

**Route:** `/hod`

### Purpose

Provide HOD-level analytics for division performance, faculty consistency, subject outcomes, and allocation insights.

### Screen Content

- KPI cards
- Pending activity watch
- Faculty performance summary
- Subject outcome snapshot
- Recent activity logs

### Functional Behavior

- Uses live HOD analytics endpoint
- Pulls activity and assignment data for division-level insight
- Presents summary cards instead of chart-heavy duplication

---

## 5.15 HOD Activity List

**Route:** `/hod/activities`

### Purpose

Allow HOD users to inspect and oversee activities relevant to their scope.

---

## 5.16 Coordinator Analytics Screen

**Route:** `/subject-analytics`

### Purpose

Provide subject coordinator analytics with subject-centered performance information.

### Functional Behavior

- Shows assigned subject analytics
- Displays subject coordination insights and activity metrics

---

## 6. Process Flows

## 6.1 Authentication Flow

1. User opens the application
2. If not logged in, the system redirects to login
3. User enters credentials
4. Backend validates credentials
5. User is redirected to role-based landing page
6. Header and protected routes are rendered based on role

## 6.2 Role-Based Landing Flow

1. System detects the stored user session
2. Role is identified
3. User is routed to the correct home screen
4. Each role sees only relevant modules and summary information

## 6.3 Activity Creation Flow

1. User opens Create Activity
2. User selects assignment, date/time, and marks
3. User optionally adds mark subdivisions
4. Frontend validates totals and schedule
5. Backend validates assignment, marks, and subdivision consistency
6. Activity is stored
7. Subdivisions are stored
8. Notification email may be sent

## 6.4 Activity Editing Flow

1. User opens Edit Activity
2. Existing activity and subdivisions are loaded
3. User edits details and, if allowed, edits subdivisions
4. Frontend validates the breakdown
5. Backend validates again
6. Activity and subdivisions are updated
7. System preserves consistency with marks totals

## 6.5 Status Update Flow

1. User changes status from the activities table
2. System checks allowed transition
3. If moving to Conducted, a model answer PDF upload is required
4. User confirms the modal dialog
5. Backend updates activity status and model answer files
6. Activity list refreshes
7. Modal closes and user returns to the list view

## 6.6 Marks Update Flow

1. User opens marks screen for a conducted activity
2. Marks are entered or uploaded
3. System validates total and subdivision logic
4. Marks are stored
5. Status may move to Marks_Updated after successful completion

## 6.7 Bulk Assignment Upload Flow

1. Admin uploads an Excel file
2. System parses row-wise assignment data
3. Class, subject, and faculty references are validated
4. Invalid rows are reported
5. Valid assignments are created or updated depending on overwrite option

---

## 7. Business Rules and Validations

## 7.1 Activity Status Rules

- Scheduled can move to Conducted
- Conducted can move to Marks_Updated
- Marks_Updated cannot move backward
- Invalid transitions are rejected

## 7.2 Conducted Activity Rules

- A conducted status update requires model answer PDF upload
- Only PDF files are allowed
- At least one file must be uploaded
- Activity schedule must already be reached

## 7.3 Marks Rules

- Marks must be numeric and greater than zero
- Marks cannot be edited after grading is completed
- Marks breakdown must always sum to total marks
- Subdivision titles are required

## 7.4 Schedule Rules

- Schedule date/time must be valid
- Activity cannot be scheduled in the past
- Conducted activities have stronger schedule restrictions

## 7.5 File Upload Rules

- Model answer upload accepts PDF only
- Marks upload accepts valid Excel format where supported
- Invalid file types are rejected with feedback

## 7.6 Activity Breakdown Rules

- If a breakdown is not provided, a default total marks subdivision is created
- If a breakdown is provided, every row must be valid
- Totals must match exactly to avoid inconsistent scoring

## 7.7 Assignment Upload Rules

- Bulk assignment upload uses Excel
- Subject and faculty mapping must resolve correctly
- Rows with invalid references are rejected or reported
- Overwrite behavior is supported when enabled

---

## 8. Terms, Conditions, and Operational Assumptions

- The system assumes authenticated sessions are stored locally and used for route protection
- Role-based access is enforced on the frontend and backend
- The same activity cannot be edited in ways that break existing marks consistency
- Uploaded model answer files are stored on the backend and linked to the activity
- Email notifications depend on configured SMTP/email service availability
- Excel-based actions depend on structured input columns matching the accepted template
- Data shown on home screens is live from backend APIs, not hardcoded

---

## 9. Data Entities Overview

## 9.1 User

Stores identity, role, email, and login information.

## 9.2 Class

Stores year, division, and class communication fields.

## 9.3 Subject

Stores subject name, code, and related metadata.

## 9.4 TeachingAssignment

Maps class + subject + faculty for a given academic year.

## 9.5 Activity

Stores activity details, schedule date, status, and assignment linkage.

## 9.6 ActivityMarkSubdivision

Stores marks breakdown rows for an activity.

## 9.7 RubricCriteria

Stores rubric-style evaluation rules where applicable.

## 9.8 StudentActivityMarks

Stores marks entered for students for a specific activity.

## 9.9 StudentSubjectMarks

Stores subject-level student marks and related activity records.

## 9.10 AcademicYear

Stores active academic year and semester boundaries.

---

## 10. Technical Architecture

### 10.1 Frontend Architecture

- React app with route-based screens
- Shared header and protected routing
- Reusable utility layer for API and toast feedback
- Role-based conditional UI rendering

### 10.2 Backend Architecture

- Express route layer
- Controller-driven business logic
- Mongoose models for persistence
- Middleware for role protection and authentication
- Email and upload services for workflow support

### 10.3 File Handling Architecture

- Multer handles file upload storage
- PDFs are used for model answer evidence
- Excel files are used for bulk data operations

### 10.4 Notification Architecture

- Activity create/update events can send email notifications
- Templates include activity metadata and mark breakdown data

---

## 11. API and Route Summary

### Frontend Routes

- `/`
- `/login`
- `/reset-password-first-login`
- `/dashboard`
- `/admin`
- `/admin/activities`
- `/subject-analytics`
- `/activities`
- `/activity/create`
- `/activity/edit/:id`
- `/activity/schedule/:id`
- `/marks/activity/:activityId`
- `/activity/details/:id`
- `/hod`
- `/hod/activities`

### Backend Route Groups

- Authentication routes
- Admin routes
- Activity routes
- Marks routes
- Subject routes
- Class routes
- Teaching assignment routes
- Student routes
- HOD routes
- Dashboard routes
- Rubric routes
- Student subject marks routes

---

## 12. Validation Summary

The following validations are applied throughout the system:

- Required field validation
- Numeric validation for marks
- Schedule date validation
- Status transition validation
- File type validation for PDFs and Excel files
- Assignment resolution validation
- Subdivision sum validation
- Grading lock validation
- Role-based access validation

---

## 13. Known Workflow Constraints

- Activity status changes are controlled and not free-form
- Once marks are updated, some fields become locked
- Conducted status requires model answer evidence
- Subdivision consistency must match total marks
- Bulk upload depends on clean spreadsheet structure
- Analytics screens are summary-driven and rely on live backend data

---

## 14. Suggested Usage of This Document

Use this document as the single project reference for:

- functional understanding
- technical onboarding
- workflow explanation
- role-based screen mapping
- validation and business rule reference
- future maintenance planning
- stakeholder review

---

## 15. Conclusion

The Activity Management System is a role-driven academic operations platform that centralizes activity planning, execution, grading, and reporting. The system emphasizes controlled status transitions, data consistency, live dashboards, and a validation-first workflow to reduce errors in academic record management.

This document intentionally combines the functional specification, technical specification, process flow, screen overview, validations, and operational rules into a single source of truth for the project.
