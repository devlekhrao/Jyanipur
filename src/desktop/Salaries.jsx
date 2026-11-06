import React, { useState, useEffect } from 'react';
import { getEmployees, getMonthlyAttendance, getMonthlyPayouts, initiatePayout, getEmployeeExpenses } from '../db';

export default function Salaries() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [payouts, setPayouts] = useState({});
  const [advances, setAdvances] = useState({});
  
  const [selectedEmps, setSelectedEmps] = useState(new Set());
  const [currentBankBalance] = useState(850000.00); 

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const loadData = async () => {
    setLoading(true);
    try {
      const [emps, att, pays, allExpenses] = await Promise.all([
        getEmployees(),
        getMonthlyAttendance(selectedYear, selectedMonth),
        getMonthlyPayouts(selectedYear, selectedMonth),
        getEmployeeExpenses()
      ]);
      
      const monthlyAdvances = {};
      (allExpenses || []).forEach(exp => {
        if (!exp.date) return;
        const d = new Date(exp.date);
        if (d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && exp.category === 'Salary Advance') {
          monthlyAdvances[exp.empId] = (monthlyAdvances[exp.empId] || 0) + (parseFloat(exp.amount) || 0);
        }
      });

      setEmployees((emps || []).filter(e => e.status === 'Active'));
      setAttendance(att || {});
      setPayouts(pays || {});
      setAdvances(monthlyAdvances);
      setSelectedEmps(new Set()); 
    } catch (e) {
      console.error("Error loading payroll telemetry from cloud DB:", e);
      setEmployees([]);
      setAttendance({});
      setPayouts({});
      setAdvances({});
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  // --- Linked Payroll Pre-Calculation ---
  const payrollData = employees.map(emp => {
    const empAtt = attendance[emp.id] || {};
    const presentCount = Object.values(empAtt).filter(s => s === 'Present').length;
    const halfCount = Object.values(empAtt).filter(s => s === 'Half Day').length;
    const totalDays = presentCount + (halfCount * 0.5);

    let grossPay = 0;
    if (emp.payType === 'Daily') {
      grossPay = totalDays * (parseFloat(emp.payRate) || 0);
    } else {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      grossPay = ((parseFloat(emp.payRate) || 0) / daysInMonth) * totalDays;
    }

    const advanceDeduction = advances[emp.id] || 0;
    const payoutStatus = payouts[emp.id];
    const isPaidOrPending = !!payoutStatus;

    const rawNet = Math.round(grossPay) - advanceDeduction;
    const netPayable = isPaidOrPending ? 0 : Math.max(0, rawNet);
    
    const canBePaid = !isPaidOrPending && netPayable > 0 && !!emp.accountNo;

    return { 
      ...emp, 
      totalDays, 
      grossPay: Math.round(grossPay), 
      advanceDeduction,
      netPayable, 
      payoutStatus, 
      isPaidOrPending, 
      canBePaid 
    };
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
      alert("Insufficient funds in the bank account to process this batch.");
      return;
    }

    if (window.confirm(`Initiate batch payout for ${selectedEmps.size} employees totaling ₹${selectedPayrollAmount.toLocaleString('en-IN')}?`)) {
      const employeesToPay = payrollData.filter(emp => selectedEmps.has(emp.id));

      const optimisticPayouts = { ...payouts };
      employeesToPay.forEach(emp => {
        optimisticPayouts[emp.id] = { status: 'API_PENDING', amount: emp.netPayable };
      });
      setPayouts(optimisticPayouts);
      setSelectedEmps(new Set());

      try {
        await Promise.all(
          employeesToPay.map(emp => 
            initiatePayout(emp.id, selectedMonth, selectedYear, emp.netPayable)
          )
        );
        alert(`Batch Payout Triggered for ${employeesToPay.length} employees!`);
        await loadData();
      } catch (err) {
        alert("Failed to initiate batch payout. Please check DB connection.");
        await loadData();
      }
    }
  };

  const allSelectableCount = payrollData.filter(e => e.canBePaid).length;
  const isAllSelected = allSelectableCount > 0 && selectedEmps.size === allSelectableCount;

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Payroll & Disbursements</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Automated advance deductions and batch bank payout projections.</p>
        </div>

        <div className="flex items-center bg-white border border-zinc-200 rounded-lg shadow-sm">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))} 
            className="bg-transparent border-none text-[11px] font-bold uppercase tracking-widest text-zinc-900 outline-none cursor-pointer px-4 py-2.5 appearance-none focus:ring-2 focus:ring-zinc-900 rounded-l-lg transition-all"
            style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717A' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1rem', paddingRight: '2rem' }}
          >
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
            ))}
          </select>
          <div className="w-[1px] h-4 bg-zinc-200"></div>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))} 
            className="bg-transparent border-none text-[11px] font-bold uppercase tracking-widest text-zinc-900 outline-none cursor-pointer px-4 py-2.5 appearance-none focus:ring-2 focus:ring-zinc-900 rounded-r-lg transition-all"
            style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717A' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1rem', paddingRight: '2rem' }}
          >
            <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
            <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
            <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
          </select>
        </div>
      </div>

      {/* PROJECTION DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Current Bank Balance</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {currentBankBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Due Payroll</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {totalPayrollAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Selected Payout Total</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {selectedPayrollAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className={`p-6 rounded-xl shadow-sm border flex flex-col justify-center relative overflow-hidden ${
          projectedBalance < 0 ? 'bg-red-600 border-red-700 text-white' : 'bg-zinc-900 border-black text-white'
        }`}>
          <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-widest block mb-2 opacity-80 relative z-10">Projected Balance</span>
          <p className="text-2xl font-black tracking-tight relative z-10">₹ {projectedBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* BATCH ACTION BAR */}
      <div className={`mb-6 p-5 rounded-xl flex justify-between items-center transition-all shrink-0 ${
        selectedEmps.size > 0 ? 'bg-zinc-900 text-white shadow-lg opacity-100' : 'opacity-0 pointer-events-none h-0 p-0 m-0 overflow-hidden'
      }`}>
        <div>
          <span className="text-sm font-bold tracking-tight text-white">{selectedEmps.size} Employees Selected</span>
          <p className="text-xs font-medium text-zinc-400 mt-0.5">Totaling ₹ {selectedPayrollAmount.toLocaleString('en-IN')}</p>
        </div>
        <button 
          onClick={handleBatchDisburse}
          disabled={projectedBalance < 0}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
            projectedBalance < 0 
            ? 'bg-red-500/20 text-red-300 cursor-not-allowed border border-red-400/30' 
            : 'bg-white text-zinc-900 hover:bg-zinc-100 shadow-sm'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {projectedBalance < 0 ? 'Insufficient Funds' : 'Initiate Batch Payout'}
        </button>
      </div>

      {/* MODERN PAYROLL LEDGER */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {/* Select All Checkbox Header */}
        <div className="flex items-center px-4 py-2 mb-2 shrink-0">
          <input 
            type="checkbox" 
            checked={isAllSelected}
            onChange={handleSelectAll}
            disabled={allSelectableCount === 0}
            className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer border-zinc-300 mr-3 accent-zinc-900 disabled:opacity-40"
          />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Select All Payables</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3 flex-1">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Syncing payroll telemetry with cloud DB...</p>
          </div>
        ) : payrollData.length === 0 ? (
          <div className="py-20 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest bg-white border border-dashed border-zinc-300 rounded-xl flex-1 flex items-center justify-center">
            No active employees found.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {payrollData.map(emp => (
              <div 
                key={emp.id} 
                className={`flex flex-col xl:flex-row items-center justify-between p-5 rounded-xl border transition-all ${
                  selectedEmps.has(emp.id) ? 'bg-zinc-50 border-zinc-900 shadow-sm' : 'bg-white border-zinc-200 hover:border-zinc-300'
                }`}
              >
                
                {/* 1. Left: Profile & Checkbox */}
                <div className="flex items-center w-full xl:w-1/3 mb-4 xl:mb-0">
                  <input 
                    type="checkbox" 
                    checked={selectedEmps.has(emp.id)}
                    onChange={() => handleSelectOne(emp.id)}
                    disabled={!emp.canBePaid}
                    className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 cursor-pointer border-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed mr-4 accent-zinc-900"
                  />
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-sm mr-3 shadow-sm flex-shrink-0">
                    {emp.fullName.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 tracking-tight">{emp.fullName}</h4>
                    <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${!emp.accountNo ? 'text-red-600 font-bold' : 'text-zinc-500 font-mono font-medium'}`}>
                      {!emp.accountNo ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Bank Details Missing
                        </>
                      ) : (
                        `A/C: ...${emp.accountNo.slice(-4)} | ${emp.ifscCode}`
                      )}
                    </p>
                  </div>
                </div>

                {/* 2. Middle: Visual Math Breakdown */}
                <div className="flex items-center gap-2 xl:gap-4 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  
                  {/* Gross Block */}
                  <div className="flex flex-col items-center bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-lg min-w-[120px]">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Gross Pay</span>
                    <span className="text-xs font-bold text-zinc-900 mt-0.5">₹{emp.grossPay.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">{emp.totalDays} Days @ {emp.payType}</span>
                  </div>

                  <span className="text-zinc-400 font-bold text-xs">-</span>

                  {/* Advance Block */}
                  <div className={`flex flex-col items-center px-4 py-2.5 rounded-lg min-w-[120px] border ${
                    emp.advanceDeduction > 0 ? 'bg-red-50 border-red-200' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Advances</span>
                    <span className={`text-xs font-bold mt-0.5 ${emp.advanceDeduction > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                      ₹{emp.advanceDeduction.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">From Staff Exp</span>
                  </div>

                  <span className="text-zinc-400 font-bold text-xs">=</span>

                  {/* Net Block */}
                  <div className={`flex flex-col items-center px-4 py-2.5 rounded-lg min-w-[120px] border ${
                    emp.netPayable > 0 && !emp.isPaidOrPending ? 'bg-emerald-50 border-emerald-200' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Net Payable</span>
                    <span className={`text-sm font-black mt-0.5 ${emp.netPayable > 0 && !emp.isPaidOrPending ? 'text-emerald-700' : 'text-zinc-900'}`}>
                      ₹{emp.netPayable.toLocaleString('en-IN')}
                    </span>
                  </div>

                </div>

                {/* 3. Right: Status */}
                <div className="w-full xl:w-1/6 flex justify-end items-center mt-4 xl:mt-0">
                  {emp.isPaidOrPending ? (
                    <span className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                      emp.payoutStatus.status === 'API_PENDING' ? 'bg-zinc-100 text-zinc-800 border-zinc-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {emp.payoutStatus.status === 'API_PENDING' ? 'Syncing...' : 'Paid'}
                    </span>
                  ) : emp.netPayable === 0 ? (
                    <span className="px-3 py-1 rounded-md text-[9px] font-bold text-zinc-400 bg-zinc-100 uppercase tracking-widest border border-zinc-200">No Dues</span>
                  ) : !emp.accountNo ? (
                    <span className="px-3 py-1 rounded-md text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 uppercase tracking-widest">Setup Reqd</span>
                  ) : (
                    <span className="px-3 py-1 rounded-md text-[9px] font-bold text-zinc-700 bg-zinc-100 border border-zinc-200 uppercase tracking-widest">Unpaid</span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}