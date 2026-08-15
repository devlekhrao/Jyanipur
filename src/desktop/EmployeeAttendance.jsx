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
      console.warn("Ensure attendance functions exist in db.js");
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
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: getDaysInMonth(viewYear, viewMonth) }, (_, i) => i + 1);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-emerald-500 text-white border-emerald-600 shadow-sm';
      case 'Half Day': return 'bg-amber-400 text-white border-amber-500 shadow-sm';
      case 'Absent': return 'bg-red-500 text-white border-red-600 shadow-sm';
      case 'Leave': return 'bg-purple-500 text-white border-purple-600 shadow-sm';
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

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Staff & Attendance Portal</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Manage workforce directory, daily site attendance, and onboarding.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentView('monthly')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentView === 'monthly' ? 'bg-[#1E3A8A] text-white shadow-md' : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            Interactive Grid
          </button>
          <button 
            onClick={() => setCurrentView('attendance')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentView === 'attendance' ? 'bg-[#1E3A8A] text-white shadow-md' : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            Today's List
          </button>
          <button 
            onClick={() => setCurrentView('directory')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentView === 'directory' ? 'bg-[#1E3A8A] text-white shadow-md' : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            Staff Directory
          </button>
          <button 
            onClick={() => setCurrentView('register')}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md hover:-translate-y-0.5 ml-2"
          >
            + Register Staff
          </button>
        </div>
      </div>

      {/* TODAY'S ATTENDANCE VIEW */}
      {currentView === 'attendance' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest">Total Staff</span>
              <p className="text-2xl font-black text-zinc-900 mt-1">{totalEmployees}</p>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
              <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest">Present Today</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{presentCount}</p>
            </div>
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
              <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest">Half Day</span>
              <p className="text-2xl font-black text-amber-700 mt-1">{halfDayCount}</p>
            </div>
            <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm">
              <span className="text-[9px] font-extrabold text-red-600 uppercase tracking-widest">Absent</span>
              <p className="text-2xl font-black text-red-700 mt-1">{absentCount}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider">
                Mark Attendance for <span className="text-amber-600">{currentDate.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-100 bg-zinc-50/50">
                    <th className="py-3.5 px-4 font-bold">Emp ID</th>
                    <th className="py-3.5 px-4 font-bold">Employee Name</th>
                    <th className="py-3.5 px-4 font-bold">Role / Job</th>
                    <th className="py-3.5 px-4 font-bold text-center">Status Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {loading ? (
                    <tr><td colSpan="4" className="text-center py-10 text-zinc-400 font-medium">Loading staff data...</td></tr>
                  ) : employees.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-10 text-zinc-400 font-medium">No staff registered yet.</td></tr>
                  ) : (
                    employees.map((emp) => {
                      const currentStatus = todayAttendance[emp.id] || '';
                      return (
                        <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-zinc-500">{emp.empId}</td>
                          <td className="py-3.5 px-4 font-extrabold text-zinc-900">{emp.fullName}</td>
                          <td className="py-3.5 px-4 text-zinc-600 font-medium">{emp.role}</td>
                          <td className="py-3.5 px-4">
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
                                  className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
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
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0">
            <div>
              <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider">Monthly Register</h3>
              <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Select a paintbrush tool, then click cells to mark attendance instantly.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-2xl shadow-md">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-2 pr-1">Tool:</span>
                {[
                  { id: 'Present', color: 'bg-emerald-500 text-white', label: 'P' },
                  { id: 'Half Day', color: 'bg-amber-400 text-white', label: 'H' },
                  { id: 'Absent', color: 'bg-red-500 text-white', label: 'A' },
                  { id: 'Leave', color: 'bg-purple-500 text-white', label: 'L' },
                  { id: 'Cycle', color: 'bg-white text-zinc-900', label: '↻' }
                ].map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    title={tool.id}
                    className={`h-7 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeTool === tool.id 
                        ? `${tool.color} shadow-sm scale-105 ring-2 ring-white/20` 
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {tool.id === 'Cycle' ? tool.label : tool.id}
                  </button>
                ))}
              </div>

              <div className="w-px h-8 bg-zinc-200 hidden xl:block"></div>

              <div className="flex items-center gap-1.5 h-10 bg-white border border-zinc-200 shadow-sm rounded-2xl px-3">
                <select 
                  value={viewMonth} 
                  onChange={(e) => setViewMonth(Number(e.target.value))} 
                  className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer"
                >
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'long' })}</option>
                  ))}
                </select>
                <select 
                  value={viewYear} 
                  onChange={(e) => setViewYear(Number(e.target.value))} 
                  className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer"
                >
                  <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
                  <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
                  <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="w-full flex-1 overflow-x-auto min-h-0 bg-white border border-zinc-200 rounded-[2rem] p-4 shadow-sm flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="text-zinc-400 text-[9px] uppercase border-b border-zinc-100 sticky top-0 bg-white z-20">
                    <th className="py-3 px-3 font-bold sticky left-0 bg-white z-30 border-r border-zinc-100">Employee Name</th>
                    {daysArray.map(day => (
                      <th key={day} className="py-3 px-1 font-bold text-center w-8">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {loading ? (
                    <tr><td colSpan={daysArray.length + 1} className="text-center py-10 text-zinc-400 font-medium">Loading Master Register...</td></tr>
                  ) : employees.map(emp => {
                    const empRecord = monthlyAttendance[emp.id] || {};
                    
                    const pCount = Object.values(empRecord).filter(s => s === 'Present').length;
                    const hCount = Object.values(empRecord).filter(s => s === 'Half Day').length;
                    const totalPayableDays = pCount + (hCount * 0.5);

                    return (
                      <tr key={emp.id} className="hover:bg-zinc-50 group">
                        <td className="py-2.5 px-3 sticky left-0 bg-white group-hover:bg-zinc-50 z-10 border-r border-zinc-100 transition-colors">
                          <div className="flex justify-between items-center w-48">
                            <span className="font-extrabold text-zinc-900 truncate">{emp.fullName}</span>
                            <span className="text-[9px] font-bold text-[#1E3A8A] bg-blue-50 px-2 py-0.5 rounded-md">
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
                              className="py-1 px-0.5 text-center cursor-cell"
                            >
                              <div className={`w-[26px] h-[26px] mx-auto flex items-center justify-center rounded-md text-[10px] font-black border transition-all ${getStatusColor(status)}`}>
                                {getStatusLetter(status)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-zinc-200 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 shrink-0">
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-emerald-500 border border-emerald-600 text-white flex items-center justify-center text-[8px] shadow-sm">P</span> Present</div>
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-400 border border-amber-500 text-white flex items-center justify-center text-[8px] shadow-sm">H</span> Half Day</div>
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-red-500 border border-red-600 text-white flex items-center justify-center text-[8px] shadow-sm">A</span> Absent</div>
            <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-purple-500 border border-purple-600 text-white flex items-center justify-center text-[8px] shadow-sm">L</span> Leave</div>
          </div>
        </div>
      )}

      {/* STAFF DIRECTORY VIEW */}
      {currentView === 'directory' && (
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider">Employee Directory</h3>
            <span className="text-xs font-semibold text-zinc-500">{employees.length} Staff Members Registered</span>
          </div>

          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-100 bg-zinc-50/50">
                  <th className="py-3 px-4 font-bold">Emp ID</th>
                  <th className="py-3 px-4 font-bold">Name & Contact</th>
                  <th className="py-3 px-4 font-bold">Role</th>
                  <th className="py-3 px-4 font-bold">Salary / Rate</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-zinc-500">{emp.empId}</td>
                    <td className="py-4 px-4">
                      <p className="font-extrabold text-zinc-900">{emp.fullName}</p>
                      <p className="text-[10px] text-zinc-500">{emp.phone}</p>
                    </td>
                    <td className="py-4 px-4 text-zinc-700 font-semibold">{emp.role}</td>
                    <td className="py-4 px-4 font-extrabold text-zinc-900">
                      ₹{emp.payRate.toLocaleString('en-IN')} <span className="text-[9px] text-zinc-400 font-normal">({emp.payType})</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={() => { setSelectedEmp(emp); setCurrentView('view_emp'); }}
                        className="text-[#1E3A8A] hover:text-blue-900 font-bold uppercase tracking-wider text-[10px] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
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
        <div className="bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-sm max-w-4xl mx-auto w-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
            <div>
              <h3 className="text-lg font-extrabold text-zinc-900 tracking-tight">New Staff Registration</h3>
              <p className="text-zinc-500 text-xs mt-0.5">Onboard new carpenters, supervisors, interior architects, and site labor.</p>
            </div>
            <button 
              onClick={() => setCurrentView('monthly')}
              className="text-zinc-500 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-widest bg-zinc-100 px-3.5 py-1.5 rounded-full cursor-pointer"
            >
              ✕ Cancel
            </button>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            <div>
              <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-3">1. Personal & Role Info</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="e.g. Ramesh Reddy" value={newEmp.fullName} onChange={e => setNewEmp({...newEmp, fullName: e.target.value})} className={`${inputClass} ${errors.fullName ? 'ring-1 ring-red-400 bg-red-50' : ''}`} />
                </div>
                <div>
                  <label className={labelClass}>Designation / Role</label>
                  <select value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} className={`${inputClass} cursor-pointer`}>
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
                  <input type="text" placeholder="+91 9876543210" value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} className={`${inputClass} ${errors.phone ? 'ring-1 ring-red-400 bg-red-50' : ''}`} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-3">2. Pay Rate & Terms</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Wage Structure</label>
                  <select value={newEmp.payType} onChange={e => setNewEmp({...newEmp, payType: e.target.value})} className={`${inputClass} cursor-pointer font-bold text-zinc-900 bg-amber-50/50 border-amber-200`}>
                    <option value="Monthly">Monthly Fixed Salary</option>
                    <option value="Daily">Daily Rate Worker</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Pay Rate Amount (₹) <span className="text-red-500">*</span></label>
                  <input type="number" placeholder="e.g. 35000 or 1200" value={newEmp.payRate} onChange={e => setNewEmp({...newEmp, payRate: e.target.value})} className={`${inputClass} ${errors.payRate ? 'ring-1 ring-red-400 bg-red-50' : ''}`} />
                </div>
                <div>
                  <label className={labelClass}>Joining Date</label>
                  <input type="date" value={newEmp.joiningDate} onChange={e => setNewEmp({...newEmp, joiningDate: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-3">3. ID & Banking</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>ID Number [OMITTED]</label>
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

            <div className="pt-6 flex justify-end gap-3 border-t border-zinc-100">
              <button type="button" onClick={() => setCurrentView('monthly')} className="px-6 py-3.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-bold text-[10px] uppercase tracking-wider text-zinc-600 transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" className="px-8 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">
                Complete Registration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STAFF DETAIL CARD VIEW */}
      {currentView === 'view_emp' && selectedEmp && (
        <div className="bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-xl max-w-2xl mx-auto w-full">
          <div className="flex justify-between items-start border-b border-zinc-100 pb-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1E3A8A] text-amber-400 flex items-center justify-center font-black text-xl shadow-md">
                {selectedEmp.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-zinc-900">{selectedEmp.fullName}</h3>
                <p className="text-xs font-bold text-amber-600">{selectedEmp.role} | {selectedEmp.empId}</p>
              </div>
            </div>
            <button onClick={() => setCurrentView('directory')} className="text-zinc-500 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-widest bg-zinc-100 px-3.5 py-1.5 rounded-full cursor-pointer">✕ Close</button>
          </div>

          <div className="grid grid-cols-2 gap-6 text-xs text-zinc-700">
            <div className="space-y-3 bg-zinc-50 p-5 rounded-2xl border border-zinc-200/60 shadow-sm">
              <p className="font-extrabold text-zinc-400 uppercase text-[9px] tracking-widest">Contact & Joining</p>
              <p><strong>Mobile:</strong> {selectedEmp.phone}</p>
              <p><strong>Joining Date:</strong> {selectedEmp.joiningDate}</p>
              <p><strong>Status:</strong> <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">{selectedEmp.status}</span></p>
            </div>
            <div className="space-y-3 bg-zinc-50 p-5 rounded-2xl border border-zinc-200/60 shadow-sm">
              <p className="font-extrabold text-zinc-400 uppercase text-[9px] tracking-widest">Pay & Bank Details</p>
              <p><strong>Wage Type:</strong> {selectedEmp.payType}</p>
              <p><strong>Rate / Salary:</strong> ₹{selectedEmp.payRate.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-end">
            <button onClick={() => setCurrentView('directory')} className="px-6 py-3 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">Back to Directory</button>
          </div>
        </div>
      )}
    </div>
  );
}