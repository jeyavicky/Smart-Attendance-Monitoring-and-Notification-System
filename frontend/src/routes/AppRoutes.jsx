import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Public pages
import LandingPage from '../pages/LandingPage';
import Login from '../pages/auth/Login';
import Unauthorized from '../pages/auth/Unauthorized';

// Protection wrappers
import ProtectedRoute from '../components/ProtectedRoute';

// Layouts
import AdminLayout from '../layouts/AdminLayout';
import FacultyLayout from '../layouts/FacultyLayout';
import StudentLayout from '../layouts/StudentLayout';

// Dashboards
import AdminDashboard from '../pages/admin/Dashboard';
import FacultyDashboard from '../pages/faculty/Dashboard';
import StudentDashboard from '../pages/student/Dashboard';

// Academic Master Data Pages (Phase 3)
import AcademicYears from '../pages/admin/AcademicYears';
import Departments from '../pages/admin/Departments';
import Classes from '../pages/admin/Classes';
import Sections from '../pages/admin/Sections';
import Subjects from '../pages/admin/Subjects';
import FacultyManagement from '../pages/admin/FacultyManagement';
import StudentManagement from '../pages/admin/StudentManagement';

// Faculty Mapping & Timetable (Phase 4)
import FacultyMapping from '../pages/admin/FacultyMapping';
import Timetable from '../pages/admin/Timetable';

// Attendance, Shortages & Reports (Phase 5 & 6)
import AdminAttendance from '../pages/admin/AdminAttendance';
import ShortageList from '../pages/admin/ShortageList';
import Reports from '../pages/admin/Reports';

// Faculty Modules
import MyClasses from '../pages/faculty/MyClasses';
import MySubjects from '../pages/faculty/MySubjects';
import MarkAttendance from '../pages/faculty/MarkAttendance';
import AttendanceHistory from '../pages/faculty/AttendanceHistory';
import FacultyShortage from '../pages/faculty/FacultyShortage';
import FacultyProfile from '../pages/faculty/Profile';

// Student Modules
import MyAttendance from '../pages/student/MyAttendance';
import StudentHistory from '../pages/student/StudentHistory';
import Notifications from '../pages/student/Notifications';
import StudentProfile from '../pages/student/Profile';

export default function AppRoutes({ backendHealth, isChecking, refetchHealth }) {
  return (
    <Routes>
      {/* Public Pages */}
      <Route
        path="/"
        element={
          <LandingPage
            backendHealth={backendHealth}
            isChecking={isChecking}
            refetchHealth={refetchHealth}
          />
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Admin Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* Academic Master Data */}
          <Route path="/admin/academic-years" element={<AcademicYears />} />
          <Route path="/admin/departments" element={<Departments />} />
          <Route path="/admin/classes" element={<Classes />} />
          <Route path="/admin/sections" element={<Sections />} />
          <Route path="/admin/subjects" element={<Subjects />} />
          <Route path="/admin/faculty" element={<FacultyManagement />} />
          <Route path="/admin/students" element={<StudentManagement />} />
          <Route path="/admin/academic" element={<Navigate to="/admin/academic-years" replace />} />

          {/* Faculty Mapping & Timetable */}
          <Route path="/admin/faculty-mapping" element={<FacultyMapping />} />
          <Route path="/admin/timetable" element={<Timetable />} />

          {/* Attendance, Shortage & Reports */}
          <Route path="/admin/attendance" element={<AdminAttendance />} />
          <Route path="/admin/shortage" element={<ShortageList />} />
          <Route path="/admin/reports" element={<Reports />} />
        </Route>
      </Route>

      {/* Faculty Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
        <Route element={<FacultyLayout />}>
          <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
          <Route path="/faculty/classes" element={<MyClasses />} />
          <Route path="/faculty/subjects" element={<MySubjects />} />
          <Route path="/faculty/timetable" element={<FacultyDashboard />} />

          {/* Attendance Actions */}
          <Route path="/faculty/attendance" element={<MarkAttendance />} />
          <Route path="/faculty/attendance/mark" element={<MarkAttendance />} />
          <Route path="/faculty/attendance/mark/:timetableId" element={<MarkAttendance />} />
          <Route path="/faculty/history" element={<AttendanceHistory />} />
          <Route path="/faculty/attendance/history" element={<AttendanceHistory />} />
          <Route path="/faculty/shortage" element={<FacultyShortage />} />
          <Route path="/faculty/reports" element={<Reports />} />
          <Route path="/faculty/profile" element={<FacultyProfile />} />
        </Route>
      </Route>

      {/* Student Protected Routes */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<StudentLayout />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/attendance" element={<MyAttendance />} />
          <Route path="/student/history" element={<StudentHistory />} />
          <Route path="/student/attendance/history" element={<StudentHistory />} />
          <Route path="/student/notifications" element={<Notifications />} />
          <Route path="/student/profile" element={<StudentProfile />} />
        </Route>
      </Route>

      {/* Catch-all unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
