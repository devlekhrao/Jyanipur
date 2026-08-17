import React, { useState, useEffect } from 'react';
import { 
  getProjects, getSubcontractors, saveSubcontractor, 
  getWorkOrders, saveWorkOrder, saveWoPayment, updateWorkOrderStatus 
} from '../db';

export default function MobileSubcontractors() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [expandedRows, setExpandedRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Bottom Sheets
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
      console.warn("Ensure subcontractor & work order functions exist in db.js");
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
    await saveSubcontractor(subForm);
    setIsSubModalOpen(false);
    setSubForm({ name: '', trade: 'Painter', phone: '' });
    await loadData();
  };

  const handleSaveWo = async (e) => {
    e.preventDefault();
    await saveWorkOrder({ ...woForm, contractValue: parseFloat(woForm.contractValue) });
    setIsWoModalOpen(false);
    setWoForm({ subcontractorId: '', projectId: '', scope: '', contractValue: '' });
    await loadData();
  };

  const handleSavePay = async (e) => {
    e.preventDefault();
    await saveWoPayment({ ...payForm, amount: parseFloat(payForm.amount) });
    setIsPayModalOpen(false);
    setPayForm({ workOrderId: '', date: new Date().toISOString().split('T')[0], amount: '', mode: 'UPI', referenceNo: '', notes: '' });
    await loadData();
  };

  const handleStatusChange = async (id, status) => {
    await updateWorkOrderStatus(id, status);
    await loadData();
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const openPayModal = (woId) => {
    setPayForm(prev => ({ ...prev, workOrderId: woId }));
    setIsPayModalOpen(true);
  };

  const filteredWos = workOrders.filter(wo => 
    (wo.subName && wo.subName.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (wo.projectName && wo.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (wo.trade && wo.trade.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalContracted = filteredWos.reduce((sum, wo) => sum + wo.contractValue, 0);
  const totalPaid = filteredWos.reduce((sum, wo) => sum + wo.totalPaid, 0);
  const totalBalance = totalContracted - totalPaid;

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Subcontractors</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Work Orders & Advances</p>
          </div>
          
          <div className="flex gap-1.5">
            <button 
              onClick={() => setIsSubModalOpen(true)}
              className="bg-white border border-zinc-200 text-zinc-800 font-bold px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-sm active:scale-95"
            >
              + Sub
            </button>
            <button 
              onClick={() => setIsWoModalOpen(true)}
              className="bg-[#1E3A8A] text-white font-semibold text-[11px] px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-md active:scale-95"
            >
              + Work Order
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white border border-zinc-200 rounded-2xl px-3 py-2 shadow-sm flex items-center mb-2">
          <span className="text-xs text-zinc-400 mr-2">🔍</span>
          <input 
            type="text" 
            placeholder="Search subcontractor, trade, or site..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* 2x2 KPI GRID */}
      <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[8px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest block">Active Work Orders</span>
          <p className="text-base font-semibold text-[11px] text-zinc-900 mt-0.5">{filteredWos.filter(w => w.status !== 'Completed').length}</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
          <span className="text-[8px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest block">Contracted Value</span>
          <p className="text-base font-semibold text-[11px] text-zinc-900 mt-0.5">₹ {totalContracted.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-[8px] font-semibold text-[11px] text-emerald-600 uppercase tracking-widest block">Total Paid (Advances)</span>
          <p className="text-base font-semibold text-[11px] text-emerald-700 mt-0.5">₹ {totalPaid.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-red-50 p-3 rounded-2xl border border-red-100 shadow-sm">
          <span className="text-[8px] font-semibold text-[11px] text-red-500 uppercase tracking-widest block">Pending Balance</span>
          <p className="text-base font-semibold text-[11px] text-red-600 mt-0.5">₹ {totalBalance.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* WORK ORDER CARDS STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading subcontractor ledgers...</div>
        ) : filteredWos.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">👷‍♂️</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No active work orders assigned</p>
          </div>
        ) : (
          filteredWos.map(wo => {
            const isExpanded = expandedRows.includes(wo.id);

            return (
              <div key={wo.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform">
                
                {/* CARD HEADER */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-blue-50 text-[#1E3A8A] text-[8px] font-semibold text-[11px] px-2 py-0.5 rounded uppercase tracking-wider">
                      {wo.trade}
                    </span>
                    <h4 className="font-bold text-zinc-900 text-sm mt-1">{wo.subName}</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{wo.projectName}</p>
                  </div>

                  <div className="relative">
                    <select 
                      value={wo.status} 
                      onChange={(e) => handleStatusChange(wo.id, e.target.value)}
                      className={`px-2.5 py-1 rounded-xl text-[9px] font-semibold text-[11px] uppercase tracking-wider outline-none appearance-none pr-6 ${
                        wo.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                        wo.status === 'On Hold' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <option value="Ongoing">Ongoing</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-[8px] text-zinc-400">▼</div>
                  </div>
                </div>

                {wo.scope && (
                  <p className="text-xs text-zinc-600 bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                    Scope: {wo.scope}
                  </p>
                )}

                {/* FINANCIAL METRICS GRID */}
                <div className="grid grid-cols-3 gap-1.5 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 text-center text-xs">
                  <div>
                    <span className="text-[8px] font-semibold text-[11px] text-zinc-400 uppercase block">Contract</span>
                    <p className="font-semibold text-[11px] text-zinc-900 mt-0.5">₹{wo.contractValue?.toLocaleString('en-IN')}</p>
                  </div>

                  <div>
                    <span className="text-[8px] font-semibold text-[11px] text-emerald-600 uppercase block">Paid</span>
                    <p className="font-semibold text-[11px] text-emerald-700 mt-0.5">₹{wo.totalPaid?.toLocaleString('en-IN')}</p>
                  </div>

                  <div>
                    <span className="text-[8px] font-semibold text-[11px] text-red-500 uppercase block">Balance</span>
                    <p className="font-semibold text-[11px] text-red-600 mt-0.5">₹{wo.balance?.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* TOGGLE EXPAND PAYMENTS ROW */}
                <div className="flex justify-between items-center pt-1 border-t border-zinc-100">
                  <button 
                    onClick={() => toggleRow(wo.id)} 
                    className="text-[10px] font-semibold text-[11px] text-zinc-500 hover:text-zinc-900"
                  >
                    {isExpanded ? 'Hide Ledger ▲' : `Payments (${wo.payments?.length || 0}) ▼`}
                  </button>

                  <button 
                    onClick={() => openPayModal(wo.id)}
                    className="bg-[#1E3A8A] text-white px-3 py-1.5 rounded-xl text-[10px] font-semibold text-[11px] uppercase tracking-wider active:scale-95 transition-transform"
                  >
                    + Log Pay
                  </button>
                </div>

                {/* EXPANDABLE PAYMENTS STREAM */}
                {isExpanded && (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 space-y-2 text-xs">
                    <h5 className="text-[9px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-1">
                      Payment & Advance History
                    </h5>

                    {wo.payments?.length === 0 ? (
                      <p className="text-[10px] text-zinc-400 italic">No payments logged yet. Contract is unpaid.</p>
                    ) : (
                      wo.payments?.map(pay => (
                        <div key={pay.id} className="flex justify-between items-center py-1.5 border-b border-zinc-100 last:border-0">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="bg-white border border-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded text-[8px] font-semibold text-[11px] uppercase">
                                {pay.mode}
                              </span>
                              <span className="font-bold text-zinc-900 text-xs">₹{Number(pay.amount).toLocaleString('en-IN')}</span>
                            </div>
                            {pay.notes && <p className="text-[9px] text-zinc-400 mt-0.5">{pay.notes}</p>}
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-zinc-400 font-semibold block">{pay.date}</span>
                            {pay.ref && <span className="text-[8px] font-mono text-zinc-400">Ref: {pay.ref}</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: ADD SUBCONTRACTOR SHEET */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[2.5rem] shadow-2xl p-6 flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Add Subcontractor</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Register Agency Master</p>
              </div>
              <button onClick={() => setIsSubModalOpen(false)} className="text-zinc-400 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveSub} className="space-y-4 pb-6">
              <div>
                <label className={labelClass}>Agency / Contractor Name <span className="text-red-500">*</span></label>
                <input type="text" required placeholder="e.g. Ramesh Carpentry" value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Trade Speciality</label>
                  <select value={subForm.trade} onChange={e => setSubForm({...subForm, trade: e.target.value})} className={inputClass}>
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
                  <label className={labelClass}>Mobile Phone</label>
                  <input type="tel" placeholder="+91..." value={subForm.phone} onChange={e => setSubForm({...subForm, phone: e.target.value})} className={inputClass} />
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-[#1E3A8A] text-white font-semibold text-[11px] rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform mt-2">
                Save Subcontractor
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN WORK ORDER SHEET */}
      {isWoModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[2.5rem] shadow-2xl p-6 flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Assign Work Order</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Lock Contract Value</p>
              </div>
              <button onClick={() => setIsWoModalOpen(false)} className="text-zinc-400 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSaveWo} className="space-y-4 pb-6">
              <div>
                <label className={labelClass}>Subcontractor <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select required value={woForm.subcontractorId} onChange={e => setWoForm({...woForm, subcontractorId: e.target.value})} className={`${inputClass} appearance-none font-bold`}>
                    <option value="" disabled>Choose agency...</option>
                    {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.trade})</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select required value={woForm.projectId} onChange={e => setWoForm({...woForm, projectId: e.target.value})} className={`${inputClass} appearance-none font-bold`}>
                    <option value="" disabled>Choose active project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Scope of Work</label>
                <input type="text" placeholder="e.g. Villa Putty & Paint Complete" value={woForm.scope} onChange={e => setWoForm({...woForm, scope: e.target.value})} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Contract Value (₹) <span className="text-red-500">*</span></label>
                <input type="number" inputMode="decimal" required placeholder="0.00" value={woForm.contractValue} onChange={e => setWoForm({...woForm, contractValue: e.target.value})} className={inputClass} />
              </div>

              <button type="submit" className="w-full py-4 bg-[#1E3A8A] text-white font-semibold text-[11px] rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform mt-2">
                Assign Contract
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: LOG PAYMENT SHEET */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[2.5rem] shadow-2xl p-6 flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Log Payment / Advance</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Subcontractor Outflow</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-zinc-400 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSavePay} className="space-y-4 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                  <input type="number" inputMode="decimal" required placeholder="0.00" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Payment Mode</label>
                  <select value={payForm.mode} onChange={e => setPayForm({...payForm, mode: e.target.value})} className={inputClass}>
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Ref / Txn No.</label>
                  <input type="text" placeholder="Txn ID" value={payForm.referenceNo} onChange={e => setPayForm({...payForm, referenceNo: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <input type="text" placeholder="e.g. Advance for materials" value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} className={inputClass} />
              </div>

              <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-semibold text-[11px] rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform mt-2">
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}