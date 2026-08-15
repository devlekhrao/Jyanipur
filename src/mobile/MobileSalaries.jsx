import React, { useState, useEffect } from 'react';
import { getEmployees, getMonthlyAttendance, getMonthlyPayouts, initiatePayout, getEmployeeExpenses } from '../db';

export default function MobileSalaries() {
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
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Payroll & Salary</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Disbursements & Wages</p>
          </div>

          {/* PERIOD SELECTOR */}
          <div className="flex gap-1.5 bg-white border border-zinc-200 rounded-xl p-1 shadow-sm">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))} 
              className="bg-transparent text-[11px] font-extrabold text-zinc-800 outline-none"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))} 
              className="bg-transparent text-[11px] font-extrabold text-zinc-800 outline-none"
            >
              <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
              <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
            </select>
          </div>
        </div>

        {/* SELECT ALL ROW */}
        <div className="bg-white border border-zinc-200 rounded-2xl px-3 py-2 shadow-sm flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-black text-zinc-800 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isAllSelected}
              onChange={handleSelectAll}
              disabled={allSelectableCount === 0}
              className="w-4 h-4 rounded text-[#1E3A8A] focus:ring-[#1E3A8A] border-zinc-300"
            />
            <span>Select All Payables ({allSelectableCount})</span>
          </label>
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
            {selectedEmps.size} Selected
          </span>
        </div>
      </div>

      {/* 2x2 PROJECTION KPI GRID */}
      <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Bank Balance</span>
          <p className="text-xs font-black text-zinc-900 mt-0.5">₹ {currentBankBalance.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Total Due</span>
          <p className="text-xs font-black text-zinc-800 mt-0.5">₹ {totalPayrollAmount.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>

        <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block">Selected Payout</span>
          <p className="text-xs font-black text-amber-700 mt-0.5">₹ {selectedPayrollAmount.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>

        <div className={`p-3 rounded-2xl shadow-sm border ${projectedBalance < 0 ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white'}`}>
          <span className="text-[8px] font-black uppercase tracking-widest block opacity-80">Projected Bal</span>
          <p className="text-xs font-black mt-0.5">₹ {projectedBalance.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* PAYROLL STREAM LIST */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Calculating payroll...</div>
        ) : payrollData.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">💼</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No active staff found for this month</p>
          </div>
        ) : (
          payrollData.map(emp => {
            const isSelected = selectedEmps.has(emp.id);

            return (
              <div 
                key={emp.id} 
                className={`border rounded-[1.5rem] p-4 shadow-sm space-y-3 transition-all ${
                  isSelected 
                    ? 'bg-amber-50/80 border-amber-300 shadow-md' 
                    : 'bg-white border-zinc-200'
                }`}
              >
                {/* HEADER & CHECKBOX */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => handleSelectOne(emp.id)}
                      disabled={!emp.canBePaid}
                      className="w-5 h-5 rounded text-[#1E3A8A] focus:ring-[#1E3A8A] border-zinc-300 disabled:opacity-30"
                    />
                    <div className="w-10 h-10 rounded-2xl bg-[#1E3A8A] text-amber-400 flex items-center justify-center font-black text-xs shrink-0">
                      {emp.fullName.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-zinc-900 text-sm">{emp.fullName}</h4>
                      <p className={`text-[9px] ${!emp.accountNo ? 'text-red-500 font-bold' : 'text-zinc-400 font-mono'}`}>
                        {emp.accountNo ? `A/c: ****${emp.accountNo.slice(-4)}` : '⚠️ Bank Details Missing'}
                      </p>
                    </div>
                  </div>

                  {/* STATUS BADGE */}
                  <div>
                    {emp.isPaidOrPending ? (
                      <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider ${
                        emp.payoutStatus.status === 'API_PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {emp.payoutStatus.status === 'API_PENDING' ? 'Syncing...' : 'Paid'}
                      </span>
                    ) : emp.netPayable === 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-[8px] font-black text-zinc-400 bg-zinc-100 uppercase">No Dues</span>
                    ) : !emp.accountNo ? (
                      <span className="px-2.5 py-1 rounded-full text-[8px] font-black text-red-600 bg-red-50 uppercase">Setup Reqd</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[8px] font-black text-zinc-600 bg-zinc-100 uppercase">Unpaid</span>
                    )}
                  </div>
                </div>

                {/* PAYROLL CALCULATION METRICS */}
                <div className="grid grid-cols-3 gap-1.5 bg-white p-2.5 rounded-xl border border-zinc-100 text-center text-xs">
                  <div>
                    <span className="text-[8px] font-black text-zinc-400 uppercase block">Gross Pay</span>
                    <p className="font-black text-zinc-900 mt-0.5">₹{emp.grossPay.toLocaleString('en-IN')}</p>
                    <span className="text-[8px] text-zinc-400 block">{emp.totalDays} Days</span>
                  </div>

                  <div>
                    <span className="text-[8px] font-black text-red-500 uppercase block">Advances</span>
                    <p className="font-black text-red-600 mt-0.5">-₹{emp.advanceDeduction.toLocaleString('en-IN')}</p>
                    <span className="text-[8px] text-zinc-400 block">Deducted</span>
                  </div>

                  <div>
                    <span className="text-[8px] font-black text-emerald-600 uppercase block">Net Payable</span>
                    <p className="font-black text-emerald-700 mt-0.5">₹{emp.netPayable.toLocaleString('en-IN')}</p>
                    <span className="text-[8px] text-emerald-600 font-bold block">Final</span>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* FIXED BOTTOM DISBURSEMENT ACTION BAR */}
      {selectedEmps.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom,20px)+12px)] bg-amber-500 border-t border-amber-600 shadow-2xl flex items-center justify-between z-50 animate-in slide-in-from-bottom duration-200">
          <div>
            <span className="text-xs font-black text-zinc-900 block">{selectedEmps.size} Staff Selected</span>
            <span className="text-[10px] font-black text-zinc-900 uppercase">
              Total: ₹{selectedPayrollAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <button 
            onClick={handleBatchDisburse}
            disabled={projectedBalance < 0}
            className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-transform active:scale-95 ${
              projectedBalance < 0
                ? 'bg-red-600 text-white cursor-not-allowed'
                : 'bg-zinc-900 text-white'
            }`}
          >
            {projectedBalance < 0 ? 'Insufficient Funds' : 'Initiate Payout ⚡'}
          </button>
        </div>
      )}

    </div>
  );
}