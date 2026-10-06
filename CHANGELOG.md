# Changelog - Smart Attendance Monitoring and Notification System

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - Phase 6 Final Integration & Submission Release - 2026-10-07

### Added & Polished
- **Production Interface**: Removed all development helper buttons and quick demo toggles from Login and dashboard screens.
- **Frontend Build Optimization**: Clean Vite production build passing with 1679 transformed modules and zero bundling errors.
- **Root Repository Configuration**: Added root `.gitignore` and `.env.example` templates for streamlined team onboarding and deployment.
- **Submission Documentation**: Updated `README.md`, `PROJECT_STATUS.md`, `TEST_LOG.md`, `CHANGELOG.md`, and `HANDOFF.md`.

---

## [0.5.0] - Phase 5 Complete Attendance Core, Shortage & Notifications - 2026-10-06

### Added
- **Attendance Core Models**:
  - `AttendanceSession.js`: Period session model with compound unique index on `{ classId, sectionId, subjectId, attendanceDate, period }`.
  - `AttendanceRecord.js`: Student-level record with status enum (`P`, `A`, `OD`, `ML`) and compound unique index on `{ sessionId, studentId }`.
  - `Notification.js`: In-app notification center for shortage warnings, status tier transitions, and attendance reminders.
  - `AuditLog.js`: Security audit trail capturing session creates, updates, and cancellations with delta tracking.
- **Centralized Calculation & Recovery Engines**:
  - `attendanceCalculationService.js`: Standardized formulas for Attended hours ($P+OD$), Conducted hours ($P+A+OD+ML$), percentage, tier classification (`EXCELLENT`, `SAFE`, `CAUTION`, `WARNING`, `CRITICAL`), recovery prediction ($x = \lceil (0.75 \cdot \text{conducted} - \text{attended}) / 0.25 \rceil$), safe bunk buffer, and shortage rosters.
  - `attendanceService.js`: Atomic session recording, standalone MongoDB rollback resilience, duplicate prevention, and cross-faculty edit authorization guards.
  - `notificationService.js`: Automated trigger engine generating non-duplicate alerts on threshold transitions.
  - `reportService.js`: Printable institutional reporting for Class, Student, Subject, and Shortage cohorts.
- **Controllers & API Routes**:
  - `/api/attendance`: Session marking, history, student personal metrics, institutional registers, and shortage lists.
  - `/api/notifications`: Student notifications retrieval, mark read, mark all read.
  - `/api/reports`: Class, student, subject, and shortage report generators.
- **Frontend Attendance & Notification Portals**:
  - `MarkAttendance.jsx`: Roster marking with live summary counters and batch status setters.
  - `AttendanceHistory.jsx`: Session register with filters, view modal, and inline edit modal.
  - `FacultyShortage.jsx` & `ShortageList.jsx`: Real-time shortage rosters with recovery prediction badges.
  - `StudentDashboard.jsx` & `MyAttendance.jsx`: Interactive attendance dial, status badges, and recovery action cards.
  - `StudentHistory.jsx`: Chronological session-by-session log with date/period filters.
  - `Notifications.jsx`: Student in-app notification center with read state management.
  - `AdminAttendance.jsx` & `Reports.jsx`: Institutional attendance register and report generator.
- **Automated Test Suite**:
  - `npm run test:attendance`: 32 automated test cases covering marking, validation, duplicate prevention, editing, calculations, recovery predictions, shortage detection, notifications, and reports.
  - Full suite: **124 automated tests passing (100% pass rate)**.

---

### Added
- **Mongoose Data Models**:
  - `FacultySubjectMapping.js`: Instructor course and section allocations with compound unique index (`facultyId`, `subjectId`, `classId`, `sectionId`, `academicYearId`).
  - `TimetableEntry.js`: Weekly period scheduling model with day enumeration, period bounds (1–10), 24h start/end time validation, room assignment, and compound conflict indexes.
- **Service Layer & Conflict Detection Logic**:
  - `facultyMappingService.js`: Relationship validation (department matching, subject semester and class semester harmony, class-section membership), duplicate assignment prevention, referential deletion guard (blocks deletion if timetable entries reference mapping), aggregated workload summaries.
  - `timetableService.js`:
    - Multi-tier conflict engine: Faculty Double-Booking (HTTP 409), Class/Section conflict (HTTP 409), Room Conflict (HTTP 409).
    - Grid format builder (`format=grid`) generating day-by-period matrix.
    - Personal faculty timetable generator and real-time dashboard summary (today's lectures, weekly workload, assigned courses).
- **Controllers & RBAC REST APIs**:
  - `/api/faculty-mappings`: CRUD, status toggling, `/workload` summary (Admin), `/me` personal mappings (Faculty).
  - `/api/timetable`: CRUD, status toggling, grid view, `/me` personal weekly schedule (Faculty), `/dashboard-summary` (Faculty).
- **Development Database Seeding (`seed.js`)**:
  - `seedFacultyMappingsAndTimetable`: Seeds realistic allocations across IT and CSE departments with 14 period timetable entries covering Monday through Saturday.
- **Frontend Master Data & Schedule Management**:
  - `FacultyMapping.jsx`: Filterable data table, workload summary toggle, cascading allocation modal.
  - `Timetable.jsx`: Interactive Weekly Grid Matrix view (Mon–Sat, Period 1–8), List view switcher, Add period modal with room allocation and conflict feedback.
  - `Dashboard.jsx` (Faculty): Live metrics (Assigned Courses, Class Batches, Weekly Workload, Today's Lectures), interactive tabs for Today's Schedule, Weekly Timetable, and Assigned Courses.
  - `MyClasses.jsx` & `MySubjects.jsx` (Faculty): Dedicated curriculum allocations and cohort batch viewers.
  - Navigation: Promoted Faculty Mapping and Timetable in `AdminLayout.jsx` and activated My Classes / My Subjects in `FacultyLayout.jsx`.
- **Automated Test Suite**:
  - `npm run test:timetable`: 29 automated test cases covering CRUD, duplicate blocking, semester mismatch, 3-tier conflict checks, workload API, faculty personal endpoints, and RBAC enforcement.
  - Full regression: 92 passing backend tests (100% pass rate).
- **Browser Subagent E2E Visual Verification**:
  - Automated visual auditing of Admin and Faculty flows with recorded video artifact.

---

## [0.3.0] - Phase 3 Academic Master Data - 2026-10-06

### Added
- **Academic Master Data Mongoose Models**:
  - `AcademicYear.js`: Date interval verification (`endDate > startDate`), automatic current session unsetting, soft deactivation.
  - `Department.js`: Normalized uppercase codes, unique name and code indexes, referential dependency checks.
  - `Class.js`: Student cohort representation, logical year (1-4) & semester (1-8) pair constraints, compound uniqueness index.
  - `Section.js`: Class cohort scoping, duplicate prevention in class, capacity constraint, auto-derived display name.
  - `Subject.js`: Normalized subject code, semester boundary rules, positive credits, course classification enums (`Core`, `Professional Elective`, `Open Elective`, etc.).
  - `Faculty.js`: Academic staff profile linked to `User._id` with zero password redundancy, employeeId uniqueness, department affiliation.
  - `Student.js`: Enrolled student profile linked to `User._id`, registerNumber uniqueness, full academic hierarchy references.
- **Service Layer Architecture**:
  - `academicYearService.js`, `departmentService.js`, `classService.js`, `sectionService.js`, `subjectService.js`, `facultyService.js`, `studentService.js`, `dashboardService.js`.
  - Encapsulated referential integrity checks: Class department/AY validity, Section class validity, Student cohort & department harmony.
  - Safe User account provisioning: Single-operation creation of Faculty/Student profiles with synchronized `User` authentication credentials.
  - Account sync: Email/name edits propagate to linked `User`; profile deactivations toggle linked `User.isActive`.
  - Referential integrity on deletion: Hard deletion blocked if dependencies exist; soft-deactivation recommended.
- **Database Service Guard (`dbGuard.js`)**:
  - Enforces MongoDB persistence rule (Section 3 & 58); rejects master data requests with HTTP 503 Service Unavailable if database is disconnected, preventing silent in-memory fallback or data loss.
- **RESTful Master Data Endpoints**:
  - `/api/academic-years`, `/api/departments`, `/api/classes`, `/api/sections`, `/api/subjects`, `/api/faculty`, `/api/students`.
  - Strict RBAC: All write operations (`POST`, `PUT`, `PATCH`, `DELETE`) restricted to `admin` role (HTTP 403 for Faculty/Student).
  - Search, multi-field filtering, pagination metadata (`page`, `limit`, `totalItems`, `totalPages`), and safe sorting whitelists.
  - Live summary endpoint: `GET /api/admin/dashboard/summary` (Admin only).
  - Personal profile endpoints: `GET /api/faculty/profile/me` and `GET /api/student/profile/me`.
- **Frontend Master Data Management**:
  - Reusable components: `DataTable.jsx` (skeleton states, empty states, row actions), `Pagination.jsx`, `SearchInput.jsx`, `FormModal.jsx`, `ConfirmDialog.jsx`.
  - 7 Master Data administration pages: `AcademicYears.jsx`, `Departments.jsx`, `Classes.jsx`, `Sections.jsx`, `Subjects.jsx`, `FacultyManagement.jsx`, `StudentManagement.jsx`.
  - Dependent and cascading dropdowns: Academic Year -> Department -> Class Cohort -> Section.
  - Automatic hierarchy calculation: Section and Student forms auto-derive department and semester from selected class.
  - Admin Dashboard integration: Live statistics cards for Students, Faculty, Departments, Subjects, Classes, and Current Academic Year.
  - Faculty & Student Dashboards: Real verified profile information rendered from backend.
- **Automated Test Suite**:
  - `npm run test:academic`: 39 automated tests covering CRUD, RBAC, cross-cohort rejections, duplicate blocking, User sync, dashboard metrics, and DB guard.
  - `npm run test:auth`: 24 passing authentication regression tests. Total: 63 backend tests passing.

---

## [0.2.0] - Phase 2 Authentication & Authorization - 2026-10-06


### Added
- **User Mongoose Model**: Created `src/models/User.js` with schema validation, email uniqueness, role enumeration (`admin`, `faculty`, `student`), `isActive` status flag, and safe JSON transformations preventing password leakage.
- **Password Security**: Integrated `bcryptjs` hashing with 12 salt rounds; plain-text passwords never stored or returned in responses.
- **JWT Authentication Engine**: Implemented `generateToken.js` with minimal token payload (`userId`, `role`), configurable expiration, and token verification.
- **Authentication Endpoints**:
  - `POST /api/auth/login`: Credential validation, bcrypt comparison, lastLogin update, and JWT issuance.
  - `GET /api/auth/me`: Authenticated profile retrieval.
  - `POST /api/auth/logout`: Stateless session invalidation.
  - `PUT /api/auth/change-password`: Current password verification and hash updates (minimum 8 characters).
  - `GET /api/auth/test/admin`, `/faculty`, `/student`: Role-protected test routes for authorization verification.
- **Backend Middleware**:
  - `authMiddleware.js`: Bearer token extraction, signature verification, user lookup, and inactive account gating.
  - `roleMiddleware.js`: Role enforcement throwing HTTP 403 Forbidden on privilege mismatch.
  - `rateLimiter.js`: Rate limiting on authentication routes (100 attempts per 15 min).
  - `authValidator.js`: Input validation using `express-validator`.
- **Database Seeding**: Created idempotent seed script `src/scripts/seed.js` (`npm run seed`) creating test accounts for Admin, Faculty, and Student, with automated dev startup check in `server.js`.
- **Frontend Auth Context & API Client**:
  - `apiClient.js`: Centralized Axios client with automatic Bearer token injection and safe 401 response handling.
  - `AuthContext.jsx`: Persistent session restoration on browser refresh, reactive logout events, and role redirect helpers.
- **Route Protection & RBAC Guards**:
  - `ProtectedRoute.jsx` & `RoleRoute.jsx`: Non-flickering loader during auth check, unauthenticated redirect to `/login`, and unauthorized redirect to `/unauthorized`.
  - `Unauthorized.jsx`: HTTP 403 Access Denied page with button returning user to their role-specific dashboard.
- **Role Layouts & Dashboards**:
  - `AdminLayout.jsx` with 8 navigation links and `admin/Dashboard.jsx`.
  - `FacultyLayout.jsx` with 7 navigation links and `faculty/Dashboard.jsx`.
  - `StudentLayout.jsx` with 5 navigation links and `student/Dashboard.jsx`.
  - `ChangePasswordModal.jsx`: In-app password rotation for all authenticated users.
  - `PlaceholderPage.jsx`: Standardized placeholder view for navigation items scheduled for upcoming phases.
- **Test Automation**: Implemented `npm run test:auth` with 24 passing assertions and browser subagent recording verifying 15/15 UI flows.

---

## [0.1.0] - Phase 1 Foundation - 2026-10-06

### Added
- **Project Structure**: Established root structure with separated `backend/`, `frontend/`, and `docs/` modules.
- **Backend Core**: Initialized Express 4.x server with Helmet HTTP security headers, CORS protection, Morgan logging, and JSON body parsing.
- **Database Engine**: Mongoose connection orchestrator (`src/config/db.js`) supporting standard MongoDB instances as well as automatic fallback to in-memory MongoDB in dev mode.
- **Standardized API Contract**: Implemented `sendSuccess` and `sendError` response formatters adhering to enterprise API standards.
- **Centralized Error Handling**: Integrated `errorHandler` and `notFoundHandler` middleware handling CastErrors, ValidationErrors, Duplicate Key (E11000) errors, and JWT expiration.
- **Health Telemetry**: Deployed `/api/health` providing real-time system uptime, memory usage, environment details, and MongoDB connection status.
- **System Constants**: Configured roles (`ADMIN`, `FACULTY`, `STUDENT`), attendance statuses (`P`, `A`, `OD`, `ML`), notification levels, and attendance tiers.
- **Documentation Suite**: Created `README.md`, `PROJECT_STATUS.md`, `TEST_LOG.md`, `CHANGELOG.md`, `HANDOFF.md`, and architectural guidelines.
