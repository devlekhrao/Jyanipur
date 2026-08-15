import React, { useState, useEffect } from 'react';
import { getEmployees, saveEmployee, getTodayAttendance, saveAttendance, getMonthlyAttendance } from '..../db';

export default function MobileEmployeeAttendance({ companySettings = {} }) {
  const [currentView, setCurrentView] = useState('attendance');
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

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Staff & Attendance</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Workforce & Payroll</p>
          </div>
          <button 
            onClick={() => setCurrentView('register')}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-black px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-sm active:scale-95"
          >
            + Register
          </button>
        </div>

        {/* SWIPEABLE VIEW SEGMENTED CONTROL */}
        <div className="flex bg-zinc-200/80 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setCurrentView('attendance')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all ${
              currentView === 'attendance' ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-500'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setCurrentView('monthly')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all ${
              currentView === 'monthly' ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-500'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCurrentView('directory')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all ${
              currentView === 'directory' ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-500'
            }`}
          >
            Directory
          </button>
        </div>
      </div>

      {/* VIEW 1: TODAY'S ATTENDANCE */}
      {currentView === 'attendance' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* STATS STRIP */}
          <div className="grid grid-cols-4 gap-2 mb-3 shrink-0">
            <div className="bg-white p-2.5 rounded-2xl border border-zinc-200 shadow-sm text-center">
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Total</span>
              <p className="text-lg font-black text-zinc-900">{totalEmployees}</p>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-100 shadow-sm text-center">
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">Present</span>
              <p className="text-lg font-black text-emerald-700">{presentCount}</p>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-2xl border border-amber-100 shadow-sm text-center">
              <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block">Half</span>
              <p className="text-lg font-black text-amber-700">{halfDayCount}</p>
            </div>
            <div className="bg-red-50 p-2.5 rounded-2xl border border-red-100 shadow-sm text-center">
              <span className="text-[8px] font-black text-red-600 uppercase tracking-widest block">Absent</span>
              <p className="text-lg font-black text-red-700">{absentCount}</p>
            </div>
          </div>

          {/* ATTENDANCE CARDS LIST */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {loading ? (
              <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading staff list...</div>
            ) : employees.length === 0 ? (
              <div className="text-center py-12 bg-white border border-zinc-200 border-dashed rounded-3xl">
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No staff registered yet.</p>
              </div>
            ) : (
              employees.map(emp => {
                const currentStatus = todayAttendance[emp.id] || '';
                return (
                  <div key={emp.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-zinc-900 text-sm">{emp.fullName}</h4>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{emp.role} • {emp.empId}</p>
                      </div>
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-700">
                        {emp.payType}
                      </span>
                    </div>

                    {/* TOUCH CONTROLS */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {[
                        { label: 'Present', color: 'bg-emerald-600 text-white' },
                        { label: 'Half Day', color: 'bg-amber-500 text-white' },
                        { label: 'Absent', color: 'bg-red-600 text-white' },
                        { label: 'Leave', color: 'bg-purple-600 text-white' }
                      ].map(st => (
                        <button
                          key={st.label}
                          onClick={() => handleAttendanceChange(emp.id, st.label)}
                          className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                            currentStatus === st.label
                              ? `${st.color} shadow-md`
                              : 'bg-zinc-100 text-zinc-500'
                          }`}
                        >
                          {st.label === 'Half Day' ? 'Half' : st.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* VIEW 2: MONTHLY OVERVIEW */}
      {currentView === 'monthly' && (
        <div className="flex-1 flex flex-col overflow-hidden space-y-3">
          
          {/* MONTH / YEAR PICKER */}
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between shrink-0">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Select Month:</span>
            <div className="flex gap-2">
              <select 
                value={viewMonth} 
                onChange={e => setViewMonth(Number(e.target.value))}
                className="bg-zinc-100 font-extrabold text-xs text-zinc-800 py-1.5 px-3 rounded-xl outline-none"
              >
                {Array.from({length: 12}, (_, i) => (
                  <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
                ))}
              </select>
              <select 
                value={viewYear} 
                onChange={e => setViewYear(Number(e.target.value))}
                className="bg-zinc-100 font-extrabold text-xs text-zinc-800 py-1.5 px-3 rounded-xl outline-none"
              >
                <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
                <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
                <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
              </select>
            </div>
          </div>

          {/* MONTHLY SUMMARY LIST */}
          <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {loading ? (
              <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading monthly register...</div>
            ) : employees.map(emp => {
              const empRecord = monthlyAttendance[emp.id] || {};
              const pCount = Object.values(empRecord).filter(s => s === 'Present').length;
              const hCount = Object.values(empRecord).filter(s => s === 'Half Day').length;
              const aCount = Object.values(empRecord).filter(s => s === 'Absent').length;
              const totalPayableDays = pCount + (hCount * 0.5);

              return (
                <div key={emp.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-zinc-900 text-sm">{emp.fullName}</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{emp.role}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">P: {pCount}</span>
                      <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">H: {hCount}</span>
                      <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md">A: {aCount}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-[#1E3A8A] block">{totalPayableDays}</span>
                    <span className="text-[8px] font-extrabold text-zinc-400 uppercase tracking-widest">Payable Days</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* VIEW 3: STAFF DIRECTORY */}
      {currentView === 'directory' && (
        <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {loading ? (
            <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading directory...</div>
          ) : employees.map(emp => (
            <div key={emp.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1E3A8A] text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                  {emp.fullName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-extrabold text-zinc-900 text-sm">{emp.fullName}</h4>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{emp.phone}</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedEmp(emp); setCurrentView('view_emp'); }}
                className="bg-blue-50 text-[#1E3A8A] px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-transform"
              >
                Card
              </button>
            </div>
          ))}
        </div>
      )}

      {/* VIEW 4: REGISTER STAFF SHEET */}
      {currentView === 'register' && (
        <div className="flex-1 overflow-y-auto bg-white border border-zinc-200 rounded-[2rem] p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100">
            <h3 className="font-extrabold text-zinc-900 text-base">New Staff Onboarding</h3>
            <button onClick={() => setCurrentView('attendance')} className="text-zinc-400 font-bold text-sm">✕</button>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-4 pb-12">
            <div>
              <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="e.g. Ramesh Reddy" value={newEmp.fullName} onChange={e => setNewEmp({...newEmp, fullName: e.target.value})} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Designation / Role</label>
              <select value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value})} className={inputClass}>
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
              <input type="tel" placeholder="+91 9876543210" value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Wage Type</label>
                <select value={newEmp.payType} onChange={e => setNewEmp({...newEmp, payType: e.target.value})} className={inputClass}>
                  <option value="Monthly">Monthly</option>
                  <option value="Daily">Daily</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Rate / Amount (₹) <span className="text-red-500">*</span></label>
                <input type="number" inputMode="numeric" placeholder="35000" value={newEmp.payRate} onChange={e => setNewEmp({...newEmp, payRate: e.target.value})} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Government ID / Record Ref</label>
              <input type="text" placeholder="ID / Reference Number" value={newEmp.idNumber} onChange={e => setNewEmp({...newEmp, idNumber: e.target.value})} className={inputClass} />
            </div>

            <button type="submit" className="w-full py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform mt-4">
              Complete Onboarding
            </button>
          </form>
        </div>
      )}

      {/* VIEW 5: EMPLOYEE CARD MODAL */}
      {currentView === 'view_emp' && selectedEmp && (
        <div className="flex-1 overflow-y-auto bg-white border border-zinc-200 rounded-[2rem] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#1E3A8A] text-amber-400 flex items-center justify-center font-black text-lg">
                  {selectedEmp.fullName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-extrabold text-zinc-900 text-base">{selectedEmp.fullName}</h3>
                  <p className="text-[10px] font-bold text-amber-600">{selectedEmp.role} • {selectedEmp.empId}</p>
                </div>
              </div>
              <button onClick={() => setCurrentView('directory')} className="text-zinc-400 font-bold text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs text-zinc-700 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <p><strong>Mobile:</strong> {selectedEmp.phone}</p>
              <p><strong>Joining Date:</strong> {selectedEmp.joiningDate}</p>
              <p><strong>Wage Type:</strong> {selectedEmp.payType}</p>
              <p><strong>Rate / Salary:</strong> ₹{selectedEmp.payRate?.toLocaleString('en-IN')}</p>
            </div>
          </div>

          <button onClick={() => setCurrentView('directory')} className="w-full py-3.5 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider mt-6">
            Back to Directory
          </button>
        </div>
      )}

    </div>
  );
}