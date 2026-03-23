// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Home, User, Calendar as CalendarIcon, CalendarCheck, Plus, 
  Briefcase, Clock, CheckCircle, AlertCircle, Lock, LogOut, 
  ChevronLeft, ChevronRight, AlignLeft, Coffee, X, Users
} from 'lucide-react';

// === Firebase 雲端資料庫連線核心 ===
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
//  Firebase 金鑰設定 (與後台完全共用同一個資料庫)
// ==========================================
let firebaseConfig = {
  apiKey: "AIzaSyDC1cBttnZIRWEfYNve5S8NZItx311uM2c",
  authDomain: "staff-scheduling-system-e877c.firebaseapp.com",
  projectId: "staff-scheduling-system-e877c",
  storageBucket: "staff-scheduling-system-e877c.firebasestorage.app",
  messagingSenderId: "694900041074",
  appId: "1:694900041074:web:b2e51efded21ae0953a9eb"
};

try {
  if (typeof window !== 'undefined' && window.__firebase_config) firebaseConfig = JSON.parse(window.__firebase_config);
  else if (typeof __firebase_config !== 'undefined') firebaseConfig = JSON.parse(__firebase_config);
} catch (e) { /* 使用本地 Config */ }

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = (typeof window !== 'undefined' && window.__app_id) ? window.__app_id : (typeof __app_id !== 'undefined' ? __app_id : 'staff-scheduling-system');

let globalSetError = null;

// 雲端同步輔助函數 (只處理員工能做的：寫入假單、註冊帳號)
const syncStateToCloud = async (firebaseUser, updates) => {
  if (!firebaseUser) {
    if (globalSetError) globalSetError("【雲端連線失敗】尚未取得驗證授權，請確認網路連線。");
    return;
  }
  const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'schedule_data', 'main_state');
  try {
    await setDoc(docRef, updates, { merge: true });
  } catch (e) {
    console.error("雲端同步失敗: ", e);
    if (globalSetError) globalSetError("【資料儲存被拒絕】無法連線至伺服器。");
  }
};

// ==========================================
// 工具函數
// ==========================================

const getRoleStyles = (role) => {
  if (!role) return 'bg-blue-600 text-white shadow-inner';
  if (role.includes('店長') && !role.includes('副店長')) return 'shiny-gold font-extrabold';
  if (role.includes('副店長')) return 'shiny-silver font-extrabold';
  if (role.includes('組長')) return 'shiny-bronze font-extrabold';
  if (role.includes('儲備幹部')) return 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md border-transparent';
  if (role.includes('兼職')) return 'bg-[#F2823A] text-white shadow-inner border-transparent';
  return 'bg-blue-600 text-white shadow-inner border-transparent';
};

const getShiftCardStyles = (role) => {
  if (!role) return 'bg-blue-50 border-blue-100 text-blue-800 hover:bg-blue-100';
  if (role.includes('店長') && !role.includes('副店長')) return 'bg-yellow-50/80 border-yellow-300 text-yellow-900 hover:bg-yellow-100/80';
  if (role.includes('副店長')) return 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200';
  if (role.includes('組長')) return 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100';
  if (role.includes('儲備幹部')) return 'bg-purple-50 border-purple-200 text-purple-900 hover:bg-purple-100';
  if (role.includes('兼職')) return 'bg-orange-50 border-orange-100 text-orange-800 hover:bg-orange-100';
  return 'bg-blue-50 border-blue-100 text-blue-800 hover:bg-blue-100';
};

const getUserTypeBadge = (name, registeredUsers) => {
  const u = registeredUsers.find((user) => user.name === name);
  if (!u) return null;
  if (u.role.includes('店長') && !u.role.includes('副店長')) return <span className="bg-yellow-100 text-yellow-800 text-[9px] px-1.5 py-0.5 rounded font-black ml-1 shrink-0 border border-yellow-300 shadow-sm">店長</span>;
  if (u.role.includes('副店長')) return <span className="bg-gray-200 text-gray-800 text-[9px] px-1.5 py-0.5 rounded font-black ml-1 shrink-0 border border-gray-300 shadow-sm">副店</span>;
  if (u.role.includes('組長')) return <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-black ml-1 shrink-0 border border-amber-300 shadow-sm">組長</span>;
  if (u.role.includes('儲備幹部')) return <span className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.5 rounded font-black ml-1 shrink-0 border border-purple-200 shadow-sm">儲備</span>;
  return u.role.includes('兼職') ? 
    (<span className="bg-orange-100 text-orange-600 text-[9px] px-1.5 py-0.5 rounded font-black ml-1 shrink-0 border border-orange-200 shadow-sm">兼職</span>) : 
    (<span className="bg-blue-100 text-blue-600 text-[9px] px-1.5 py-0.5 rounded font-black ml-1 shrink-0 border border-blue-200 shadow-sm">正職</span>);
};

const taiwanHolidays = {
  '2026/1/1': '元旦', '2026/2/16': '春節', '2026/2/17': '春節', '2026/2/18': '春節', '2026/2/19': '春節', '2026/2/20': '春節', '2026/2/23': '春節', '2026/2/24': '春節',
  '2026/2/28': '和平', '2026/3/2': '補假', '2026/4/3': '兒童', '2026/4/4': '清明', '2026/4/6': '清明', '2026/5/1': '勞動',
  '2026/6/19': '端午', '2026/6/20': '端午', '2026/6/21': '端午', '2026/9/25': '中秋', '2026/9/26': '中秋', '2026/9/27': '中秋',
  '2026/10/9': '國慶', '2026/10/10': '國慶', '2026/10/11': '國慶'
};

const getDayInfo = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dateKey = `${year}/${month}/${day}`;
  const holidayName = taiwanHolidays[dateKey] || null;
  const dayOfWeekStr = ['(週日)', '(週一)', '(週二)', '(週三)', '(週四)', '(週五)', '(週六)'][dayOfWeek];

  let displayLabel = null;
  if (holidayName) displayLabel = holidayName.substring(0, 2);
  else if (isWeekend) displayLabel = '假日';

  return { isWeekend, isHoliday: !!holidayName, holidayName, displayLabel, isOffDay: isWeekend || !!holidayName, dayOfWeekStr };
};

const isHourInTimeStr = (hour, timeStr) => {
  if (!timeStr || timeStr.includes('待定')) return false;
  const parts = timeStr.split('&').map(p => p.trim());
  return parts.some(part => {
    let [start, end] = part.split('-');
    if (!start || !end) return false;
    let sH = parseInt(start.split(':')[0], 10);
    let eH = parseInt(end.split(':')[0], 10);
    if (eH === 0) eH = 24;
    return hour >= sH && hour < eH;
  });
};

const getShiftCategories = (shift) => {
  if (!shift) return [];
  if (shift.shiftCategory === '留守' || shift.type.includes('留守')) return ['留守'];
  const cats = [];
  const isMorn = [11, 12, 13, 14].some(h => isHourInTimeStr(h, shift.time));
  const isNight = [17, 18, 19, 20, 21].some(h => isHourInTimeStr(h, shift.time));
  if (isMorn) cats.push('早班');
  if (isNight) cats.push('晚班');
  if (cats.length === 0) cats.push(shift.shiftCategory || (shift.type.includes('晚') ? '晚班' : '早班'));
  return cats;
};

// ==========================================
// UI 元件 - 底部導覽 (純員工版)
// ==========================================
function BottomNav({ activeScreen, onNavigate }) {
  return (
    <nav className="absolute bottom-0 left-0 w-full bg-white/85 backdrop-blur-md border-t border-gray-100 px-8 py-5 flex justify-around items-center z-50">
      <button onClick={() => onNavigate('leave_request')} className={`${activeScreen === 'leave_request' ? 'text-[#2563EB]' : 'text-gray-400 hover:text-gray-800'} transition-colors active:scale-90 flex flex-col items-center gap-1`}>
        <Home size={24} strokeWidth={activeScreen === 'leave_request' ? 2.5 : 2} fill={activeScreen === 'leave_request' ? 'currentColor' : 'none'} />
        <span className="text-[10px] font-bold">排休</span>
      </button>
      <button onClick={() => onNavigate('employee_profile')} className={`${activeScreen === 'employee_profile' ? 'text-[#2563EB]' : 'text-gray-400 hover:text-gray-800'} transition-colors active:scale-90 flex flex-col items-center gap-1`}>
        <User size={24} strokeWidth={activeScreen === 'employee_profile' ? 2.5 : 2} />
        <span className="text-[10px] font-bold">我的班表</span>
      </button>
    </nav>
  );
}

// ==========================================
// UI 元件 - 登入畫面 (純員工版)
// ==========================================
function LoginScreen({ onLogin, onGoRegister, registeredUsers }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    if (!password) { setError('請輸入密碼'); return; }
    const user = registeredUsers.find((u) => u.password === password);
    if (!user) { setError('密碼錯誤或尚未註冊'); return; }
    onLogin(user.name);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 bg-white animate-in fade-in duration-300">
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4 bg-blue-600 shadow-blue-600/30">
          <CalendarIcon size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#111] tracking-tight">員工排班系統</h1>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Employee Portal</p>
      </div>
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        {error && <div className="bg-red-50 text-red-500 text-sm font-bold p-3 rounded-xl flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">員工密碼</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="請輸入 6 位數密碼" className="w-full bg-gray-50 text-gray-800 font-medium py-3.5 pl-11 pr-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all border border-transparent focus:border-blue-100" />
          </div>
        </div>
        <button type="submit" className="w-full py-4 rounded-2xl text-white font-bold shadow-lg mt-4 active:scale-[0.98] transition-all bg-blue-600 shadow-blue-600/30 hover:bg-blue-700">
          登入系統
        </button>
      </form>
      <div className="mt-8 text-sm font-medium text-gray-500">新進員工？ <button onClick={onGoRegister} className="text-blue-600 font-bold hover:underline">點此註冊個人資料</button></div>
    </div>
  );
}

// ==========================================
// UI 元件 - 註冊畫面
// ==========================================
function RegisterScreen({ onGoLogin, onRegister, registeredUsers }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shift, setShift] = useState('早班');
  const [position, setPosition] = useState('兼職');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('姓氏/姓名為必填欄位'); return; }
    if (!/^\d{6}$/.test(password)) { setError('註冊密碼必須為 6 位數字'); return; }
    if (password !== confirmPassword) { setError('兩次輸入的密碼不一致'); return; }
    if (registeredUsers && registeredUsers.some(u => u.password === password)) { setError('此密碼有人註冊'); return; }

    const finalRole = `${shift}${position}`;
    onRegister(name.trim(), password, finalRole);
    setSuccess(true);
    setTimeout(() => { onGoLogin(); }, 2000);
  };

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-white animate-in fade-in duration-300">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-6"><CheckCircle size={40} /></div>
        <h2 className="text-2xl font-bold text-[#111] mb-2">註冊成功！</h2>
        <p className="text-gray-500 font-medium text-center">正在為您跳轉至登入畫面...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-8 pt-12 bg-white animate-in slide-in-from-right-8 duration-300 overflow-y-auto pb-12">
      <button onClick={onGoLogin} className="w-10 h-10 bg-gray-50 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-800 transition mb-8"><ChevronLeft size={24} /></button>
      <h1 className="text-3xl font-extrabold text-[#111] tracking-tight mb-2">員工註冊</h1>
      <p className="text-sm font-medium text-gray-500 mb-8">請建立您的個人資料以便進行線上排班與排休。</p>
      <form onSubmit={handleRegister} className="w-full space-y-5">
        {error && <div className="bg-red-50 text-red-500 text-sm font-bold p-3 rounded-xl flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">姓氏 / 姓名 <span className="text-red-500">*</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：王小明" className="w-full bg-gray-50 text-gray-800 font-medium py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:border-blue-100" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">班別 <span className="text-red-500">*</span></label>
            <select value={shift} onChange={(e) => setShift(e.target.value)} className="w-full bg-gray-50 text-gray-800 font-medium py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:border-blue-100 cursor-pointer">
              <option value="早班">早班</option>
              <option value="晚班">晚班</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">職位 <span className="text-red-500">*</span></label>
            <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full bg-gray-50 text-gray-800 font-medium py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:border-blue-100 cursor-pointer">
              <option value="兼職">兼職</option>
              <option value="正職">正職</option>
              <option value="儲備幹部">儲備幹部</option>
              <option value="組長">組長</option>
              <option value="副店長">副店長</option>
              <option value="店長">店長</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">設定密碼 <span className="text-red-500">*</span></label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="請輸入 6 位數字" maxLength={6} className="w-full bg-gray-50 text-gray-800 font-medium py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:border-blue-100" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">確認密碼 <span className="text-red-500">*</span></label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="請再次輸入 6 位數字密碼" maxLength={6} className="w-full bg-gray-50 text-gray-800 font-medium py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border border-transparent focus:border-blue-100" />
        </div>
        <button type="submit" className="w-full py-4 rounded-2xl bg-[#111] text-white font-bold shadow-lg shadow-black/10 hover:bg-gray-800 mt-6 active:scale-[0.98] transition-all">完成註冊</button>
      </form>
    </div>
  );
}

// ==========================================
// UI 元件 - 員工排休畫面
// ==========================================
function LeaveRequestScreen({ currentUser, employeeLeaves, employeeNotes, leaveSettings, onSaveLeaves, announcement, onLogout }) {
  const initialLeaves = employeeLeaves[currentUser] || [];
  let initialDate = '';
  let initialReason = '';
  try {
    if (employeeNotes[currentUser]) {
      const parsed = JSON.parse(employeeNotes[currentUser]);
      initialDate = parsed.date || '';
      initialReason = parsed.reason || '';
    }
  } catch (e) {
    initialReason = employeeNotes[currentUser] || '';
  }

  const [selectedLeaves, setSelectedLeaves] = useState(initialLeaves);
  const [leaveMode, setLeaveMode] = useState('regular'); // 'regular' | 'special'
  const [leaveDate, setLeaveDate] = useState(initialDate);
  const [leaveReason, setLeaveReason] = useState(initialReason);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');

  const targetYear = leaveSettings?.year || 2026;
  const targetMonth = leaveSettings?.month || 3;
  const lockDate = leaveSettings?.lockDate || 20;

  const currentDate = new Date().getDate();
  const isLocked = currentDate > lockDate;

  const MAX_LEAVES = leaveSettings?.total || 8;
  const MAX_WEEKEND_LEAVES = leaveSettings?.weekend || 1;
  const MAX_WEEKDAY_LEAVES = leaveSettings?.weekday || 7;
  const APPROVAL_THRESHOLD = 1;

  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const marchDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const firstDayOfWeek = new Date(targetYear, targetMonth - 1, 1).getDay();
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  // 計算其他人請假的天數 (同步精髓在這裡，這包 employeeLeaves 來自 Firebase 即時更新)
  const othersLeaves = {};
  Object.entries(employeeLeaves).forEach(([emp, leaves]) => {
    if (emp !== currentUser) leaves.forEach((l) => { othersLeaves[l.date] = (othersLeaves[l.date] || 0) + 1; });
  });

  const handleDayClick = (day) => {
    if (isSubmitted || isLocked) return;
    const dateStr = `${targetYear}/${targetMonth}/${day}`;

    const existingIndex = selectedLeaves.findIndex(l => l.date === dateStr);
    if (existingIndex >= 0) {
      setSelectedLeaves((prev) => prev.filter((l) => l.date !== dateStr));
      setWarningMsg('');
      return;
    }

    const info = getDayInfo(targetYear, targetMonth, day);
    const currentOffDayCount = selectedLeaves.filter(l => {
      const [y, m, d] = l.date.split('/').map(Number);
      return y === targetYear && m === targetMonth && getDayInfo(y, m, d).isOffDay;
    }).length;
    const currentWorkDayCount = selectedLeaves.filter(l => {
      const [y, m, d] = l.date.split('/').map(Number);
      return y === targetYear && m === targetMonth && !getDayInfo(y, m, d).isOffDay;
    }).length;
    const currentTotalForMonth = selectedLeaves.filter(l => {
      const [y, m] = l.date.split('/').map(Number);
      return y === targetYear && m === targetMonth;
    }).length;

    if (info.isOffDay && currentOffDayCount >= MAX_WEEKEND_LEAVES) {
      setWarningMsg(`本月最多只能選擇 ${MAX_WEEKEND_LEAVES} 天「假日/連假」排休`);
      setTimeout(() => setWarningMsg(''), 3000);
      return;
    }
    if (!info.isOffDay && currentWorkDayCount >= MAX_WEEKDAY_LEAVES) {
      setWarningMsg(`本月最多只能選擇 ${MAX_WEEKDAY_LEAVES} 天「平日」排休`);
      setTimeout(() => setWarningMsg(''), 3000);
      return;
    }
    if (currentTotalForMonth >= MAX_LEAVES) {
      setWarningMsg(`您已達本月自選排休上限 (${MAX_LEAVES}天)`);
      setTimeout(() => setWarningMsg(''), 3000);
      return;
    }

    const bookedCount = othersLeaves[dateStr] || 0;
    const needsApproval = bookedCount >= APPROVAL_THRESHOLD;

    const newLeave = { date: dateStr, status: needsApproval ? 'pending' : 'approved', type: leaveMode };
    setSelectedLeaves((prev) => [...prev, newLeave]);

    if (needsApproval) {
      setWarningMsg('該日已有其他同事排休，將送交主管審核');
      setTimeout(() => setWarningMsg(''), 3500);
    } else {
      setWarningMsg('');
    }
  };

  const isNoteValid = (!leaveDate && !leaveReason.trim()) || (leaveDate && leaveReason.trim());
  const canSubmitBtn = (selectedLeaves.length > 0 || (leaveDate && leaveReason.trim())) && isNoteValid;

  const confirmSubmit = () => {
    setIsSubmitted(true);
    const noteData = (leaveDate && leaveReason.trim()) ? JSON.stringify({ date: leaveDate, reason: leaveReason.trim() }) : '';
    onSaveLeaves(currentUser, selectedLeaves, noteData);
    setShowConfirmModal(false);
  };

  const monthLeavesCount = selectedLeaves.filter(l => {
    const [y, m] = l.date.split('/').map(Number);
    return y === targetYear && m === targetMonth;
  }).length;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-[#f8f9fc] pb-[150px] animate-in fade-in slide-in-from-right-8 duration-300 relative flex flex-col">
      {warningMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 w-11/12 max-w-[320px]">
          <div className={`text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center justify-center gap-2 text-center leading-snug ${warningMsg.includes('主管審核') ? 'bg-orange-500' : 'bg-red-500'}`}>
            <AlertCircle size={20} className="shrink-0" /> {warningMsg}
          </div>
        </div>
      )}

      <header className="shrink-0 sticky top-0 bg-[#f8f9fc]/90 backdrop-blur-md z-10 flex items-center justify-between px-8 pt-12 pb-4 border-b border-gray-200/50">
        <div>
          <h1 className="text-2xl font-extrabold text-[#111] tracking-tight">{targetMonth}月份排休</h1>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">{currentUser} {isLocked ? ' - 系統已鎖定' : isSubmitted ? ' - 假單已送出' : ` - 已選 ${monthLeavesCount} 天 (上限 ${MAX_LEAVES} 天)`}</p>
        </div>
        <button onClick={onLogout} className="w-10 h-10 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-full flex items-center justify-center transition shadow-sm active:scale-95" title="安全登出">
          <LogOut size={16} strokeWidth={2.5} />
        </button>
      </header>

      <div className="px-8 mt-6 flex-1 pb-[120px]">
        {isLocked && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl mb-6 shadow-sm flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">排休系統已關閉</h4>
              <p className="text-xs font-medium mt-1 leading-relaxed">目前已超過本月排休截止日（{lockDate}號），無法再進行任何排休或請假異動。如需修改假單，請直接聯繫主管處理。</p>
            </div>
          </div>
        )}

        {!isLocked && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <p className="text-xs font-bold text-blue-800 leading-relaxed text-center">
              {announcement.split('\n').map((line, i) => (
                <span key={i}>{line}<br /></span>
              ))}
            </p>
          </div>
        )}

        <div className="flex bg-gray-200/60 p-1.5 rounded-2xl mb-6">
          <button onClick={() => setLeaveMode('regular')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${leaveMode === 'regular' ? 'bg-white text-[#111] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>一般排休</button>
          <button onClick={() => setLeaveMode('special')} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${leaveMode === 'special' ? 'bg-purple-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>特休申請</button>
        </div>

        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col gap-2 text-xs font-bold text-gray-500">
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-[#111]"></div><span>一般排休</span></div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-purple-600"></div><span className="text-purple-600">特休</span></div>
          </div>
          <div className="flex flex-col gap-2 text-xs font-bold text-gray-500">
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-orange-500"></div><span className="text-orange-600">待主管核准</span></div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-red-50 border border-red-200"></div><span className="text-red-500">相同排休過多</span></div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm font-bold text-[#111] mb-2">
            <span>本月自選 (最多 {MAX_WEEKEND_LEAVES} 假日, {MAX_WEEKDAY_LEAVES} 平日)</span>
            <span className={monthLeavesCount === MAX_LEAVES ? 'text-green-600' : 'text-blue-600'}>{monthLeavesCount} / {MAX_LEAVES} 天</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all duration-300 ${monthLeavesCount === MAX_LEAVES ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${Math.min((monthLeavesCount / MAX_LEAVES) * 100, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="grid grid-cols-7 gap-x-2 gap-y-3">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
              <div key={d} className={`text-center text-[10px] font-bold mb-2 ${d === '日' || d === '六' ? 'text-blue-500' : 'text-gray-400'}`}>{d}</div>
            ))}
            {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
            {marchDays.map((day) => {
              const dateStr = `${targetYear}/${targetMonth}/${day}`;
              const myLeave = selectedLeaves.find((l) => l.date === dateStr);
              const bookedCount = othersLeaves[dateStr] || 0;
              const isFull = bookedCount >= APPROVAL_THRESHOLD;

              const info = getDayInfo(targetYear, targetMonth, day);
              let btnClass = 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100';
              if (myLeave) {
                if (myLeave.type === 'special') {
                  btnClass = myLeave.status === 'pending' ? 'bg-purple-400 text-white shadow-md transform scale-105 z-10 font-bold border-transparent' : 'bg-purple-600 text-white shadow-md transform scale-105 z-10 font-bold border-transparent';
                } else {
                  btnClass = myLeave.status === 'pending' ? 'bg-orange-500 text-white shadow-md transform scale-105 z-10 font-bold border-transparent' : 'bg-[#111] text-white shadow-md transform scale-105 z-10 font-bold border-transparent';
                }
              } else if (isFull) {
                btnClass = 'bg-red-50 text-red-500 border border-red-100 font-bold';
              } else if (bookedCount > 0) {
                btnClass = 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 font-bold';
              } else if (info.isOffDay) {
                btnClass = 'bg-blue-50/30 text-blue-500 hover:bg-blue-100 border-transparent';
              }

              const lockedStyle = isLocked && !myLeave ? 'opacity-50 cursor-not-allowed' : '';

              return (
                <button key={day} onClick={() => handleDayClick(day)} disabled={isSubmitted || isLocked} className={`relative w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 ${btnClass} ${lockedStyle}`}>
                  <span className={`text-[14px] font-bold ${(!myLeave && !isFull) ? (info.isHoliday ? 'text-blue-600' : (info.isWeekend ? 'text-blue-400' : 'text-gray-700')) : ''}`}>{day}</span>
                  {info.displayLabel && (
                    <span className={`absolute top-1 right-1.5 text-[9px] font-black tracking-tighter leading-none ${myLeave ? 'text-white/90' : (isFull ? 'text-red-500' : 'text-blue-600')}`}>
                      {info.displayLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center gap-2 mb-4 ml-1 border-b border-gray-50 pb-3">
            <AlignLeft size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-[#111]">特殊請假申請 <span className="text-gray-400 text-[10px] font-medium ml-1">(若不請假則免填)</span></h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">選擇日期 <span className="text-red-500">*</span></label>
              <input type="date" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} disabled={isSubmitted || isLocked} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-sm disabled:opacity-60 disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">填寫原因 <span className="text-red-500">*</span></label>
              <textarea value={leaveReason} onChange={e => setLeaveReason(e.target.value)} disabled={isSubmitted || isLocked} placeholder={isLocked ? "系統已鎖定，無法新增或修改" : "請輸入您的請假原因..."} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none shadow-sm disabled:opacity-60 disabled:bg-gray-100" rows={2} />
            </div>
          </div>
          {!isNoteValid && (
            <p className="text-[10px] font-bold text-red-500 mt-3 flex items-center gap-1 animate-pulse"><AlertCircle size={12}/> 請完整填寫請假日期與原因，否則無法送出！</p>
          )}
        </div>

        <div className="w-full">
          {isLocked ? (
            <div className="w-full bg-gray-100 text-gray-400 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-sm border border-gray-200 cursor-not-allowed">
              <Lock size={20} /> 已超過排休截止日 ({lockDate}號)
            </div>
          ) : isSubmitted ? (
            <div className="w-full bg-green-50 text-green-600 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-sm border border-green-100">
              <CheckCircle size={20} /> 假單已送出
            </div>
          ) : (
            <button
              onClick={() => {
                if (!isNoteValid) {
                  setWarningMsg('請完整填寫請假日期與原因');
                  setTimeout(() => setWarningMsg(''), 3000);
                  return;
                }
                if (selectedLeaves.length > 0 || (leaveDate && leaveReason.trim())) setShowConfirmModal(true);
              }}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold shadow-lg transition-all active:scale-[0.98] ${
                canSubmitBtn ? 'bg-[#2563EB] text-white shadow-blue-600/30 hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              發送假單 ({monthLeavesCount} / {MAX_LEAVES} 天)
            </button>
          )}
        </div>
      </div>

      {showConfirmModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}></div>
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4"><AlertCircle size={24} /></div>
            <h3 className="text-xl font-bold text-[#111] mb-2">確定送出排休與請假？</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              您本月已自選 <strong className="text-gray-800">{monthLeavesCount}</strong> 天假。
              {leaveDate && leaveReason && <span className="text-blue-600 font-bold block mt-1"> 包含 1 筆特殊請假申請。</span>}
              {selectedLeaves.some(l => l.status === 'pending') && <span className="text-orange-500 font-bold block mt-1"> 包含待審核的假單，須經主管同意。</span>}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3.5 rounded-2xl bg-gray-50 text-gray-600 font-bold hover:bg-gray-100 transition-colors">取消</button>
              <button onClick={confirmSubmit} className="flex-1 py-3.5 rounded-2xl bg-[#2563EB] text-white font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-colors">確定送出</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// UI 元件 - 員工專屬行事曆畫面
// ==========================================
function EmployeeProfileScreen({ currentUser, registeredUsers, employeeLeaves, shifts, leaveSettings }) {
  const user = registeredUsers.find(u => u.name === currentUser);
  if (!user) return null;

  const [viewYear, setViewYear] = useState(leaveSettings?.year || 2026);
  const [viewMonth, setViewMonth] = useState(leaveSettings?.month || 3);
  useEffect(() => {
    setViewYear(leaveSettings?.year || 2026);
    setViewMonth(leaveSettings?.month || 3);
  }, [leaveSettings?.year, leaveSettings?.month]);

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const viewDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const emptyDays = Array.from({ length: firstDayOfWeek }, (_, i) => i);
  const myLeaves = employeeLeaves[currentUser] || [];
  const myShifts = shifts.filter(s => s.assignee === currentUser);
  const [selectedDate, setSelectedDate] = useState(`${leaveSettings?.year || 2026}/${leaveSettings?.month || 3}/1`);

  useEffect(() => {
    setSelectedDate(`${viewYear}/${viewMonth}/1`);
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(v => v - 1); }
    else setViewMonth(v => v - 1);
  };
  const handleNextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(v => v + 1); }
    else setViewMonth(v => v + 1);
  };

  const selectedShift = myShifts.find(s => s.date === selectedDate);
  const selectedLeave = myLeaves.find(l => l.date === selectedDate);
  const allDayShifts = shifts.filter(s => s.date === selectedDate);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar bg-[#f8f9fc] pb-32 animate-in slide-in-from-right-8 duration-300">
      <header className="sticky top-0 bg-[#f8f9fc]/90 backdrop-blur-md z-10 flex items-center px-8 pt-12 pb-6 border-b border-gray-200/50">
        <div>
          <h1 className="text-2xl font-extrabold text-[#111] tracking-tight">我的專屬行事曆</h1>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">My Schedule</p>
        </div>
      </header>

      <div className="px-8 mt-6 flex flex-col gap-6">
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0 ${getRoleStyles(user.role)}`}>
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xl font-bold text-[#111]">{user.name}</h2>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${user.role.includes('兼職') ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><Lock size={10}/> 登入密碼</span>
            <span className="text-sm font-bold text-gray-800 tracking-widest">{user.password}</span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#111] text-md">{viewMonth}月 班表</h3>
              <div className="flex gap-1.5 ml-2">
                <button onClick={handlePrevMonth} className="w-6 h-6 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-200 rounded-full transition"><ChevronLeft size={12} strokeWidth={2.5} /></button>
                <button onClick={handleNextMonth} className="w-6 h-6 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-200 rounded-full transition"><ChevronRight size={12} strokeWidth={2.5} /></button>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div><span className="text-[10px] font-bold text-gray-500">上班</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div><span className="text-[10px] font-bold text-gray-500">休假</span></div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-x-2 gap-y-3">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
              <div key={d} className={`text-center text-[10px] font-bold mb-1 ${d === '日' || d === '六' ? 'text-blue-500' : 'text-gray-400'}`}>{d}</div>
            ))}
            {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
            {viewDays.map((day) => {
              const dateStr = `${viewYear}/${viewMonth}/${day}`;
              const isShift = myShifts.some(s => s.date === dateStr);
              const leaveInfo = myLeaves.find(l => l.date === dateStr);
              const isSelected = selectedDate === dateStr;
              const info = getDayInfo(viewYear, viewMonth, day);

              let btnClass = 'bg-gray-50 text-gray-600 hover:bg-gray-100';
              if (leaveInfo) {
                if (leaveInfo.type === 'special') {
                  btnClass = leaveInfo.status === 'pending' ? 'bg-purple-50 text-purple-500 border border-purple-200' : 'bg-purple-100 text-purple-700 border border-purple-300';
                } else {
                  btnClass = leaveInfo.status === 'pending' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-green-50 text-green-600 border border-green-200';
                }
              } else if (isShift) {
                btnClass = 'bg-blue-50 text-blue-600 border border-blue-200 font-bold';
              } else if (info.isOffDay) {
                btnClass = 'bg-blue-50/30 text-blue-500 hover:bg-blue-100';
              }

              return (
                <button key={day} onClick={() => setSelectedDate(dateStr)} className={`relative w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 ${btnClass} ${isSelected ? 'ring-2 ring-[#111] ring-offset-2 transform scale-105 z-10 shadow-md' : ''}`}>
                  <span className={`text-[14px] font-bold ${(!leaveInfo && !isShift) ? (info.isHoliday ? 'text-blue-600' : (info.isWeekend ? 'text-blue-400' : 'text-gray-700')) : ''}`}>{day}</span>
                  {info.displayLabel && (
                    <span className={`absolute top-1 right-1.5 text-[9px] font-black tracking-tighter leading-none ${leaveInfo ? (leaveInfo.status === 'pending' ? 'text-orange-600' : 'text-green-600') : 'text-blue-600'}`}>
                      {info.displayLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#111] text-white rounded-[2rem] p-6 shadow-lg shadow-black/10 relative overflow-hidden mb-4">
          <div className="absolute -right-4 -top-4 opacity-10 pointer-events-none">
            <CalendarIcon size={100} />
          </div>
          <div className="flex items-center gap-2 mb-4 relative z-10">
            <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2">
              <CalendarCheck size={16} /> <span className="text-white">{selectedDate.split('/')[1]}/{selectedDate.split('/')[2]} {getDayInfo(viewYear, viewMonth, parseInt(selectedDate.split('/')[2])).dayOfWeekStr}</span> 詳細資訊
            </h3>
            {getDayInfo(viewYear, viewMonth, parseInt(selectedDate.split('/')[2])).isOffDay && (
              <span className="text-[10px] font-black text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-500/30">
                {getDayInfo(viewYear, viewMonth, parseInt(selectedDate.split('/')[2])).holidayName || '例假日'}
              </span>
            )}
          </div>

          {selectedShift ? (
            <div className="flex flex-col gap-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Briefcase size={20} /></div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">排定班別</span>
                  <span className="block text-sm font-bold text-white">{getShiftCategories(selectedShift).join(' + ')} ({selectedShift.type})</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Clock size={20} /></div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">工作時間</span>
                  <span className="block text-sm font-bold text-white leading-relaxed">{selectedShift.time.replace(/&/g, ' 與 ')}</span>
                </div>
              </div>
            </div>
          ) : selectedLeave ? (
            <div className="flex items-center gap-4 relative z-10 py-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedLeave.status === 'pending' ? 'bg-orange-500/20 text-orange-400' : 'bg-green-500/20 text-green-400'}`}>
                {selectedLeave.status === 'pending' ? <Clock size={24} /> : <CheckCircle size={24} />}
              </div>
              <div>
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">休假狀態</span>
                <span className={`block text-lg font-bold ${selectedLeave.status === 'pending' ? 'text-orange-400' : 'text-green-400'}`}>
                  {selectedLeave.status === 'pending' ? '待主管審核中' : '已核准休假'} {selectedLeave.type === 'special' && '(特休)'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center relative z-10 text-gray-400 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-sm font-bold flex items-center justify-center gap-2"><Coffee size={16} /> 本日無排班與排休</span>
            </div>
          )}
        </div>

        {allDayShifts.length > 0 && (
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-sm font-bold text-[#111] flex items-center gap-2">
                <Users size={16} className="text-blue-500" /> 當日出勤名單
              </h3>
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg font-bold border border-blue-100">
                共 {allDayShifts.length} 人出勤
              </span>
            </div>

            <div className="flex flex-col gap-4">
              {['早班', '晚班', '留守'].map(cat => {
                const catShifts = allDayShifts.filter(s => getShiftCategories(s).includes(cat));
                if (catShifts.length === 0) return null;

                return (
                  <div key={cat} className="flex flex-col gap-2.5">
                    <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
                      <Briefcase size={12} /> {cat}
                      <div className="h-px bg-gray-100 flex-1 ml-1"></div>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {catShifts.map(s => (
                        <div key={s.id} className={`border px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm ${getShiftCardStyles(s.type)} ${s.assignee === currentUser ? 'ring-2 ring-blue-400 scale-105 transform' : ''}`}>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${getRoleStyles(s.type)}`}></div>
                          <span className="text-xs font-bold">{s.assignee} {s.assignee === currentUser && '(我)'}</span>
                          {getUserTypeBadge(s.assignee, registeredUsers)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 主程式入口 (App) - 員工版
// ==========================================
export default function App() {
  const [systemError, setSystemError] = useState('');
  const [activeScreen, setActiveScreen] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  
  // 核心資料狀態
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [employeeLeaves, setEmployeeLeaves] = useState({});
  const [employeeNotes, setEmployeeNotes] = useState({});
  const [leaveSettings, setLeaveSettings] = useState({ year: 2026, month: 3, total: 10, weekend: 4, weekday: 6, lockDate: 20 });
  const [shifts, setShifts] = useState([]);
  const [announcement, setAnnouncement] = useState('');

  // 全局錯誤處理
  useEffect(() => {
    globalSetError = (msg) => {
      setSystemError(msg);
      setTimeout(() => setSystemError(''), 10000);
    };
    return () => { globalSetError = null; };
  }, []);

  // Firebase 初始化與登入
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof window !== 'undefined' && window.__initial_auth_token) {
          await signInWithCustomToken(auth, window.__initial_auth_token);
        } else if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth Error", error);
        if (globalSetError) globalSetError("【身份驗證失敗】請確認 Firebase Auth 設定。");
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  // 即時監聽資料庫變更 (同步的精髓在這裡！)
  useEffect(() => {
    if (!firebaseUser) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'schedule_data', 'main_state');

    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.users) setRegisteredUsers(data.users);
        if (data.shifts) setShifts(data.shifts);
        if (data.leaves) setEmployeeLeaves(data.leaves);
        if (data.announcement !== undefined) setAnnouncement(data.announcement);
        if (data.leaveSettings !== undefined) setLeaveSettings(data.leaveSettings);
        if (data.notes !== undefined) setEmployeeNotes(data.notes);
      }
    }, (err) => {
      console.error("Snapshot error", err);
      if (globalSetError) globalSetError("【讀取資料失敗】請檢查 Firebase 權限設定！");
    });

    return () => unsub();
  }, [firebaseUser]);

  const navigateTo = (screen) => setActiveScreen(screen);

  // 員工送出假單
  const handleSaveLeaves = (userName, leavesArray, noteStr) => {
    let newLeavesMap = { ...employeeLeaves, [userName]: leavesArray };
    
    // 計算同日請假人數邏輯...
    const dateCounts = {};
    Object.values(newLeavesMap).forEach(leaves => {
      leaves.forEach(l => { dateCounts[l.date] = (dateCounts[l.date] || 0) + 1; });
    });

    Object.keys(newLeavesMap).forEach(emp => {
      newLeavesMap[emp] = newLeavesMap[emp].map(l => {
        if (dateCounts[l.date] > 1 && l.status === 'approved' && !l.managerHandled) {
          return { ...l, status: 'pending' };
        }
        else if (dateCounts[l.date] <= 1 && l.status === 'pending' && !l.managerHandled) {
          return { ...l, status: 'approved' };
        }
        return l;
      });
    });

    setEmployeeLeaves(newLeavesMap);

    let newNotesMap = { ...employeeNotes };
    if (noteStr !== undefined) {
      newNotesMap[userName] = noteStr;
      setEmployeeNotes(newNotesMap);
    }

    // 將資料同步上傳給後台
    syncStateToCloud(firebaseUser, { leaves: newLeavesMap, notes: newNotesMap });
  };

  const handleLoginSuccess = (userName) => {
    setCurrentUser(userName);
    setActiveScreen('leave_request');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveScreen('login');
  };

  const onRegisterNew = (name, password, role) => {
    const newUser = { id: Date.now().toString(), name, password, role };
    const newUsers = [...registeredUsers, newUser];
    setRegisteredUsers(newUsers);
    syncStateToCloud(firebaseUser, { users: newUsers });
    return { success: true };
  };

  return (
    <div className="h-[100dvh] w-full sm:max-w-md sm:mx-auto sm:border-x sm:border-gray-200 sm:shadow-2xl bg-[#f5f6f8] font-sans overflow-hidden relative flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes shine {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .shiny-gold {
          background: linear-gradient(120deg, #D4AF37 20%, #FFEA9F 38%, #FFFFFF 45%, #FFEA9F 52%, #D4AF37 80%);
          background-size: 200% auto; color: #5C4300; animation: shine 2.5s linear infinite;
          box-shadow: 0 2px 10px rgba(212, 175, 55, 0.5), inset 0 1px 2px rgba(255,255,255,0.8); border: 1px solid #D4AF37;
        }
        .shiny-silver {
          background: linear-gradient(120deg, #9CA3AF 20%, #E5E7EB 38%, #FFFFFF 45%, #E5E7EB 52%, #9CA3AF 80%);
          background-size: 200% auto; color: #1F2937; animation: shine 2.5s linear infinite;
          box-shadow: 0 2px 10px rgba(156, 163, 175, 0.5), inset 0 1px 2px rgba(255,255,255,0.8); border: 1px solid #9CA3AF;
        }
        .shiny-bronze {
          background: linear-gradient(120deg, #B45309 20%, #FDE68A 38%, #FFFFFF 45%, #FDE68A 52%, #B45309 80%);
          background-size: 200% auto; color: #451A03; animation: shine 2.5s linear infinite;
          box-shadow: 0 2px 10px rgba(180, 83, 9, 0.5), inset 0 1px 2px rgba(255,255,255,0.8); border: 1px solid #B45309;
        }
      ` }} />

      {systemError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-11/12 max-w-md animate-in slide-in-from-top-4">
          <div className="bg-red-500 text-white p-4 rounded-2xl shadow-2xl font-bold text-sm flex items-start gap-3 border border-red-400">
            <AlertCircle size={24} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed drop-shadow-sm">{systemError}</p>
            <button onClick={() => setSystemError('')} className="ml-auto bg-white/20 rounded-full p-1 hover:bg-white/30"><X size={16} /></button>
          </div>
        </div>
      )}

      {activeScreen === 'login' && <LoginScreen onLogin={handleLoginSuccess} onGoRegister={() => setActiveScreen('register')} registeredUsers={registeredUsers} />}
      {activeScreen === 'register' && <RegisterScreen onGoLogin={() => setActiveScreen('login')} registeredUsers={registeredUsers} onRegister={onRegisterNew} />}
      {activeScreen === 'leave_request' && <LeaveRequestScreen currentUser={currentUser} employeeLeaves={employeeLeaves} employeeNotes={employeeNotes} leaveSettings={leaveSettings} onSaveLeaves={handleSaveLeaves} announcement={announcement} onLogout={handleLogout} />}
      {activeScreen === 'employee_profile' && <EmployeeProfileScreen currentUser={currentUser} registeredUsers={registeredUsers} employeeLeaves={employeeLeaves} shifts={shifts} leaveSettings={leaveSettings} />}

      {activeScreen !== 'login' && activeScreen !== 'register' && <BottomNav activeScreen={activeScreen} onNavigate={navigateTo} />}
    </div>
  );
}