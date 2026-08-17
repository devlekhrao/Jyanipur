import React, { useState, useEffect } from 'react';
import { getEmployees, saveEmployee, getTodayAttendance, saveAttendance, getMonthlyAttendance } from '../db';

export default function EmployeeAttendance({ companySettings = {} }) {
  const [currentView, setCurrentView] = useState('monthly');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({});
  const [monthlyAttendance, setMonthlyAttendance] = useState({});

  const currentDate = new Date();
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth() + 1);
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  
  const [activeTool, setActiveTool] = useState('Present');

  const todayStr = currentDate.toISOString().split('T')[0];

  const loadData = async () => {
    setLoading(true);
    try {
      const emps = await getEmployees();
      setEmployees(emps || []);
      
      if (currentView === 'attendance') {
        const att = await getTodayAttendance(todayStr);
        setTodayAttendance(att || {});
      } else if (currentView === 'monthly') {
        const monthAtt = await getMonthlyAttendance(viewYear, viewMonth);
        setMonthlyAttendance(monthAtt || {});
      }
    } catch (e) {
      console.error("Error loading attendance data from cloud database:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentView, viewMonth, viewYear]);

  const [newEmp, setNewEmp] = useState({
    fullName: '', role: 'Site Supervisor', phone: '', payType: 'Monthly', payRate: '',
    joiningDate: todayStr, bankName: '', accountNo: '', ifscCode: '', idNumber: ''
  });

  const [errors, setErrors] = useState({});

  const totalEmployees = employees.length;
  const presentCount = Object.values(todayAttendance).filter(v => v === 'Present').length;
  const absentCount = Object.values(todayAttendance).filter(v => v === 'Absent').length;
  const halfDayCount = Object.values(todayAttendance).filter(v => v === 'Half Day').length;

  const handleAttendanceChange = async (empId, status) => {
    setTodayAttendance(prev => ({ ...prev, [empId]: status }));
    await saveAttendance(empId, todayStr, status);
  };

  const handleGridCellClick = async (empId, day) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentStatus = (monthlyAttendance[empId] && monthlyAttendance[empId][dateStr]) || '';

    let nextStatus = '';
    
    if (activeTool === 'Cycle') {
      const cycle = ['', 'Present', 'Half Day', 'Absent', 'Leave'];
      let nextIndex = cycle.indexOf(currentStatus) + 1;
      if (nextIndex >= cycle.length) nextIndex = 0;
      nextStatus = cycle[nextIndex];
    } else {
      nextStatus = currentStatus === activeTool ? '' : activeTool;
    }

    setMonthlyAttendance(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        [dateStr]: nextStatus
      }
    }));

    await saveAttendance(empId, dateStr, nextStatus);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!newEmp.fullName) newErrors.fullName = true;
    if (!newEmp.phone) newErrors.phone = true;
    if (!newEmp.payRate) newErrors.payRate = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Please fill all required fields (*)');
      return;
    }

    const createdEmp = {
      empId: `JYN-EMP-00${employees.length + 1}`,
      ...newEmp,
      payRate: parseFloat(newEmp.payRate) || 0,
      status: 'Active'
    };

    setLoading(true);
    try {
      await saveEmployee(createdEmp);
      await loadData();
      setNewEmp({
        fullName: '', role: 'Site Supervisor', phone: '', payType: 'Monthly', payRate: '',
        joiningDate: todayStr, bankName: '', accountNo: '', ifscCode: '', idNumber: ''
      });
      setErrors({});
      alert(`Employee ${createdEmp.fullName} registered successfully!`);
      setCurrentView('directory');
    } catch (err) {
      alert('Failed to register employee. Check DB connection.');
      setLoading(false);
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: getDaysInMonth(viewYear, viewMonth) }, (_, i) => i + 1);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-emerald-500 text-white border-emerald-600 shadow-xs';
      case 'Half Day': return 'bg-amber-400 text-white border-amber-500 shadow-xs';
      case 'Absent': return 'bg-red-500 text-white border-red-600 shadow-xs';
      case 'Leave': return 'bg-purple-500 text-white border-purple-600 shadow-xs';
      default: return 'bg-zinc-100 text-transparent border-zinc-200 hover:bg-zinc-200';
    }
  };

  const getStatusLetter = (status) => {
    switch (status) {
      case 'Present': return 'P';
      case 'Half Day': return 'H';
      case 'Absent': return 'A';
      case 'Leave': return 'L';
      default: return '';
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Staff & Attendance Portal</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Manage workforce directory, daily site attendance, and onboarding.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200">
            <button 
              onClick={() => setCurrentView('monthly')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'monthly' ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Interactive Grid
            </button>
            <button 
              onClick={() => setCurrentView('attendance')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'attendance' ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Today's List
            </button>
            <button 
              onClick={() => setCurrentView('directory')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'directory' ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Staff Directory
            </button>
          </div>

          <button 
            onClick={() => setCurrentView('register')}
            className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10 ml-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Register Staff
          </button>
        </div>
      </div>

      {/* TODAY'S ATTENDANCE VIEW */}
      {currentView === 'attendance' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6 shrink-0">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Staff</span>
              <p className="text-xl font-bold text-zinc-900">{totalEmployees}</p>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Present Today</span>
              <p className="text-xl font-bold text-emerald-700">{presentCount}</p>
            </div>
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest block mb-1">Half Day</span>
              <p className="text-xl font-bold text-[#B45309]">{halfDayCount}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-red-200/80 shadow-sm flex flex-col justify-center">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Absent</span>
              <p className="text-xl font-bold text-red-500">{absentCount}</p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 bg-zinc-50/80 shrink-0">
              <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Mark Attendance for <span className="text-[#B45309]">{currentDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200">
                    <th className="py-3.5 px-6 font-semibold">Emp ID</th>
                    <th className="py-3.5 px-6 font-semibold">Employee Name</th>
                    <th className="py-3.5 px-6 font-semibold">Role / Job</th>
                    <th className="py-3.5 px-6 font-semibold text-center">Status Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {loading ? (
                    <tr><td colSpan="4" className="text-center py-12 text-zinc-400 font-medium">Syncing attendance with cloud database...</td></tr>
                  ) : employees.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-12 text-zinc-400 font-medium">No staff registered yet.</td></tr>
                  ) : (
                    employees.map((emp) => {
                      const currentStatus = todayAttendance[emp.id] || '';
                      return (
                        <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="py-4 px-6 font-mono text-xs font-semibold text-zinc-500">{emp.empId}</td>
                          <td className="py-4 px-6 font-semibold text-zinc-900">{emp.fullName}</td>
                          <td className="py-4 px-6 text-xs text-zinc-600 font-medium">{emp.role}</td>
                          <td className="py-4 px-6">
                            <div className="flex justify-center gap-2">
                              {[
                                { label: 'Present', color: 'bg-emerald-600 text-white' },
                                { label: 'Half Day', color: 'bg-amber-500 text-white' },
                                { label: 'Absent', color: 'bg-red-600 text-white' },
                                { label: 'Leave', color: 'bg-purple-600 text-white' }
                              ].map((st) => (
                                <button
                                  key={st.label}
                                  onClick={() => handleAttendanceChange(emp.id, st.label)}
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    currentStatus === st.label
                                      ? `${st.color} shadow-sm scale-105`
                                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900'
                                  }`}
                                >
                                  {st.label}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY CALENDAR GRID */}
      {currentView === 'monthly' && (
        <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Monthly Attendance Register</h3>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">Select a status tool, then click grid cells to update attendance instantly.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-white border border-zinc-200 p-1 rounded-xl shadow-sm">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider pl-2 pr-1">Tool:</span>
                {[
                  { id: 'Present', color: 'bg-emerald-600 text-white', label: 'P' },
                  { id: 'Half Day', color: 'bg-amber-500 text-white', label: 'H' },
                  { id: 'Absent', color: 'bg-red-600 text-white', label: 'A' },
                  { id: 'Leave', color: 'bg-purple-600 text-white', label: 'L' },
                  { id: 'Cycle', color: 'bg-zinc-800 text-white', label: '↻' }
                ].map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    title={tool.id}
                    className={`h-7 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTool === tool.id 
                        ? `${tool.color} shadow-sm` 
                        : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                    }`}
                  >
                    {tool.id === 'Cycle' ? tool.label : tool.id}
                  </button>
                ))}
              </div>

              <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3 shadow-sm">
                <select 
                  value={viewMonth} 
                  onChange={(e) => setViewMonth(Number(e.target.value))} 
                  className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer px-1"
                >
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'long' })}</option>
                  ))}
                </select>
                <select 
                  value={viewYear} 
                  onChange={(e) => setViewYear(Number(e.target.value))} 
                  className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer pr-1"
                >
                  <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
                  <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
                  <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="w-full flex-1 overflow-x-auto min-h-0 bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-sm flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase border-b border-zinc-200 sticky top-0 bg-zinc-50 z-20">
                    <th className="py-3 px-3 font-semibold sticky left-0 bg-zinc-50 z-30 border-r border-zinc-200">Employee Name</th>
                    {daysArray.map(day => (
                      <th key={day} className="py-3 px-1 font-semibold text-center w-8">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {loading ? (
                    <tr><td colSpan={daysArray.length + 1} className="text-center py-12 text-zinc-400 font-medium">Syncing Master Register from cloud DB...</td></tr>
                  ) : employees.map(emp => {
                    const empRecord = monthlyAttendance[emp.id] || {};
                    
                    const pCount = Object.values(empRecord).filter(s => s === 'Present').length;
                    const hCount = Object.values(empRecord).filter(s => s === 'Half Day').length;
                    const totalPayableDays = pCount + (hCount * 0.5);

                    return (
                      <tr key={emp.id} className="hover:bg-zinc-50 group">
                        <td className="py-2.5 px-3 sticky left-0 bg-white group-hover:bg-zinc-50 z-10 border-r border-zinc-100 transition-colors">
                          <div className="flex justify-between items-center w-48">
                            <span className="font-semibold text-zinc-900 truncate text-xs">{emp.fullName}</span>
                            <span className="text-[10px] font-bold text-[#B45309] bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded">
                              {totalPayableDays} Days
                            </span>
                          </div>
                        </td>
                        {daysArray.map(day => {
                          const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const status = empRecord[dateStr] || '';
                          
                          return (
                            <td 
                              key={day} 
                              onClick={() => handleGridCellClick(emp.id, day)}
                              className="py-1 px-0.5 text-center cursor-pointer select-none"
                            >
                              <div className={`w-6 h-6 mx-auto flex items-center justify-center rounded text-xs font-bold transition-all ${getStatusColor(status)}`}>
                                {getStatusLetter(status)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-zinc-200 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 shrink-0">
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">P</span> Present</div>
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">H</span> Half Day</div>
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">A</span> Absent</div>
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-purple-500 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">L</span> Leave</div>
          </div>
        </div>
      )}

      {/* STAFF DIRECTORY VIEW */}
      {currentView === 'directory' && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/80 flex justify-between items-center shrink-0">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Employee Directory</h3>
            <span className="text-xs font-semibold text-[#B45309]">{employees.length} Staff Members Registered</span>
          </div>

          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200">
                  <th className="py-3.5 px-6 font-semibold">Emp ID</th>
                  <th className="py-3.5 px-6 font-semibold">Name & Contact</th>
                  <th className="py-3.5 px-6 font-semibold">Role</th>
                  <th className="py-3.5 px-6 font-semibold">Salary / Rate</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-semibold text-zinc-500">{emp.empId}</td>
                    <td className="py-4 px-6">
                      <p className="font-semibold text-zinc-900">{emp.fullName}</p>
                      <p className="text-xs text-zinc-400 font-medium mt-0.5">{emp.phone}</p>
                    </td>
                    <td className="py-4 px-6 text-zinc-700 font-medium text-xs">{emp.role}</td>
                    <td className="py-4 px-6 font-bold text-zinc-900">
                      ₹{parseFloat(emp.payRate || 0).toLocaleString('en-IN')} <span className="text-xs text-zinc-400 font-normal">({emp.payType})</span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => { setSelectedEmp(emp); setCurrentView('view_emp'); }}
                        className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-wider transition-all"
                      >
                        View Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REGISTER STAFF VIEW */}
      {currentView === 'register' && (
        <div className="bg-white p-8 rounded-2xl border border-zinc-200/80 shadow-sm max-w-4xl mx-auto w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex justify-between items-center border-b border-zinc-200 pb-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 tracking-tight">New Staff Registration</h3>
              <p className="text-xs font-medium text-zinc-500 mt-0.5">Onboard carpenters, supervisors, interior architects, and site labor.</p>
            </div>
            <button 
              onClick={() => setCurrentView('monthly')}
              className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-[#B45309] uppercase tracking-wider mb-3 border-b border-zinc-100 pb-1">1. Personal & Role Info</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="e.g. Ramesh Reddy" value={newEmp.fullName} onChange={e => setNewEmp({...newEmp, fullName: e.target.value})} className={`${inputClass} ${errors.fullName ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} />
                </div>
                <div>
                  <label className={labelClass}>Designation / Role</label>
                  <select 
                    value={newEmp.role} 
                    onChange={e => setNewEmp({...newEmp, role: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="Site Supervisor">Site Supervisor</option>
                    <option value="Interior Architect">Interior Architect</option>
                    <option value="Lead Carpenter">Lead Carpenter</option>
                    <option value="Senior Electrician">Senior Electrician</option>
                    <option value="Painter Lead">Painter Lead</option>
                    <option value="Site Helper">Site Helper / Labor</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Mobile Number <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="+91 9876543210" value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} className={`${inputClass} ${errors.phone ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#B45309] uppercase tracking-wider mb-3 border-b border-zinc-100 pb-1">2. Pay Rate & Terms</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Wage Structure</label>
                  <select 
                    value={newEmp.payType} 
                    onChange={e => setNewEmp({...newEmp, payType: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10 font-bold text-zinc-900 bg-amber-50/50 border-amber-200`}
                  >
                    <option value="Monthly">Monthly Fixed Salary</option>
                    <option value="Daily">Daily Rate Worker</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Pay Rate Amount (₹) <span className="text-red-500">*</span></label>
                  <input type="number" placeholder="e.g. 35000 or 1200" value={newEmp.payRate} onChange={e => setNewEmp({...newEmp, payRate: e.target.value})} className={`${inputClass} ${errors.payRate ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} />
                </div>
                <div>
                  <label className={labelClass}>Joining Date</label>
                  <input type="date" value={newEmp.joiningDate} onChange={e => setNewEmp({...newEmp, joiningDate: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-[#B45309] uppercase tracking-wider mb-3 border-b border-zinc-100 pb-1">3. ID & Banking</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>ID Number</label>
                  <input type="text" placeholder="Government ID" value={newEmp.idNumber} onChange={e => setNewEmp({...newEmp, idNumber: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Bank Name</label>
                  <input type="text" placeholder="e.g. HDFC Bank" value={newEmp.bankName} onChange={e => setNewEmp({...newEmp, bankName: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Account Number</label>
                  <input type="text" placeholder="Account Number" value={newEmp.accountNo} onChange={e => setNewEmp({...newEmp, accountNo: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>IFSC Code</label>
                  <input type="text" placeholder="IFSC Code" value={newEmp.ifscCode} onChange={e => setNewEmp({...newEmp, ifscCode: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-3 border-t border-zinc-200">
              <button type="button" onClick={() => setCurrentView('monthly')} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                {loading ? 'Registering...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STAFF DETAIL CARD VIEW */}
      {currentView === 'view_emp' && selectedEmp && (
        <div className="bg-white p-8 rounded-2xl border border-zinc-200/80 shadow-sm max-w-2xl mx-auto w-full">
          <div className="flex justify-between items-start border-b border-zinc-200 pb-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#B45309] text-white flex items-center justify-center font-bold text-xl shadow-sm">
                {selectedEmp.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">{selectedEmp.fullName}</h3>
                <p className="text-xs font-semibold text-[#B45309]">{selectedEmp.role} | {selectedEmp.empId}</p>
              </div>
            </div>
            <button onClick={() => setCurrentView('directory')} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6 text-sm text-zinc-700">
            <div className="space-y-3 bg-zinc-50 p-5 rounded-2xl border border-zinc-200/60 shadow-xs">
              <p className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider">Contact & Joining</p>
              <p><strong>Mobile:</strong> {selectedEmp.phone}</p>
              <p><strong>Joining Date:</strong> {selectedEmp.joiningDate}</p>
              <p><strong>Status:</strong> <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-xs">{selectedEmp.status}</span></p>
            </div>
            <div className="space-y-3 bg-zinc-50 p-5 rounded-2xl border border-zinc-200/60 shadow-xs">
              <p className="font-bold text-zinc-400 uppercase text-[10px] tracking-wider">Pay & Bank Details</p>
              <p><strong>Wage Type:</strong> {selectedEmp.payType}</p>
              <p><strong>Rate / Salary:</strong> ₹{parseFloat(selectedEmp.payRate || 0).toLocaleString('en-IN')}</p>
              {selectedEmp.bankName && <p><strong>Bank:</strong> {selectedEmp.bankName}</p>}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-200 flex justify-end">
            <button onClick={() => setCurrentView('directory')} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl text-sm font-medium shadow-sm cursor-pointer">
              Back to Directory
            </button>
          </div>
        </div>
      )}

    </div>
  );
}