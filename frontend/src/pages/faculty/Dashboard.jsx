import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { facultyApi, timetableApi } from '../../api/academicApi';
import attendanceApi from '../../api/attendanceApi';
import ChangePasswordModal from '../../components/common/ChangePasswordModal';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  BookOpen,
  Clock,
  DoorOpen,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Loader2,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [weeklySchedule, setWeeklySchedule] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [shortageStudents, setShortageStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'weekly' | 'shortage'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardInfo = async () => {
      try {
        const [profRes, dashRes, ttRes, todayAttRes, shortageRes] = await Promise.all([
          facultyApi.getProfileMe(),
          timetableApi.getDashboardSummary(),
          timetableApi.getMyTimetable(),
          attendanceApi.getTodaySchedule(),
          attendanceApi.getFacultyShortage(),
        ]);

        if (profRes.success) setProfile(profRes.data);
        if (dashRes.success) setDashboardData(dashRes.data);
        if (ttRes.success) setWeeklySchedule(ttRes.data.weeklySchedule);
        if (todayAttRes.success) setTodayAttendance(todayAttRes.data);
        if (shortageRes.success) setShortageStudents(shortageRes.data || []);
      } catch (err) {
        console.error('Failed to load faculty dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardInfo();
  }, []);

  const todayClasses = todayAttendance?.schedule || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden border border-slate-800">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Faculty Member Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            Welcome, {profile?.name || user?.name || 'Faculty Member'}
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Monitor real-time class attendance, view today's teaching schedule, and track students requiring attendance recovery.
          </p>
        </div>
      </div>

      {/* Real Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Classes */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Today's Classes</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : todayAttendance?.totalScheduled ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">{todayAttendance?.currentDay || 'Today'}'s Scheduled</p>
        </div>

        {/* Attendance Completed */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Attendance Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : todayAttendance?.completedCount ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Sessions Recorded Today</p>
        </div>

        {/* Attendance Pending */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Attendance Pending</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : todayAttendance?.pendingCount ?? 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">Awaiting Submission</p>
        </div>

        {/* Shortage Students */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">Shortage Students</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : shortageStudents.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Below 75% in Your Courses</p>
        </div>
      </div>

      {/* Main Schedule & Allocation Section */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 px-6 pt-4 gap-4 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('today')}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'today'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Today's Attendance Schedule ({todayAttendance?.currentDay || 'Today'})
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'weekly'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Weekly Timetable Matrix
          </button>
          <button
            onClick={() => setActiveTab('shortage')}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'shortage'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Shortage Alert ({shortageStudents.length})
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: Today's Schedule with Attendance Actions */}
          {activeTab === 'today' && (
            <div>
              {todayClasses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayClasses.map((item) => (
                    <div
                      key={item.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                        item.isMarked
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-slate-800 bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 font-mono">
                          Period {item.period}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {item.startTime} – {item.endTime}
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-white text-base">
                          {item.subject?.name}
                        </div>
                        <div className="text-xs text-emerald-400 font-mono font-semibold mt-0.5">
                          {item.subject?.code}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-medium text-slate-300">
                          {item.classCohort?.name} • {item.section?.displayName}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          <DoorOpen className="w-3.5 h-3.5 text-slate-500" />
                          {item.room || 'TBA'}
                        </span>
                      </div>

                      {/* Attendance Action Bar */}
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Attendance:</span>
                          {item.isMarked ? (
                            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                              <CheckCheck className="w-3.5 h-3.5" /> Completed
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Not Marked
                            </span>
                          )}
                        </div>

                        {item.isMarked ? (
                          <Link
                            to="/faculty/history"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
                          >
                            View Attendance
                          </Link>
                        ) : (
                          <Link
                            to={`/faculty/attendance/mark/${item.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all"
                          >
                            Mark Attendance <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl">
                  <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-white font-semibold">No classes scheduled today</p>
                  <p className="text-xs text-slate-400 mt-1">
                    You have no scheduled lectures for {todayAttendance?.currentDay || 'today'}. You can still review attendance history or mark manual sessions.
                  </p>
                  <Link
                    to="/faculty/attendance"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                  >
                    Mark Manual Attendance
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Weekly Matrix */}
          {activeTab === 'weekly' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-28">Day</th>
                    {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                      <th key={p} className="py-2.5 px-3 text-center">
                        Period {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {DAYS.map((day) => (
                    <tr key={day} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-white whitespace-nowrap bg-slate-850/60">
                        {day}
                      </td>
                      {[1, 2, 3, 4, 5, 6, 7].map((p) => {
                        const entry = weeklySchedule?.[day]?.find((e) => e.period === p);
                        return (
                          <td key={p} className="py-2 px-2 text-center align-top min-w-[130px]">
                            {entry ? (
                              <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-left">
                                <div className="font-bold text-white truncate text-[11px]">
                                  {entry.subjectName}
                                </div>
                                <div className="text-[10px] text-emerald-400 font-mono">
                                  {entry.subjectCode}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">
                                  {entry.className} ({entry.sectionName})
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-600 font-mono text-[11px]">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Shortage Alert */}
          {activeTab === 'shortage' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Students with attendance below 75% in your taught courses.
                </p>
                <Link
                  to="/faculty/shortage"
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                >
                  View Full Shortage Roster
                </Link>
              </div>

              {shortageStudents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shortageStudents.slice(0, 6).map((st, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-bold text-white">{st.name}</div>
                        <div className="text-xs font-mono text-slate-400">
                          {st.registerNumber} • {st.className} ({st.sectionName})
                        </div>
                        <div className="text-xs text-slate-300 mt-1">
                          {st.subjectCode} — {st.attended}/{st.conducted} classes
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-rose-400">{st.percentage}%</div>
                        <div className="text-[10px] text-amber-300 font-medium">
                          +{st.classesToRecover} classes to recover
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-white font-medium">All student attendance is healthy!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
