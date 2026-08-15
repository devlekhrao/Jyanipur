import React, { useState, useEffect } from 'react';
import { 
  getProjects, getSubcontractors,
  getRaBills, saveRaBill,
  getMilestones, saveMilestone, updateMilestoneStatus,
  getChangeOrders, saveChangeOrder 
} from '.../db';

export default function MobileProjectControl() {
  const [activeTab, setActiveTab] = useState('RA Bills');
  const [loading, setLoading] = useState(true);
  
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Tab Data States
  const [raBills, setRaBills] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [changeOrders, setChangeOrders] = useState([]);

  // Bottom Sheet Modals
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
    try {
      const [projs, subs, bills, ms, cos] = await Promise.all([
        getProjects(),
        getSubcontractors(),
        getRaBills(selectedProjectId),
        getMilestones(selectedProjectId),
        getChangeOrders(selectedProjectId)
      ]);
      setProjects(projs || []);
      setSubcontractors(subs || []);
      setRaBills(bills || []);
      setMilestones(ms || []);
      setChangeOrders(cos || []);
    } catch (e) {
      console.warn("Ensure project control DB functions exist in db.js");
    }
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
    setRaForm({
      projectId: '', subcontractorId: '', billNo: '', billDate: new Date().toISOString().split('T')[0],
      grossAmount: '', retentionPercent: 5, previousPaid: '', notes: ''
    });
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
    setMilestoneForm({ projectId: '', stageName: '', percentage: '', amount: '', dueDate: '', notes: '' });
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
    setCoForm({ projectId: '', title: '', description: '', additionalCost: '', extraDays: 0, date: new Date().toISOString().split('T')[0] });
    await loadData();
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Project Control</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">RA Bills & Variations</p>
          </div>
          
          {/* ACTION BUTTON DEPENDING ON TAB */}
          <div>
            {activeTab === 'RA Bills' && (
              <button 
                onClick={() => setIsRaModalOpen(true)}
                className="bg-[#1E3A8A] text-white font-black px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-md active:scale-95"
              >
                + RA Bill
              </button>
            )}
            {activeTab === 'Milestones' && (
              <button 
                onClick={() => setIsMilestoneModalOpen(true)}
                className="bg-[#1E3A8A] text-white font-black px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-md active:scale-95"
              >
                + Milestone
              </button>
            )}
            {activeTab === 'Change Orders' && (
              <button 
                onClick={() => setIsCoModalOpen(true)}
                className="bg-[#1E3A8A] text-white font-black px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-wider shadow-md active:scale-95"
              >
                + Variation
              </button>
            )}
          </div>
        </div>

        {/* PROJECT FILTER DROPDOWN */}
        <div className="relative mb-2">
          <select 
            value={selectedProjectId} 
            onChange={e => setSelectedProjectId(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold text-zinc-800 outline-none shadow-sm appearance-none pr-8"
          >
            <option value="">All Projects Filter</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 text-xs">▼</div>
        </div>

        {/* SEGMENTED TAB CONTROL */}
        <div className="flex bg-zinc-200/80 p-1 rounded-2xl gap-1">
          {['RA Bills', 'Milestones', 'Change Orders'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition-all truncate ${
                activeTab === tab ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-500'
              }`}
            >
              {tab === 'Change Orders' ? 'Variations' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT LIST STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading financial controls...</div>
        ) : activeTab === 'RA Bills' ? (
          raBills.length === 0 ? (
            <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
              <span className="text-3xl mb-2 block">📄</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No Running Account Bills generated</p>
            </div>
          ) : (
            raBills.map(b => (
              <div key={b.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-blue-50 text-[#1E3A8A] text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      {b.billNo}
                    </span>
                    <h4 className="font-extrabold text-zinc-900 text-sm mt-1">{b.subName || 'Subcontractor'} ({b.trade || 'Work'})</h4>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{b.projectName}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-emerald-600 block">₹{b.netPayable?.toLocaleString('en-IN')}</span>
                    <span className="text-[8px] font-extrabold text-zinc-400 uppercase">Net Payable</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-2.5 rounded-xl text-xs border border-zinc-100">
                  <div>
                    <span className="text-[8px] font-black text-zinc-400 uppercase block">Gross Bill</span>
                    <p className="font-bold text-zinc-800">₹{b.grossAmount?.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black text-red-500 uppercase block">Retention ({b.retentionPercent}%)</span>
                    <p className="font-bold text-red-600">-₹{b.retentionAmount?.toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            ))
          )
        ) : activeTab === 'Milestones' ? (
          milestones.length === 0 ? (
            <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
              <span className="text-3xl mb-2 block">🚩</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No payment milestones created</p>
            </div>
          ) : (
            milestones.map(m => (
              <div key={m.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">{m.projectName}</span>
                    <h4 className="font-extrabold text-zinc-900 text-sm mt-0.5">{m.stageName}</h4>
                  </div>
                  <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    m.status === 'Received' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                  <div>
                    <p className="text-base font-black text-zinc-900">₹{m.amount?.toLocaleString('en-IN')} <span className="text-xs font-medium text-zinc-400">({m.percentage}%)</span></p>
                    <span className="text-[9px] text-zinc-400 font-semibold block">Due: {m.dueDate || 'N/A'}</span>
                  </div>

                  {m.status !== 'Received' && (
                    <button 
                      onClick={() => updateMilestoneStatus(m.id, 'Received').then(loadData)} 
                      className="bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-transform shadow-sm"
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            ))
          )
        ) : (
          changeOrders.length === 0 ? (
            <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
              <span className="text-3xl mb-2 block">📝</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No scope change orders logged</p>
            </div>
          ) : (
            changeOrders.map(co => (
              <div key={co.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-2 active:scale-[0.99] transition-transform">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">{co.projectName}</span>
                    <h4 className="font-extrabold text-zinc-900 text-sm mt-0.5">{co.title}</h4>
                  </div>
                  <span className="text-[9px] font-bold text-zinc-400">{co.date}</span>
                </div>

                {co.description && (
                  <p className="text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                    {co.description}
                  </p>
                )}

                <div className="pt-2 border-t border-zinc-100 flex justify-between items-center">
                  <span className="font-black text-emerald-600 text-base">+₹{co.additionalCost?.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg">+{co.extraDays} Days</span>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* MODAL 1: RA BILL BOTTOM SHEET */}
      {isRaModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">Contractor RA Bill</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Running Account Entry</p>
              </div>
              <button onClick={() => setIsRaModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <form id="raForm" onSubmit={handleSaveRa} className="space-y-4 pb-20">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select required value={raForm.projectId} onChange={e => setRaForm({...raForm, projectId: e.target.value})} className={`${inputClass} appearance-none font-bold`}>
                      <option value="" disabled>Select Project Site...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Subcontractor <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select required value={raForm.subcontractorId} onChange={e => setRaForm({...raForm, subcontractorId: e.target.value})} className={`${inputClass} appearance-none font-bold`}>
                      <option value="" disabled>Select Subcontractor...</option>
                      {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.trade})</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Bill No <span className="text-red-500">*</span></label>
                    <input type="text" required placeholder="RA-001" value={raForm.billNo} onChange={e => setRaForm({...raForm, billNo: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Gross Value (₹) <span className="text-red-500">*</span></label>
                    <input type="number" inputMode="decimal" required placeholder="50000" value={raForm.grossAmount} onChange={e => setRaForm({...raForm, grossAmount: e.target.value})} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Retention %</label>
                    <input type="number" inputMode="decimal" value={raForm.retentionPercent} onChange={e => setRaForm({...raForm, retentionPercent: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Previous Paid (₹)</label>
                    <input type="number" inputMode="decimal" placeholder="0" value={raForm.previousPaid} onChange={e => setRaForm({...raForm, previousPaid: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button type="submit" form="raForm" className="w-full py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform">
                Save RA Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: MILESTONE BOTTOM SHEET */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">Add Payment Milestone</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Client Payment Term</p>
              </div>
              <button onClick={() => setIsMilestoneModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <form id="milestoneForm" onSubmit={handleSaveMilestone} className="space-y-4 pb-20">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select required value={milestoneForm.projectId} onChange={e => setMilestoneForm({...milestoneForm, projectId: e.target.value})} className={`${inputClass} appearance-none font-bold`}>
                      <option value="" disabled>Select Project Site...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Stage Name <span className="text-red-500">*</span></label>
                  <input type="text" required placeholder="e.g. 30% Frame Completion" value={milestoneForm.stageName} onChange={e => setMilestoneForm({...milestoneForm, stageName: e.target.value})} className={inputClass} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Percentage (%)</label>
                    <input type="number" inputMode="decimal" placeholder="30" value={milestoneForm.percentage} onChange={e => setMilestoneForm({...milestoneForm, percentage: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                    <input type="number" inputMode="decimal" required placeholder="100000" value={milestoneForm.amount} onChange={e => setMilestoneForm({...milestoneForm, amount: e.target.value})} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Due Date</label>
                  <input type="date" value={milestoneForm.dueDate} onChange={e => setMilestoneForm({...milestoneForm, dueDate: e.target.value})} className={inputClass} />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button type="submit" form="milestoneForm" className="w-full py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform">
                Save Milestone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CHANGE ORDER BOTTOM SHEET */}
      {isCoModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[85vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">Log Scope Variation</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Extra Work & Timeline Impact</p>
              </div>
              <button onClick={() => setIsCoModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <form id="coForm" onSubmit={handleSaveCo} className="space-y-4 pb-20">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select required value={coForm.projectId} onChange={e => setCoForm({...coForm, projectId: e.target.value})} className={`${inputClass} appearance-none font-bold`}>
                      <option value="" disabled>Select Project Site...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Variation Title <span className="text-red-500">*</span></label>
                  <input type="text" required placeholder="e.g. Additional False Ceiling in Hallway" value={coForm.title} onChange={e => setCoForm({...coForm, title: e.target.value})} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Scope Details</label>
                  <textarea placeholder="Client requested extra electrical & woodwork..." value={coForm.description} onChange={e => setCoForm({...coForm, description: e.target.value})} className={`${inputClass} min-h-[80px] resize-none`} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Additional Cost (₹) <span className="text-red-500">*</span></label>
                    <input type="number" inputMode="decimal" required placeholder="25000" value={coForm.additionalCost} onChange={e => setCoForm({...coForm, additionalCost: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Extra Days Needed</label>
                    <input type="number" inputMode="numeric" placeholder="3" value={coForm.extraDays} onChange={e => setCoForm({...coForm, extraDays: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button type="submit" form="coForm" className="w-full py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform">
                Save Scope Variation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}