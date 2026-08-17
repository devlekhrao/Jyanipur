import React, { useState, useEffect } from 'react';
import { getEmployeeExpenses, saveEmployeeExpense, deleteEmployeeExpense, getEmployees } from '../db';

export default function MobileEmployeeExpenses() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newExp, setNewExp] = useState({
    date: currentDate.toISOString().split('T')[0],
    empId: '',
    category: 'Material/Tools',
    description: '',
    amount: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [expData, empData] = await Promise.all([getEmployeeExpenses(), getEmployees()]);
      setExpenses(expData || []);
      setEmployees((empData || []).filter(e => e.status === 'Active'));
    } catch (e) {
      console.warn("Ensure employee expense functions exist in db.js");
      setExpenses([]);
      setEmployees([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter expenses for selected month & year
  const monthlyExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
  });

  const totalMonthExpense = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Helper to get employee name from ID
  const getEmpName = (id) => {
    const emp = employees.find(e => e.empId === id);
    return emp ? emp.fullName : id;
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExp.date || !newExp.empId || !newExp.amount) {
      alert("Date, Employee, and Amount are required.");
      return;
    }

    const payload = {
      ...newExp,
      amount: parseFloat(newExp.amount) || 0
    };

    try {
      await saveEmployeeExpense(payload);
      await loadData();
      setNewExp({
        date: currentDate.toISOString().split('T')[0],
        empId: '',
        category: 'Material/Tools',
        description: '',
        amount: ''
      });
      setIsModalOpen(false);
    } catch (err) {
      alert("Failed to save expense. Check DB connection.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this expense record?")) {
      await deleteEmployeeExpense(id);
      await loadData();
    }
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Staff Expenses</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Petty Cash & Site Allowances</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-semibold text-[11px] px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            + Log Expense
          </button>
        </div>

        {/* MONTH / YEAR PICKER STRIP */}
        <div className="bg-white p-2.5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest pl-1">Period:</span>
          <div className="flex gap-2">
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-zinc-100 font-bold text-xs text-zinc-800 py-1.5 px-3 rounded-xl outline-none"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-zinc-100 font-bold text-xs text-zinc-800 py-1.5 px-3 rounded-xl outline-none"
            >
              <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
              <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
              <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
            </select>
          </div>
        </div>
      </div>

      {/* MONTHLY TOTAL KPI CARD */}
      <div className="bg-zinc-900 text-white p-4 rounded-2xl shadow-md mb-3 flex justify-between items-center shrink-0">
        <div>
          <span className="text-[9px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest block">Total Expense (This Month)</span>
          <p className="text-xl font-semibold text-[11px] text-amber-400 mt-0.5">₹ {totalMonthExpense.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <span className="text-2xl">💸</span>
      </div>

      {/* EXPENSES LIST STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading staff expenses...</div>
        ) : monthlyExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">🧾</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No expenses logged for this month</p>
          </div>
        ) : (
          monthlyExpenses.map(exp => (
            <div key={exp.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-2 active:scale-[0.99] transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-zinc-900 text-sm">{getEmpName(exp.empId)}</h4>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{exp.date}</p>
                </div>
                <p className="text-base font-semibold text-[11px] text-red-600">₹ {exp.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="bg-zinc-100 text-zinc-700 text-[9px] font-semibold text-[11px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {exp.category}
                </span>
                
                <button 
                  onClick={() => handleDelete(exp.id)} 
                  className="text-zinc-300 hover:text-red-500 p-1 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {exp.description && (
                <p className="text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                  {exp.description}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* ADD EXPENSE MODAL / SHEET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Record Staff Expense</h2>
                <p className="text-zinc-500 text-[9px] font-bold mt-0.5 uppercase tracking-widest">Petty Cash & Material Logs</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <form id="expenseForm" onSubmit={handleAddExpense} className="space-y-4 pb-20">
                
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} className={inputClass} required />
                </div>

                <div>
                  <label className={labelClass}>Staff Member <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={newExp.empId} onChange={e => setNewExp({...newExp, empId: e.target.value})} className={`${inputClass} appearance-none font-bold`} required>
                      <option value="" disabled>Select Employee...</option>
                      {employees.map(e => <option key={e.empId} value={e.empId}>{e.fullName} ({e.empId})</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Category</label>
                  <div className="relative">
                    <select value={newExp.category} onChange={e => setNewExp({...newExp, category: e.target.value})} className={`${inputClass} appearance-none`}>
                      <option value="Material/Tools">Material / Tools</option>
                      <option value="Travel/Fuel">Travel / Fuel</option>
                      <option value="Food/Meals">Food / Meals</option>
                      <option value="Salary Advance">Salary Advance</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    step="any" 
                    inputMode="decimal"
                    placeholder="0.00" 
                    value={newExp.amount} 
                    onChange={e => setNewExp({...newExp, amount: e.target.value})} 
                    className={`${inputClass} font-semibold text-[11px] text-red-600 text-base`} 
                    required 
                  />
                </div>

                <div>
                  <label className={labelClass}>Description / Voucher Ref</label>
                  <textarea 
                    placeholder="Bill reference or items purchased..." 
                    value={newExp.description} 
                    onChange={e => setNewExp({...newExp, description: e.target.value})} 
                    className={`${inputClass} min-h-[90px] resize-none`} 
                  />
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button 
                type="submit" 
                form="expenseForm"
                className="w-full py-4 bg-[#1E3A8A] text-white font-semibold text-[11px] rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform"
              >
                Save Expense
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}