import React, { useState, useEffect } from 'react';
import { getProjects, getIncomeRecords, saveIncomeRecord, deleteIncomeRecord } from './db';

export default function Income() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [income, setIncome] = useState([]);
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [newEntry, setNewEntry] = useState({
    date: currentDate.toISOString().split('T')[0],
    projectId: '',
    amount: '',
    paymentMode: 'NEFT/RTGS',
    referenceNo: '',
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    const [projData, incData] = await Promise.all([getProjects(), getIncomeRecords()]);
    setProjects(projData);
    setIncome(incData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Calculations ---
  // Filter income for the selected month
  const monthlyIncome = income.filter(i => {
    if (!i.date) return false;
    const d = new Date(i.date);
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  });

  const totalMonthIncome = monthlyIncome.reduce((sum, i) => sum + i.amount, 0);

  // Calculate global pending receivables (All time)
  const totalActiveBudget = projects.filter(p => p.status !== 'Completed').reduce((sum, p) => sum + p.budget, 0);
  const totalReceivedAllTime = income.reduce((sum, i) => sum + i.amount, 0);
  const globalPending = totalActiveBudget - totalReceivedAllTime;

  const handleAddIncome = async () => {
    if (!newEntry.date || !newEntry.projectId || !newEntry.amount) {
      alert("Date, Project, and Amount are required.");
      return;
    }

    try {
      await saveIncomeRecord({
        ...newEntry,
        amount: parseFloat(newEntry.amount)
      });
      await loadData();
      setNewEntry({
        ...newEntry,
        amount: '',
        referenceNo: '',
        notes: ''
      });
    } catch (err) {
      alert("Failed to save income record.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this income record?")) {
      await deleteIncomeRecord(id);
      await loadData();
    }
  };

  const inputClass = "w-full px-1.5 py-2 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:outline-none text-zinc-800 text-[11px] font-medium transition-all placeholder:text-zinc-400";

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Client Income & Receivables</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Track PO amounts, milestone payments, and remaining project balances.</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-2xl border border-white/60 shadow-sm">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Total Active PO Budgets</span>
          <p className="text-xl font-bold text-zinc-800">₹ {totalActiveBudget.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-emerald-50/50 backdrop-blur-xl p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest block mb-1">Received (This Month)</span>
          <p className="text-xl font-bold text-emerald-700">₹ {totalMonthIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-zinc-800 text-white p-5 rounded-2xl shadow-md">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Global Pending Receivables</span>
          <p className="text-xl font-bold">₹ {Math.max(0, globalPending).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Full Width Borderless Table */}
      <div className="w-full overflow-x-auto pb-8">
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
          <thead>
            <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-200">
              <th className="py-3 px-2 font-semibold w-28">Date</th>
              <th className="py-3 px-2 font-semibold min-w-[200px]">Project Name</th>
              <th className="py-3 px-2 font-semibold w-32">Payment Mode</th>
              <th className="py-3 px-2 font-semibold w-32">Ref / UTR No</th>
              <th className="py-3 px-2 font-semibold min-w-[150px]">Notes</th>
              <th className="py-3 px-2 font-semibold text-right w-32">Amount Received</th>
              <th className="py-3 px-2 font-semibold text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm text-zinc-700">
            
            {/* INLINE ENTRY ROW */}
            <tr className="border-b border-zinc-200/60 bg-white/20">
              <td className="py-1 px-1"><input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className={inputClass} /></td>
              <td className="py-1 px-1">
                <select value={newEntry.projectId} onChange={e => setNewEntry({...newEntry, projectId: e.target.value})} className={`${inputClass} cursor-pointer appearance-none font-semibold text-zinc-800`}>
                  <option value="" disabled>Select Project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>)}
                </select>
              </td>
              <td className="py-1 px-1">
                <select value={newEntry.paymentMode} onChange={e => setNewEntry({...newEntry, paymentMode: e.target.value})} className={`${inputClass} cursor-pointer appearance-none`}>
                  <option value="NEFT/RTGS">NEFT / RTGS</option>
                  <option value="IMPS/UPI">IMPS / UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </td>
              <td className="py-1 px-1"><input type="text" placeholder="Transaction ID" value={newEntry.referenceNo} onChange={e => setNewEntry({...newEntry, referenceNo: e.target.value})} className={`${inputClass} font-mono text-[10px]`} /></td>
              <td className="py-1 px-1"><input type="text" placeholder="Milestone / Notes" value={newEntry.notes} onChange={e => setNewEntry({...newEntry, notes: e.target.value})} className={inputClass} /></td>
              <td className="py-1 px-1"><input type="number" step="any" placeholder="₹ 0.00" value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} className={`${inputClass} text-right font-bold text-emerald-600`} /></td>
              <td className="py-1 px-1 text-center">
                <button onClick={handleAddIncome} className="w-full bg-zinc-800 hover:bg-zinc-900 text-white py-2 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all shadow-sm">Add</button>
              </td>
            </tr>

            {/* SAVED RECORDS */}
            {loading ? (
              <tr><td colSpan="7" className="py-12 text-center text-zinc-500 font-medium">Loading income records...</td></tr>
            ) : monthlyIncome.length === 0 ? (
              <tr><td colSpan="7" className="py-12 text-center text-zinc-400 font-medium">No income recorded for this month. Type above to add one.</td></tr>
            ) : (
              monthlyIncome.map(inc => (
                <tr key={inc.id} className="border-b border-zinc-200/40 hover:bg-white/40 transition-colors group">
                  <td className="py-3.5 px-2 font-medium text-zinc-600">{inc.date}</td>
                  <td className="py-3.5 px-2">
                    <p className="font-semibold text-zinc-800">{inc.projectName}</p>
                    <p className="text-[9px] text-zinc-500">{inc.clientName}</p>
                  </td>
                  <td className="py-3.5 px-2 text-zinc-600 font-medium text-xs">{inc.paymentMode}</td>
                  <td className="py-3.5 px-2 text-zinc-500 font-mono text-[10px]">{inc.referenceNo || '-'}</td>
                  <td className="py-3.5 px-2 text-zinc-500 text-xs truncate max-w-[200px]">{inc.notes || '-'}</td>
                  <td className="py-3.5 px-2 text-right font-bold text-emerald-600">₹ {inc.amount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className="py-3.5 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDelete(inc.id)} className="text-red-400 hover:text-red-600 font-semibold text-[10px] uppercase tracking-wider">Del</button>
                  </td>
                </tr>
              ))
            )}

            {/* Monthly Total Footer */}
            <tr className="font-bold text-zinc-800 border-t border-zinc-300">
              <td colSpan="5" className="py-4 text-right">MONTHLY TOTAL:</td>
              <td className="py-4 text-right text-emerald-700">₹ {totalMonthIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              <td></td>
            </tr>

          </tbody>
        </table>
      </div>

    </div>
  );
}