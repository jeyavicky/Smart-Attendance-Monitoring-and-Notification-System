# System Architecture Specification

## 1. Executive Overview

The **Smart Attendance Monitoring and Notification System** is an enterprise-grade academic platform designed to automate attendance management, detect shortage vulnerabilities early, calculate recovery horizons with mathematical precision, and communicate proactively with students and faculty.

---

## 2. Architectural Principles

1. **Backend as Source of Truth**: Percentage calculations, tier categorization, and recovery predictions must never be computed client-side. The backend guarantees uniform calculations across student, faculty, and administrative views.
2. **Atomic Attendance Sessions**: An attendance session represents a single classroom interaction characterized uniquely by `(Class, Section, Subject, Date, Period)`. Duplicate sessions are prevented via strict compound uniqueness constraints.
3. **Decoupled Notification Pipeline**: Notification generation is triggered synchronously upon attendance persistence, while external delivery channels (e.g. Nodemailer SMTP) operate in a non-blocking asynchronous boundary.
4. **Normalized Storage & Scalability**: Attendance records are stored individually per student rather than embedded in a monolithic array, ensuring scalability across cohorts of thousands of students without hitting document size limits.

---

## 3. Core Mathematical Models

### 3.1 Attendance Percentage Formula

```
Attendance Percentage = (Attended Classes / Eligible Conducted Classes) * 100
```

Where:
- `P` (Present) = 1 attended, 1 conducted
- `A` (Absent) = 0 attended, 1 conducted
- `OD` (On Duty) = 1 attended, 1 conducted
- `ML` (Medical Leave) = Configurable; exempt from eligible conducted count by default.

### 3.2 Smart Recovery Prediction Engine

Given:
- `A` = Current classes attended
- `C` = Current classes conducted
- `T` = Target percentage represented as decimal (`0.75` for 75%)
- `x` = Minimum consecutive future classes the student must attend

The condition to reach target `T`:
```
(A + x) / (C + x) >= T
A + x >= T * (C + x)
A + x >= (T * C) + (T * x)
x - (T * x) >= (T * C) - A
x * (1 - T) >= (T * C) - A
x >= ((T * C) - A) / (1 - T)
```

Therefore:
```
x = ceil( max(0, ((T * C) - A) / (1 - T)) )
```

### 3.3 Bunk Buffer Formula (Allowable Absences)

When a student is currently above target (`(A / C) >= T`), the number of future consecutive classes `m` they can miss while remaining at or above target is:
```
A / (C + m) >= T
A >= T * C + T * m
T * m <= A - (T * C)
m <= (A - (T * C)) / T
```

Therefore:
```
m = floor( max(0, (A - (T * C)) / T) )
```

---

## 4. Role-Based Access Control (RBAC) Matrix

| Resource / Action | Admin | Faculty | Student |
|---|---|---|---|
| Academic Structure CRUD | Full Access | No Access | No Access |
| User Account Management | Full Access | No Access | No Access |
| Timetable & Mappings | Full Access | Read Own | Read Own |
| Mark Attendance | Full Access | Mapped Classes/Subjects Only | No Access |
| Modify Attendance | Full Access | Within Permission Window | No Access |
| View Attendance History | System-wide | Assigned Sections Only | Personal Records Only |
| Shortage Analytics | System-wide | Assigned Sections Only | Personal Status Only |
| Recovery Forecast | All Students | Assigned Students | Self Only |
| Notifications | Broadcast / View | Assigned Classes | Self Inbox Only |

---

## 5. Status Tier Matrix

| Tier | Percentage Range | Visual Badge | System Response |
|---|---|---|---|
| **EXCELLENT** | 90.00% &ndash; 100.00% | Emerald | Commendation / Safe buffer |
| **SAFE** | 80.00% &ndash; 89.99% | Teal | Nominal status |
| **CAUTION** | 75.00% &ndash; 79.99% | Amber | Proximity warning triggered |
| **WARNING** | 65.00% &ndash; 74.99% | Orange | Shortage alert & recovery plan |
| **CRITICAL** | Below 65.00% | Rose | High shortage risk, escalation to Admin/HOD |
