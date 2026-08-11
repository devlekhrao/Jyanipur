import React, { useState, useEffect } from 'react';
import { getEmployees, saveEmployee, getTodayAttendance, saveAttendance } from './db';

export default function EmployeeAttendance({ companySettings = {} }) {
  const [currentView, setCurrentView] = useState('attendance'); 
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({});

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    setLoading(true);
    const emps = await getEmployees();
    setEmployees(emps);
    
    const att = await getTodayAttendance(todayStr);
    setTodayAttendance(att);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const [newEmp, setNewEmp] = useState({
    fullName: '',
    role: 'Site Supervisor',
    phone: '',
    payType: 'Monthly',
    payRate: '',
    joiningDate: todayStr,
    bankName: '',
    accountNo: '',
    ifscCode: '',
    idNumber: ''
  });

  const [errors, setErrors] = useState({});

  const totalEmployees = employees.length;
  const presentCount = Object.values(todayAttendance).filter(v => v === 'Present').length;
  const absentCount = Object.values(todayAttendance).filter(v => v === 'Absent').length;
  const halfDayCount = Object.values(todayAttendance).filter(v => v === 'Half Day').length;

  const handleAttendanceChange = async (empId, status) => {
    // Optimistic UI update
    setTodayAttendance(prev => ({ ...prev, [empId]: status }));
    // Save to DB
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
      setCurrentView('attendance');
    } catch (err) {
      alert('Failed to register employee. Check DB connection.');
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-white/40 bg-white/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full font-['Poppins']">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Staff & Attendance Portal</h2>
          <p className="text-zinc-600 text-xs mt-1 font-medium">Manage workforce directory, daily site attendance, and onboarding.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentView('attendance')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${currentView === 'attendance' ? 'bg-zinc-900 text-white shadow-md' : 'bg-white/40 hover:bg-white text-zinc-700 border border-white/50'}`}
          >
            Today's Attendance
          </button>
          <button 
            onClick={() => setCurrentView('directory')}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${currentView === 'directory' ? 'bg-zinc-900 text-white shadow-md' : 'bg-white/40 hover:bg-white text-zinc-700 border border-white/50'}`}
          >
            Staff Directory
          </button>
          <button 
            onClick={() => setCurrentView('register')}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-900 font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg hover:-translate-y-0.5 ml-2"
          >
            + Register Staff
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/40 backdrop-blur-md p-5 rounded-2xl border border-white/60 shadow-sm">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Staff</span>
          <p className="text-2xl font-black text-zinc-900 mt-1">{totalEmployees}</p>
        </div>
        <div className="bg-emerald-50/50 backdrop-blur-md p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Present Today</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{presentCount}</p>
        </div>
        <div className="bg-amber-50/50 backdrop-blur-md p-5 rounded-2xl border border-amber-100 shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Half Day</span>
          <p className="text-2xl font-black text-amber-700 mt-1">{halfDayCount}</p>
        </div>
        <div className="bg-red-50/50 backdrop-blur-md p-5 rounded-2xl border border-red-100 shadow-sm">
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Absent</span>
          <p className="text-2xl font-black text-red-700 mt-1">{absentCount}</p>
        </div>
      </div>

      {currentView === 'attendance' && (
        <div className="bg-white/40 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Mark Attendance for <span className="text-amber-600">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </h3>
            <span className="text-[10px] bg-zinc-900 text-white font-bold px-3 py-1 rounded-full uppercase tracking-widest">Auto-Saved to DB</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-300/50">
                  <th className="py-3 px-3 font-bold">Emp ID</th>
                  <th className="py-3 px-3 font-bold">Employee Name</th>
                  <th className="py-3 px-3 font-bold">Role / Job</th>
                  <th className="py-3 px-3 font-bold text-center">Status Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/40 text-xs">
                {loading ? (
                  <tr><td colSpan="4" className="text-center py-6 text-zinc-500">Loading staff data...</td></tr>
                ) : employees.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-6 text-zinc-500">No staff registered yet.</td></tr>
                ) : (
                  employees.map((emp) => {
                    const currentStatus = todayAttendance[emp.id] || 'Present';
                    return (
                      <tr key={emp.id} className="hover:bg-white/30 transition-colors">
                        <td className="py-3.5 px-3 font-bold text-zinc-500">{emp.empId}</td>
                        <td className="py-3.5 px-3 font-extrabold text-zinc-900">{emp.fullName}</td>
                        <td className="py-3.5 px-3 text-zinc-600 font-medium">{emp.role}</td>
                        <td className="py-3.5 px-3">
                          <div className="flex justify-center gap-1.5">
                            {[
                              { label: 'Present', color: 'bg-emerald-600 text-white' },
                              { label: 'Half Day', color: 'bg-amber-500 text-white' },
                              { label: 'Absent', color: 'bg-red-600 text-white' },
                              { label: 'Leave', color: 'bg-purple-600 text-white' }
                            ].map((st) => (
                              <button
                                key={st.label}
                                onClick={() => handleAttendanceChange(emp.id, st.label)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                  currentStatus === st.label
                                    ? `${st.color} shadow-sm scale-105`
                                    : 'bg-white/60 text-zinc-500 hover:bg-white hover:text-zinc-900 border border-white/60'
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
      )}

      {currentView === 'directory' && (
        <div className="bg-white/40 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Employee Directory</h3>
            <span className="text-xs font-semibold text-zinc-500">{employees.length} Staff Members Registered</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-zinc-500 text-[10px] uppercase tracking-widest border-b border-zinc-300/50">
                  <th className="py-3 px-3 font-bold">Emp ID</th>
                  <th className="py-3 px-3 font-bold">Name & Contact</th>
                  <th className="py-3 px-3 font-bold">Role</th>
                  <th className="py-3 px-3 font-bold">Salary / Rate</th>
                  <th className="py-3 px-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/40 text-xs">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-white/30 transition-colors">
                    <td className="py-4 px-3 font-bold text-zinc-500">{emp.empId}</td>
                    <td className="py-4 px-3">
                      <p className="font-extrabold text-zinc-900">{emp.fullName}</p>
                      <p className="text-[10px] text-zinc-500">{emp.phone}</p>
                    </td>
                    <td className="py-4 px-3 text-zinc-700 font-semibold">{emp.role}</td>
                    <td className="py-4 px-3 font-bold text-zinc-900">
                      ₹{emp.payRate.toLocaleString('en-IN')} <span className="text-[9px] text-zinc-400 font-normal">({emp.payType})</span>
                    </td>
                    <td className="py-4 px-3 text-right">
                      <button 
                        onClick={() => { setSelectedEmp(emp); setCurrentView('view_emp'); }}
                        className="text-zinc-600 hover:text-zinc-900 font-bold uppercase tracking-wider text-[10px] bg-white/60 hover:bg-white px-3 py-1.5 rounded-lg shadow-sm border border-white/60"
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

      {currentView === 'register' && (
        <div className="bg-white/60 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl max-w-4xl mx-auto">
          <div className="flex justify-between items-center border-b border-zinc-200 pb-4 mb-6">
            <div>
              <h3 className="text-lg font-extrabold text-zinc-900 tracking-tight">New Staff Registration</h3>
              <p className="text-zinc-500 text-xs mt-0.5">Onboard new carpenters, supervisors, interior architects, and site labor.</p>
            </div>
            <button 
              onClick={() => setCurrentView('attendance')}
              className="text-zinc-500 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-widest bg-white/50 px-3.5 py-1.5 rounded-full border border-white/60"
            >
              ✕ Cancel
            </button>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-6">
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">1. Personal & Role Info</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="e.g. Ramesh Reddy" value={newEmp.fullName} onChange={e => setNewEmp({...newEmp, fullName: e.target.value})} className={`${inputClass} ${errors.fullName ? 'ring-1 ring-red-400 bg-red-50/50' : ''}`} />
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
                  <input type="text" placeholder="+91 9876543210" value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} className={`${inputClass} ${errors.phone ? 'ring-1 ring-red-400 bg-red-50/50' : ''}`} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">2. Pay Rate & Terms</h4>
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
                  <input type="number" placeholder="e.g. 35000 or 1200" value={newEmp.payRate} onChange={e => setNewEmp({...newEmp, payRate: e.target.value})} className={`${inputClass} ${errors.payRate ? 'ring-1 ring-red-400 bg-red-50/50' : ''}`} />
                </div>
                <div>
                  <label className={labelClass}>Joining Date</label>
                  <input type="date" value={newEmp.joiningDate} onChange={e => setNewEmp({...newEmp, joiningDate: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">3. ID & Banking</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className={labelClass}>Aadhaar / PAN ID</label>
                  <input type="text" placeholder="Aadhaar Number" value={newEmp.idNumber} onChange={e => setNewEmp({...newEmp, idNumber: e.target.value})} className={inputClass} />
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

            <div className="pt-4 flex justify-end gap-3 border-t border-zinc-200">
              <button type="button" onClick={() => setCurrentView('attendance')} className="px-6 py-3 bg-white/50 border border-white/60 rounded-2xl font-bold text-xs text-zinc-600 hover:bg-white transition-all">Cancel</button>
              <button type="submit" className="px-8 py-3 bg-zinc-900 hover:bg-black text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg hover:-translate-y-0.5">Complete Registration</button>
            </div>
          </form>
        </div>
      )}

      {currentView === 'view_emp' && selectedEmp && (
        <div className="bg-white/80 backdrop-blur-3xl p-8 rounded-3xl border border-white/60 shadow-2xl max-w-2xl mx-auto">
          <div className="flex justify-between items-start border-b border-zinc-200 pb-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 text-amber-400 flex items-center justify-center font-black text-xl shadow-md">
                {selectedEmp.fullName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900">{selectedEmp.fullName}</h3>
                <p className="text-xs font-bold text-amber-600">{selectedEmp.role} | {selectedEmp.empId}</p>
              </div>
            </div>
            <button onClick={() => setCurrentView('directory')} className="text-zinc-500 hover:text-zinc-900 text-xs font-bold uppercase tracking-widest bg-white/60 px-3 py-1.5 rounded-full border border-zinc-200">✕ Close</button>
          </div>

          <div className="grid grid-cols-2 gap-6 text-xs text-zinc-700">
            <div className="space-y-3 bg-white/40 p-4 rounded-2xl border border-white/60">
              <p className="font-bold text-zinc-400 uppercase text-[9px] tracking-widest">Contact & Joining</p>
              <p><strong>Mobile:</strong> {selectedEmp.phone}</p>
              <p><strong>Joining Date:</strong> {selectedEmp.joiningDate}</p>
              <p><strong>Status:</strong> <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">{selectedEmp.status}</span></p>
              <p><strong>ID Record:</strong> {selectedEmp.idNumber || 'N/A'}</p>
            </div>

            <div className="space-y-3 bg-white/40 p-4 rounded-2xl border border-white/60">
              <p className="font-bold text-zinc-400 uppercase text-[9px] tracking-widest">Pay & Bank Details</p>
              <p><strong>Wage Type:</strong> {selectedEmp.payType}</p>
              <p><strong>Rate / Salary:</strong> ₹{selectedEmp.payRate.toLocaleString('en-IN')}</p>
              <p><strong>Bank:</strong> {selectedEmp.bankName || 'N/A'}</p>
              <p><strong>Account:</strong> {selectedEmp.accountNo || 'N/A'}</p>
              <p><strong>IFSC:</strong> {selectedEmp.ifscCode || 'N/A'}</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-200 flex justify-end">
            <button onClick={() => setCurrentView('directory')} className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-bold">Back to Directory</button>
          </div>
        </div>
      )}
    </div>
  );
}