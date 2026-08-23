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
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isWoModalOpen, setIsWoModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Forms
  const [subForm, setSubForm] = useState({ name: '', trade: 'Painter', phone: '' });
  const [woForm, setWoForm] = useState({ subcontractorId: '', projectId: '', scope: '', contractValue: '' });
  const [payForm, setPayForm] = useState({ workOrderId: '', date: new Date().toISOString().split('T')[0], amount: '', mode: 'UPI', referenceNo: '', notes: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedProj, fetchedSubs, fetchedWos] = await Promise.all([
        getProjects(), getSubcontractors(), getWorkOrders()
      ]);
      setProjects((fetchedProj || []).filter(p => p.status !== 'Completed'));
      setSubcontractors(fetchedSubs || []);
      setWorkOrders(fetchedWos || []);
    } catch (e) {
      console.error("Error loading subcontractor ledgers from cloud DB:", e);
      setProjects([]);
      setSubcontractors([]);
      setWorkOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSub = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await saveSubcontractor(subForm);
      setIsSubModalOpen(false);
      setSubForm({ name: '', trade: 'Painter', phone: '' });
      await loadData();
    } catch (err) {
      alert("Failed to save subcontractor agency.");
    }
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
    } catch (err) {
      alert("Failed to assign work order contract.");
    }
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
    } catch (err) {
      alert("Failed to record subcontractor payment.");
    }
    setSubmitting(false);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateWorkOrderStatus(id, status);
      await loadData();
    } catch (err) {
      console.error("Failed to update work order status:", err);
    }
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const openPayModal = (woId) => {
    setPayForm(prev => ({ ...prev, workOrderId: woId }));
    setIsPayModalOpen(true);
  };

  const filteredWos = workOrders.filter(wo => 
    (wo.subName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (wo.projectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (wo.trade || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalContracted = filteredWos.reduce((sum, wo) => sum + (parseFloat(wo.contractValue) || 0), 0);
  const totalPaid = filteredWos.reduce((sum, wo) => sum + (parseFloat(wo.totalPaid) || 0), 0);
  const totalBalance = totalContracted - totalPaid;

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Subcontractor Ledgers</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Track work orders, running account (RA) bills, and site advances.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsSubModalOpen(true)} 
            className="bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Subcontractor
          </button>
          <button 
            onClick={() => setIsWoModalOpen(true)} 
            className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Work Order
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Active Work Orders</span>
          <p className="text-xl font-bold text-zinc-900">{filteredWos.filter(w => w.status !== 'Completed').length}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Contracted Value</span>
          <p className="text-xl font-bold text-zinc-900">₹ {totalContracted.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Total Paid (Advances)</span>
          <p className="text-xl font-bold text-emerald-700">₹ {totalPaid.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white border border-red-200/80 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Pending Balance To Pay</span>
          <p className="text-xl font-bold text-red-500">₹ {totalBalance.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3.5 shadow-sm w-full max-w-sm mb-6 shrink-0">
        <span className="text-sm text-zinc-400">🔍</span>
        <input 
          type="text" 
          placeholder="Search subcontractor, trade, project..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-sm font-medium text-zinc-800 outline-none px-2 w-full placeholder:text-zinc-400"
        />
      </div>

      {/* WORK ORDERS TABLE */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
            <thead>
              <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200 sticky top-0 bg-zinc-50 z-10">
                <th className="py-4 px-4 w-8"></th>
                <th className="py-4 px-4 font-semibold w-48">Project Site</th>
                <th className="py-4 px-4 font-semibold min-w-[200px]">Subcontractor & Trade</th>
                <th className="py-4 px-4 font-semibold text-right w-32">Contract Val</th>
                <th className="py-4 px-4 font-semibold text-right w-32">Paid (Advances)</th>
                <th className="py-4 px-4 font-semibold text-right w-32">Balance</th>
                <th className="py-4 px-4 font-semibold text-center w-32">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan="7" className="py-12 text-center text-zinc-400 font-medium text-sm">Syncing ledgers with cloud DB...</td></tr>
              ) : filteredWos.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-zinc-400 font-medium text-sm">No active work orders. Assign one above.</td></tr>
              ) : (
                filteredWos.map(wo => (
                  <React.Fragment key={wo.id}>
                    <tr className={`hover:bg-zinc-50 transition-colors cursor-pointer ${expandedRows.includes(wo.id) ? 'bg-zinc-50/80' : ''}`} onClick={() => toggleRow(wo.id)}>
                      <td className="py-4 px-4 text-center text-zinc-400 font-semibold text-xs">
                        <svg className={`w-4 h-4 transition-transform ${expandedRows.includes(wo.id) ? 'rotate-90 text-[#B45309]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </td>
                      <td className="py-4 px-4 font-semibold text-zinc-900">{wo.projectName}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#B45309]">{wo.subName}</span>
                          <span className="text-xs text-zinc-500 font-medium mt-0.5">{wo.trade} | {wo.scope}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-medium text-sm text-zinc-900">₹{(parseFloat(wo.contractValue) || 0).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right font-bold text-sm text-emerald-600">₹{(parseFloat(wo.totalPaid) || 0).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right font-bold text-sm text-red-500">₹{(parseFloat(wo.balance) || 0).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <select 
                          value={wo.status || 'Ongoing'} 
                          onChange={(e) => handleStatusChange(wo.id, e.target.value)}
                          className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23A1A1AA%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.8rem_0.8rem] pr-7 pl-3 py-1.5 rounded-full border outline-none cursor-pointer transition-all text-[10px] font-semibold uppercase tracking-wider ${
                            wo.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            wo.status === 'On Hold' ? 'bg-red-50 text-red-600 border-red-200' :
                            'bg-amber-50 text-[#B45309] border-amber-200'
                          }`}
                        >
                          <option value="Ongoing">Ongoing</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </td>
                    </tr>

                    {/* EXPANDED ROW FOR PAYMENTS */}
                    {expandedRows.includes(wo.id) && (
                      <tr className="bg-zinc-50/60 border-b border-zinc-200">
                        <td></td>
                        <td colSpan="6" className="py-4 pr-6">
                          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm space-y-3">
                            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Payment & Advance History</h4>
                              <button onClick={() => openPayModal(wo.id)} className="px-3 py-1.5 bg-[#B45309] hover:bg-[#92400E] text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1 cursor-pointer">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                Log Payment
                              </button>
                            </div>
                            
                            {(!wo.payments || wo.payments.length === 0) ? (
                              <p className="text-xs text-zinc-400 italic font-medium py-2">No payments logged yet. Contract is currently unpaid.</p>
                            ) : (
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="text-[11px] text-zinc-500 uppercase tracking-wider border-b border-zinc-100">
                                    <th className="pb-2 font-semibold">Date</th>
                                    <th className="pb-2 font-semibold">Mode</th>
                                    <th className="pb-2 font-semibold">Ref No</th>
                                    <th className="pb-2 font-semibold">Notes</th>
                                    <th className="pb-2 font-semibold text-right">Amount Paid</th>
                                  </tr>
                                </thead>
                                <tbody className="text-xs text-zinc-800 divide-y divide-zinc-50">
                                  {wo.payments.map(pay => (
                                    <tr key={pay.id} className="hover:bg-zinc-50 transition-colors">
                                      <td className="py-2.5 font-medium text-zinc-600">{pay.date}</td>
                                      <td className="py-2.5"><span className="bg-zinc-100 px-2 py-0.5 rounded text-[10px] font-semibold text-zinc-700">{pay.mode}</span></td>
                                      <td className="py-2.5 text-zinc-500 font-mono text-xs">{pay.ref || pay.referenceNo || '-'}</td>
                                      <td className="py-2.5 text-zinc-500 font-medium">{pay.notes || '-'}</td>
                                      <td className="py-2.5 text-right font-bold text-emerald-600">₹{Number(pay.amount).toLocaleString('en-IN')}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD SUBCONTRACTOR MODAL --- */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Add Subcontractor</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Register agency to master list</p>
              </div>
              <button onClick={() => setIsSubModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="subForm" onSubmit={handleSaveSub} className="space-y-4">
                <div>
                  <label className={labelClass}>Agency / Contractor Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} className={inputClass} placeholder="e.g. Ramesh Carpentry" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Trade Speciality</label>
                    <select 
                      value={subForm.trade} 
                      onChange={e => setSubForm({...subForm, trade: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="Painter">Painter</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Plumber">Plumber</option>
                      <option value="False Ceiling">False Ceiling</option>
                      <option value="Civil/Mason">Civil / Mason</option>
                      <option value="Carpenter">Carpenter</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input type="text" value={subForm.phone} onChange={e => setSubForm({...subForm, phone: e.target.value})} className={inputClass} placeholder="+91..." />
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsSubModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="subForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- ADD WORK ORDER MODAL --- */}
      {isWoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Assign Work Order</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Lock in contract value for site</p>
              </div>
              <button onClick={() => setIsWoModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="woForm" onSubmit={handleSaveWo} className="space-y-4">
                <div>
                  <label className={labelClass}>Select Subcontractor <span className="text-red-500">*</span></label>
                  <select 
                    required 
                    value={woForm.subcontractorId} 
                    onChange={e => setWoForm({...woForm, subcontractorId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="" disabled>Choose agency...</option>
                    {subcontractors.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.trade})</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Select Project Site <span className="text-red-500">*</span></label>
                  <select 
                    required 
                    value={woForm.projectId} 
                    onChange={e => setWoForm({...woForm, projectId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="" disabled>Choose active project...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Scope of Work</label>
                  <input type="text" placeholder="e.g. Entire Villa Putty & Paint" value={woForm.scope} onChange={e => setWoForm({...woForm, scope: e.target.value})} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Total Contract Value (₹) <span className="text-red-500">*</span></label>
                  <input type="number" step="any" required placeholder="0.00" value={woForm.contractValue} onChange={e => setWoForm({...woForm, contractValue: e.target.value})} className={inputClass} />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsWoModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="woForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Assigning...' : 'Assign Contract'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- LOG PAYMENT MODAL --- */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Log Payment / Advance</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Funds transferred to subcontractor</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="payForm" onSubmit={handleSavePay} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                    <input type="number" step="any" required placeholder="0.00" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Mode</label>
                    <select 
                      value={payForm.mode} 
                      onChange={e => setPayForm({...payForm, mode: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Ref No.</label>
                    <input type="text" placeholder="Txn ID" value={payForm.referenceNo} onChange={e => setPayForm({...payForm, referenceNo: e.target.value})} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Notes</label>
                  <input type="text" placeholder="e.g. Advance for material mobilization" value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} className={inputClass} />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsPayModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="payForm" disabled={submitting} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Recording...' : 'Record Payment'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}