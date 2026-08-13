import React, { useState, useEffect } from 'react';
import { getEmployees, getMonthlyAttendance, getMonthlyPayouts, initiatePayout, getEmployeeExpenses } from './db';

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
    const [emps, att, pays, allExpenses] = await Promise.all([
      getEmployees(),
      getMonthlyAttendance(selectedYear, selectedMonth),
      getMonthlyPayouts(selectedYear, selectedMonth),
      getEmployeeExpenses()
    ]);
    
    // Filter expenses for "Salary Advance" in the selected month/year
    const monthlyAdvances = {};
    allExpenses.forEach(exp => {
      if (!exp.date) return;
      const d = new Date(exp.date);
      if (d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && exp.category === 'Salary Advance') {
        monthlyAdvances[exp.empId] = (monthlyAdvances[exp.empId] || 0) + exp.amount;
      }
    });

    setEmployees(emps.filter(e => e.status === 'Active'));
    setAttendance(att);
    setPayouts(pays);
    setAdvances(monthlyAdvances);
    setSelectedEmps(new Set()); 
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

    // Math: Gross - Advance = Net Payable (Cannot go below 0 for ICICI transfer)
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
      alert("Insufficient funds in the simulated bank account to process this batch.");
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
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Payroll & Disbursements</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Advances are automatically deducted. Select employees to calculate payout projection.</p>
        </div>

        <div className="flex items-center gap-1.5 h-9 bg-white/60 border border-zinc-200/60 rounded-xl px-2 shadow-sm">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent border-none text-xs font-semibold text-zinc-700 outline-none cursor-pointer px-1">
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent border-none text-xs font-semibold text-zinc-700 outline-none cursor-pointer pr-1">
            <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
            <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
          </select>
        </div>
      </div>

      {/* Projection Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-3xl border border-white/60 shadow-sm">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Current Bank Balance</span>
          <p className="text-xl font-bold text-zinc-800">₹ {currentBankBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-3xl border border-white/60 shadow-sm">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Total Due Payroll</span>
          <p className="text-xl font-bold text-zinc-600">₹ {totalPayrollAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-amber-50/50 backdrop-blur-xl p-5 rounded-3xl border border-amber-200/60 shadow-sm">
          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest block mb-1">Selected Payout Total</span>
          <p className="text-xl font-bold text-amber-700">₹ {selectedPayrollAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className={`p-5 rounded-3xl shadow-md ${projectedBalance < 0 ? 'bg-red-500 text-white' : 'bg-zinc-800 text-white'}`}>
          <span className="text-[10px] font-semibold uppercase tracking-widest block mb-1 opacity-80">Projected Balance</span>
          <p className="text-xl font-bold">₹ {projectedBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className={`mb-6 p-4 rounded-3xl flex justify-between items-center transition-all ${selectedEmps.size > 0 ? 'bg-orange-50 border border-orange-200 opacity-100 shadow-sm' : 'opacity-0 pointer-events-none h-0 p-0 m-0 overflow-hidden'}`}>
        <div>
          <span className="text-sm font-bold text-orange-800">{selectedEmps.size} Employees Selected</span>
          <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-widest mt-0.5">Totaling ₹ {selectedPayrollAmount.toLocaleString('en-IN')}</p>
        </div>
        <button 
          onClick={handleBatchDisburse}
          disabled={projectedBalance < 0}
          className={`px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-md flex items-center gap-2 ${
            projectedBalance < 0 
            ? 'bg-red-100 text-red-500 cursor-not-allowed border border-red-200' 
            : 'bg-orange-500 hover:bg-orange-600 text-white hover:-translate-y-0.5'
          }`}
        >
          <span>⚡</span> {projectedBalance < 0 ? 'Insufficient Funds' : 'Initiate Batch Payout'}
        </button>
      </div>

      {/* Modern Payroll Ledger (Card Layout instead of Table) */}
      <div className="w-full">
        {/* Header Row for Select All */}
        <div className="flex items-center px-4 py-2 mb-2">
          <input 
            type="checkbox" 
            checked={isAllSelected}
            onChange={handleSelectAll}
            disabled={allSelectableCount === 0}
            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer border-zinc-300 mr-4"
          />
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Select All Payables</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 font-medium">Calculating payroll...</div>
        ) : payrollData.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 font-medium">No active employees found.</div>
        ) : (
          <div className="space-y-3">
            {payrollData.map(emp => (
              <div 
                key={emp.id} 
                className={`flex flex-col xl:flex-row items-center justify-between p-4 rounded-3xl border transition-all ${
                  selectedEmps.has(emp.id) ? 'bg-orange-50/40 border-orange-200 shadow-sm' : 'bg-white/60 border-white/80 hover:bg-white hover:shadow-md'
                }`}
              >
                
                {/* 1. Left: Profile & Checkbox */}
                <div className="flex items-center w-full xl:w-1/3 mb-4 xl:mb-0">
                  <input 
                    type="checkbox" 
                    checked={selectedEmps.has(emp.id)}
                    onChange={() => handleSelectOne(emp.id)}
                    disabled={!emp.canBePaid}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer border-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed mr-4"
                  />
                  <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-sm mr-3 shadow-sm flex-shrink-0">
                    {emp.fullName.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${selectedEmps.has(emp.id) ? 'text-orange-900' : 'text-zinc-800'}`}>{emp.fullName}</h4>
                    <p className={`text-[10px] ${!emp.accountNo ? 'text-red-400 font-medium' : 'text-zinc-500 font-mono'}`}>
                      {emp.accountNo ? `A/c: ${emp.accountNo.slice(-4)} | ${emp.ifscCode}` : '⚠️ Bank Details Missing'}
                    </p>
                  </div>
                </div>

                {/* 2. Middle: Visual Math Breakdown */}
                <div className="flex items-center gap-2 xl:gap-4 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
                  
                  {/* Gross Block */}
                  <div className="flex flex-col items-center bg-zinc-100/50 px-4 py-2 rounded-2xl min-w-[110px]">
                    <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">Gross Pay</span>
                    <span className="text-xs font-bold text-zinc-700">₹{emp.grossPay.toLocaleString('en-IN')}</span>
                    <span className="text-[8px] text-zinc-400 mt-0.5">{emp.totalDays} Days @ {emp.payType}</span>
                  </div>

                  <span className="text-zinc-300 font-bold">-</span>

                  {/* Advance Block */}
                  <div className={`flex flex-col items-center px-4 py-2 rounded-2xl min-w-[110px] ${emp.advanceDeduction > 0 ? 'bg-red-50/50' : 'bg-zinc-100/50'}`}>
                    <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-widest">Advances</span>
                    <span className={`text-xs font-bold ${emp.advanceDeduction > 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                      ₹{emp.advanceDeduction.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[8px] text-zinc-400 mt-0.5">From Staff Exp</span>
                  </div>

                  <span className="text-zinc-300 font-bold">=</span>

                  {/* Net Block */}
                  <div className={`flex flex-col items-center px-4 py-2 rounded-2xl min-w-[110px] shadow-inner ${emp.netPayable > 0 && !emp.isPaidOrPending ? 'bg-emerald-50/50 border border-emerald-100' : 'bg-zinc-100/50'}`}>
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest">Net Payable</span>
                    <span className={`text-sm font-bold ${emp.netPayable > 0 && !emp.isPaidOrPending ? 'text-emerald-700' : 'text-zinc-800'}`}>
                      ₹{emp.netPayable.toLocaleString('en-IN')}
                    </span>
                  </div>

                </div>

                {/* 3. Right: Status */}
                <div className="w-full xl:w-1/6 flex justify-end items-center mt-4 xl:mt-0">
                  {emp.isPaidOrPending ? (
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold uppercase tracking-wider ${
                      emp.payoutStatus.status === 'API_PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {emp.payoutStatus.status === 'API_PENDING' ? 'Syncing ICICI...' : 'Paid'}
                    </span>
                  ) : emp.netPayable === 0 ? (
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-medium text-zinc-400 bg-zinc-100 uppercase tracking-wider">No Dues</span>
                  ) : !emp.accountNo ? (
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-medium text-red-500 bg-red-50 border border-red-100 uppercase tracking-wider">Setup Reqd</span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-medium text-zinc-500 bg-white border border-zinc-200 shadow-sm uppercase tracking-wider">Unpaid</span>
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