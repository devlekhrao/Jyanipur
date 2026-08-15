import React, { useState, useEffect } from 'react';
import { getPettyCash, savePettyCash, deletePettyCash, getProjects } from '../db';

export default function MobilePettyCash() {
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
    if (!formData.amount || !formData.description) {
      alert("Amount and description are required.");
      return;
    }
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
      return (t.projectName && t.projectName.toLowerCase().includes(q)) || 
             (t.description && t.description.toLowerCase().includes(q)) || 
             (t.loggedBy && t.loggedBy.toLowerCase().includes(q));
    }
    return true;
  });

  const totalAdvances = transactions.filter(t => t.type === 'Advance').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const walletBalance = totalAdvances - totalExpenses;

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Site Petty Cash</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Supervisor Wallet Logs</p>
          </div>
          
          <div className="flex gap-1.5">
            <button 
              onClick={() => { setFormData(prev => ({...prev, type: 'Advance'})); setIsModalOpen(true); }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-sm active:scale-95"
            >
              + Advance
            </button>
            <button 
              onClick={() => { setFormData(prev => ({...prev, type: 'Expense'})); setIsModalOpen(true); }}
              className="bg-[#1E3A8A] text-white font-black px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-md active:scale-95"
            >
              + Expense
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white border border-zinc-200 rounded-2xl px-3 py-2 shadow-sm flex items-center mb-2">
          <span className="text-xs text-zinc-400 mr-2">🔍</span>
          <input 
            type="text" 
            placeholder="Search site, item, or supervisor..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
          />
        </div>

        {/* SEGMENTED TAB CONTROL */}
        <div className="flex bg-zinc-200/80 p-1 rounded-2xl gap-1">
          {['All', 'Advance', 'Expense'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all ${
                activeTab === tab ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* KPI WALLET CARDS */}
      <div className="space-y-2 mb-3 shrink-0">
        <div className="bg-zinc-900 text-white p-4 rounded-2xl shadow-md flex justify-between items-center">
          <div>
            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block">Wallet Balance</span>
            <p className="text-xl font-black mt-0.5">₹ {walletBalance.toLocaleString('en-IN')}</p>
          </div>
          <span className="text-2xl">👛</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 shadow-sm">
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">Total Advances</span>
            <p className="text-base font-black text-emerald-700 mt-0.5">₹ {totalAdvances.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest block">Total Spent</span>
            <p className="text-base font-black text-zinc-900 mt-0.5">₹ {totalExpenses.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* TRANSACTION STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading petty cash logs...</div>
        ) : filteredTxns.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">💸</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No petty cash records found</p>
          </div>
        ) : (
          filteredTxns.map(t => (
            <div key={t.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-2 active:scale-[0.99] transition-transform">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                    t.type === 'Advance' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {t.type}
                  </span>
                  <h4 className="font-extrabold text-zinc-900 text-sm mt-1">{t.description}</h4>
                  <p className="text-[10px] font-bold text-[#1E3A8A] uppercase tracking-wider">{t.projectName || 'Office / General'}</p>
                </div>

                <div className="text-right">
                  <p className={`text-base font-black ${t.type === 'Advance' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                    {t.type === 'Expense' ? '-' : '+'} ₹{t.amount.toLocaleString('en-IN')}
                  </p>
                  <button 
                    onClick={() => handleDelete(t.id)}
                    className="text-zinc-300 hover:text-red-500 text-xs font-bold mt-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-[10px]">
                <span className="text-zinc-400 font-bold">Logged by: {t.loggedBy || 'Supervisor'}</span>
                <span className="text-zinc-400 font-semibold">{t.date}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MOBILE LOG MODAL / SHEET */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">Log {formData.type}</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Site Petty Cash Register</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <form id="pettyCashForm" onSubmit={handleSave} className="space-y-4 pb-20">
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                    <input 
                      type="number" 
                      step="any" 
                      inputMode="decimal"
                      required 
                      placeholder="0.00" 
                      value={formData.amount} 
                      onChange={e => setFormData({...formData, amount: e.target.value})} 
                      className={`${inputClass} font-black text-base`} 
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Project Site</label>
                  <div className="relative">
                    <select 
                      value={formData.projectId} 
                      onChange={e => setFormData({...formData, projectId: e.target.value})} 
                      className={`${inputClass} appearance-none font-bold`}
                    >
                      <option value="">Office / General</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Description / Purpose <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Tea/Snacks, Hardware items, Fuel..." 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className={inputClass} 
                  />
                </div>

                <div>
                  <label className={labelClass}>Logged By / Supervisor Name</label>
                  <input 
                    type="text" 
                    placeholder="Supervisor name..." 
                    value={formData.loggedBy} 
                    onChange={e => setFormData({...formData, loggedBy: e.target.value})} 
                    className={inputClass} 
                  />
                </div>

              </form>
            </div>

            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button 
                type="submit" 
                form="pettyCashForm"
                className={`w-full py-4 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform ${
                  formData.type === 'Advance' ? 'bg-emerald-600' : 'bg-[#1E3A8A]'
                }`}
              >
                Save {formData.type}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}