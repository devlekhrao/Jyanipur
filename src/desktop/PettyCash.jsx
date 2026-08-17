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
    await savePettyCash({ ...formData, amount: parseFloat(formData.amount) });
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
      return t.projectName.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.loggedBy.toLowerCase().includes(q);
    }
    return true;
  });

  const totalAdvances = transactions.filter(t => t.type === 'Advance').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const walletBalance = totalAdvances - totalExpenses;

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Site Petty Cash</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Track supervisor wallets and daily loose cash expenses.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setFormData(prev => ({...prev, type: 'Advance'})); setIsModalOpen(true); }} className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer">+ Send Advance</button>
          <button onClick={() => { setFormData(prev => ({...prev, type: 'Expense'})); setIsModalOpen(true); }} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer">+ Log Expense</button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0">
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Total Funded (Advances)</span>
          <p className="text-2xl font-semibold text-[11px] text-zinc-900">₹ {totalAdvances.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest block mb-1">Total Spent (Expenses)</span>
          <p className="text-2xl font-semibold text-[11px] text-zinc-900">₹ {totalExpenses.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-zinc-900 p-6 rounded-[2rem] shadow-lg text-white">
          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest block mb-1">Current Wallet Balance</span>
          <p className="text-2xl font-semibold text-[11px]">₹ {walletBalance.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 shrink-0">
        <div className="flex bg-zinc-100 p-1.5 rounded-2xl w-fit">
          {['All', 'Advance', 'Expense'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-2xl px-3.5 shadow-sm w-full md:max-w-sm">
          <span className="text-xs text-zinc-400">🔍</span>
          <input type="text" placeholder="Search site or description..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none text-xs font-medium text-zinc-800 outline-none px-3 w-full placeholder:text-zinc-400" />
        </div>
      </div>

      {/* TRANSACTION TABLE */}
      <div className="bg-white border border-zinc-200 rounded-[2rem] shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-100 bg-zinc-50/50 sticky top-0 bg-zinc-50 z-10">
                <th className="py-3.5 px-6 font-bold w-28">Date</th>
                <th className="py-3.5 px-4 font-bold w-48">Project Site</th>
                <th className="py-3.5 px-4 font-bold">Description</th>
                <th className="py-3.5 px-4 font-bold w-32">Logged By</th>
                <th className="py-3.5 px-4 font-bold text-right w-32">Amount</th>
                <th className="py-3.5 px-6 font-bold text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs text-zinc-800 divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium">Loading wallet...</td></tr>
              ) : filteredTxns.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium">No transactions found.</td></tr>
              ) : (
                filteredTxns.map(t => (
                  <tr key={t.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="py-4 px-6 font-medium text-zinc-500 text-xs">{t.date}</td>
                    <td className="py-4 px-4 font-bold text-zinc-900 text-xs">{t.projectName || 'Office / General'}</td>
                    <td className="py-4 px-4 text-xs font-medium text-zinc-700">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider mr-2 ${t.type === 'Advance' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{t.type}</span>
                      {t.description}
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-zinc-600">{t.loggedBy || '-'}</td>
                    <td className={`py-4 px-4 text-right font-semibold text-[11px] ${t.type === 'Advance' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                      {t.type === 'Expense' ? '-' : '+'} ₹{t.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button onClick={() => handleDelete(t.id)} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">Del</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">Log {formData.type}</h2>
            <p className="text-zinc-500 text-[10px] font-bold mb-6 uppercase tracking-widest">Petty Cash Register</p>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Date *</label><input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Amount (₹) *</label><input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className={inputClass} placeholder="0.00" /></div>
              </div>
              <div>
                <label className={labelClass}>Project Site</label>
                <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className={`${inputClass} cursor-pointer`}>
                  <option value="">Office / General</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Description *</label><input type="text" required placeholder="e.g. Tea/Snacks, Hardware..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} /></div>
              <div><label className={labelClass}>Logged By / Supervisor Name</label><input type="text" value={formData.loggedBy} onChange={e => setFormData({...formData, loggedBy: e.target.value})} className={inputClass} placeholder="Supervisor name..." /></div>
              <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer">Cancel</button>
                <button type="submit" className={`flex-1 py-3.5 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer ${formData.type === 'Advance' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-[#1E3A8A] hover:bg-blue-900'}`}>Save {formData.type}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}