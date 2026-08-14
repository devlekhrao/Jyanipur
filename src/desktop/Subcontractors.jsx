import React, { useState, useEffect } from 'react';
import { 
  getProjects, getSubcontractors, saveSubcontractor, 
  getWorkOrders, saveWorkOrder, saveWoPayment, updateWorkOrderStatus 
} from './db';

export default function Subcontractors() {
  const [loading, setLoading] = useState(true);
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
    wo.subName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    wo.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.trade.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalContracted = filteredWos.reduce((sum, wo) => sum + wo.contractValue, 0);
  const totalPaid = filteredWos.reduce((sum, wo) => sum + wo.totalPaid, 0);
  const totalBalance = totalContracted - totalPaid;

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Subcontractor Ledgers</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Track work orders, running account (RA) bills, and advances.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsSubModalOpen(true)} className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">+ Add Subcontractor</button>
          <button onClick={() => setIsWoModalOpen(true)} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer">+ New Work Order</button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Active Work Orders</span>
          <p className="text-2xl font-black text-zinc-900">{filteredWos.filter(w => w.status !== 'Completed').length}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-6 rounded-[2rem] shadow-sm">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Total Contracted Value</span>
          <p className="text-2xl font-black text-zinc-900">₹ {totalContracted.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-100 p-6 rounded-[2rem] shadow-sm">
          <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest block mb-1">Total Paid (Advances)</span>
          <p className="text-2xl font-black text-emerald-700">₹ {totalPaid.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-red-50/70 border border-red-100 p-6 rounded-[2rem] shadow-sm">
          <span className="text-[9px] font-extrabold text-red-600 uppercase tracking-widest block mb-1">Pending Balance To Pay</span>
          <p className="text-2xl font-black text-red-600">₹ {totalBalance.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-2xl px-3.5 shadow-sm w-full max-w-sm mb-6 shrink-0">
        <span className="text-xs text-zinc-400">🔍</span>
        <input 
          type="text" 
          placeholder="Search subcontractor or project..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-transparent border-none text-xs font-medium text-zinc-800 outline-none px-3 w-full placeholder:text-zinc-400"
        />
      </div>

      {/* WORK ORDERS TABLE */}
      <div className="bg-white border border-zinc-200 rounded-[2rem] shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
            <thead>
              <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-100 bg-zinc-50/50 sticky top-0 bg-zinc-50 z-10">
                <th className="py-3.5 px-4 w-8"></th>
                <th className="py-3.5 px-4 font-bold w-48">Project Site</th>
                <th className="py-3.5 px-4 font-bold min-w-[200px]">Subcontractor & Trade</th>
                <th className="py-3.5 px-4 font-bold text-right w-32">Contract Val</th>
                <th className="py-3.5 px-4 font-bold text-right w-32">Paid (Advances)</th>
                <th className="py-3.5 px-4 font-bold text-right w-32">Balance</th>
                <th className="py-3.5 px-4 font-bold text-center w-32">Status</th>
              </tr>
            </thead>
            <tbody className="text-xs text-zinc-800 divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan="7" className="py-12 text-center text-zinc-400 font-medium text-xs">Loading ledgers...</td></tr>
              ) : filteredWos.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-zinc-400 font-medium text-xs">No active work orders. Assign one above.</td></tr>
              ) : (
                filteredWos.map(wo => (
                  <React.Fragment key={wo.id}>
                    <tr className={`hover:bg-zinc-50 transition-colors cursor-pointer ${expandedRows.includes(wo.id) ? 'bg-zinc-50/80' : ''}`} onClick={() => toggleRow(wo.id)}>
                      <td className="py-4 px-4 text-center text-zinc-400 font-bold text-xs">{expandedRows.includes(wo.id) ? 'v' : '>'}</td>
                      <td className="py-4 px-4 font-extrabold text-zinc-900">{wo.projectName}</td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-[#1E3A8A]">{wo.subName}</span>
                          <span className="text-[10px] text-zinc-500 font-medium mt-0.5">{wo.trade} | {wo.scope}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-black text-zinc-900">₹{wo.contractValue.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right font-extrabold text-emerald-600">₹{wo.totalPaid.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right font-black text-red-500">₹{wo.balance.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <select 
                          value={wo.status} 
                          onChange={(e) => handleStatusChange(wo.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest border border-zinc-200 outline-none cursor-pointer appearance-none ${
                            wo.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                            wo.status === 'On Hold' ? 'bg-red-50 text-red-600' :
                            'bg-amber-50 text-amber-700'
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
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <td></td>
                        <td colSpan="6" className="py-4 pr-6">
                          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-3">
                              <h4 className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest">Payment & Advance History</h4>
                              <button onClick={() => openPayModal(wo.id)} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer">
                                + Log Payment
                              </button>
                            </div>
                            
                            {wo.payments.length === 0 ? (
                              <p className="text-xs text-zinc-400 italic font-medium">No payments logged yet. Contract is unpaid.</p>
                            ) : (
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="text-[9px] text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                                    <th className="pb-2 font-bold">Date</th>
                                    <th className="pb-2 font-bold">Mode</th>
                                    <th className="pb-2 font-bold">Ref No</th>
                                    <th className="pb-2 font-bold">Notes</th>
                                    <th className="pb-2 font-bold text-right">Amount Paid</th>
                                  </tr>
                                </thead>
                                <tbody className="text-xs text-zinc-800">
                                  {wo.payments.map(pay => (
                                    <tr key={pay.id} className="border-t border-zinc-50 hover:bg-zinc-50 transition-colors">
                                      <td className="py-2.5 font-medium text-zinc-600">{pay.date}</td>
                                      <td className="py-2.5"><span className="bg-zinc-100 px-2 py-0.5 rounded text-[9px] font-bold text-zinc-700">{pay.mode}</span></td>
                                      <td className="py-2.5 text-zinc-500 font-mono text-[10px]">{pay.ref || '-'}</td>
                                      <td className="py-2.5 text-zinc-500 font-medium">{pay.notes || '-'}</td>
                                      <td className="py-2.5 text-right font-black text-emerald-600">₹{Number(pay.amount).toLocaleString('en-IN')}</td>
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
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-extrabold text-zinc-900 mb-1">Add Subcontractor</h2>
            <p className="text-zinc-500 text-[10px] font-bold mb-6 uppercase tracking-widest">Register agency to master list.</p>

            <form onSubmit={handleSaveSub} className="space-y-4">
              <div>
                <label className={labelClass}>Agency / Contractor Name <span className="text-red-500">*</span></label>
                <input type="text" required value={subForm.name} onChange={e => setSubForm({...subForm, name: e.target.value})} className={inputClass} placeholder="e.g. Ramesh Carpentry" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Trade Speciality</label>
                  <select value={subForm.trade} onChange={e => setSubForm({...subForm, trade: e.target.value})} className={`${inputClass} cursor-pointer`}>
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
              <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-2">
                <button type="button" onClick={() => setIsSubModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD WORK ORDER MODAL --- */}
      {isWoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-extrabold text-zinc-900 mb-1">Assign Work Order</h2>
            <p className="text-zinc-500 text-[10px] font-bold mb-6 uppercase tracking-widest">Lock in contract value for site.</p>

            <form onSubmit={handleSaveWo} className="space-y-4">
              <div>
                <label className={labelClass}>Select Subcontractor <span className="text-red-500">*</span></label>
                <select required value={woForm.subcontractorId} onChange={e => setWoForm({...woForm, subcontractorId: e.target.value})} className={`${inputClass} cursor-pointer`}>
                  <option value="" disabled>Choose agency...</option>
                  {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.trade})</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Select Project Site <span className="text-red-500">*</span></label>
                <select required value={woForm.projectId} onChange={e => setWoForm({...woForm, projectId: e.target.value})} className={`${inputClass} cursor-pointer`}>
                  <option value="" disabled>Choose active project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Scope of Work</label>
                <input type="text" placeholder="e.g. Entire Villa Putty & Paint" value={woForm.scope} onChange={e => setWoForm({...woForm, scope: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Total Contract Value (₹) <span className="text-red-500">*</span></label>
                <input type="number" required placeholder="0.00" value={woForm.contractValue} onChange={e => setWoForm({...woForm, contractValue: e.target.value})} className={inputClass} />
              </div>
              <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-2">
                <button type="button" onClick={() => setIsWoModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">Assign Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LOG PAYMENT MODAL --- */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-extrabold text-zinc-900 mb-1">Log Payment / Advance</h2>
            <p className="text-zinc-500 text-[10px] font-bold mb-6 uppercase tracking-widest">Funds transferred to subcontractor.</p>

            <form onSubmit={handleSavePay} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                  <input type="number" required placeholder="0.00" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Mode</label>
                  <select value={payForm.mode} onChange={e => setPayForm({...payForm, mode: e.target.value})} className={`${inputClass} cursor-pointer`}>
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
                <input type="text" placeholder="e.g. Advance for materials" value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} className={inputClass} />
              </div>
              <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-2">
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}