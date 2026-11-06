import React, { useState, useEffect } from 'react';
import { getProjects } from '../db'; 

// Mock Employees (In a real app, this comes from an Employee DB table)
const defaultEmployees = [
  { id: 'EMP-001', name: 'Pavan Kumar', role: 'Site Engineer', wagePerDay: 1200 },
  { id: 'EMP-002', name: 'Ramesh Singh', role: 'Head Carpenter', wagePerDay: 900 },
  { id: 'EMP-003', name: 'Sunita Devi', role: 'Painter', wagePerDay: 700 },
  { id: 'EMP-004', name: 'Arjun Reddy', role: 'Electrician', wagePerDay: 850 },
  { id: 'EMP-005', name: 'Mohammad Ali', role: 'Helper', wagePerDay: 500 }
];

export default function EmployeeAttendance() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('DAILY_MUSTER'); // 'DAILY_MUSTER' or 'MONTHLY_REGISTER'
  
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState(defaultEmployees);
  const [attendanceDb, setAttendanceDb] = useState([]); // Master Log
  
  // Daily Muster Form State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProject, setSelectedProject] = useState('');
  const [dailyEntries, setDailyEntries] = useState([]);

  // Monthly Register State
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const projs = await getProjects();
        setProjects((projs || []).filter(p => p.status !== 'Completed'));
      } catch (e) {
        console.error("Failed to load projects", e);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Sync daily entries when date or project changes
  useEffect(() => {
    const currentEntries = employees.map(emp => {
      const existing = attendanceDb.find(a => a.empId === emp.id && a.date === selectedDate && a.projectId === selectedProject);
      if (existing) return existing;
      
      return {
        empId: emp.id,
        name: emp.name,
        role: emp.role,
        date: selectedDate,
        projectId: selectedProject,
        status: 'Absent', 
        inTime: '09:00',
        outTime: '18:00',
        otHours: 0,
        notes: ''
      };
    });
    setDailyEntries(currentEntries);
  }, [selectedDate, selectedProject, employees, attendanceDb]);

  const handleEntryChange = (empId, field, value) => {
    setDailyEntries(prev => prev.map(entry => {
      if (entry.empId === empId) {
        return { ...entry, [field]: value };
      }
      return entry;
    }));
  };

  const handleSaveMuster = (e) => {
    e.preventDefault();
    if (!selectedProject) return alert('Please select a Project Site to book this attendance against.');
    
    setSubmitting(true);
    // Remove old entries for this specific date & project combination
    const filteredDb = attendanceDb.filter(a => !(a.date === selectedDate && a.projectId === selectedProject));
    
    // Save updated entries
    setAttendanceDb([...filteredDb, ...dailyEntries]);
    
    setTimeout(() => {
      setSubmitting(false);
      alert('Daily Muster Roll booked and locked successfully!');
    }, 500);
  };

  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
  const daysInMonth = getDaysInMonth(filterMonth, filterYear);
  const monthName = new Date(filterYear, filterMonth - 1).toLocaleString('default', { month: 'long' });

  const exportToExcel = () => {
    let tableHtml = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1" style="font-family: Arial; font-size: 12px; border-collapse: collapse;"><thead><tr><th colspan="${daysInMonth + 3}" style="font-size: 16px; padding: 10px; text-align: center; background-color: #f3f4f6;">Statutory Attendance Register (Form XVI) - ${monthName} ${filterYear}</th></tr><tr style="background-color: #e4e4e7;"><th>Employee ID</th><th>Employee Name</th><th>Designation</th>`;
    
    for (let i = 1; i <= daysInMonth; i++) {
      tableHtml += `<th>${i}</th>`;
    }
    tableHtml += `</tr></thead><tbody>`;

    employees.forEach(emp => {
      tableHtml += `<tr><td>${emp.id}</td><td>${emp.name}</td><td>${emp.role}</td>`;
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        // Find any attendance record for this employee on this date across all projects
        const records = attendanceDb.filter(a => a.empId === emp.id && a.date === dateStr && a.status !== 'Absent');
        
        let mark = 'A';
        if (records.length > 0) {
          const hasPresent = records.some(r => r.status === 'Present');
          const hasHalf = records.some(r => r.status === 'Half Day');
          const hasLeave = records.some(r => r.status === 'Leave');
          mark = hasPresent ? 'P' : hasHalf ? 'HD' : hasLeave ? 'L' : 'A';
        }
        tableHtml += `<td style="text-align: center;">${mark}</td>`;
      }
      tableHtml += `</tr>`;
    });

    tableHtml += `</tbody></table></body></html>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Muster_Roll_${monthName}_${filterYear}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Staff & Attendance Portal</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Legally compliant muster roll, time-tracking, and project cost booking.</p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex bg-white p-1 rounded-lg shadow-sm border border-zinc-200 overflow-x-auto mb-6 shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {[
          { id: 'DAILY_MUSTER', label: 'Daily Site Muster (Form XVI)' },
          { id: 'MONTHLY_REGISTER', label: 'Monthly Statutory Register' }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id)} 
            className={`px-4 py-2 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        
        {/* ========================================== */}
        {/* TAB 1: DAILY MUSTER ROLL (FORM XVI) */}
        {/* ========================================== */}
        {activeTab === 'DAILY_MUSTER' && (
          <div className="space-y-6">
            
            {/* Filter & Booking Header */}
            <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Select Date</label>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Book To Project Site / Cost Center <span className="text-red-500">*</span></label>
                  <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                    <option value="" disabled>Select active site...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                    <option value="HEAD_OFFICE">Company Head Office (Overhead)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Attendance Table */}
            {!selectedProject ? (
              <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-16 text-center">
                <div className="w-12 h-12 bg-zinc-100 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-200">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <p className="text-sm text-zinc-500 font-medium">Select a Project Site above to log attendance for {selectedDate}.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveMuster} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex justify-between items-center">
                  <h3 className="text-[11px] font-bold text-zinc-900 uppercase tracking-widest">Statutory Time Log</h3>
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-white px-2.5 py-1 rounded border border-zinc-200 shadow-sm">Total Workforce: {employees.length}</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-200 font-bold">
                        <th className="py-4 px-6">Employee</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center">In Time</th>
                        <th className="py-4 px-6 text-center">Out Time</th>
                        <th className="py-4 px-6 text-center">OT Hrs</th>
                        <th className="py-4 px-6">Audit Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-sm">
                      {dailyEntries.map(entry => (
                        <tr key={entry.empId} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-bold text-zinc-900 tracking-tight">{entry.name}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{entry.role}</p>
                          </td>
                          <td className="py-4 px-6">
                            <select 
                              value={entry.status} 
                              onChange={e => handleEntryChange(entry.empId, 'status', e.target.value)}
                              className={`w-full text-[11px] uppercase tracking-widest font-bold rounded-lg px-3 py-2 outline-none border cursor-pointer transition-colors ${
                                entry.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                entry.status === 'Half Day' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                entry.status === 'Leave' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                              <option value="Half Day">Half Day</option>
                              <option value="Leave">On Leave</option>
                            </select>
                          </td>
                          <td className="py-4 px-6"><input type="time" disabled={entry.status === 'Absent' || entry.status === 'Leave'} value={entry.inTime} onChange={e => handleEntryChange(entry.empId, 'inTime', e.target.value)} className="w-28 text-xs font-medium px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 disabled:bg-zinc-100 transition-all shadow-sm" /></td>
                          <td className="py-4 px-6"><input type="time" disabled={entry.status === 'Absent' || entry.status === 'Leave'} value={entry.outTime} onChange={e => handleEntryChange(entry.empId, 'outTime', e.target.value)} className="w-28 text-xs font-medium px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 disabled:bg-zinc-100 transition-all shadow-sm" /></td>
                          <td className="py-4 px-6"><input type="number" disabled={entry.status === 'Absent' || entry.status === 'Leave'} value={entry.otHours} onChange={e => handleEntryChange(entry.empId, 'otHours', e.target.value)} className="w-20 text-xs font-bold text-center px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 disabled:bg-zinc-100 transition-all shadow-sm" min="0" step="0.5" /></td>
                          <td className="py-4 px-6"><input type="text" disabled={entry.status === 'Absent' || entry.status === 'Leave'} value={entry.notes} onChange={e => handleEntryChange(entry.empId, 'notes', e.target.value)} className="w-full text-xs font-medium px-3 py-2 border border-zinc-200 bg-white rounded-lg outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-50 disabled:bg-zinc-100 transition-all shadow-sm" placeholder="Reason for OT/Delay..." /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-5 border-t border-zinc-200 bg-zinc-50 flex justify-end">
                  <button type="submit" disabled={submitting} className="bg-zinc-900 hover:bg-black text-white px-8 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2">
                    {submitting ? (
                      <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Locking Record...</>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Lock & Save Muster Roll
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: MONTHLY STATUTORY REGISTER */}
        {/* ========================================== */}
        {activeTab === 'MONTHLY_REGISTER' && (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="text-[11px] uppercase tracking-widest font-bold bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none cursor-pointer">
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2020, m - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="text-[11px] uppercase tracking-widest font-bold bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none cursor-pointer">
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={exportToExcel} className="bg-zinc-900 text-white border border-black px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm hover:bg-black transition-all flex items-center gap-2 cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> 
                Export Form XVI (.xls)
              </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-200 bg-zinc-50 flex justify-between items-center">
                <h3 className="text-[11px] font-bold text-zinc-900 uppercase tracking-widest">Monthly Register Grid</h3>
                <div className="flex gap-4 text-[9px] uppercase tracking-widest font-bold bg-white px-3 py-1.5 rounded-lg border border-zinc-200 shadow-sm">
                  <span className="text-emerald-700">P = Present</span>
                  <span className="text-amber-700">HD = Half Day</span>
                  <span className="text-red-700">A = Absent</span>
                  <span className="text-blue-700">L = Leave</span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
                  <thead>
                    <tr className="bg-zinc-100 text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-200 font-bold">
                      <th className="py-4 px-6 sticky left-0 bg-zinc-100 z-10 w-48 border-r border-zinc-200">Employee Name</th>
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i} className="py-4 px-2 text-center border-r border-zinc-200 w-8">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-4 px-6 sticky left-0 bg-white z-10 border-r border-zinc-200">
                          <p className="font-bold text-zinc-900 truncate tracking-tight">{emp.name}</p>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{emp.role}</p>
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const dateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                          const records = attendanceDb.filter(a => a.empId === emp.id && a.date === dateStr && a.status !== 'Absent');
                          
                          let mark = 'A';
                          let cellColor = 'text-red-500 font-bold bg-red-50/50';
                          
                          if (records.length > 0) {
                            if (records.some(r => r.status === 'Present')) { mark = 'P'; cellColor = 'text-emerald-700 font-bold bg-emerald-50'; }
                            else if (records.some(r => r.status === 'Half Day')) { mark = 'HD'; cellColor = 'text-amber-700 font-bold bg-amber-50'; }
                            else if (records.some(r => r.status === 'Leave')) { mark = 'L'; cellColor = 'text-blue-700 font-bold bg-blue-50'; }
                          }

                          return (
                            <td key={i} className={`py-4 px-2 text-center text-xs border-r border-zinc-100 ${cellColor}`}>
                              {mark}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}