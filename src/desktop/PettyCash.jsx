import React, { useState, useEffect } from 'react';
import { getPettyCash, savePettyCash, deletePettyCash, getProjects } from '../db';

export default function PettyCash() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '', date: new Date().toISOString().split('T')[0], type: 'Expense', amount: '', description: '', loggedBy: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [txns, projs] = await Promise.all([getPettyCash(), getProjects()]);
      setTransactions(txns || []);
      setProjects((projs || []).filter(p => p.status !== 'Completed'));
    } catch (e) {
      console.warn("Ensure petty cash functions exist in db.js");
      setTransactions([]);
      setProjects([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const selectedProj = projects.find(p => String(p.id) === String(formData.projectId));
    await savePettyCash({ 
      ...formData, 
      projectName: selectedProj ? selectedProj.name : 'Office / General',
      amount: parseFloat(formData.amount) || 0 
    });
    setIsModalOpen(false);
    setFormData({ projectId: '', date: new Date().toISOString().split('T')[0], type: 'Expense', amount: '', description: '', loggedBy: '' });
    await loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this transaction?")) {
      await deletePettyCash(id);
      await loadData();
    }
  };

  const filteredTxns = transactions.filter(t => {
    if (activeTab !== 'All' && t.type !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (t.projectName || '').toLowerCase().includes(q) || 
             (t.description || '').toLowerCase().includes(q) || 
             (t.loggedBy || '').toLowerCase().includes(q);
    }
    return true;
  });

  const totalAdvances = transactions.filter(t => t.type === 'Advance').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalExpenses = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const walletBalance = totalAdvances - totalExpenses;

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Site Petty Cash</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Track supervisor wallets and daily loose cash site expenses.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => { setFormData(prev => ({...prev, type: 'Advance'})); setIsModalOpen(true); }} 
            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Send Advance
          </button>
          <button 
            onClick={() => { setFormData(prev => ({...prev, type: 'Expense'})); setIsModalOpen(true); }} 
            className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Log Expense
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0">
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Total Funded (Advances)</span>
          <p className="text-xl font-bold text-emerald-700">₹ {totalAdvances.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white border border-red-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Total Spent (Expenses)</span>
          <p className="text-xl font-bold text-red-500">₹ {totalExpenses.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-white border border-amber-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest block mb-1">Current Wallet Balance</span>
          <p className="text-xl font-bold text-[#B45309]">₹ {walletBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200">
          {['All', 'Advance', 'Expense'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3.5 shadow-sm w-full md:max-w-sm">
          <span className="text-sm text-zinc-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search site, supervisor, description..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="bg-transparent border-none text-sm font-medium text-zinc-800 outline-none px-2 w-full placeholder:text-zinc-400" 
          />
        </div>
      </div>

      {/* TRANSACTION TABLE */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200 sticky top-0 bg-zinc-50 z-10">
                <th className="py-4 px-6 font-semibold w-28">Date</th>
                <th className="py-4 px-4 font-semibold w-48">Project Site</th>
                <th className="py-4 px-4 font-semibold">Description</th>
                <th className="py-4 px-4 font-semibold w-32">Logged By</th>
                <th className="py-4 px-4 font-semibold text-right w-36">Amount</th>
                <th className="py-4 px-6 font-semibold text-right w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-sm">Loading wallet...</td></tr>
              ) : filteredTxns.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-sm">No petty cash transactions found.</td></tr>
              ) : (
                filteredTxns.map(t => (
                  <tr key={t.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="py-4 px-6 font-medium text-zinc-500 text-xs">{t.date}</td>
                    <td className="py-4 px-4 font-semibold text-zinc-900">{t.projectName || 'Office / General'}</td>
                    <td className="py-4 px-4 text-sm font-medium text-zinc-700">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mr-2 border ${
                        t.type === 'Advance' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {t.type}
                      </span>
                      {t.description}
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-zinc-600">{t.loggedBy || '-'}</td>
                    <td className={`py-4 px-4 text-right font-bold text-sm ${t.type === 'Advance' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {t.type === 'Expense' ? '-' : '+'} ₹{parseFloat(t.amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => handleDelete(t.id)} 
                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Delete Transaction"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Log {formData.type}</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Petty Cash Register</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="pettyForm" onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                    <input type="number" step="any" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className={inputClass} placeholder="0.00" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Project Site</label>
                  <select 
                    value={formData.projectId} 
                    onChange={e => setFormData({...formData, projectId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="">Office / General</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Description <span className="text-red-500">*</span></label>
                  <input type="text" required placeholder="e.g. Tea/Snacks, Hardware..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Logged By / Supervisor Name</label>
                  <input type="text" value={formData.loggedBy} onChange={e => setFormData({...formData, loggedBy: e.target.value})} className={inputClass} placeholder="Supervisor name..." />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="pettyForm" className={`px-6 py-2.5 text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer ${formData.type === 'Advance' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#B45309] hover:bg-[#92400E]'}`}>
                Save {formData.type}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}