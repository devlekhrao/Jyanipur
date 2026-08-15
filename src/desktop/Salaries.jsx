import React, { useState, useEffect } from 'react';
import { getEmployees, getMonthlyAttendance, getMonthlyPayouts, initiatePayout, getEmployeeExpenses } from '.../db';

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
          monthlyAdvances[exp.empId] = (monthlyAdvances[exp.empId] || 0) + exp.amount;
        }
      });

      setEmployees((emps || []).filter(e => e.status === 'Active'));
      setAttendance(att || {});
      setPayouts(pays || {});
      setAdvances(monthlyAdvances);
      setSelectedEmps(new Set()); 
    } catch (e) {
      console.warn("Ensure salary and payroll functions exist in db.js");
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
      grossPay = totalDays * (emp.payRate || 0);
    } else {
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      grossPay = ((emp.payRate || 0) / daysInMonth) * totalDays;
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

    if (window.confirm(`Initiate ICICI NEFT batch payout for ${selectedEmps.size} employees totaling ₹${selectedPayrollAmount.toLocaleString('en-IN')}?`)) {
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
        alert(`Batch Payout API Triggered for ${employeesToPay.length} employees!`);
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
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Payroll & Disbursements</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Advances are automatically deducted. Select employees to calculate payout projection.</p>
        </div>

        <div className="flex items-center gap-1.5 h-10 bg-white border border-zinc-200 rounded-2xl px-3 shadow-sm">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Current Bank Balance</span>
          <p className="text-2xl font-black text-zinc-900">₹ {currentBankBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Total Due Payroll</span>
          <p className="text-2xl font-black text-zinc-800">₹ {totalPayrollAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-amber-50/70 p-6 rounded-[2rem] border border-amber-200/80 shadow-sm">
          <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest block mb-1">Selected Payout Total</span>
          <p className="text-2xl font-black text-amber-700">₹ {selectedPayrollAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className={`p-6 rounded-[2rem] shadow-lg border ${projectedBalance < 0 ? 'bg-red-600 border-red-600 text-white' : 'bg-zinc-900 border-zinc-900 text-white'}`}>
          <span className="text-[9px] font-extrabold uppercase tracking-widest block mb-1 opacity-80">Projected Balance</span>
          <p className="text-2xl font-black">₹ {projectedBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className={`mb-6 p-4 rounded-2xl flex justify-between items-center transition-all shrink-0 ${selectedEmps.size > 0 ? 'bg-amber-500 text-zinc-900 shadow-md opacity-100' : 'opacity-0 pointer-events-none h-0 p-0 m-0 overflow-hidden'}`}>
        <div>
          <span className="text-sm font-extrabold">{selectedEmps.size} Employees Selected</span>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-90">Totaling ₹ {selectedPayrollAmount.toLocaleString('en-IN')}</p>
        </div>
        <button 
          onClick={handleBatchDisburse}
          disabled={projectedBalance < 0}
          className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 cursor-pointer ${
            projectedBalance < 0 
            ? 'bg-red-100 text-red-600 cursor-not-allowed border border-red-200' 
            : 'bg-zinc-900 hover:bg-black text-white'
          }`}
        >
          <span>⚡</span> {projectedBalance < 0 ? 'Insufficient Funds' : 'Initiate Batch Payout'}
        </button>
      </div>

      {/* Modern Payroll Ledger */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header Row for Select All */}
        <div className="flex items-center px-4 py-2 mb-2 shrink-0">
          <input 
            type="checkbox" 
            checked={isAllSelected}
            onChange={handleSelectAll}
            disabled={allSelectableCount === 0}
            className="w-4 h-4 rounded text-[#1E3A8A] focus:ring-[#1E3A8A] cursor-pointer border-zinc-300 mr-4"
          />
          <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">Select All Payables</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1">Calculating payroll...</div>
        ) : payrollData.length === 0 ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs bg-white border border-dashed border-zinc-200 rounded-[2rem] flex-1 flex items-center justify-center">No active employees found.</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {payrollData.map(emp => (
              <div 
                key={emp.id} 
                className={`flex flex-col xl:flex-row items-center justify-between p-5 rounded-2xl border transition-all ${
                  selectedEmps.has(emp.id) ? 'bg-amber-50/60 border-amber-300 shadow-sm' : 'bg-white border-zinc-200 hover:shadow-sm'
                }`}
              >
                
                {/* 1. Left: Profile & Checkbox */}
                <div className="flex items-center w-full xl:w-1/3 mb-4 xl:mb-0">
                  <input 
                    type="checkbox" 
                    checked={selectedEmps.has(emp.id)}
                    onChange={() => handleSelectOne(emp.id)}
                    disabled={!emp.canBePaid}
                    className="w-4 h-4 rounded text-[#1E3A8A] focus:ring-[#1E3A8A] cursor-pointer border-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed mr-4"
                  />
                  <div className="w-10 h-10 rounded-2xl bg-[#1E3A8A] text-amber-400 flex items-center justify-center font-black text-sm mr-3 shadow-sm flex-shrink-0">
                    {emp.fullName.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-zinc-900">{emp.fullName}</h4>
                    <p className={`text-[10px] ${!emp.accountNo ? 'text-red-500 font-bold' : 'text-zinc-400 font-mono font-medium'}`}>
                      {emp.accountNo ? `A/c: ${emp.accountNo.slice(-4)} | ${emp.ifscCode}` : '⚠️ Bank Details Missing'}
                    </p>
                  </div>
                </div>

                {/* 2. Middle: Visual Math Breakdown */}
                <div className="flex items-center gap-2 xl:gap-4 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  
                  {/* Gross Block */}
                  <div className="flex flex-col items-center bg-zinc-50 border border-zinc-200/80 px-4 py-2 rounded-xl min-w-[110px]">
                    <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest">Gross Pay</span>
                    <span className="text-xs font-black text-zinc-900">₹{emp.grossPay.toLocaleString('en-IN')}</span>
                    <span className="text-[8px] text-zinc-500 mt-0.5 font-medium">{emp.totalDays} Days @ {emp.payType}</span>
                  </div>

                  <span className="text-zinc-400 font-black">-</span>

                  {/* Advance Block */}
                  <div className={`flex flex-col items-center px-4 py-2 rounded-xl min-w-[110px] border ${emp.advanceDeduction > 0 ? 'bg-red-50/70 border-red-100' : 'bg-zinc-50 border-zinc-200/80'}`}>
                    <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest">Advances</span>
                    <span className={`text-xs font-black ${emp.advanceDeduction > 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                      ₹{emp.advanceDeduction.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[8px] text-zinc-500 mt-0.5 font-medium">From Staff Exp</span>
                  </div>

                  <span className="text-zinc-400 font-black">=</span>

                  {/* Net Block */}
                  <div className={`flex flex-col items-center px-4 py-2 rounded-xl min-w-[110px] border ${emp.netPayable > 0 && !emp.isPaidOrPending ? 'bg-emerald-50/70 border-emerald-100' : 'bg-zinc-50 border-zinc-200/80'}`}>
                    <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">Net Payable</span>
                    <span className={`text-sm font-black ${emp.netPayable > 0 && !emp.isPaidOrPending ? 'text-emerald-700' : 'text-zinc-900'}`}>
                      ₹{emp.netPayable.toLocaleString('en-IN')}
                    </span>
                  </div>

                </div>

                {/* 3. Right: Status */}
                <div className="w-full xl:w-1/6 flex justify-end items-center mt-4 xl:mt-0">
                  {emp.isPaidOrPending ? (
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                      emp.payoutStatus.status === 'API_PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {emp.payoutStatus.status === 'API_PENDING' ? 'Syncing ICICI...' : 'Paid'}
                    </span>
                  ) : emp.netPayable === 0 ? (
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-zinc-400 bg-zinc-100 uppercase tracking-wider">No Dues</span>
                  ) : !emp.accountNo ? (
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 uppercase tracking-wider">Setup Reqd</span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-zinc-600 bg-zinc-100 border border-zinc-200 uppercase tracking-wider">Unpaid</span>
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