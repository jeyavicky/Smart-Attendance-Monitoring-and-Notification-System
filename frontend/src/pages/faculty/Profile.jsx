import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { facultyApi } from '../../api/academicApi';
import ChangePasswordModal from '../../components/common/ChangePasswordModal';
import {
  GraduationCap,
  KeyRound,
  ShieldCheck,
  Building2,
  Mail,
  Phone,
  BookOpen,
  Award,
  Loader2,
} from 'lucide-react';

export default function FacultyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await facultyApi.getProfileMe();
        if (res.success) {
          setProfile(res.data);
        }
      } catch (err) {
        console.error('Failed to load faculty profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <Loader2 className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin text-emerald-500" />
        <p className="mt-3 text-slate-400 text-xs">Loading faculty profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-emerald-400" /> Faculty Member Profile
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Institutional instructor details, department affiliation, and security credentials.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 text-2xl font-black">
              {(profile?.name || user?.name || 'F')[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{profile?.name || user?.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {profile?.designation || 'Instructor'} • Employee ID: <strong className="text-slate-200 font-mono">{profile?.employeeId || '—'}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors self-start sm:self-auto"
          >
            <KeyRound className="w-4 h-4 text-emerald-400" /> Change Password
          </button>
        </div>

        {/* Profile Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-850/60 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
            <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs text-slate-400 block">Email Address</span>
              <span className="text-white font-medium">{profile?.email || user?.email}</span>
            </div>
          </div>

          <div className="bg-slate-850/60 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
            <Building2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs text-slate-400 block">Department</span>
              <span className="text-white font-medium">
                {profile?.departmentId?.name || 'Information Technology'} ({profile?.departmentId?.code || 'IT'})
              </span>
            </div>
          </div>

          <div className="bg-slate-850/60 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
            <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs text-slate-400 block">Contact Phone</span>
              <span className="text-white font-medium font-mono">{profile?.phone || '—'}</span>
            </div>
          </div>

          <div className="bg-slate-850/60 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
            <Award className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs text-slate-400 block">Academic Qualification</span>
              <span className="text-white font-medium">{profile?.qualification || 'M.Tech, Ph.D'}</span>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Role: <strong className="text-white uppercase font-mono">faculty</strong></span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active Status
          </span>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
