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
    let tableHtml = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1" style="font-family: Arial; font-size: 12px; border-collapse: collapse;"><thead><tr><th colspan="${daysInMonth + 3}" style="font-size: 16px; padding: 10px; text-align: center; background-color: #f3f4f6;">Statutory Attendance Register (Form XVI) - ${monthName} ${filterYear}</th></tr><tr style="background-color: #e5e7eb;"><th>Employee ID</th><th>Employee Name</th><th>Designation</th>`;
    
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

  const inputClass = "w-full px-4 py-2 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col bg-zinc-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Staff & Attendance Portal</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Legally compliant muster roll, time-tracking, and project cost booking.</p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200 overflow-x-auto mb-6 shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {[
          { id: 'DAILY_MUSTER', label: 'Daily Site Muster (Form XVI)' },
          { id: 'MONTHLY_REGISTER', label: 'Monthly Statutory Register' }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id)} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
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
            <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Select Date</label>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Book To Project Site / Cost Center <span className="text-red-500">*</span></label>
                  <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
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
                <p className="text-sm text-zinc-500 font-medium">Select a Project Site above to log attendance for {selectedDate}.</p>
              </div>
            ) : (
              <form onSubmit={handleSaveMuster} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Statutory Time Log</h3>
                  <span className="text-[10px] font-semibold text-zinc-500 bg-white px-2 py-1 rounded border border-zinc-200">Total Workforce: {employees.length}</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                      <tr className="text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-100">
                        <th className="py-3 px-4 font-bold">Employee</th>
                        <th className="py-3 px-4 font-bold text-center">Status</th>
                        <th className="py-3 px-4 font-bold text-center">In Time</th>
                        <th className="py-3 px-4 font-bold text-center">Out Time</th>
                        <th className="py-3 px-4 font-bold text-center">OT Hrs</th>
                        <th className="py-3 px-4 font-bold">Audit Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 text-sm">
                      {dailyEntries.map(entry => (
                        <tr key={entry.empId} className="hover:bg-zinc-50/50">
                          <td className="py-3 px-4">
                            <p className="font-bold text-zinc-900">{entry.name}</p>
                            <p className="text-[10px] text-zinc-500 font-semibold">{entry.role}</p>
                          </td>
                          <td className="py-3 px-4">
                            <select 
                              value={entry.status} 
                              onChange={e => handleEntryChange(entry.empId, 'status', e.target.value)}
                              className={`w-full text-xs font-bold rounded-lg px-2 py-1.5 outline-none border cursor-pointer ${
                                entry.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                entry.status === 'Half Day' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                entry.status === 'Leave' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                'bg-red-50 text-red-600 border-red-200'
                              }`}
                            >
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                              <option value="Half Day">Half Day</option>
                              <option value="Leave">On Leave</option>
                            </select>
                          </td>
                          <td className="py-3 px-4"><input type="time" disabled={entry.status === 'Absent' || entry.status === 'Leave'} value={entry.inTime} onChange={e => handleEntryChange(entry.empId, 'inTime', e.target.value)} className="w-28 text-xs px-2 py-1.5 border border-zinc-200 rounded-lg outline-none focus:border-[#B45309] disabled:opacity-50" /></td>
                          <td className="py-3 px-4"><input type="time" disabled={entry.status === 'Absent' || entry.status === 'Leave'} value={entry.outTime} onChange={e => handleEntryChange(entry.empId, 'outTime', e.target.value)} className="w-28 text-xs px-2 py-1.5 border border-zinc-200 rounded-lg outline-none focus:border-[#B45309] disabled:opacity-50" /></td>
                          <td className="py-3 px-4"><input type="number" disabled={entry.status === 'Absent' || entry.status === 'Leave'} value={entry.otHours} onChange={e => handleEntryChange(entry.empId, 'otHours', e.target.value)} className="w-16 text-xs text-center px-2 py-1.5 border border-zinc-200 rounded-lg outline-none focus:border-[#B45309] disabled:opacity-50" min="0" step="0.5" /></td>
                          <td className="py-3 px-4"><input type="text" value={entry.notes} onChange={e => handleEntryChange(entry.empId, 'notes', e.target.value)} className="w-full text-xs px-3 py-1.5 border border-zinc-200 rounded-lg outline-none focus:border-[#B45309]" placeholder="Reason for OT/Delay..." /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-end">
                  <button type="submit" disabled={submitting} className="bg-[#B45309] hover:bg-[#92400E] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50">
                    {submitting ? 'Locking Record...' : 'Lock & Save Muster Roll'}
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
            <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="text-sm font-bold bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 outline-none cursor-pointer">
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{new Date(2020, m - 1).toLocaleString('default', { month: 'long' })}</option>
                  ))}
                </select>
                <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="text-sm font-bold bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 outline-none cursor-pointer">
                  {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button onClick={exportToExcel} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-100 transition-all flex items-center gap-1.5 cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> 
                Export Form XVI (.xls)
              </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Monthly Register Grid</h3>
                <div className="flex gap-4 text-[10px] font-bold">
                  <span className="text-emerald-600">P = Present</span>
                  <span className="text-amber-500">HD = Half Day</span>
                  <span className="text-red-500">A = Absent</span>
                  <span className="text-blue-500">L = Leave</span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
                  <thead>
                    <tr className="bg-zinc-100/50 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200">
                      <th className="py-3 px-4 font-bold sticky left-0 bg-zinc-100/90 backdrop-blur z-10 w-48 border-r border-zinc-200">Employee Name</th>
                      {Array.from({ length: daysInMonth }, (_, i) => (
                        <th key={i} className="py-3 px-2 font-bold text-center border-r border-zinc-100 w-8">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="py-3 px-4 sticky left-0 bg-white z-10 border-r border-zinc-200">
                          <p className="font-bold text-zinc-900 truncate">{emp.name}</p>
                        </td>
                        {Array.from({ length: daysInMonth }, (_, i) => {
                          const dateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                          const records = attendanceDb.filter(a => a.empId === emp.id && a.date === dateStr && a.status !== 'Absent');
                          
                          let mark = 'A';
                          let cellColor = 'text-red-400 bg-red-50/30';
                          
                          if (records.length > 0) {
                            if (records.some(r => r.status === 'Present')) { mark = 'P'; cellColor = 'text-emerald-600 font-bold bg-emerald-50'; }
                            else if (records.some(r => r.status === 'Half Day')) { mark = 'HD'; cellColor = 'text-amber-600 font-bold bg-amber-50'; }
                            else if (records.some(r => r.status === 'Leave')) { mark = 'L'; cellColor = 'text-blue-600 font-bold bg-blue-50'; }
                          }

                          return (
                            <td key={i} className={`py-3 px-2 text-center text-xs border-r border-zinc-100 ${cellColor}`}>
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