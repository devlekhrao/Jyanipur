import React, { useState, useEffect } from 'react';
import { getEmployeeExpenses, saveEmployeeExpense, deleteEmployeeExpense, getEmployees } from '../db';

export default function EmployeeExpenses() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  
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
      console.error("Error fetching employee expenses from cloud DB:", e);
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

  const totalMonthExpense = monthlyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // 2. Calculate Current Week Expense (last 7 days from today)
  const oneWeekAgo = new Date(currentDate);
  oneWeekAgo.setDate(currentDate.getDate() - 7);
  const weeklyExpenses = expenses.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d >= oneWeekAgo && d <= currentDate;
  });
  const totalWeekExpense = weeklyExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // 3. Employee-wise breakdown for the selected month
  const employeeTotals = {};
  monthlyExpenses.forEach(exp => {
    if (!employeeTotals[exp.empId]) employeeTotals[exp.empId] = 0;
    employeeTotals[exp.empId] += (parseFloat(exp.amount) || 0);
  });

  // Helper to get employee name from ID
  const getEmpName = (id) => {
    const emp = employees.find(e => e.empId === id || String(e.id) === String(id));
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

    setSubmitting(true);
    try {
      await saveEmployeeExpense(payload);
      await loadData();
      setNewExp({ ...newExp, description: '', amount: '' });
    } catch (err) {
      alert("Failed to save expense. Check DB connection.");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this expense record?")) {
      setLoading(true);
      await deleteEmployeeExpense(id);
      await loadData();
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-xs font-medium transition-all shadow-sm";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Staff Expenses</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Track allowances, petty cash, and site purchases given to employees.</p>
        </div>

        <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3 shadow-sm">
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

      {/* DASHBOARD SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 print:hidden shrink-0">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Given (This Month)</span>
          <p className="text-xl font-bold text-zinc-900">₹ {totalMonthExpense.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest block mb-1">Total Given (Past 7 Days)</span>
          <p className="text-xl font-bold text-[#B45309]">₹ {totalWeekExpense.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        
        {/* Employee Breakdown Mini-Dashboard */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Highest Spenders (This Month)</span>
          <div className="space-y-1.5 max-h-[60px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {Object.keys(employeeTotals).length === 0 ? (
              <p className="text-xs text-zinc-400 font-medium">No expenses recorded yet.</p>
            ) : (
              Object.entries(employeeTotals)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([empId, total]) => (
                  <div key={empId} className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-zinc-800 truncate pr-2">{getEmpName(empId)}</span>
                    <span className="font-bold text-red-500">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* PDF Header (Only visible when printing) */}
      <div className="hidden print:block mb-6">
        <h2 className="text-xl font-bold text-zinc-900">Staff Expense Register</h2>
        <p className="text-xs text-zinc-600">Period: {new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* FULL WIDTH TABLE CONTAINER */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
            <thead>
              <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200 sticky top-0 bg-zinc-50 z-10">
                <th className="py-3.5 px-4 font-semibold w-32">Date</th>
                <th className="py-3.5 px-4 font-semibold w-48">Employee</th>
                <th className="py-3.5 px-4 font-semibold w-40">Category</th>
                <th className="py-3.5 px-4 font-semibold min-w-[200px]">Description / Bill Ref</th>
                <th className="py-3.5 px-4 font-semibold text-right w-36">Amount</th>
                <th className="py-3.5 px-6 font-semibold text-right w-20 print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm text-zinc-800 divide-y divide-zinc-100">
              
              {/* INLINE ENTRY ROW */}
              <tr className="bg-amber-50/30 border-b border-amber-100 print:hidden">
                <td className="py-3 px-3"><input type="date" value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} className={inputClass} /></td>
                <td className="py-3 px-3">
                  <select 
                    value={newExp.empId} 
                    onChange={e => setNewExp({...newExp, empId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.8rem_center] bg-[length:1rem_1rem] pr-8 font-semibold text-zinc-900`}
                  >
                    <option value="" disabled>Select Staff...</option>
                    {employees.map(e => <option key={e.empId || e.id} value={e.empId || e.id}>{e.fullName} ({e.empId})</option>)}
                  </select>
                </td>
                <td className="py-3 px-3">
                  <select 
                    value={newExp.category} 
                    onChange={e => setNewExp({...newExp, category: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.8rem_center] bg-[length:1rem_1rem] pr-8`}
                  >
                    <option value="Material/Tools">Material / Tools</option>
                    <option value="Travel/Fuel">Travel / Fuel</option>
                    <option value="Food/Meals">Food / Meals</option>
                    <option value="Salary Advance">Salary Advance</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </td>
                <td className="py-3 px-3"><input type="text" placeholder="Bill no, item details..." value={newExp.description} onChange={e => setNewExp({...newExp, description: e.target.value})} className={inputClass} /></td>
                <td className="py-3 px-3"><input type="number" step="any" placeholder="₹ 0.00" value={newExp.amount} onChange={e => setNewExp({...newExp, amount: e.target.value})} className={`${inputClass} text-right font-bold text-red-500`} /></td>
                <td className="py-3 px-6 text-right">
                  <button onClick={handleAddExpense} disabled={submitting} className="px-4 py-2 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1 ml-auto disabled:opacity-50">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    {submitting ? 'Adding...' : 'Add'}
                  </button>
                </td>
              </tr>

              {/* SAVED RECORDS */}
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-sm">Syncing expense records with cloud DB...</td></tr>
              ) : monthlyExpenses.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-sm">No expenses found for this month. Use the top row above to add one.</td></tr>
              ) : (
                monthlyExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="py-4 px-4 text-xs font-medium text-zinc-500">{exp.date}</td>
                    <td className="py-4 px-4 font-semibold text-zinc-900">{getEmpName(exp.empId)}</td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 bg-amber-50 text-[#B45309] border border-amber-200/60 rounded-md text-[10px] font-semibold uppercase tracking-wider">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-zinc-500 truncate max-w-[250px]">{exp.description || '-'}</td>
                    <td className="py-4 px-4 text-right font-bold text-sm text-zinc-900">₹ {parseFloat(exp.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="py-4 px-6 text-right print:hidden">
                      <button onClick={() => handleDelete(exp.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100" title="Delete Expense Record">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}

              {/* TOTAL FOOTER */}
              <tr className="font-semibold text-zinc-900 border-t-2 border-zinc-200 bg-zinc-50/80">
                <td colSpan="4" className="py-4 px-4 text-right text-xs uppercase tracking-wider font-bold">MONTHLY TOTAL:</td>
                <td className="py-4 px-4 text-right text-sm font-bold text-[#B45309]">₹ {totalMonthExpense.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td className="print:hidden"></td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}