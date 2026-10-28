# Student Record Management System (SRMS) Using MongoDB

A complete, college-grade **Record Management System** built with **Node.js, Express, and MongoDB Server 8.x**, adhering to all academic constraints and design patterns.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v20+ or v24+) & **npm**
- **MongoDB Server** (v7.x or v8.x running locally on `localhost:27017`)
- The MongoDB service is already running on your machine.

### 2. Install Dependencies (Already installed)
```bash
cd "c:\Users\Kaushal\OneDrive\Desktop\r"
npm install
```

### 3. Seed Database with Realistic Records
Populates departments, courses, and 15+ student records with embedded addresses, guardians, and semester grades:
```bash
npm run seed
```

### 4. Run the Automated Test Suite (10/10 Verification Tests)
```bash
npm test
```

### 5. Start the Application Server
```bash
npm start
```
Visit your browser at: **[http://localhost:5000](http://localhost:5000)**

---

## 📁 Project Directory Structure
```
c:\Users\Kaushal\OneDrive\Desktop\r\
├── package.json                   # Dependencies, project metadata, and npm scripts
├── server.js                      # Express application server and static middleware
├── .env                           # MongoDB URI and port configuration
├── config/
│   └── db.js                      # MongoDB connection & $jsonSchema validation rules
├── models/
│   ├── Student.js                 # Student schema (Embedding + Referencing + Indexes)
│   ├── Department.js              # Referenced Department schema
│   └── Course.js                  # Referenced Course schema
├── controllers/
│   ├── studentController.js       # Complete CRUD operations, pagination & search
│   ├── analyticsController.js     # MongoDB Aggregation Pipelines & Query Playground
│   └── courseController.js        # Department & Course catalog controllers
├── routes/
│   ├── studentRoutes.js           # REST routes for Student operations
│   ├── analyticsRoutes.js         # REST routes for Aggregations & Analytics
│   └── courseRoutes.js            # REST routes for academic catalogs
├── scripts/
│   ├── seed.js                    # Database seeder with sample data & index checks
│   └── test-db.js                 # Automated 10-point test runner
├── public/
│   ├── index.html                 # Interactive Web Dashboard & UI
│   ├── css/
│   │   └── style.css              # Modern responsive CSS styling
│   └── js/
│       └── app.js                 # Client-side JavaScript & Chart.js integration
├── PROJECT_REPORT.md              # Complete 11-section Academic Project Report
├── PROJECT_REPORT.html            # Print-ready HTML report (Ctrl+P -> Save as PDF)
└── README.md                      # Documentation & instructions
```

---

## 🎯 Key Academic Constraints Satisfied

### 1. Database Architecture & Design (Section 5)
- **Collections:** `students`, `departments`, `courses`
- **Embedding:** `address` (sub-document), `guardian` (sub-document), and `grades[]` (embedded array of objects).
  - *Why?* Eliminates expensive relational `JOIN`s and provides atomic $O(1)$ single-seek reads.
- **Referencing:** `department` (code reference) and `enrolledCourses` (ObjectId array reference).
  - *Why?* Prevents duplicating course syllabus metadata across thousands of students.
- **Indexes:**
  - `regNo`: Unique index enforcing unique alphanumeric registration numbers.
  - `email`: Unique index preventing duplicate institutional emails.
  - `{ department: 1, semester: 1 }`: Compound index for accelerated cohort filtering.
  - Text Search Index on `regNo`, `firstName`, `lastName`, and `email`.
- **Validation Rules:** Native MongoDB `$jsonSchema` collection validators enforcing types, required fields, and regex formats.

### 2. MongoDB Aggregation Pipelines (Section 6)
- **Pipeline 1 (Department Performance):** `$match`, `$group`, `$avg`, `$lookup` (joining departments), `$unwind`, `$project`, `$sort`.
- **Pipeline 2 (Semester Pass Rates):** `$group`, `$project` calculating distinction and pass percentages.
- **Pipeline 3 (Grade Distribution):** `$unwind` on embedded `grades` array followed by `$group` and count.
- **Pipeline 4 (Honor Roll Leaderboard):** `$match`, `$sort` by CGPA descending, `$limit` 5.
- **Pipeline 5 (Multi-Faceted Analytics):** `$facet` executing multi-dimensional analytics in a single stage.

---

## 🌐 Web Application Features

1. **📊 Visual Analytics Dashboard:**
   - Real-time KPI summary cards (Total Students, Average CGPA, Department count, Attendance %).
   - Department-wise Comparison Bar Chart (CGPA vs. Attendance).
   - Institution-wide Grade Distribution Doughnut Chart.
   - Top 5 Honor Roll Leaderboard.
2. **📋 Student Records Directory:**
   - Live debounced search by RegNo, Name, Email, or City.
   - Filter dropdowns by Department, Semester, and Fee Status.
   - Full CRUD actions: View complete profile, Edit record, Delete record.
   - Export to JSON and CSV buttons.
3. **➕ Dynamic Add / Edit Student Record:**
   - Input forms for personal details, residential address, and emergency guardian info.
   - Dynamic course grade rows with automatic weighted CGPA calculation on save.
4. **⚡ MongoDB Aggregation Explorer:**
   - Interactive runner allowing examiners to execute real-time MongoDB pipelines and inspect raw JSON query outputs.
5. **🔍 Schema & Index Inspector:**
   - Real-time inspector for collection schemas, indexes, and `$jsonSchema` rules.

---

## 🔐 User Authentication & Pre-Seeded Accounts

The application includes Role-Based Access Control (RBAC) with password encryption (`bcryptjs`) and JSON Web Tokens (JWT). Click **"🔐 Sign In"** in the top navbar to log in, or use the 1-click quick login buttons:

| Role | Email Address | Password | Permissions |
|:---|:---|:---|:---|
| **👑 Administrator** | `admin@campus.edu` | `Admin@123` | Full access (Batch upload, CRUD, Aggregations, Schema inspection) |
| **👨‍🏫 Faculty** | `faculty@campus.edu` | `Faculty@123` | Student grade entry, Directory search, Data export |
| **🧑‍🎓 Student** | `student@campus.edu` | `Student@123` | Read-only profile view, Honor roll dashboard |

---

## 📤 Batch Data Ingestion (CSV / JSON / BSON)

You can import multiple student records simultaneously into MongoDB:
1. Click **"📤 Import Data (CSV/JSON/BSON)"** on the Student Records Directory toolbar.
2. Drag & drop or select any `.csv`, `.json`, or `.bson` file.
3. Choose a duplicate handling strategy:
   - **Skip duplicates:** Keeps existing records in MongoDB unchanged.
   - **Update existing:** Merges uploaded file fields into existing records.
4. Download sample templates directly from the upload modal:
   - **Sample CSV:** `/api/upload/template/csv`
   - **Sample JSON:** `/api/upload/template/json`
   - **Full BSON Export:** `/api/upload/export/bson`

---

## 🌟 Extra High-Impact Features

1. **📄 Printable Official Statement of Grades (Marksheet):**
   - Click `📄` next to any student to view their official university grade sheet.
   - Calculates total credits, grade points, and SGPA on the fly.
   - Ready to print with university seal, issue date, and examination controller signature.

2. **🪪 Digital Campus Student ID Card:**
   - Click `🪪` on any student to generate an identification card.
   - Includes student photo placeholder, RegNo barcode, department, and emergency contact details.

3. **🧾 Official Academic Fee Receipt Voucher:**
   - Click `🧾` to generate a financial payment receipt (`REC-2026-XXXXX`).
   - Detailed breakdown of tuition, computing lab, and library fees with official payment verification status.

4. **⚠️ Attendance Defaulter Warning & Filter (< 75%):**
   - Automatic red indicator `⚠️ XX%` for students below 75% attendance.
   - Instant 1-click toolbar filter `⚠️ Defaulters (<75%)` to isolate all examination-ineligible students.

5. **🌙 Dark Mode / Light Mode Switch:**
   - Smooth theme toggle button (`🌙 Dark` / `☀️ Light`) in the top navbar with persistent `localStorage` preference.

6. **📜 MongoDB Activity Audit Trail:**
   - Click `📜 Audit Logs` in the header to view who performed which operation (Logins, Record Creation, Updates, Deletions, Batch Ingestion) with live timestamps.

---

## 🧪 Running the Verification Test Suite
```bash
npm test
```
**Output:**
```
===============================================================
       STUDENT RECORD MANAGEMENT SYSTEM - TEST SUITE           
===============================================================

✅ [TC-01] MongoDB Connection Test -> PASS (Connected successfully to local instance)
✅ [TC-02] Read / Count Student Records -> PASS (Found 18 student records)
✅ [TC-03] CRUD - Create Student Record with Embedded Data -> PASS (Created with ID, CGPA: 10)
✅ [TC-04] Schema Validation - Unique regNo Constraint -> PASS (Duplicate registration rejected as expected)
✅ [TC-05] CRUD - Update Student Record & Embedded Fields -> PASS (Attendance updated to 98 and city to Mysuru)
✅ [TC-06] Query Search with Regex Operator -> PASS (Matched 4 record(s))
✅ [TC-07] CRUD - Delete Student Record -> PASS (Removed record RA2311TEST999)
✅ [TC-08] MongoDB Aggregation - Department Summary & $lookup -> PASS (Aggregated 5 departments)
✅ [TC-09] MongoDB Aggregation - $unwind Embedded Array -> PASS (Counted grades across 5 grade categories)
✅ [TC-10] MongoDB Indexes - Unique & Compound Index Validation -> PASS (Verified unique regNo index and compound (dept, sem) index)
✅ [TC-11] Authentication - Role & Password Hash Verification -> PASS (Verified Admin (Admin) with bcrypt password hash)
✅ [TC-12] BSON Serialization & Ingestion Engine -> PASS (Successfully serialized & deserialized 68 bytes)
✅ [TC-13] MongoDB Audit Log Persistence -> PASS (Saved & retrieved log)

Overall Result: ALL TESTS PASSED (13/13) ✅
```

---

## 📄 Project Documentation
- **Markdown Report:** [`PROJECT_REPORT.md`](file:///c:/Users/Kaushal/OneDrive/Desktop/r/PROJECT_REPORT.md)
- **Printable / PDF Report:** [`PROJECT_REPORT.html`](file:///c:/Users/Kaushal/OneDrive/Desktop/r/PROJECT_REPORT.html) (Open in Chrome / Edge and press `Ctrl+P` -> Save as PDF).
