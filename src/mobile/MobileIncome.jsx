import React, { useState, useEffect } from 'react';
import { getProjects, getIncomeRecords, saveIncomeRecord, deleteIncomeRecord } from '.../db';

export default function MobileIncome() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [income, setIncome] = useState([]);
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      console.warn("Ensure income functions exist in db.js");
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

  const totalMonthIncome = monthlyIncome.reduce((sum, i) => sum + i.amount, 0);
  const totalActiveBudget = projects.filter(p => p.status !== 'Completed').reduce((sum, p) => sum + p.budget, 0);
  const totalReceivedAllTime = income.reduce((sum, i) => sum + i.amount, 0);
  const globalPending = totalActiveBudget - totalReceivedAllTime;

  const handleAddIncome = async (e) => {
    e.preventDefault();
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
        date: currentDate.toISOString().split('T')[0],
        projectId: '',
        amount: '',
        paymentMode: 'NEFT/RTGS',
        referenceNo: '',
        notes: ''
      });
      setIsModalOpen(false);
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

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Client Income</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Milestone Collections</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-black px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            + Add Receipt
          </button>
        </div>

        {/* MONTH / YEAR SELECTOR */}
        <div className="bg-white p-2.5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Period:</span>
          <div className="flex gap-2">
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-zinc-100 font-extrabold text-xs text-zinc-800 py-1.5 px-3 rounded-xl outline-none"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-zinc-100 font-extrabold text-xs text-zinc-800 py-1.5 px-3 rounded-xl outline-none"
            >
              <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
              <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
              <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
        <div className="bg-emerald-500 text-white p-3.5 rounded-2xl shadow-sm">
          <span className="text-[8px] font-black uppercase tracking-widest block text-emerald-100">Received (Month)</span>
          <p className="text-lg font-black mt-0.5">₹ {totalMonthIncome.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-zinc-900 text-white p-3.5 rounded-2xl shadow-sm">
          <span className="text-[8px] font-black uppercase tracking-widest block text-amber-400">Global Pending</span>
          <p className="text-lg font-black mt-0.5">₹ {Math.max(0, globalPending).toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* INCOME RECORD STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading income entries...</div>
        ) : monthlyIncome.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">💰</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No collections logged for this month</p>
          </div>
        ) : (
          monthlyIncome.map(inc => (
            <div key={inc.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-2 active:scale-[0.99] transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-zinc-900 text-sm">{inc.projectName}</h4>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{inc.clientName || 'Client Receipt'}</p>
                </div>
                <p className="text-base font-black text-emerald-600">₹ {inc.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    {inc.paymentMode}
                  </span>
                  {inc.referenceNo && (
                    <span className="text-[9px] font-mono text-zinc-400">Ref: {inc.referenceNo}</span>
                  )}
                </div>
                
                <button 
                  onClick={() => handleDelete(inc.id)} 
                  className="text-zinc-300 hover:text-red-500 p-1 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {inc.notes && (
                <p className="text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                  {inc.notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* ADD INCOME MODAL / SHEET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">Record Client Payment</h2>
                <p className="text-zinc-500 text-[9px] font-bold mt-0.5 uppercase tracking-widest">Milestones & Advances</p>
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
              <form id="incomeForm" onSubmit={handleAddIncome} className="space-y-4 pb-20">
                
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className={inputClass} required />
                </div>

                <div>
                  <label className={labelClass}>Project / Client <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={newEntry.projectId} onChange={e => setNewEntry({...newEntry, projectId: e.target.value})} className={`${inputClass} appearance-none font-bold`} required>
                      <option value="" disabled>Select Project...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Payment Mode</label>
                  <div className="relative">
                    <select value={newEntry.paymentMode} onChange={e => setNewEntry({...newEntry, paymentMode: e.target.value})} className={`${inputClass} appearance-none`}>
                      <option value="NEFT/RTGS">NEFT / RTGS</option>
                      <option value="IMPS/UPI">IMPS / UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Amount Received (₹) <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    step="any" 
                    inputMode="decimal"
                    placeholder="0.00" 
                    value={newEntry.amount} 
                    onChange={e => setNewEntry({...newEntry, amount: e.target.value})} 
                    className={`${inputClass} font-black text-emerald-600 text-base`} 
                    required 
                  />
                </div>

                <div>
                  <label className={labelClass}>Ref / UTR Number</label>
                  <input 
                    type="text" 
                    placeholder="Bank Reference ID" 
                    value={newEntry.referenceNo} 
                    onChange={e => setNewEntry({...newEntry, referenceNo: e.target.value})} 
                    className={inputClass} 
                  />
                </div>

                <div>
                  <label className={labelClass}>Milestone Notes</label>
                  <textarea 
                    placeholder="e.g. 2nd Mobilization Advance..." 
                    value={newEntry.notes} 
                    onChange={e => setNewEntry({...newEntry, notes: e.target.value})} 
                    className={`${inputClass} min-h-[80px] resize-none`} 
                  />
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button 
                type="submit" 
                form="incomeForm"
                className="w-full py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform"
              >
                Save Collection
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}