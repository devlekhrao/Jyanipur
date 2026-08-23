import React, { useState, useEffect } from 'react';
import { 
  getSubcontractors, 
  saveSubcontractor, 
  getSubcontractorWorkOrders as getWorkOrders, 
  saveSubcontractorWorkOrder as saveWorkOrder, 
  updateSubcontractorWorkOrderStatus as updateWorkOrderStatus, 
  saveSubWoPayment as saveWoPayment, 
  getProjects 
} from '../db';

export default function Subcontractors() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('DIRECTORY'); 
  // Tabs: DIRECTORY, LEDGERS, RECONCILIATION, HEADCOUNT, RATES, PERFORMANCE
  
  // Database States
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Module Local States (Simulating DB tables for the new features)
  const [debitNotes, setDebitNotes] = useState([]);
  const [labourLogs, setLabourLogs] = useState([]);
  const [rateCards, setRateCards] = useState([]);
  const [mockSnags, setMockSnags] = useState([]); // Used for Performance Scoring

  // Ledger/View States
  const [expandedRows, setExpandedRows] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState('');

  // Modals
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isWoModalOpen, setIsWoModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Forms
  const [subForm, setSubForm] = useState({ name: '', trade: 'Painter', phone: '' });
  const [woForm, setWoForm] = useState({ subcontractorId: '', projectId: '', scope: '', contractValue: '' });
  const [payForm, setPayForm] = useState({ workOrderId: '', date: new Date().toISOString().split('T')[0], amount: '', mode: 'UPI', referenceNo: '', notes: '' });
  
  // New Forms
  const [dnForm, setDnForm] = useState({ date: new Date().toISOString().split('T')[0], projectId: '', item: '', qty: '', rate: '', reason: 'Material Issued to Agency' });
  const [labourForm, setLabourForm] = useState({ date: new Date().toISOString().split('T')[0], projectId: '', skilled: '', unskilled: '', notes: '' });
  const [rateForm, setRateForm] = useState({ item: '', uom: 'SqFt', rate: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedProj, fetchedSubs, fetchedWos] = await Promise.all([
        getProjects(), getSubcontractors(), getWorkOrders()
      ]);
      setProjects((fetchedProj || []).filter(p => p.status !== 'Completed'));
      setSubcontractors(fetchedSubs || []);
      setWorkOrders(fetchedWos || []);

      // Generate some mock snags for the Performance tab based on active projects
      if (fetchedSubs && fetchedSubs.length > 0) {
        setMockSnags([
          { id: 1, subId: fetchedSubs[0].id, status: 'Resolved' },
          { id: 2, subId: fetchedSubs[0].id, status: 'Pending' },
          { id: 3, subId: fetchedSubs[fetchedSubs.length - 1]?.id, status: 'Pending' }
        ]);
      }
    } catch (e) {
      console.error("Error loading subcontractor ledgers:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // --- CORE SUBMITS ---
  const handleSaveSub = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await saveSubcontractor(subForm);
      setIsSubModalOpen(false);
      setSubForm({ name: '', trade: 'Painter', phone: '' });
      await loadData();
    } catch (err) { alert("Failed to save subcontractor agency."); }
    setSubmitting(false);
  };

  const handleSaveWo = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await saveWorkOrder({ 
        ...woForm, 
        subcontractorId: Number(woForm.subcontractorId) || woForm.subcontractorId,
        projectId: Number(woForm.projectId) || woForm.projectId,
        contractValue: parseFloat(woForm.contractValue) || 0 
      });
      setIsWoModalOpen(false);
      setWoForm({ subcontractorId: '', projectId: '', scope: '', contractValue: '' });
      await loadData();
    } catch (err) { alert("Failed to assign work order contract."); }
    setSubmitting(false);
  };

  const handleSavePay = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await saveWoPayment({ 
        ...payForm, 
        workOrderId: Number(payForm.workOrderId) || payForm.workOrderId,
        amount: parseFloat(payForm.amount) || 0 
      });
      setIsPayModalOpen(false);
      setPayForm({ workOrderId: '', date: new Date().toISOString().split('T')[0], amount: '', mode: 'UPI', referenceNo: '', notes: '' });
      await loadData();
    } catch (err) { alert("Failed to record subcontractor payment."); }
    setSubmitting(false);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateWorkOrderStatus(id, status);
      await loadData();
    } catch (err) { console.error("Failed to update work order status:", err); }
  };

  // --- NEW MODULE SUBMITS ---
  const handleSaveDN = (e) => {
    e.preventDefault();
    if (!selectedSubId || !dnForm.projectId) return alert("Select Subcontractor and Project");
    setDebitNotes([...debitNotes, { ...dnForm, id: Date.now(), subId: selectedSubId, deducted: false }]);
    setDnForm({ ...dnForm, item: '', qty: '', rate: '' });
  };

  const handleSaveLabour = (e) => {
    e.preventDefault();
    if (!selectedSubId || !labourForm.projectId) return alert("Select Subcontractor and Project");
    setLabourLogs([{ ...labourForm, id: Date.now(), subId: selectedSubId }, ...labourLogs]);
    setLabourForm({ ...labourForm, skilled: '', unskilled: '', notes: '' });
  };

  const handleSaveRate = (e) => {
    e.preventDefault();
    if (!selectedSubId) return alert("Select Subcontractor");
    setRateCards([...rateCards, { ...rateForm, id: Date.now(), subId: selectedSubId }]);
    setRateForm({ ...rateForm, item: '', rate: '' });
  };

  // --- HELPERS ---
  const toggleRow = (id) => setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  const openPayModal = (woId) => { setPayForm(prev => ({ ...prev, workOrderId: woId })); setIsPayModalOpen(true); };

  const filteredWos = workOrders.filter(wo => 
    (wo.subName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (wo.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (wo.trade || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSubStats = (subId) => {
    const subWOs = workOrders.filter(w => String(w.subcontractorId) === String(subId));
    return {
      totalWOs: subWOs.length,
      totalContractValue: subWOs.reduce((sum, w) => sum + (parseFloat(w.contractValue) || 0), 0),
      totalPaid: subWOs.reduce((sum, w) => sum + (parseFloat(w.totalPaid) || 0), 0)
    };
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col bg-zinc-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Subcontractor Command Center</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Manage directories, ledgers, materials, headcount, and performance.</p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200 overflow-x-auto mb-6 shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {[
          { id: 'DIRECTORY', label: 'Agency Directory' },
          { id: 'LEDGERS', label: 'Ledgers & Work Orders' },
          { id: 'RECONCILIATION', label: 'Debit Notes (Material)' },
          { id: 'HEADCOUNT', label: 'Muster Roll' },
          { id: 'RATES', label: 'Rate Cards' },
          { id: 'PERFORMANCE', label: 'Quality & Perf.' }
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id)} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        
        {/* ========================================== */}
        {/* TAB 1: DIRECTORY */}
        {/* ========================================== */}
        {activeTab === 'DIRECTORY' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3.5 shadow-sm w-full max-w-sm">
                <span className="text-sm text-zinc-400">🔍</span>
                <input type="text" placeholder="Search subcontractors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none text-sm font-medium text-zinc-800 outline-none px-2 w-full placeholder:text-zinc-400" />
              </div>
              <button onClick={() => setIsSubModalOpen(true)} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer h-10 flex items-center gap-1.5">
                <span className="text-lg leading-none">+</span> Add Agency
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Registered Agencies</span>
                <p className="text-3xl font-black text-zinc-900">{subcontractors.length}</p>
              </div>
              <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">Active Work Orders</span>
                <p className="text-3xl font-black text-[#B45309]">{workOrders.filter(w => w.status !== 'Completed').length}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block mb-1">Total Subcontractor Payouts</span>
                <p className="text-3xl font-black text-emerald-700">₹{workOrders.reduce((sum, w) => sum + (parseFloat(w.totalPaid) || 0), 0).toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">Master Directory</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-100">
                      <th className="py-4 px-6 font-bold">Agency / Name</th>
                      <th className="py-4 px-6 font-bold">Speciality (Trade)</th>
                      <th className="py-4 px-6 font-bold">Phone</th>
                      <th className="py-4 px-6 font-bold text-center">Projects Assigned</th>
                      <th className="py-4 px-6 font-bold text-right">Lifetime Contract Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 text-sm">
                    {subcontractors.map(sub => {
                      const stats = getSubStats(sub.id);
                      return (
                        <tr key={sub.id} className="hover:bg-amber-50/30 transition-colors cursor-pointer" onClick={() => { setActiveTab('LEDGERS'); setSelectedSubId(String(sub.id)); }}>
                          <td className="py-4 px-6 font-bold text-zinc-900">{sub.name}</td>
                          <td className="py-4 px-6"><span className="bg-amber-50 text-[#B45309] text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-100">{sub.trade}</span></td>
                          <td className="py-4 px-6 text-zinc-500 font-medium">{sub.phone || '-'}</td>
                          <td className="py-4 px-6 text-center font-bold text-zinc-700">{stats.totalWOs}</td>
                          <td className="py-4 px-6 text-right font-bold text-emerald-600">₹ {stats.totalContractValue.toLocaleString('en-IN')}</td>
                        </tr>
                      )
                    })}
                    {subcontractors.length === 0 && <tr><td colSpan="5" className="py-12 text-center text-zinc-400 font-medium text-sm">No subcontractors added yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* SIDEBAR FOR TABS 2-5 (Select Agency) */}
        {/* ========================================== */}
        {['LEDGERS', 'RECONCILIATION', 'HEADCOUNT', 'RATES'].includes(activeTab) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-[600px]">
            
            {/* LEFT: SELECTOR */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
                <div className="p-4 border-b border-zinc-100 bg-zinc-900 shrink-0 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Select Agency</h3>
                </div>
                <div className="p-2 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                  {subcontractors.map(sub => (
                    <button
                      key={sub.id} onClick={() => setSelectedSubId(String(sub.id))}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all cursor-pointer flex flex-col ${selectedSubId === String(sub.id) ? 'bg-amber-50 border border-amber-200' : 'bg-transparent border border-transparent hover:bg-zinc-50'}`}
                    >
                      <span className={`text-sm font-bold ${selectedSubId === String(sub.id) ? 'text-[#B45309]' : 'text-zinc-800'}`}>{sub.name}</span>
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">{sub.trade}</span>
                    </button>
                  ))}
                  {subcontractors.length === 0 && <p className="text-xs text-center p-4 text-zinc-400">No agencies available.</p>}
                </div>
              </div>
            </div>

            {/* RIGHT: MODULE CONTENT */}
            <div className="lg:col-span-9 space-y-6">
              {!selectedSubId ? (
                <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-16 text-center">
                  <p className="text-sm text-zinc-500 font-medium">Select an agency from the left panel to open this module.</p>
                </div>
              ) : (
                <>
                  {/* --- TAB 2: LEDGERS & WORK ORDERS --- */}
                  {activeTab === 'LEDGERS' && (
                    <div>
                      <div className="flex justify-end mb-4">
                        <button onClick={() => { setWoForm(prev => ({...prev, subcontractorId: selectedSubId})); setIsWoModalOpen(true); }} className="bg-zinc-900 hover:bg-black text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
                          + Assign Work Order
                        </button>
                      </div>
                      
                      {workOrders.filter(w => String(w.subcontractorId) === selectedSubId).map(wo => {
                        const balanceToPay = (parseFloat(wo.contractValue) || 0) - (parseFloat(wo.totalPaid) || 0);
                        return (
                          <div key={wo.id} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden mb-6">
                            <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer" onClick={() => toggleRow(wo.id)}>
                              <div>
                                <span className="bg-zinc-200 text-zinc-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block">SUB-WO/00{wo.id}</span>
                                <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                                  {wo.projectName}
                                  <svg className={`w-4 h-4 text-zinc-400 transition-transform ${expandedRows.includes(wo.id) ? 'rotate-180 text-[#B45309]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                                </h3>
                                <p className="text-xs text-zinc-500 font-medium mt-1 truncate max-w-md">{wo.scope}</p>
                              </div>
                              <div className="flex gap-4 text-right">
                                <div><p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Contract Val</p><p className="text-sm font-bold text-zinc-900">₹{Number(wo.contractValue).toLocaleString('en-IN')}</p></div>
                                <div><p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Balance</p><p className="text-sm font-bold text-red-500">₹{balanceToPay.toLocaleString('en-IN')}</p></div>
                              </div>
                            </div>
                            
                            {expandedRows.includes(wo.id) && (
                              <div className="p-5 bg-zinc-50/30">
                                <div className="flex justify-between items-center border-b border-zinc-200 pb-3 mb-3">
                                  <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Payment Ledger</h4>
                                  <button onClick={() => openPayModal(wo.id)} className="px-3 py-1.5 bg-[#B45309] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm hover:bg-[#92400E]">
                                    + Log Payment
                                  </button>
                                </div>
                                {(!wo.payments || wo.payments.length === 0) ? (
                                  <p className="text-xs text-zinc-500 italic py-2">No payments logged yet.</p>
                                ) : (
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="text-[10px] text-zinc-400 uppercase tracking-wider border-b border-zinc-100"><th className="pb-2">Date</th><th className="pb-2">Mode & Ref</th><th className="pb-2">Notes</th><th className="pb-2 text-right">Amount</th></tr>
                                    </thead>
                                    <tbody className="text-xs text-zinc-800 divide-y divide-zinc-50">
                                      {wo.payments.map(pay => (
                                        <tr key={pay.id}>
                                          <td className="py-2.5 font-medium">{pay.date}</td>
                                          <td className="py-2.5"><span className="bg-zinc-100 px-2 py-0.5 rounded text-[10px] font-semibold">{pay.mode}</span> {pay.ref || pay.referenceNo}</td>
                                          <td className="py-2.5 text-zinc-500">{pay.notes || '-'}</td>
                                          <td className="py-2.5 text-right font-bold text-emerald-600">₹{Number(pay.amount).toLocaleString('en-IN')}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {workOrders.filter(w => String(w.subcontractorId) === selectedSubId).length === 0 && (
                        <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-16 text-center">
                          <p className="text-sm text-zinc-500 font-medium">No active work orders for this agency.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- TAB 3: MATERIAL RECONCILIATION --- */}
                  {activeTab === 'RECONCILIATION' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 h-fit">
                        <h3 className="text-sm font-bold text-red-600 uppercase tracking-widest mb-4">Issue Debit Note</h3>
                        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">Log materials provided to this agency. The total cost will be deducted from their RA bills automatically.</p>
                        <form onSubmit={handleSaveDN} className="space-y-4">
                          <div>
                            <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                            <select required value={dnForm.projectId} onChange={e => setDnForm({...dnForm, projectId: e.target.value})} className={inputClass}>
                              <option value="">Select Project...</option>
                              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                          <div><label className={labelClass}>Material Issued <span className="text-red-500">*</span></label><input type="text" required value={dnForm.item} onChange={e => setDnForm({...dnForm, item: e.target.value})} placeholder="e.g. 50 Bags Cement" className={inputClass} /></div>
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>Quantity <span className="text-red-500">*</span></label><input type="number" step="any" required value={dnForm.qty} onChange={e => setDnForm({...dnForm, qty: e.target.value})} className={inputClass} /></div>
                            <div><label className={labelClass}>Rate (₹) <span className="text-red-500">*</span></label><input type="number" step="any" required value={dnForm.rate} onChange={e => setDnForm({...dnForm, rate: e.target.value})} className={inputClass} /></div>
                          </div>
                          <button type="submit" className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-sm">Issue Debit Note</button>
                        </form>
                      </div>
                      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
                        <div className="p-4 border-b border-zinc-100 bg-red-50/50"><h3 className="text-xs font-bold text-red-800 uppercase tracking-widest">Active Debit Notes</h3></div>
                        <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                          {debitNotes.filter(d => String(d.subId) === selectedSubId).map(dn => (
                            <div key={dn.id} className="p-3 bg-white border border-zinc-200 rounded-xl flex justify-between items-center hover:border-red-200 transition-colors">
                              <div>
                                <p className="text-sm font-bold text-zinc-900">{dn.item}</p>
                                <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{dn.qty} units @ ₹{dn.rate} <br/><span className="text-[#B45309]">{projects.find(p=>String(p.id)===String(dn.projectId))?.name}</span></p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-red-600 mb-1">- ₹{(dn.qty * dn.rate).toLocaleString('en-IN')}</p>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${dn.deducted ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {dn.deducted ? 'Recovered' : 'Pending'}
                                </span>
                              </div>
                            </div>
                          ))}
                          {debitNotes.filter(d => String(d.subId) === selectedSubId).length === 0 && <p className="text-xs text-zinc-400 italic text-center py-10">No materials issued to this agency.</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB 4: MUSTER ROLL (HEADCOUNT) --- */}
                  {activeTab === 'HEADCOUNT' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:col-span-1 h-fit">
                        <h3 className="text-sm font-bold text-[#B45309] uppercase tracking-widest mb-4">Log Daily Labour</h3>
                        <form onSubmit={handleSaveLabour} className="space-y-4">
                          <div><label className={labelClass}>Date</label><input type="date" required value={labourForm.date} onChange={e => setLabourForm({...labourForm, date: e.target.value})} className={inputClass} /></div>
                          <div>
                            <label className={labelClass}>Project Site</label>
                            <select required value={labourForm.projectId} onChange={e => setLabourForm({...labourForm, projectId: e.target.value})} className={inputClass}>
                              <option value="">Select Project...</option>
                              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>Skilled</label><input type="number" required value={labourForm.skilled} onChange={e => setLabourForm({...labourForm, skilled: e.target.value})} className={`${inputClass} text-center font-bold`} placeholder="0" /></div>
                            <div><label className={labelClass}>Unskilled</label><input type="number" required value={labourForm.unskilled} onChange={e => setLabourForm({...labourForm, unskilled: e.target.value})} className={`${inputClass} text-center font-bold`} placeholder="0" /></div>
                          </div>
                          <button type="submit" className="w-full py-3 bg-[#B45309] hover:bg-[#92400E] text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-sm">Save Headcount</button>
                        </form>
                      </div>
                      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden md:col-span-2 h-[500px] flex flex-col">
                        <div className="p-4 border-b border-zinc-100 bg-zinc-50/80"><h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Labour Logs (Muster Roll)</h3></div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                            <thead><tr className="bg-white sticky top-0 text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-100"><th className="p-4">Date & Project</th><th className="p-4 text-center">Skilled</th><th className="p-4 text-center">Unskilled</th><th className="p-4 text-center text-[#B45309]">Total</th></tr></thead>
                            <tbody className="divide-y divide-zinc-50">
                              {labourLogs.filter(l => String(l.subId) === selectedSubId).map(log => (
                                <tr key={log.id} className="hover:bg-amber-50/30">
                                  <td className="p-4"><p className="font-bold text-zinc-800">{log.date}</p><p className="text-[10px] text-zinc-500 font-medium">{projects.find(p=>String(p.id)===String(log.projectId))?.name}</p></td>
                                  <td className="p-4 text-center font-medium text-zinc-600">{log.skilled}</td>
                                  <td className="p-4 text-center font-medium text-zinc-600">{log.unskilled}</td>
                                  <td className="p-4 text-center font-black text-[#B45309] text-base">{Number(log.skilled) + Number(log.unskilled)}</td>
                                </tr>
                              ))}
                              {labourLogs.filter(l => String(l.subId) === selectedSubId).length === 0 && <tr><td colSpan="4" className="text-center py-10 text-xs text-zinc-400 italic">No labour logged for this agency.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- TAB 5: RATE CARDS --- */}
                  {activeTab === 'RATES' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 md:col-span-1 h-fit">
                        <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-widest mb-4">Add Approved Rate</h3>
                        <form onSubmit={handleSaveRate} className="space-y-4">
                          <div><label className={labelClass}>Work Item Description <span className="text-red-500">*</span></label><textarea required rows="2" value={rateForm.item} onChange={e => setRateForm({...rateForm, item: e.target.value})} className={`${inputClass} resize-none`} placeholder="e.g. Gypsum False Ceiling"></textarea></div>
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>UOM</label><input type="text" required value={rateForm.uom} onChange={e => setRateForm({...rateForm, uom: e.target.value})} className={inputClass} placeholder="SqFt" /></div>
                            <div><label className={labelClass}>Rate (₹) <span className="text-red-500">*</span></label><input type="number" step="any" required value={rateForm.rate} onChange={e => setRateForm({...rateForm, rate: e.target.value})} className={`${inputClass} font-bold text-emerald-600`} placeholder="0.00" /></div>
                          </div>
                          <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-sm">Save to Rate Book</button>
                        </form>
                      </div>
                      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden md:col-span-2 flex flex-col h-[500px]">
                        <div className="p-4 border-b border-zinc-100 bg-emerald-50/50"><h3 className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Master Rate Card</h3></div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                            <thead><tr className="bg-white sticky top-0 text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-100"><th className="p-4">Work Item Description</th><th className="p-4 text-center">UOM</th><th className="p-4 text-right">Approved Rate</th></tr></thead>
                            <tbody className="divide-y divide-zinc-50">
                              {rateCards.filter(r => String(r.subId) === selectedSubId).map(rate => (
                                <tr key={rate.id} className="hover:bg-zinc-50 transition-colors">
                                  <td className="p-4 font-bold text-zinc-800 whitespace-normal">{rate.item}</td>
                                  <td className="p-4 text-center text-zinc-500 text-xs font-semibold">{rate.uom}</td>
                                  <td className="p-4 text-right font-black text-emerald-600 text-base">₹{Number(rate.rate).toLocaleString('en-IN')}</td>
                                </tr>
                              ))}
                              {rateCards.filter(r => String(r.subId) === selectedSubId).length === 0 && <tr><td colSpan="3" className="text-center py-10 text-xs text-zinc-400 italic">No rates negotiated yet.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 6: QUALITY & PERFORMANCE (Global View) */}
        {/* ========================================== */}
        {activeTab === 'PERFORMANCE' && (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100 bg-zinc-900 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><span>📊</span> Agency Performance & Quality Scores</h3>
              <p className="text-xs text-zinc-400 font-medium hidden md:block">Automatically scored based on resolved vs pending defects.</p>
            </div>
            <div className="p-6 bg-zinc-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subcontractors.map(sub => {
                  // Simulate aggregation of Snags assigned to this subcontractor
                  const agencySnags = mockSnags.filter(s => String(s.subId) === String(sub.id));
                  const totalSnags = agencySnags.length;
                  const resolvedSnags = agencySnags.filter(s => s.status === 'Resolved').length;
                  const resolutionRate = totalSnags === 0 ? 100 : Math.round((resolvedSnags / totalSnags) * 100);
                  const isPoor = resolutionRate < 60 && totalSnags > 0;

                  return (
                    <div key={sub.id} className={`border rounded-2xl p-5 hover:shadow-md transition-shadow bg-white ${isPoor ? 'border-red-200' : 'border-zinc-200'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-zinc-900 text-lg">{sub.name}</h4>
                          <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider">{sub.trade}</span>
                        </div>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-sm border-4 ${isPoor ? 'border-red-200 text-red-600 bg-red-50' : 'border-emerald-200 text-emerald-600 bg-emerald-50'}`}>
                          {resolutionRate}%
                        </div>
                      </div>
                      <div className="space-y-3 border-t border-zinc-100 pt-4 mt-2">
                        <div className="flex justify-between text-xs font-medium"><span className="text-zinc-500">Defects Logged (Snags)</span><strong className="text-zinc-800">{totalSnags}</strong></div>
                        <div className="flex justify-between text-xs font-medium"><span className="text-zinc-500">Defects Resolved</span><strong className="text-emerald-600">{resolvedSnags}</strong></div>
                        <div className="flex justify-between items-center text-xs font-medium mt-2 pt-2 border-t border-zinc-100">
                          <span className="text-zinc-500">System Rating</span>
                          <strong className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider ${isPoor ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{isPoor ? 'High Risk' : 'Reliable'}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- ADD SUBCONTRACTOR MODAL --- */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Add Subcontractor</h2>
              </div>
              <button onClick={() => setIsSubModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer p-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form id="subForm" onSubmit={handleSaveSub} className="p-6 space-y-4">
              <div><label className={labelClass}>Agency Name <span className="text-red-500">*</span></label><input type="text" required value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Trade Speciality</label>
                  <select value={subForm.trade} onChange={e => setSubForm({...subForm, trade: e.target.value})} className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                    <option value="Painter">Painter</option><option value="Electrician">Electrician</option><option value="Plumber">Plumber</option><option value="False Ceiling">False Ceiling</option><option value="Civil/Mason">Civil / Mason</option><option value="Carpenter">Carpenter</option><option value="Other">Other</option>
                  </select>
                </div>
                <div><label className={labelClass}>Phone</label><input type="text" value={subForm.phone} onChange={e => setSubForm({...subForm, phone: e.target.value})} className={inputClass} /></div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
                <button type="button" onClick={() => setIsSubModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 rounded-xl text-[11px] font-bold uppercase tracking-widest text-zinc-700">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD WORK ORDER MODAL --- */}
      {isWoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-900 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white tracking-tight">Assign Work Order</h2>
              <button onClick={() => setIsWoModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form id="woForm" onSubmit={handleSaveWo} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                <select required value={woForm.projectId} onChange={e => setWoForm({...woForm, projectId: e.target.value})} className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                  <option value="" disabled>Choose active project...</option>
                  {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Scope of Work</label><input type="text" placeholder="e.g. Entire Villa Putty & Paint" value={woForm.scope} onChange={e => setWoForm({...woForm, scope: e.target.value})} className={inputClass} /></div>
              <div><label className={labelClass}>Total Contract Value (₹) <span className="text-red-500">*</span></label><input type="number" step="any" required value={woForm.contractValue} onChange={e => setWoForm({...woForm, contractValue: e.target.value})} className={`${inputClass} font-bold text-[#B45309]`} /></div>
              <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsWoModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 rounded-xl text-[11px] font-bold uppercase tracking-widest text-zinc-700">Cancel</button><button type="submit" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-sm">Assign Contract</button></div>
            </form>
          </div>
        </div>
      )}

      {/* --- LOG PAYMENT MODAL --- */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-200 bg-red-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Record Sub Payment</h2>
              <button onClick={() => setIsPayModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form id="payForm" onSubmit={handleSavePay} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Payment Date</label><input type="date" required value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Amount Paid (₹) <span className="text-red-500">*</span></label><input type="number" step="any" required value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className={`${inputClass} font-bold text-red-600`} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Mode</label>
                  <select value={payForm.mode} onChange={e => setPayForm({...payForm, mode: e.target.value})} className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                    <option value="UPI">UPI</option><option value="Cash">Cash</option><option value="Bank Transfer">Bank Transfer</option><option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div><label className={labelClass}>Ref No.</label><input type="text" value={payForm.referenceNo} onChange={e => setPayForm({...payForm, referenceNo: e.target.value})} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Notes</label><input type="text" value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} className={inputClass} /></div>
              <div className="pt-4 flex justify-end gap-3"><button type="button" onClick={() => setIsPayModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 rounded-xl text-[11px] font-bold uppercase tracking-widest text-zinc-700">Cancel</button><button type="submit" disabled={submitting} className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-sm">Record Payment</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}