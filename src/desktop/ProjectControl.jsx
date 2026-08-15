import React, { useState, useEffect } from 'react';
import { 
  getProjects, getSubcontractors,
  getRaBills, saveRaBill,
  getMilestones, saveMilestone, updateMilestoneStatus,
  getChangeOrders, saveChangeOrder 
} from '.../db';

export default function ProjectControl() {
  const [activeTab, setActiveTab] = useState('RA Bills');
  const [loading, setLoading] = useState(true);
  
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Tab Data States
  const [raBills, setRaBills] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [changeOrders, setChangeOrders] = useState([]);

  // Modals
  const [isRaModalOpen, setIsRaModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isCoModalOpen, setIsCoModalOpen] = useState(false);

  // Forms
  const [raForm, setRaForm] = useState({
    projectId: '', subcontractorId: '', billNo: '', billDate: new Date().toISOString().split('T')[0],
    grossAmount: '', retentionPercent: 5, previousPaid: '', notes: ''
  });

  const [milestoneForm, setMilestoneForm] = useState({
    projectId: '', stageName: '', percentage: '', amount: '', dueDate: '', notes: ''
  });

  const [coForm, setCoForm] = useState({
    projectId: '', title: '', description: '', additionalCost: '', extraDays: 0, date: new Date().toISOString().split('T')[0]
  });

  const loadData = async () => {
    setLoading(true);
    const [projs, subs, bills, ms, cos] = await Promise.all([
      getProjects(),
      getSubcontractors(),
      getRaBills(selectedProjectId),
      getMilestones(selectedProjectId),
      getChangeOrders(selectedProjectId)
    ]);
    setProjects(projs);
    setSubcontractors(subs);
    setRaBills(bills);
    setMilestones(ms);
    setChangeOrders(cos);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedProjectId]);

  // Handle RA Bill Save
  const handleSaveRa = async (e) => {
    e.preventDefault();
    const gross = parseFloat(raForm.grossAmount) || 0;
    const retPct = parseFloat(raForm.retentionPercent) || 0;
    const retAmt = (gross * retPct) / 100;
    const prev = parseFloat(raForm.previousPaid) || 0;
    const net = gross - retAmt - prev;

    await saveRaBill({
      ...raForm,
      grossAmount: gross,
      retentionAmount: retAmt,
      previousPaid: prev,
      netPayable: net > 0 ? net : 0,
      workDoneDetails: { note: raForm.notes }
    });
    setIsRaModalOpen(false);
    await loadData();
  };

  // Handle Milestone Save
  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    await saveMilestone({
      ...milestoneForm,
      percentage: parseFloat(milestoneForm.percentage) || 0,
      amount: parseFloat(milestoneForm.amount) || 0
    });
    setIsMilestoneModalOpen(false);
    await loadData();
  };

  // Handle Change Order Save
  const handleSaveCo = async (e) => {
    e.preventDefault();
    await saveChangeOrder({
      ...coForm,
      additionalCost: parseFloat(coForm.additionalCost) || 0,
      extraDays: parseInt(coForm.extraDays) || 0
    });
    setIsCoModalOpen(false);
    await loadData();
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-zinc-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full font-['Poppins'] pb-12 relative h-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Project Financial Control</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Manage Contractor RA Bills, Payment Milestones & Change Orders.</p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedProjectId} 
            onChange={e => setSelectedProjectId(e.target.value)}
            className="bg-white/80 border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-bold text-zinc-800 outline-none cursor-pointer"
          >
            <option value="">All Projects Filter</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {activeTab === 'RA Bills' && (
            <button onClick={() => setIsRaModalOpen(true)} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">
              + Generate RA Bill
            </button>
          )}
          {activeTab === 'Milestones' && (
            <button onClick={() => setIsMilestoneModalOpen(true)} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">
              + Add Milestone
            </button>
          )}
          {activeTab === 'Change Orders' && (
            <button onClick={() => setIsCoModalOpen(true)} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">
              + New Variation
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/60 p-1 rounded-xl shadow-sm border border-zinc-200 w-fit mb-6 shrink-0">
        {['RA Bills', 'Milestones', 'Change Orders'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-800'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content Rendering */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading records...</div>
      ) : activeTab === 'RA Bills' ? (
        /* RA BILLS TABLE */
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] shadow-xl overflow-hidden">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-200/80 bg-zinc-50/50">
                <th className="py-4 px-6 font-semibold">Bill #</th>
                <th className="py-4 px-4 font-semibold">Subcontractor</th>
                <th className="py-4 px-4 font-semibold">Project Site</th>
                <th className="py-4 px-4 font-semibold text-right">Gross Total</th>
                <th className="py-4 px-4 font-semibold text-right">Retention</th>
                <th className="py-4 px-6 font-semibold text-right">Net Payable</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-zinc-100">
              {raBills.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 text-xs">No Running Account Bills generated.</td></tr>
              ) : (
                raBills.map(b => (
                  <tr key={b.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-4 px-6 font-bold text-zinc-900 text-xs">{b.billNo}</td>
                    <td className="py-4 px-4 text-xs font-semibold text-zinc-800">{b.subName} ({b.trade})</td>
                    <td className="py-4 px-4 text-xs text-zinc-600">{b.projectName}</td>
                    <td className="py-4 px-4 text-right font-bold text-zinc-800">₹{b.grossAmount.toLocaleString('en-IN')}</td>
                    <td className="py-4 px-4 text-right text-xs text-red-500 font-medium">-₹{b.retentionAmount.toLocaleString('en-IN')} ({b.retentionPercent}%)</td>
                    <td className="py-4 px-6 text-right font-black text-emerald-600">₹{b.netPayable.toLocaleString('en-IN')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'Milestones' ? (
        /* MILESTONES GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {milestones.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-400 text-xs">No client payment milestones created.</div>
          ) : (
            milestones.map(m => (
              <div key={m.id} className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{m.projectName}</span>
                    <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded ${m.status === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
                  </div>
                  <h4 className="font-bold text-zinc-900 text-sm mb-1">{m.stageName}</h4>
                  <p className="text-xl font-black text-zinc-800 mb-2">₹{m.amount.toLocaleString('en-IN')} <span className="text-xs font-medium text-zinc-400">({m.percentage}%)</span></p>
                </div>
                <div className="pt-3 border-t border-zinc-100 flex justify-between items-center">
                  <span className="text-[10px] text-zinc-400">Due: {m.dueDate || 'N/A'}</span>
                  {m.status !== 'Received' && (
                    <button onClick={() => updateMilestoneStatus(m.id, 'Received').then(loadData)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider">Mark Paid</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* CHANGE ORDERS LIST */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {changeOrders.length === 0 ? (
            <div className="col-span-full py-12 text-center text-zinc-400 text-xs">No change orders or scope variations logged.</div>
          ) : (
            changeOrders.map(co => (
              <div key={co.id} className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{co.projectName}</span>
                  <span className="text-[9px] font-bold text-zinc-400">{co.date}</span>
                </div>
                <h4 className="font-bold text-zinc-900 text-sm mb-1">{co.title}</h4>
                <p className="text-xs text-zinc-500 mb-4">{co.description}</p>
                <div className="pt-3 border-t border-zinc-100 flex justify-between items-center">
                  <span className="font-black text-emerald-600 text-base">+₹{co.additionalCost.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-amber-600 font-bold">+{co.extraDays} Days</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* RA BILL MODAL */}
      {isRaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Generate Contractor RA Bill</h2>
            <form onSubmit={handleSaveRa} className="space-y-4">
              <div><label className={labelClass}>Project Site *</label><select required value={raForm.projectId} onChange={e => setRaForm({...raForm, projectId: e.target.value})} className={inputClass}><option value="">Select Project...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className={labelClass}>Subcontractor *</label><select required value={raForm.subcontractorId} onChange={e => setRaForm({...raForm, subcontractorId: e.target.value})} className={inputClass}><option value="">Select Worker...</option>{subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.trade})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Bill No *</label><input type="text" required placeholder="RA-001" value={raForm.billNo} onChange={e => setRaForm({...raForm, billNo: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Gross Value (₹) *</label><input type="number" required placeholder="50000" value={raForm.grossAmount} onChange={e => setRaForm({...raForm, grossAmount: e.target.value})} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Retention %</label><input type="number" value={raForm.retentionPercent} onChange={e => setRaForm({...raForm, retentionPercent: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Previous Paid (₹)</label><input type="number" placeholder="0" value={raForm.previousPaid} onChange={e => setRaForm({...raForm, previousPaid: e.target.value})} className={inputClass} /></div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setIsRaModalOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-zinc-900 text-white font-bold rounded-xl text-xs">Save RA Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MILESTONE MODAL */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Add Payment Milestone</h2>
            <form onSubmit={handleSaveMilestone} className="space-y-4">
              <div><label className={labelClass}>Project Site *</label><select required value={milestoneForm.projectId} onChange={e => setMilestoneForm({...milestoneForm, projectId: e.target.value})} className={inputClass}><option value="">Select Project...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className={labelClass}>Stage Name *</label><input type="text" required placeholder="e.g. 30% Frame Completion" value={milestoneForm.stageName} onChange={e => setMilestoneForm({...milestoneForm, stageName: e.target.value})} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Percentage (%)</label><input type="number" value={milestoneForm.percentage} onChange={e => setMilestoneForm({...milestoneForm, percentage: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Amount (₹) *</label><input type="number" required value={milestoneForm.amount} onChange={e => setMilestoneForm({...milestoneForm, amount: e.target.value})} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Due Date</label><input type="date" value={milestoneForm.dueDate} onChange={e => setMilestoneForm({...milestoneForm, dueDate: e.target.value})} className={inputClass} /></div>
              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setIsMilestoneModalOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-zinc-900 text-white font-bold rounded-xl text-xs">Save Milestone</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE ORDER MODAL */}
      {isCoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-4">Log Scope Change / Extra Work</h2>
            <form onSubmit={handleSaveCo} className="space-y-4">
              <div><label className={labelClass}>Project Site *</label><select required value={coForm.projectId} onChange={e => setCoForm({...coForm, projectId: e.target.value})} className={inputClass}><option value="">Select Project...</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className={labelClass}>Variation Title *</label><input type="text" required placeholder="e.g. Additional False Ceiling in Hallway" value={coForm.title} onChange={e => setCoForm({...coForm, title: e.target.value})} className={inputClass} /></div>
              <div><label className={labelClass}>Details</label><textarea value={coForm.description} onChange={e => setCoForm({...coForm, description: e.target.value})} className={`${inputClass} resize-none h-16`} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Additional Cost (₹) *</label><input type="number" required value={coForm.additionalCost} onChange={e => setCoForm({...coForm, additionalCost: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Extra Days Needed</label><input type="number" value={coForm.extraDays} onChange={e => setCoForm({...coForm, extraDays: e.target.value})} className={inputClass} /></div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setIsCoModalOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-zinc-900 text-white font-bold rounded-xl text-xs">Save Variation</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}