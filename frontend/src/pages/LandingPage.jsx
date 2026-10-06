import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Server, Database, Cpu, Clock, ShieldCheck, 
  UserCheck, GraduationCap, Calculator, AlertTriangle, 
  CheckCircle2, RefreshCw, ArrowRight, Layers, BellRing, Sparkles, LogIn
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import api from '../api/axios';

export default function LandingPage({ backendHealth, isChecking, refetchHealth }) {
  // Interactive Math Simulator State
  const [conducted, setConducted] = useState(40);
  const [attended, setAttended] = useState(28);
  const [targetPercent, setTargetPercent] = useState(75);

  // Calculation logic matching Section 10 & 11 specification
  const currentPercentage = conducted > 0 ? ((attended / conducted) * 100) : 0;
  
  // Status tier determination
  let currentTier = 'CRITICAL';
  if (currentPercentage >= 90) currentTier = 'EXCELLENT';
  else if (currentPercentage >= 80) currentTier = 'SAFE';
  else if (currentPercentage >= 75) currentTier = 'CAUTION';
  else if (currentPercentage >= 65) currentTier = 'WARNING';
  else currentTier = 'CRITICAL';

  // Recovery prediction: x >= ceil(((T * conducted) - attended) / (1 - T))
  const targetDecimal = targetPercent / 100;
  let classesNeeded = 0;
  let canMiss = 0;

  if (targetDecimal > 0 && targetDecimal < 1) {
    if (currentPercentage < targetPercent) {
      const neededRaw = ((targetDecimal * conducted) - attended) / (1 - targetDecimal);
      classesNeeded = Math.max(0, Math.ceil(neededRaw));
    } else {
      // Classes that can be missed while staying >= target:
      // attended / (conducted + m) >= target => attended >= target * conducted + target * m => m <= (attended - target*conducted)/target
      const missRaw = (attended - (targetDecimal * conducted)) / targetDecimal;
      canMiss = Math.max(0, Math.floor(missRaw));
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-teal-950 text-white p-8 sm:p-12 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Phase 2 Authentication & Authorization Active
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Smart Attendance Monitoring & Notification System
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Enterprise-grade MERN college attendance infrastructure featuring role-based management,
            period-level precision, automated shortage detection, and mathematical recovery forecasting.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-all shadow-lg shadow-teal-500/20"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In to Role Portal (Admin / Faculty / Student)</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Backend & Telemetry Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">System Telemetry & Health Verification</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live heartbeat response directly from Express backend <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono">/api/health</code>
            </p>
          </div>
          <button
            onClick={refetchHealth}
            disabled={isChecking}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            Re-check API Health
          </button>
        </div>

        {backendHealth ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="API Gateway"
              value={backendHealth.status === 'healthy' ? 'Healthy (200)' : 'Degraded'}
              subtitle={`Node.js ${backendHealth.environment} mode`}
              icon={Server}
              color={backendHealth.status === 'healthy' ? 'teal' : 'rose'}
            />
            <StatCard
              title="Database State"
              value={backendHealth.database?.state?.toUpperCase() || 'UNKNOWN'}
              subtitle={backendHealth.database?.host ? `Host: ${backendHealth.database.host}` : 'Connected cluster'}
              icon={Database}
              color="blue"
            />
            <StatCard
              title="Server Uptime"
              value={`${backendHealth.uptime || 0} seconds`}
              subtitle={`Started: ${new Date(backendHealth.timestamp).toLocaleTimeString()}`}
              icon={Clock}
              color="purple"
            />
            <StatCard
              title="Memory Heap Used"
              value={backendHealth.memoryUsage?.heapUsed || 'N/A'}
              subtitle={`RSS: ${backendHealth.memoryUsage?.rss || 'N/A'}`}
              icon={Cpu}
              color="slate"
            />
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <div className="inline-flex p-3 rounded-full bg-amber-50 text-amber-600 mb-2">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Connecting to Backend API...</p>
            <p className="text-xs text-slate-500 mt-1">Ensuring Express server is running on http://localhost:5000</p>
          </div>
        )}
      </div>

      {/* Core Math Engine Simulator (Section 10 & 11 Specification Demo) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">Attendance Engine & Recovery Formula Demo</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Previewing the mathematical core specified in Prompt Section 10 & 11
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 font-mono font-bold bg-slate-100 text-slate-700 rounded-lg">
            Target: {targetPercent}%
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Simulate Student Parameters</h3>
            
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Classes Conducted:</span>
                <span className="font-bold text-slate-900">{conducted}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={conducted}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setConducted(val);
                  if (attended > val) setAttended(val);
                }}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Classes Attended:</span>
                <span className="font-bold text-slate-900">{attended}</span>
              </div>
              <input
                type="range"
                min="0"
                max={conducted}
                value={attended}
                onChange={(e) => setAttended(parseInt(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                <span>Configurable Target Threshold:</span>
                <span className="font-bold text-slate-900">{targetPercent}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={targetPercent}
                onChange={(e) => setTargetPercent(parseInt(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Real-time Percentage & Tier */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Attendance Calculation</h3>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {currentPercentage.toFixed(2)}%
                </span>
                <span className="text-xs text-slate-500">
                  ({attended} / {conducted} classes)
                </span>
              </div>
              <div className="mt-3">
                <Badge status={currentTier} />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 text-xs text-slate-500">
              <span className="font-mono font-semibold">Formula:</span> Attended / Conducted &times; 100
            </div>
          </div>

          {/* Smart Recovery Prediction */}
          <div className="bg-teal-50/70 p-5 rounded-xl border border-teal-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-800">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Smart Recovery Prediction
              </div>

              {currentPercentage < targetPercent ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-semibold text-teal-950">
                    Must attend the next <span className="text-xl font-bold text-teal-700 underline decoration-teal-400 decoration-2">{classesNeeded}</span> classes continuously to reach {targetPercent}%.
                  </p>
                  <p className="text-xs text-teal-700/90 leading-relaxed font-mono bg-teal-100/60 p-2 rounded">
                    x &ge; (({targetDecimal} &times; {conducted}) - {attended}) / (1 - {targetDecimal}) = {classesNeeded}
                  </p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-semibold text-emerald-900">
                    Safe! You can miss up to <span className="text-xl font-bold text-emerald-700">{canMiss}</span> upcoming class{canMiss === 1 ? '' : 'es'} while maintaining at least {targetPercent}%.
                  </p>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Student attendance currently satisfies the institutional requirement.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-teal-200 text-xs text-teal-800 font-medium">
              Autonomous Shortage & Buffer Forecasting
            </div>
          </div>
        </div>
      </div>

      {/* System Architecture Roles */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-teal-600" />
          <h2 className="text-lg font-bold text-slate-900">Modular Role-Based Architecture (3 Core Portals)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Admin Portal Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-300 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Administrator Portal</h3>
              <p className="text-xs text-slate-500 mt-1">
                Full academic hierarchy control, timetable generation, and master configurations.
              </p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-1.5">&bull; Departments, Years, Semesters, Sections</li>
              <li className="flex items-center gap-1.5">&bull; Faculty & Student User Management</li>
              <li className="flex items-center gap-1.5">&bull; Faculty-Subject-Class Mappings</li>
              <li className="flex items-center gap-1.5">&bull; Configurable Thresholds & Audit Trails</li>
            </ul>
          </div>

          {/* Faculty Portal Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-300 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Faculty Portal</h3>
              <p className="text-xs text-slate-500 mt-1">
                Authorized attendance session recording with instantaneous calculations.
              </p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-1.5">&bull; Mapped Class & Subject Only Access</li>
              <li className="flex items-center gap-1.5">&bull; Period-level Marking (P, A, OD, ML)</li>
              <li className="flex items-center gap-1.5">&bull; Duplicate Session Lock Prevention</li>
              <li className="flex items-center gap-1.5">&bull; Real-time Class Shortage Reporting</li>
            </ul>
          </div>

          {/* Student Portal Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-teal-300 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Portal</h3>
              <p className="text-xs text-slate-500 mt-1">
                Real-time personal dashboard, shortage warnings, and recovery forecasts.
              </p>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-1.5">&bull; Subject-wise & Overall Percentage</li>
              <li className="flex items-center gap-1.5">&bull; Smart Consecutive Class Recovery Predictor</li>
              <li className="flex items-center gap-1.5">&bull; In-app Alerts (Caution, Warning, Critical)</li>
              <li className="flex items-center gap-1.5">&bull; Complete Period History Review</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Institutional Attendance Tiers Specification Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Configured Attendance Status Tiers (Prompt Section 9)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
            <span className="text-xs font-bold text-emerald-800 block">EXCELLENT</span>
            <span className="text-xs text-emerald-600 font-mono font-semibold">90.00% &ndash; 100%</span>
          </div>
          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-center space-y-1">
            <span className="text-xs font-bold text-teal-800 block">SAFE</span>
            <span className="text-xs text-teal-600 font-mono font-semibold">80.00% &ndash; 89.99%</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-1">
            <span className="text-xs font-bold text-amber-800 block">CAUTION</span>
            <span className="text-xs text-amber-600 font-mono font-semibold">75.00% &ndash; 79.99%</span>
          </div>
          <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-center space-y-1">
            <span className="text-xs font-bold text-orange-800 block">WARNING</span>
            <span className="text-xs text-orange-600 font-mono font-semibold">65.00% &ndash; 74.99%</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-1 col-span-2 sm:col-span-1">
            <span className="text-xs font-bold text-rose-800 block">CRITICAL</span>
            <span className="text-xs text-rose-600 font-mono font-semibold">Below 65.00%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
