import React, { useState, useEffect } from 'react';
import { getEmployees, getMonthlyAttendance, getMonthlyPayouts, initiatePayout } from './db';

export default function Salaries() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [payouts, setPayouts] = useState({});
  
  // Selection State for Batch Payouts
  const [selectedEmps, setSelectedEmps] = useState(new Set());
  
  // Simulated Current Bank Balance (Will be fetched from ICICI API later)
  const [currentBankBalance] = useState(850000.00); 

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
    setSelectedEmps(new Set()); // Reset selections on load
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // --- Payroll Pre-Calculation ---
  // We map the employees into an array with their calculated data so we can sum it up easily.
  const payrollData = employees.map(emp => {
    const empAtt = attendance[emp.id] || {};
    const presentCount = Object.values(empAtt).filter(s => s === 'Present').length;
    const halfCount = Object.values(empAtt).filter(s => s === 'Half Day').length;
    const totalDays = presentCount + (halfCount * 0.5);

    let calculatedPay = 0;
    if (emp.payType === 'Daily') {
      calculatedPay = totalDays * (emp.payRate || 0);
    } else {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      calculatedPay = ((emp.payRate || 0) / daysInMonth) * totalDays;
    }

    const netPayable = Math.round(calculatedPay);
    const payoutStatus = payouts[emp.id];
    const isPaidOrPending = !!payoutStatus;
    const canBePaid = !isPaidOrPending && netPayable > 0 && !!emp.accountNo;

    return { ...emp, totalDays, netPayable, payoutStatus, isPaidOrPending, canBePaid };
  });

  // --- Dashboard Metrics ---
  const totalPayrollAmount = payrollData.reduce((sum, emp) => sum + emp.netPayable, 0);
  const selectedPayrollAmount = payrollData
    .filter(emp => selectedEmps.has(emp.id))
    .reduce((sum, emp) => sum + emp.netPayable, 0);
  
  const projectedBalance = currentBankBalance - selectedPayrollAmount;

  // --- Checkbox Handlers ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allSelectable = payrollData.filter(emp => emp.canBePaid).map(emp => emp.id);
      setSelectedEmps(new Set(allSelectable));
    } else {
      setSelectedEmps(new Set());
    }
  };

  const handleSelectOne = (empId) => {
    const newSet = new Set(selectedEmps);
    if (newSet.has(empId)) {
      newSet.delete(empId);
    } else {
      newSet.add(empId);
    }
    setSelectedEmps(newSet);
  };

  // --- Batch Disburse Handler ---
  const handleBatchDisburse = async () => {
    if (selectedEmps.size === 0) return;

    if (projectedBalance < 0) {
      alert("Insufficient funds in the simulated bank account to process this batch.");
      return;
    }

    if (window.confirm(`Initiate ICICI NEFT batch payout for ${selectedEmps.size} employees totaling ₹${selectedPayrollAmount.toLocaleString('en-IN')}?`)) {
      
      const employeesToPay = payrollData.filter(emp => selectedEmps.has(emp.id));

      // Optimistic Update
      const optimisticPayouts = { ...payouts };
      employeesToPay.forEach(emp => {
        optimisticPayouts[emp.id] = { status: 'API_PENDING', amount: emp.netPayable };
      });
      setPayouts(optimisticPayouts);
      setSelectedEmps(new Set());

      // Process DB Saves
      try {
        await Promise.all(
          employeesToPay.map(emp => 
            initiatePayout(emp.id, selectedMonth, selectedYear, emp.netPayable)
          )
        );
        alert(`Batch Payout API Triggered for ${employeesToPay.length} employees! (Awaiting ICICI Keys)`);
        loadData();
      } catch (err) {
        alert("Failed to initiate batch payout.");
        loadData();
      }
    }
  };

  const allSelectableCount = payrollData.filter(e => e.canBePaid).length;
  const isAllSelected = allSelectableCount > 0 && selectedEmps.size === allSelectableCount;

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Payroll & Disbursements</h2>
          <p className="text-zinc-600 text-xs mt-1 font-medium">Batch select employees to calculate remaining account balance before initiating ICICI NEFT payouts.</p>
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

      {/* Projection Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-2xl border border-white/60 shadow-sm">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Current Bank Balance</span>
          <p className="text-xl font-black text-zinc-900">₹ {currentBankBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-2xl border border-white/60 shadow-sm">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Total Due Payroll</span>
          <p className="text-xl font-black text-zinc-600">₹ {totalPayrollAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-amber-50/50 backdrop-blur-xl p-5 rounded-2xl border border-amber-200/60 shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-1">Selected Payout Total</span>
          <p className="text-xl font-black text-amber-700">₹ {selectedPayrollAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className={`p-5 rounded-2xl shadow-md ${projectedBalance < 0 ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white'}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest block mb-1 opacity-70">Projected Balance (After Pay)</span>
          <p className="text-xl font-black">₹ {projectedBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Action Bar (Appears when items are selected) */}
      <div className={`mb-4 p-4 rounded-2xl flex justify-between items-center transition-all ${selectedEmps.size > 0 ? 'bg-orange-50 border border-orange-200 opacity-100' : 'opacity-0 pointer-events-none h-0 p-0 m-0 overflow-hidden'}`}>
        <div>
          <span className="text-sm font-black text-orange-800">{selectedEmps.size} Employees Selected</span>
          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Totaling ₹ {selectedPayrollAmount.toLocaleString('en-IN')}</p>
        </div>
        <button 
          onClick={handleBatchDisburse}
          disabled={projectedBalance < 0}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2 ${
            projectedBalance < 0 
            ? 'bg-red-200 text-red-500 cursor-not-allowed' 
            : 'bg-orange-600 hover:bg-orange-500 text-white hover:-translate-y-0.5'
          }`}
        >
          <span>⚡</span> {projectedBalance < 0 ? 'Insufficient Funds' : 'Initiate Batch Payout'}
        </button>
      </div>

      {/* Full Width Table */}
      <div className="bg-white/50 backdrop-blur-xl p-4 rounded-3xl border border-white/60 shadow-xl overflow-x-auto w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b-2 border-zinc-200">
              <th className="py-3 px-3 w-10">
                <input 
                  type="checkbox" 
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  disabled={allSelectableCount === 0}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer border-zinc-300"
                />
              </th>
              <th className="py-3 px-2 font-bold">Employee</th>
              <th className="py-3 px-2 font-bold text-center">Days Worked</th>
              <th className="py-3 px-2 font-bold text-right">Rate / Salary</th>
              <th className="py-3 px-2 font-bold text-right">Net Payable</th>
              <th className="py-3 px-2 font-bold text-center">Bank Status</th>
            </tr>
          </thead>
          <tbody className="text-xs text-zinc-800 divide-y divide-zinc-200/40">
            {loading ? (
              <tr><td colSpan="6" className="py-12 text-center text-zinc-500 font-medium">Calculating payroll...</td></tr>
            ) : payrollData.length === 0 ? (
              <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium">No active employees found.</td></tr>
            ) : (
              payrollData.map(emp => (
                <tr key={emp.id} className={`transition-colors ${selectedEmps.has(emp.id) ? 'bg-orange-50/50' : 'hover:bg-white/30'}`}>
                  <td className="py-4 px-3">
                    <input 
                      type="checkbox" 
                      checked={selectedEmps.has(emp.id)}
                      onChange={() => handleSelectOne(emp.id)}
                      disabled={!emp.canBePaid}
                      className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer border-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="py-4 px-2">
                    <p className={`font-extrabold ${selectedEmps.has(emp.id) ? 'text-orange-900' : 'text-zinc-900'}`}>{emp.fullName}</p>
                    <p className={`text-[9px] font-mono ${!emp.accountNo ? 'text-red-500 font-bold' : 'text-zinc-500'}`}>
                      {emp.accountNo ? `A/c: ${emp.accountNo.slice(-4)} | ${emp.ifscCode}` : '⚠️ Bank Details Missing'}
                    </p>
                  </td>
                  <td className="py-4 px-2 text-center font-bold text-zinc-600">{emp.totalDays}</td>
                  <td className="py-4 px-2 text-right text-zinc-500">₹{emp.payRate.toLocaleString('en-IN')} <span className="text-[9px]">({emp.payType})</span></td>
                  <td className="py-4 px-2 text-right font-black text-zinc-900 text-sm">₹{emp.netPayable.toLocaleString('en-IN')}</td>
                  <td className="py-4 px-2 text-center">
                    {emp.isPaidOrPending ? (
                      <span className={`inline-block px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                        emp.payoutStatus.status === 'API_PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {emp.payoutStatus.status === 'API_PENDING' ? 'Syncing...' : 'Paid'}
                      </span>
                    ) : emp.netPayable === 0 ? (
                      <span className="text-[9px] text-zinc-300 font-bold uppercase tracking-widest">No Dues</span>
                    ) : !emp.accountNo ? (
                      <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest">Setup Reqd</span>
                    ) : (
                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Unpaid</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}