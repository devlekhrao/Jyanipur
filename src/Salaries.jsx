import React, { useState, useEffect } from 'react';
import { getEmployees, getMonthlyAttendance, getMonthlyPayouts, initiatePayout } from './db';

export default function Salaries() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [payouts, setPayouts] = useState({});
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const loadData = async () => {
    setLoading(true);
    const emps = await getEmployees();
    const att = await getMonthlyAttendance(selectedYear, selectedMonth);
    const pays = await getMonthlyPayouts(selectedYear, selectedMonth);
    
    setEmployees(emps.filter(e => e.status === 'Active'));
    setAttendance(att);
    setPayouts(pays);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const handleDisburse = async (emp, calculatedAmount) => {
    if (!emp.accountNo || !emp.ifscCode) {
      alert(`Cannot pay ${emp.fullName}. Bank details (Account No / IFSC) are missing in the Staff Directory.`);
      return;
    }

    if (window.confirm(`Initiate ICICI NEFT of ₹${calculatedAmount.toLocaleString('en-IN')} to ${emp.fullName}?`)) {
      // 1. Optimistic UI update
      setPayouts(prev => ({
        ...prev,
        [emp.id]: { status: 'API_PENDING', amount: calculatedAmount }
      }));

      // 2. Save to DB (In the future, this calls the /api/pay-salary endpoint)
      try {
        await initiatePayout(emp.id, selectedMonth, selectedYear, calculatedAmount);
        alert(`Payout API Triggered for ${emp.fullName}! (Awaiting ICICI Keys)`);
        loadData();
      } catch (err) {
        alert("Failed to initiate payout.");
        loadData();
      }
    }
  };

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Payroll & Disbursements</h2>
          <p className="text-zinc-600 text-xs mt-1 font-medium">Auto-calculated from attendance. Ready for ICICI API integration.</p>
        </div>

        <div className="flex items-center gap-1.5 h-9 bg-white/60 border border-zinc-200/60 rounded-xl px-2 shadow-sm">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer px-1">
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer pr-1">
            <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
            <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
          </select>
        </div>
      </div>

      <div className="bg-white/50 backdrop-blur-xl p-4 rounded-3xl border border-white/60 shadow-xl overflow-x-auto w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b-2 border-zinc-200">
              <th className="py-3 px-2 font-bold">Employee</th>
              <th className="py-3 px-2 font-bold text-center">Days Worked</th>
              <th className="py-3 px-2 font-bold text-right">Rate / Salary</th>
              <th className="py-3 px-2 font-bold text-right">Net Payable</th>
              <th className="py-3 px-2 font-bold text-center">Bank Status</th>
              <th className="py-3 px-2 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs text-zinc-800 divide-y divide-zinc-200/40">
            {loading ? (
              <tr><td colSpan="6" className="py-12 text-center text-zinc-500 font-medium">Calculating payroll...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium">No active employees found.</td></tr>
            ) : (
              employees.map(emp => {
                const empAtt = attendance[emp.id] || {};
                const presentCount = Object.values(empAtt).filter(s => s === 'Present').length;
                const halfCount = Object.values(empAtt).filter(s => s === 'Half Day').length;
                const totalDays = presentCount + (halfCount * 0.5);

                // Basic Calculation (Can be customized)
                let calculatedPay = 0;
                if (emp.payType === 'Daily') {
                  calculatedPay = totalDays * (emp.payRate || 0);
                } else {
                  // Monthly logic: Pro-rate based on days in month (simplified to full amount if > 0 days for now)
                  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
                  calculatedPay = ((emp.payRate || 0) / daysInMonth) * totalDays;
                }

                const payoutStatus = payouts[emp.id];
                const isPaidOrPending = !!payoutStatus;

                return (
                  <tr key={emp.id} className="hover:bg-white/30 transition-colors">
                    <td className="py-4 px-2">
                      <p className="font-extrabold text-zinc-900">{emp.fullName}</p>
                      <p className="text-[9px] text-zinc-500 font-mono">{emp.accountNo ? `A/c: ${emp.accountNo.slice(-4)}` : 'No Bank Added'}</p>
                    </td>
                    <td className="py-4 px-2 text-center font-bold text-zinc-600">{totalDays}</td>
                    <td className="py-4 px-2 text-right text-zinc-500">₹{emp.payRate.toLocaleString('en-IN')} <span className="text-[9px]">({emp.payType})</span></td>
                    <td className="py-4 px-2 text-right font-black text-zinc-900 text-sm">₹{Math.round(calculatedPay).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-2 text-center">
                      {isPaidOrPending ? (
                        <span className={`inline-block px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                          payoutStatus.status === 'API_PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {payoutStatus.status === 'API_PENDING' ? 'Syncing...' : 'Paid'}
                        </span>
                      ) : (
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Unpaid</span>
                      )}
                    </td>
                    <td className="py-4 px-2 text-right">
                      {!isPaidOrPending && calculatedPay > 0 && (
                        <button 
                          onClick={() => handleDisburse(emp, Math.round(calculatedPay))}
                          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5 ml-auto"
                        >
                          <span>⚡</span> Pay via ICICI
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}