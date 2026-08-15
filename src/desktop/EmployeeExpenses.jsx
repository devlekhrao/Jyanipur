import React, { useState, useEffect } from 'react';
import { getEmployeeExpenses, saveEmployeeExpense, deleteEmployeeExpense, getEmployees } from '.../db';

export default function EmployeeExpenses() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

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

  // --- Calculations & Filters ---
  
  // 1. Filter expenses for the currently selected Month & Year
  const monthlyExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
  });

  const totalMonthExpense = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 2. Calculate Current Week Expense (last 7 days from today)
  const oneWeekAgo = new Date(currentDate);
  oneWeekAgo.setDate(currentDate.getDate() - 7);
  const weeklyExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d >= oneWeekAgo && d <= currentDate;
  });
  const totalWeekExpense = weeklyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 3. Employee-wise breakdown for the selected month
  const employeeTotals = {};
  monthlyExpenses.forEach(exp => {
    if (!employeeTotals[exp.empId]) employeeTotals[exp.empId] = 0;
    employeeTotals[exp.empId] += exp.amount;
  });

  // Helper to get employee name from ID
  const getEmpName = (id) => {
    const emp = employees.find(e => e.empId === id);
    return emp ? emp.fullName : id;
  };

  const handleAddExpense = async () => {
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
      setNewExp({ ...newExp, description: '', amount: '' });
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

  const inputClass = "w-full px-2 py-2 bg-transparent border-b border-zinc-200 focus:border-[#1E3A8A] focus:outline-none text-zinc-900 text-xs font-medium transition-all placeholder:text-zinc-400";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 print:hidden shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Staff Expenses</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Track allowances, petty cash, and site purchases given to employees.</p>
        </div>

        <div className="flex items-center gap-1.5 h-10 bg-white border border-zinc-200 rounded-2xl px-3 shadow-sm">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))} 
            className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer px-1"
          >
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))} 
            className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer pr-1"
          >
            <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
            <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
            <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
          </select>
        </div>
      </div>

      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 print:hidden shrink-0">
        <div className="bg-zinc-900 text-white p-6 rounded-[2rem] shadow-lg flex flex-col justify-center">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Total Given (This Month)</span>
          <p className="text-2xl font-black">₹ {totalMonthExpense.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-amber-50/70 p-6 rounded-[2rem] border border-amber-200/80 shadow-sm flex flex-col justify-center">
          <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest block mb-1">Total Given (Past 7 Days)</span>
          <p className="text-2xl font-black text-amber-700">₹ {totalWeekExpense.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        
        {/* Employee Breakdown Mini-Dashboard */}
        <div className="bg-white p-5 rounded-[2rem] border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-2">Highest Spenders (This Month)</span>
          <div className="space-y-2 max-h-[70px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {Object.keys(employeeTotals).length === 0 ? (
              <p className="text-[10px] text-zinc-400 font-medium">No expenses recorded yet.</p>
            ) : (
              Object.entries(employeeTotals)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([empId, total]) => (
                  <div key={empId} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-zinc-800 truncate pr-2">{getEmpName(empId)}</span>
                    <span className="font-black text-red-500">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* PDF Header (Only visible when printing) */}
      <div className="hidden print:block mb-6">
        <h2 className="text-xl font-black text-zinc-900">Staff Expense Register</h2>
        <p className="text-xs text-zinc-600">Period: {new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Full Width Seamless Entry Table Container */}
      <div className="bg-white border border-zinc-200 rounded-[2rem] p-6 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-100 bg-zinc-50/50">
                <th className="py-3.5 px-3 font-bold w-32">Date</th>
                <th className="py-3.5 px-3 font-bold w-48">Employee</th>
                <th className="py-3.5 px-3 font-bold w-40">Category</th>
                <th className="py-3.5 px-3 font-bold min-w-[200px]">Description / Bill Ref</th>
                <th className="py-3.5 px-3 font-bold text-right w-32">Amount</th>
                <th className="py-3.5 px-3 font-bold text-center w-20 print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs text-zinc-800">
              
              {/* INLINE ENTRY ROW */}
              <tr className="border-b border-zinc-200 bg-zinc-50/50 print:hidden">
                <td className="py-2 px-2"><input type="date" value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} className={inputClass} /></td>
                <td className="py-2 px-2">
                  <select value={newExp.empId} onChange={e => setNewExp({...newExp, empId: e.target.value})} className={`${inputClass} cursor-pointer font-bold`}>
                    <option value="" disabled>Select Staff...</option>
                    {employees.map(e => <option key={e.empId} value={e.empId}>{e.fullName} ({e.empId})</option>)}
                  </select>
                </td>
                <td className="py-2 px-2">
                  <select value={newExp.category} onChange={e => setNewExp({...newExp, category: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="Material/Tools">Material / Tools</option>
                    <option value="Travel/Fuel">Travel / Fuel</option>
                    <option value="Food/Meals">Food / Meals</option>
                    <option value="Salary Advance">Salary Advance</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </td>
                <td className="py-2 px-2"><input type="text" placeholder="Bill no, item details..." value={newExp.description} onChange={e => setNewExp({...newExp, description: e.target.value})} className={inputClass} /></td>
                <td className="py-2 px-2"><input type="number" step="any" placeholder="₹ 0.00" value={newExp.amount} onChange={e => setNewExp({...newExp, amount: e.target.value})} className={`${inputClass} text-right font-black text-red-500`} /></td>
                <td className="py-2 px-2 text-center">
                  <button onClick={handleAddExpense} className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white py-2 rounded-xl font-bold text-[9px] uppercase tracking-wider transition-all shadow-sm cursor-pointer">Add</button>
                </td>
              </tr>

              {/* SAVED RECORDS */}
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium">Loading records...</td></tr>
              ) : monthlyExpenses.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium">No expenses found for this month. Type above to add one.</td></tr>
              ) : (
                monthlyExpenses.map(exp => (
                  <tr key={exp.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors group">
                    <td className="py-3.5 px-3 font-medium text-zinc-600">{exp.date}</td>
                    <td className="py-3.5 px-3 font-extrabold text-zinc-900">{getEmpName(exp.empId)}</td>
                    <td className="py-3.5 px-3 text-zinc-600 font-medium">
                      <span className="bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-lg text-[10px] font-bold text-zinc-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-zinc-500 truncate max-w-[250px]">{exp.description || '-'}</td>
                    <td className="py-3.5 px-3 text-right font-black text-zinc-900">₹ {exp.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="py-3.5 px-3 text-center opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                      <button onClick={() => handleDelete(exp.id)} className="text-red-400 hover:text-red-600 font-bold text-[10px] uppercase tracking-wider cursor-pointer">Del</button>
                    </td>
                  </tr>
                ))
              )}

              {/* Total Footer */}
              <tr className="font-black text-zinc-900 border-t-2 border-zinc-200 bg-zinc-50/50">
                <td colSpan="4" className="py-4 px-3 text-right text-xs uppercase tracking-wider">MONTHLY TOTAL:</td>
                <td className="py-4 px-3 text-right text-sm font-black text-[#1E3A8A]">₹ {totalMonthExpense.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td className="print:hidden"></td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}