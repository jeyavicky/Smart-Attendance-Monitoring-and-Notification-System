# Smart Attendance Monitoring and Notification System


[![MERN Stack](https://img.shields.io/badge/Stack-MERN-teal.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Status: Complete](https://img.shields.io/badge/Status-Phases%201--6%20Complete%20(Production%20Ready)-emerald.svg)]()
[![Automated Tests](https://img.shields.io/badge/Tests-124%2F124%20Passing-brightgreen.svg)]()

A production-grade, enterprise-ready web-based college attendance management, shortage detection, and recovery forecasting platform built with MongoDB, Express.js, React.js, and Node.js.

---

## 1. Project Overview

The **Smart Attendance Monitoring and Notification System** is a full-featured College ERP attendance automation platform. It moves beyond generic CRUD logs to deliver period-by-period academic mapping, timetable conflict prevention, shortage detection, recovery class forecasting, in-app notification triggers, and institutional audit trails.

### Core Highlights
- **Role-Based Portals**: Dedicated, secure environments for **Admin**, **Faculty**, and **Student**.
- **Secure Authentication**: JWT token authorization, Bcrypt (12 rounds) password hashing, active account enforcement, and role-based route guards.
- **Academic Master Data**: Strict relational integrity across Academic Years, Departments, Classes, Sections, Subjects, Faculty, and Students.
- **Faculty Mapping & Timetable Engine**: Multi-criteria conflict prevention (Faculty double-booking, Class period collision, Room overlap) with weekly schedule grid matrix generation.
- **Period-Level Attendance Recording**: Faculty mark attendance by date, period, and section with atomic transaction handling, rollback resilience, and duplicate prevention.
- **Centralized Mathematical Calculation Engine**: Standardized institutional attendance metric calculation:
  $$\text{Percentage} = \left(\frac{\text{Attended Hours}}{\text{Conducted Hours}}\right) \times 100$$
  $$\text{Attended} = P + OD, \quad \text{Conducted} = P + A + OD + ML$$
- **Smart Attendance Recovery Engine**: Real-time forecast predicting exact consecutive classes needed to achieve $\ge 75\%$ threshold or permissible safe bunks.
- **Automated Shortage & In-App Alerts**: Automated tier classification (`EXCELLENT`, `SAFE`, `CAUTION`, `WARNING`, `CRITICAL`) with non-duplicate alert generation.
- **Institutional Reporting Suite**: Comprehensive Class, Student, Subject, and Shortage reports with print/export capabilities.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite, React Router v6 | Single-page application, routing, and component lifecycles |
| **Styling & Icons** | Tailwind CSS, Lucide React | Modern responsive design system, animations, and telemetry badges |
| **Backend API** | Node.js, Express.js | REST API, validation, RBAC, and calculation services |
| **Database** | MongoDB (Mongoose ODM) | Schema modeling, compound unique indexing, and transactions |
| **Security** | JWT, bcryptjs, Helmet, CORS, Express-Rate-Limit | Token security, cryptographic hashing, and attack mitigation |
| **Validation** | Express-Validator | Strict request schema verification and type safety |

---

## 3. System Architecture & Workflows

```
                                 +---------------------------+
                                 |      React / Vite UI      |
                                 |   (Admin/Faculty/Student) |
                                 +-------------+-------------+
                                               |
                                               | HTTPS / REST JSON
                                               v
+-----------------------------------------------------------------------------------------+
|                                    Express.js API                                       |
|                                                                                         |
|  [Security: Helmet, CORS, Rate Limit]  -->  [Auth: JWT & Role Middleware]               |
|                                                     |                                   |
|  [Validators (Express-Validator)]                  v                                   |
|                                        [Services Business Logic]                        |
|                                          - Attendance Calculation Engine                |
|                                          - Recovery Prediction Engine                   |
|                                          - Timetable Conflict Detector                  |
|                                          - Automated In-App Notification Service        |
|                                          - Institutional Report Engine                  |
|                                                     |                                   |
|  [Centralized Error & Response Handler] <-----------+                                   |
+-----------------------------------------------------------------------------------------+
                                               |
                                               v Mongoose ODM
                                 +---------------------------+
                                 |      MongoDB Database     |
                                 |  (10 Indexed Collections) |
                                 +---------------------------+
```

### Directory Organization

```text
Smart Attendance Monitoring and Notification System/
├── backend/
│   ├── src/
│   │   ├── config/         # Database connection and system constants
│   │   ├── controllers/    # API controllers (Auth, Academic, Timetable, Attendance, Reports)
│   │   ├── middleware/     # Auth, RBAC, Error Handler, Not Found, Rate Limiting
│   │   ├── models/         # Mongoose Schemas (User, AY, Dept, Class, Section, Subject, Faculty, Student, Mapping, Timetable, Attendance, Notification, Audit)
│   │   ├── routes/         # Express Router modules
│   │   ├── scripts/        # Seeding and automated test suites (Auth, Academic, Timetable, Attendance)
│   │   ├── services/       # Core calculation, recovery prediction, conflict checking, and reporting
│   │   ├── utils/          # API response formatters, error classes, JWT helpers
│   │   ├── validators/     # Request payload validators
│   │   └── app.js          # Express app definition
│   ├── server.js           # Server entry point & graceful shutdown
│   ├── .env.example        # Backend environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/            # Centralized API service modules (Axios client with JWT interceptors)
│   │   ├── components/     # Reusable UI components & ProtectedRoute wrappers
│   │   ├── context/        # AuthContext provider & hooks
│   │   ├── layouts/        # Role layouts (AdminLayout, FacultyLayout, StudentLayout)
│   │   ├── pages/          # Admin, Faculty, Student, Login, Landing, and 404 pages
│   │   ├── routes/         # React Router configurations & RBAC guards
│   │   ├── App.jsx         # Root app layout
│   │   └── index.css       # Tailwind CSS styles and glassmorphism themes
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env.example        # Frontend environment variables
│   └── package.json
│
├── docs/                   # System design docs, data dictionary, and workflow guides
├── CHANGELOG.md            # Release log across all phases
├── HANDOFF.md              # Production handoff and deployment notes
├── PROJECT_STATUS.md       # Complete milestone tracking
├── TEST_LOG.md             # Complete test run logs (124/124 tests passed)
└── README.md
```

---

## 4. Attendance Calculation & Recovery Models

### Attendance Percentage Formula
$$\text{Attendance Percentage} = \frac{\text{Attended}}{\text{Conducted}} \times 100$$
Where:
- $\text{Attended} = P + OD$ ($P = \text{Present}, OD = \text{On Duty}$)
- $\text{Conducted} = P + A + OD + ML$ ($A = \text{Absent}, ML = \text{Approved Medical Leave}$)

### Institutional Status Tiers
| Tier | Percentage Range | Status Tag | System Action |
| :--- | :--- | :--- | :--- |
| **Tier 1** | $90.00\% - 100.00\%$ | `EXCELLENT` | Commendable attendance record |
| **Tier 2** | $80.00\% - 89.99\%$ | `SAFE` | Satisfies institutional requirements |
| **Tier 3** | $75.00\% - 79.99\%$ | `CAUTION` | Borderline requirement; caution advisory |
| **Tier 4** | $65.00\% - 74.99\%$ | `WARNING` | Shortage detected; automated shortage alert |
| **Tier 5** | $< 65.00\%$ | `CRITICAL` | Severe shortage; formal condonation/detention alert |

### Recovery Prediction Formula
When attendance is below the target threshold $T = 0.75$:
$$x = \left\lceil \frac{T \cdot \text{Conducted} - \text{Attended}}{1 - T} \right\rceil = \left\lceil \frac{0.75 \cdot \text{Conducted} - \text{Attended}}{0.25} \right\rceil$$
Where $x$ is the exact number of consecutive upcoming classes the student must attend to restore overall/subject attendance back to $75\%$.

When attendance is safely above $75\%$, the allowable safe bunk buffer is calculated as:
$$b = \left\lfloor \frac{\text{Attended} - 0.75 \cdot \text{Conducted}}{0.75} \right\rfloor$$

---

## 5. User Roles & Capabilities

### Admin
- Institutional Overview Dashboard with real-time statistics.
- Academic Master Data CRUD (Academic Years, Departments, Classes, Sections, Subjects).
- Faculty & Student Profile Management with automatic User synchronization.
- Faculty-to-Subject-Class Mapping with workload tracking.
- Master Timetable Scheduling with conflict detection.
- Institutional Attendance Register and Shortage Monitoring.
- Class, Student, Subject, and Shortage PDF/Printable Reports.

### Faculty
- Dashboard with Today's Scheduled Classes and quick marking buttons.
- Class Attendance Marking Roster with quick batch toggles (Mark All Present, Mark All Absent).
- Period Attendance History with filtered session register.
- Session Record Editing with institutional permission validation and audit logging.
- Assigned Class Shortage Roster with real-time recovery calculations.

### Student
- Personal Attendance Dashboard featuring interactive attendance dial and status badge.
- Detailed Subject-Wise Breakdown with conducted, attended, and percentage cards.
- Attendance Recovery Forecast showing exact consecutive classes needed for recovery.
- Chronological Session-by-Session Attendance Log with date and period filters.
- Real-Time In-App Notification Center with Mark as Read actions.

---

## 6. Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB](https://www.mongodb.com/) (v5.0 or higher, running locally on port 27017 or MongoDB Atlas URI)

### Quick Start Guide

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd "Smart Attendance Monitoring and Notification System"
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Seed default users, academic master data, timetable, and historical attendance
   npm run seed
   # Start backend API server
   npm run dev
   ```
   *Backend runs at: `http://localhost:5000`*

3. **Frontend Setup**:
   ```bash
   cd ../frontend
   npm install
   cp .env.example .env
   # Start Vite dev server
   npm run dev
   ```
   *Frontend runs at: `http://localhost:5173`*

---

## 7. Demo Accounts for Testing

| Role | Email | Password | Access / Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@attendance.local` | `AdminPassword123!` | Full institutional management & reporting |
| **Faculty** | `faculty@attendance.local` | `FacultyPassword123!` | Assigned subjects marking, history & shortage |
| **Faculty 2** | `kumar.faculty@attendance.local` | `FacultyPassword123!` | Cross-faculty testing (CSE Department) |
| **Student** | `student@attendance.local` | `StudentPassword123!` | Personal attendance, history & notifications |

---

## 8. Test Execution & Verification

The system includes an automated test suite with **124 passing test cases** across all core modules:

```bash
cd backend

# Run all test suites in sequence
npm run test:all

# Run individual test suites
npm run test:auth        # 24/24 passed (JWT, Roles, RBAC, Passwords)
npm run test:academic    # 39/39 passed (Master Data, Relationships, Sync)
npm run test:timetable   # 29/29 passed (Mappings, Conflicts, Workload)
npm run test:attendance  # 32/32 passed (Marking, Editing, Shortage, Reports)
```

To validate the frontend production build:
```bash
cd frontend
npm run build
```

---

## 9. Future Enhancements

The modular MERN architecture is architected to seamlessly integrate with advanced hardware and automated attendance methods in future releases:

1. **Facial Recognition Integration**: Edge-device camera integration with OpenCV / Python inference services pushing biometric tokens to `/api/attendance/sessions`.
2. **RFID / NFC Smart Card Readers**: Hardware reader integration communicating via MQTT / WebSockets to mark student entry and period logs automatically.
3. **Dynamic QR Code Attendance**: Rolling cryptographic QR code tokens displayed on faculty smartboards scanned via student mobile application.
4. **SMS / WhatsApp Gateway Alerts**: Multi-channel urgent parent notifications via Twilio or WhatsApp Business API when critical shortage (<65%) occurs.
5. **BLE Beacon Classroom Proximity**: Bluetooth Low Energy beacon verification ensuring students are physically present in the assigned lecture hall.

---

## 10. License

This project is licensed under the ISC License.

