import React, { useState, useEffect } from 'react';
import { getProjects, getIncomeRecords, saveIncomeRecord, deleteIncomeRecord } from '../db';

export default function Income() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
    try {
      const [projData, incData] = await Promise.all([getProjects(), getIncomeRecords()]);
      setProjects(projData || []);
      setIncome(incData || []);
    } catch (e) {
      console.error("Error fetching income records from cloud DB:", e);
      setProjects([]);
      setIncome([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Calculations ---
  const monthlyIncome = income.filter(i => {
    if (!i.date) return false;
    const d = new Date(i.date);
    return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
  });

  const totalMonthIncome = monthlyIncome.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  const totalActiveBudget = projects.filter(p => p.status !== 'Completed').reduce((sum, p) => sum + (parseFloat(p.budget) || 0), 0);
  const totalReceivedAllTime = income.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const globalPending = totalActiveBudget - totalReceivedAllTime;

  const handleAddIncome = async () => {
    if (!newEntry.date || !newEntry.projectId || !newEntry.amount) {
      alert("Date, Project, and Amount are required.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(newEntry.projectId));
      await saveIncomeRecord({
        ...newEntry,
        projectId: newEntry.projectId ? (Number(newEntry.projectId) || newEntry.projectId) : '',
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'General Project',
        clientName: selectedProj ? selectedProj.clientName : '',
        amount: parseFloat(newEntry.amount) || 0
      });
      await loadData();
      setNewEntry({
        ...newEntry,
        amount: '',
        referenceNo: '',
        notes: ''
      });
    } catch (err) {
      alert("Failed to save income record. Please check database connection.");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this income record?")) {
      setLoading(true);
      await deleteIncomeRecord(id);
      await loadData();
    }
  };

  const inputClass = "w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Client Income & Receivables</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Track PO amounts, milestone payments, and remaining project balances.</p>
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

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Active PO Budgets</span>
          <p className="text-xl font-bold text-zinc-900">₹ {totalActiveBudget.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Received (This Month)</span>
          <p className="text-xl font-bold text-emerald-700">₹ {totalMonthIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest block mb-1">Global Pending Receivables</span>
          <p className="text-xl font-bold text-[#B45309]">₹ {Math.max(0, globalPending).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
            <thead>
              <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200 sticky top-0 bg-zinc-50 z-10">
                <th className="py-3.5 px-4 font-semibold w-32">Date</th>
                <th className="py-3.5 px-4 font-semibold min-w-[220px]">Project Name</th>
                <th className="py-3.5 px-4 font-semibold w-36">Payment Mode</th>
                <th className="py-3.5 px-4 font-semibold w-36">Ref / UTR No</th>
                <th className="py-3.5 px-4 font-semibold min-w-[150px]">Notes</th>
                <th className="py-3.5 px-4 font-semibold text-right w-36">Amount Received</th>
                <th className="py-3.5 px-6 font-semibold text-right w-20">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm text-zinc-800 divide-y divide-zinc-100">
              
              {/* INLINE ENTRY ROW */}
              <tr className="bg-amber-50/30 border-b border-amber-100">
                <td className="py-3 px-3"><input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className={inputClass} /></td>
                <td className="py-3 px-3">
                  <select 
                    value={newEntry.projectId} 
                    onChange={e => setNewEntry({...newEntry, projectId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.8rem_center] bg-[length:1rem_1rem] pr-8 font-semibold text-zinc-900`}
                  >
                    <option value="" disabled>Select Project...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName} ({p.clientName || 'Client'})</option>)}
                  </select>
                </td>
                <td className="py-3 px-3">
                  <select 
                    value={newEntry.paymentMode} 
                    onChange={e => setNewEntry({...newEntry, paymentMode: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.8rem_center] bg-[length:1rem_1rem] pr-8`}
                  >
                    <option value="NEFT/RTGS">NEFT / RTGS</option>
                    <option value="IMPS/UPI">IMPS / UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </td>
                <td className="py-3 px-3"><input type="text" placeholder="Transaction ID" value={newEntry.referenceNo} onChange={e => setNewEntry({...newEntry, referenceNo: e.target.value})} className={`${inputClass} font-mono text-xs`} /></td>
                <td className="py-3 px-3"><input type="text" placeholder="Milestone / Notes" value={newEntry.notes} onChange={e => setNewEntry({...newEntry, notes: e.target.value})} className={inputClass} /></td>
                <td className="py-3 px-3"><input type="number" step="any" placeholder="₹ 0.00" value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} className={`${inputClass} text-right font-bold text-emerald-600`} /></td>
                <td className="py-3 px-6 text-right">
                  <button onClick={handleAddIncome} disabled={submitting} className="px-4 py-2 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl font-semibold text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1 ml-auto disabled:opacity-50">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    {submitting ? 'Adding...' : 'Add'}
                  </button>
                </td>
              </tr>

              {/* SAVED RECORDS */}
              {loading ? (
                <tr><td colSpan="7" className="py-12 text-center text-zinc-400 font-medium text-sm">Syncing income records from cloud DB...</td></tr>
              ) : monthlyIncome.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-zinc-400 font-medium text-sm">No income recorded for this month. Use the top row above to add one.</td></tr>
              ) : (
                monthlyIncome.map(inc => (
                  <tr key={inc.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="py-4 px-4 text-xs font-medium text-zinc-500">{inc.date}</td>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-zinc-900">{inc.projectName}</p>
                      {inc.clientName && <p className="text-[10px] font-semibold text-[#B45309] uppercase mt-0.5">{inc.clientName}</p>}
                    </td>
                    <td className="py-4 px-4 text-xs text-zinc-600 font-medium">{inc.paymentMode}</td>
                    <td className="py-4 px-4 text-zinc-500 font-mono text-xs">{inc.referenceNo || '-'}</td>
                    <td className="py-4 px-4 text-xs text-zinc-500 truncate max-w-[200px]">{inc.notes || '-'}</td>
                    <td className="py-4 px-4 text-right font-bold text-sm text-emerald-600">₹ {parseFloat(inc.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    <td className="py-4 px-6 text-right">
                      <button onClick={() => handleDelete(inc.id)} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100" title="Delete Income Record">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}

              {/* MONTHLY TOTAL FOOTER */}
              <tr className="font-semibold text-zinc-900 border-t-2 border-zinc-200 bg-zinc-50/80">
                <td colSpan="5" className="py-4 px-4 text-right text-xs uppercase tracking-wider font-bold">MONTHLY TOTAL:</td>
                <td className="py-4 px-4 text-right text-sm font-bold text-emerald-600">₹ {totalMonthIncome.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td></td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}