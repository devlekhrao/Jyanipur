import React, { useState, useEffect } from 'react';
import { 
  getProjects, getSubcontractors,
  getRaBills, saveRaBill,
  getMilestones, saveMilestone, updateMilestoneStatus,
  getChangeOrders, saveChangeOrder,
  saveVaultDocument 
} from '../db';

// Standard Construction & Interior QA/QC Templates
const qaTemplates = {
  WATERPROOFING: {
    title: 'Bathroom Waterproofing',
    items: [
      'Surface cleaned, leveled, and free of dust/debris',
      'Plumbing pressure test completed and passed',
      'First coat of waterproofing chemical applied properly',
      'Glass fibre mesh laid out uniformly without wrinkles',
      'Second coat applied perpendicular to the first coat',
      '48-Hour water pond test completed with no leakage visible below'
    ]
  },
  FALSE_CEILING: {
    title: 'Gypsum False Ceiling',
    items: [
      'Ceiling level marked clearly using laser level',
      'GI framing spacing is accurate (typically 2ft x 2ft)',
      'Wire suspensions are securely fastened to true ceiling',
      'Electrical conduits and AC ducts completed above ceiling',
      'Gypsum boards screwed properly with countersunk screws',
      'Joints taped and jointing compound applied smoothly'
    ]
  },
  ELECTRICAL: {
    title: 'Electrical Concealing',
    items: [
      'Wall chasing depth is adequate for conduits',
      'Conduits laid securely with proper saddles',
      'Switchboard metal boxes are flush with wall plaster level',
      'Wires drawn matching the approved color-coding (Phase/Neutral/Earth)',
      'Insulation resistance (Megger) test passed'
    ]
  }
};

export default function ProjectControl() {
  const [activeTab, setActiveTab] = useState('RA Bills');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Tab Data States (Financial)
  const [raBills, setRaBills] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [changeOrders, setChangeOrders] = useState([]);

  // Tab Data States (Operations - Schedule & QAQC)
  const [tasks, setTasks] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState('');
  const [currentInspection, setCurrentInspection] = useState(null);

  // Modals
  const [isRaModalOpen, setIsRaModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isCoModalOpen, setIsCoModalOpen] = useState(false);

  // Forms
  const [raForm, setRaForm] = useState({ projectId: '', subcontractorId: '', billNo: '', billDate: new Date().toISOString().split('T')[0], grossAmount: '', retentionPercent: 5, previousPaid: '', notes: '', fileUrl: '', fileName: '' });
  const [milestoneForm, setMilestoneForm] = useState({ projectId: '', stageName: '', percentage: '', amount: '', dueDate: '', status: 'Pending', notes: '', fileUrl: '', fileName: '' });
  const [coForm, setCoForm] = useState({ projectId: '', title: '', description: '', additionalCost: '', extraDays: 0, date: new Date().toISOString().split('T')[0], fileUrl: '', fileName: '' });
  const [newTask, setNewTask] = useState({ title: '', startDate: '', endDate: '', status: 'Pending', assignee: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [projs, subs, bills, ms, cos] = await Promise.all([
        getProjects(), getSubcontractors(), getRaBills(selectedProjectId),
        getMilestones(selectedProjectId), getChangeOrders(selectedProjectId)
      ]);
      setProjects(projs || []);
      setSubcontractors(subs || []);
      setRaBills(bills || []);
      setMilestones(ms || []);
      setChangeOrders(cos || []);

      // Mock Operational Data for the selected project to demonstrate the Gantt
      if (selectedProjectId) {
        const today = new Date();
        const d1 = new Date(today); d1.setDate(d1.getDate() - 5);
        const d2 = new Date(today); d2.setDate(d2.getDate() + 2);
        const d3 = new Date(today); d3.setDate(d3.getDate() + 3);
        const d4 = new Date(today); d4.setDate(d4.getDate() + 10);
        
        setTasks([
          { id: 1, title: 'Site Mobilization & Demolition', startDate: d1.toISOString().split('T')[0], endDate: d2.toISOString().split('T')[0], status: 'In Progress', assignee: 'Ramesh' },
          { id: 2, title: 'Plumbing Concealing', startDate: d2.toISOString().split('T')[0], endDate: d3.toISOString().split('T')[0], status: 'Pending', assignee: 'Ali Plumbers' },
          { id: 3, title: 'Bathroom Waterproofing', startDate: d3.toISOString().split('T')[0], endDate: d4.toISOString().split('T')[0], status: 'Pending', assignee: 'Civil Team' }
        ]);
        setInspections([]);
      }
    } catch (e) {
      console.error("Error fetching project control records:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedProjectId]);

  // --- VAULT SYNC HELPER ---
  const handleFileUpload = (e, formSetter) => {
    const file = e.target.files[0];
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      let detectedType = 'FILE';
      if (['pdf'].includes(extension)) detectedType = 'PDF';
      else if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) detectedType = 'IMAGE';

      const reader = new FileReader();
      reader.onloadend = () => { formSetter(prev => ({ ...prev, fileUrl: reader.result, fileName: file.name, fileType: detectedType })); };
      reader.readAsDataURL(file);
    }
  };

  const syncDocumentToVault = async (projectId, docName, category, fileUrl, notes) => {
    if (!fileUrl) return;
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(projectId));
      await saveVaultDocument({
        projectId: projectId ? (Number(projectId) || projectId) : '',
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'General Project',
        documentName: docName, category: category, fileUrl: fileUrl,
        fileType: fileUrl.includes('data:application/pdf') ? 'PDF' : fileUrl.includes('data:image') ? 'IMAGE' : 'FILE',
        notes: notes || 'Auto-synced from Project Financial Control',
        uploadedAt: new Date().toISOString().split('T')[0]
      });
    } catch (err) { console.warn("Vault sync warning:", err); }
  };

  // --- FINANCIAL SUBMITS ---
  const handleSaveRa = async (e) => {
    e.preventDefault();
    const gross = parseFloat(raForm.grossAmount) || 0;
    const retPct = parseFloat(raForm.retentionPercent) || 0;
    const retAmt = (gross * retPct) / 100;
    const prev = parseFloat(raForm.previousPaid) || 0;
    const net = gross - retAmt - prev;

    setSubmitting(true);
    try {
      await saveRaBill({ ...raForm, projectId: Number(raForm.projectId) || raForm.projectId, subcontractorId: Number(raForm.subcontractorId) || raForm.subcontractorId, grossAmount: gross, retentionAmount: retAmt, previousPaid: prev, netPayable: net > 0 ? net : 0, workDoneDetails: { note: raForm.notes } });
      if (raForm.fileUrl) await syncDocumentToVault(raForm.projectId, `RA Bill ${raForm.billNo}`, 'Contracts & Legal', raForm.fileUrl, `Contractor RA Bill - ${raForm.notes}`);
      setIsRaModalOpen(false);
      setRaForm({ projectId: '', subcontractorId: '', billNo: '', billDate: new Date().toISOString().split('T')[0], grossAmount: '', retentionPercent: 5, previousPaid: '', notes: '', fileUrl: '', fileName: '' });
      await loadData();
    } catch (err) { alert("Failed to save RA Bill."); }
    setSubmitting(false);
  };

  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await saveMilestone({ ...milestoneForm, projectId: Number(milestoneForm.projectId) || milestoneForm.projectId, percentage: parseFloat(milestoneForm.percentage) || 0, amount: parseFloat(milestoneForm.amount) || 0 });
      if (milestoneForm.fileUrl) await syncDocumentToVault(milestoneForm.projectId, `Milestone Approval - ${milestoneForm.stageName}`, 'Client Approvals', milestoneForm.fileUrl, milestoneForm.notes);
      setIsMilestoneModalOpen(false);
      setMilestoneForm({ projectId: '', stageName: '', percentage: '', amount: '', dueDate: '', status: 'Pending', notes: '', fileUrl: '', fileName: '' });
      await loadData();
    } catch (err) { alert("Failed to save Milestone."); }
    setSubmitting(false);
  };

  const handleSaveCo = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await saveChangeOrder({ ...coForm, projectId: Number(coForm.projectId) || coForm.projectId, additionalCost: parseFloat(coForm.additionalCost) || 0, extraDays: parseInt(coForm.extraDays) || 0 });
      if (coForm.fileUrl) await syncDocumentToVault(coForm.projectId, `Change Order - ${coForm.title}`, 'Client Approvals', coForm.fileUrl, coForm.description);
      setIsCoModalOpen(false);
      setCoForm({ projectId: '', title: '', description: '', additionalCost: '', extraDays: 0, date: new Date().toISOString().split('T')[0], fileUrl: '', fileName: '' });
      await loadData();
    } catch (err) { alert("Failed to save Change Order."); }
    setSubmitting(false);
  };

  // --- OPERATIONAL SUBMITS (Schedule & QAQC) ---
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.startDate || !newTask.endDate) return alert("Please fill all required task fields.");
    if (new Date(newTask.startDate) > new Date(newTask.endDate)) return alert("End date cannot be before Start date.");
    setTasks([...tasks, { ...newTask, id: Date.now() }]);
    setNewTask({ title: '', startDate: '', endDate: '', status: 'Pending', assignee: '' });
  };

  const handleStartInspection = () => {
    if (!activeTemplate) return;
    const template = qaTemplates[activeTemplate];
    const initialChecks = {};
    template.items.forEach((item, idx) => { initialChecks[idx] = 'PENDING'; });
    
    setCurrentInspection({
      id: Date.now(), templateKey: activeTemplate, title: template.title,
      date: new Date().toISOString().split('T')[0], inspector: 'Site Engineer',
      status: 'In Progress', checks: initialChecks
    });
  };

  const handleCheck = (idx, value) => { setCurrentInspection(prev => ({ ...prev, checks: { ...prev.checks, [idx]: value } })); };

  const handleSaveInspection = () => {
    const allChecked = Object.values(currentInspection.checks).every(val => val !== 'PENDING');
    if (!allChecked) return alert("Please mark Pass/Fail/NA for all checklist items before submitting.");
    const hasFails = Object.values(currentInspection.checks).includes('FAIL');
    const finalStatus = hasFails ? 'FAILED' : 'PASSED';
    setInspections([{ ...currentInspection, status: finalStatus }, ...inspections]);
    setCurrentInspection(null);
    setActiveTemplate('');
    alert(`Inspection saved. Result: ${finalStatus}`);
  };

  // Gantt Math
  const getGanttExtremes = () => {
    if (tasks.length === 0) return { start: new Date(), end: new Date(), totalDays: 1 };
    let minStart = new Date(tasks[0].startDate);
    let maxEnd = new Date(tasks[0].endDate);
    tasks.forEach(t => {
      const s = new Date(t.startDate);
      const e = new Date(t.endDate);
      if (s < minStart) minStart = s;
      if (e > maxEnd) maxEnd = e;
    });
    const totalDays = Math.max(1, Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24)));
    return { start: minStart, end: maxEnd, totalDays };
  };
  const { start: projectStart, totalDays } = getGanttExtremes();

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Project Control Center</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Manage RA Bills, Milestones, Schedules, and QA/QC.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={selectedProjectId} 
            onChange={e => setSelectedProjectId(e.target.value)}
            className={`${inputClass} !w-auto cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.8rem_center] bg-[length:1.25rem_1.25rem] pr-9 h-10`}
          >
            <option value="">All Projects Filter</option>
            {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
          </select>

          {activeTab === 'RA Bills' && (
            <button onClick={() => setIsRaModalOpen(true)} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Generate RA Bill
            </button>
          )}
          {activeTab === 'Milestones' && (
            <button onClick={() => setIsMilestoneModalOpen(true)} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Add Milestone
            </button>
          )}
          {activeTab === 'Change Orders' && (
            <button onClick={() => setIsCoModalOpen(true)} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> New Variation
            </button>
          )}
        </div>
      </div>

      {/* 5 Tabs */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200 w-fit mb-6 shrink-0 overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {['RA Bills', 'Milestones', 'Change Orders', 'Schedule', 'QA/QC'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab === 'Schedule' ? 'Gantt Schedule' : tab === 'QA/QC' ? 'QA/QC Checks' : tab}
          </button>
        ))}
      </div>

      {/* Content Rendering */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
            <p>Syncing control records from cloud DB...</p>
          </div>
        ) : activeTab === 'RA Bills' ? (
          
          /* RA BILLS TABLE */
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200">
                  <th className="py-4 px-6 font-semibold">Bill #</th>
                  <th className="py-4 px-4 font-semibold">Subcontractor</th>
                  <th className="py-4 px-4 font-semibold">Project Site</th>
                  <th className="py-4 px-4 font-semibold text-right">Gross Total</th>
                  <th className="py-4 px-4 font-semibold text-right">Retention</th>
                  <th className="py-4 px-4 font-semibold text-right">Net Payable</th>
                  <th className="py-4 px-6 font-semibold text-center">Attachment</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-100">
                {raBills.length === 0 ? (
                  <tr><td colSpan="7" className="py-12 text-center text-zinc-400 font-medium text-sm">No Running Account Bills generated.</td></tr>
                ) : (
                  raBills.map(b => (
                    <tr key={b.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-4 px-6 font-bold text-[#B45309] text-sm">{b.billNo}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-zinc-800">{b.subName || 'Subcontractor'} {b.trade ? `(${b.trade})` : ''}</td>
                      <td className="py-4 px-4 text-sm text-zinc-600 font-medium">{b.projectName || 'General Site'}</td>
                      <td className="py-4 px-4 text-right font-medium text-sm text-zinc-800">₹{(b.grossAmount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right text-sm text-red-500 font-medium">-₹{(b.retentionAmount || 0).toLocaleString('en-IN')} ({b.retentionPercent}%)</td>
                      <td className="py-4 px-4 text-right font-semibold text-sm text-emerald-600">₹{(b.netPayable || 0).toLocaleString('en-IN')}</td>
                      <td className="py-4 px-6 text-center">
                        {b.fileUrl ? (
                          <a href={b.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309] bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md hover:bg-[#B45309] hover:text-white transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94a3 3 0 114.243 4.243L8.587 18.281a1.5 1.5 0 01-2.122-2.122l8.87-8.87" /></svg>
                            View Doc
                          </a>
                        ) : (
                          <span className="text-zinc-400 text-xs font-medium">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        ) : activeTab === 'Milestones' ? (
          
          /* MILESTONES GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {milestones.length === 0 ? (
              <div className="col-span-full py-16 text-center text-zinc-400 font-medium text-sm bg-white border border-dashed border-zinc-200 rounded-2xl">No client payment milestones created.</div>
            ) : (
              milestones.map(m => (
                <div key={m.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">{m.projectName || 'General Site'}</span>
                      <span className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${m.status === 'Received' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{m.status}</span>
                    </div>
                    <h4 className="font-bold text-zinc-900 text-base mb-1">{m.stageName}</h4>
                    <p className="text-xl font-bold text-zinc-800 mb-3">₹{(m.amount || 0).toLocaleString('en-IN')} <span className="text-xs font-semibold text-zinc-400">({m.percentage}%)</span></p>
                    {m.notes && <p className="text-xs text-zinc-500 mb-4">{m.notes}</p>}
                  </div>
                  <div className="pt-3 border-t border-zinc-100 flex justify-between items-center mt-2">
                    <span className="text-xs text-zinc-500 font-medium">Due: {m.dueDate || 'N/A'}</span>
                    <div className="flex items-center gap-2">
                      {m.fileUrl && (
                        <a href={m.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 text-[#B45309] bg-amber-50 border border-amber-200 rounded-lg hover:bg-[#B45309] hover:text-white transition-all" title="View Attachment">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94a3 3 0 114.243 4.243L8.587 18.281a1.5 1.5 0 01-2.122-2.122l8.87-8.87" /></svg>
                        </a>
                      )}
                      {m.status !== 'Received' && (
                        <button onClick={() => updateMilestoneStatus(m.id, 'Received').then(loadData)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm">Mark Received</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        ) : activeTab === 'Change Orders' ? (
          
          /* CHANGE ORDERS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {changeOrders.length === 0 ? (
              <div className="col-span-full py-16 text-center text-zinc-400 font-medium text-sm bg-white border border-dashed border-zinc-200 rounded-2xl">No change orders or scope variations logged.</div>
            ) : (
              changeOrders.map(co => (
                <div key={co.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">{co.projectName || 'General Site'}</span>
                      <span className="text-xs font-medium text-zinc-400">{co.date}</span>
                    </div>
                    <h4 className="font-bold text-zinc-900 text-base mb-1">{co.title}</h4>
                    <p className="text-xs text-zinc-500 mb-4">{co.description}</p>
                  </div>
                  <div className="pt-3 border-t border-zinc-100 flex justify-between items-center mt-2">
                    <span className="font-bold text-sm text-emerald-600">+₹{(co.additionalCost || 0).toLocaleString('en-IN')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">+{co.extraDays} Days</span>
                      {co.fileUrl && (
                        <a href={co.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 text-[#B45309] bg-amber-50 border border-amber-200 rounded-lg hover:bg-[#B45309] hover:text-white transition-all" title="View Client Approval">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94a3 3 0 114.243 4.243L8.587 18.281a1.5 1.5 0 01-2.122-2.122l8.87-8.87" /></svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        ) : activeTab === 'Schedule' ? (
          
          /* GANTT SCHEDULING */
          <div className="space-y-6">
            {!selectedProjectId ? (
              <div className="p-16 text-center text-zinc-500 bg-white border border-dashed border-zinc-300 rounded-2xl">Please select a Project Site above to view its schedule.</div>
            ) : (
              <>
                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-5">
                  <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-4">Add Schedule Milestone</h3>
                  <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full"><label className={labelClass}>Task / Phase Name</label><input type="text" required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="e.g. Tiling & Flooring" className={inputClass} /></div>
                    <div className="w-full md:w-40"><label className={labelClass}>Start Date</label><input type="date" required value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value})} className={inputClass} /></div>
                    <div className="w-full md:w-40"><label className={labelClass}>End Date</label><input type="date" required value={newTask.endDate} onChange={e => setNewTask({...newTask, endDate: e.target.value})} className={inputClass} /></div>
                    <div className="w-full md:w-48"><label className={labelClass}>Assignee</label><input type="text" value={newTask.assignee} onChange={e => setNewTask({...newTask, assignee: e.target.value})} placeholder="e.g. Subcontractor" className={inputClass} /></div>
                    <button type="submit" className="bg-[#B45309] hover:bg-[#92400E] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all h-10 shrink-0 uppercase tracking-wider">
                      + Add Task
                    </button>
                  </form>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest">Visual Timeline (Gantt)</h3>
                    <span className="text-xs font-bold text-[#B45309] bg-amber-50 px-3 py-1 rounded border border-amber-200">{tasks.length} Active Tasks</span>
                  </div>
                  {tasks.length === 0 ? (
                    <div className="p-16 text-center text-zinc-400 font-medium text-sm">No tasks added to schedule yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-zinc-50 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                            <th className="p-4 w-64 border-r border-zinc-200">Task Details</th>
                            <th className="p-4 relative">
                              Timeline ({totalDays} Days Span)
                              <div className="absolute inset-0 flex justify-between px-4 pointer-events-none opacity-20">
                                {[25, 50, 75, 100].map(pct => (
                                  <div key={pct} className="h-full border-l border-dashed border-zinc-800" style={{ left: `${pct}%`, position: 'absolute' }}></div>
                                ))}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-sm">
                          {tasks.sort((a,b) => new Date(a.startDate) - new Date(b.startDate)).map(task => {
                            const tStart = new Date(task.startDate);
                            const tEnd = new Date(task.endDate);
                            const leftPct = ((tStart - projectStart) / (1000 * 60 * 60 * 24)) / totalDays * 100;
                            const widthPct = Math.max(1, ((tEnd - tStart) / (1000 * 60 * 60 * 24)) / totalDays * 100);
                            return (
                              <tr key={task.id} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="p-4 border-r border-zinc-200">
                                  <p className="font-bold text-zinc-900">{task.title}</p>
                                  <p className="text-[10px] text-zinc-500 font-medium mt-1">{task.startDate} to {task.endDate} • {task.assignee}</p>
                                </td>
                                <td className="p-4 relative">
                                  <div className="relative w-full h-8 bg-zinc-100 rounded-lg overflow-hidden group">
                                    <div 
                                      className="absolute top-0 bottom-0 bg-[#B45309] rounded-lg shadow-sm flex items-center px-2 cursor-pointer hover:brightness-110 transition-all"
                                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                      title={`${task.title} (${task.status})`}
                                    >
                                      {widthPct > 10 && <span className="text-[10px] font-bold text-white truncate">{task.status}</span>}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        ) : activeTab === 'QA/QC' ? (

          /* QA/QC CHECKLISTS */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            {!selectedProjectId ? (
              <div className="lg:col-span-12 p-16 text-center text-zinc-500 bg-white border border-dashed border-zinc-300 rounded-2xl">Please select a Project Site above to run inspections.</div>
            ) : (
              <>
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-5">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Start New Inspection</h3>
                    <div className="space-y-3">
                      <select value={activeTemplate} onChange={e => setActiveTemplate(e.target.value)} className={inputClass} disabled={currentInspection?.id}>
                        <option value="" disabled>Select QA/QC SOP...</option>
                        {Object.keys(qaTemplates).map(key => <option key={key} value={key}>{qaTemplates[key].title}</option>)}
                      </select>
                      <button onClick={handleStartInspection} disabled={!activeTemplate || currentInspection?.id} className="w-full py-3 bg-zinc-900 hover:bg-black text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-sm disabled:opacity-50 transition-all">
                        Initiate Checklist
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 border-b border-zinc-100 bg-zinc-50"><h3 className="text-xs font-bold text-zinc-800 uppercase tracking-widest">Inspection History</h3></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {inspections.map(insp => (
                        <div key={insp.id} className="p-4 border border-zinc-200 rounded-xl bg-zinc-50/50 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-bold text-zinc-900">{insp.title}</h4>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${insp.status === 'PASSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{insp.status}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-medium">Logged: {insp.date} • {insp.inspector}</p>
                        </div>
                      ))}
                      {inspections.length === 0 && <p className="text-xs text-zinc-400 italic text-center py-10">No inspections logged yet.</p>}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8">
                  {!currentInspection ? (
                    <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-16 text-center h-full flex flex-col items-center justify-center">
                      <div className="text-5xl mb-4 opacity-50">📋</div>
                      <h3 className="text-lg font-bold text-zinc-900">No Active Inspection</h3>
                      <p className="text-sm text-zinc-500 font-medium mt-1">Select an SOP template on the left to begin a QA/QC check.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
                      <div className="p-6 border-b border-zinc-100 bg-[#B45309]">
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><span className="text-amber-300">📋</span> SOP: {currentInspection.title}</h3>
                        <p className="text-[11px] font-medium text-amber-100 mt-1">Ensure all steps are physically verified on-site before sign-off.</p>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {qaTemplates[currentInspection.templateKey].items.map((item, idx) => {
                          const status = currentInspection.checks[idx];
                          return (
                            <div key={idx} className={`p-4 border rounded-xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-colors ${
                              status === 'PASS' ? 'bg-emerald-50/30 border-emerald-200' : 
                              status === 'FAIL' ? 'bg-red-50/30 border-red-200' : 
                              'bg-zinc-50 border-zinc-200'
                            }`}>
                              <div className="flex-1 pr-4">
                                <p className="text-sm font-semibold text-zinc-900 leading-snug"><span className="text-zinc-400 mr-2">{idx + 1}.</span> {item}</p>
                              </div>
                              <div className="flex gap-2 shrink-0 bg-white p-1 rounded-lg border border-zinc-200 shadow-sm">
                                <button onClick={() => handleCheck(idx, 'PASS')} className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${status === 'PASS' ? 'bg-emerald-500 text-white shadow-inner' : 'text-zinc-500 hover:bg-emerald-50 hover:text-emerald-600'}`}>Pass</button>
                                <button onClick={() => handleCheck(idx, 'FAIL')} className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${status === 'FAIL' ? 'bg-red-500 text-white shadow-inner' : 'text-zinc-500 hover:bg-red-50 hover:text-red-600'}`}>Fail</button>
                                <button onClick={() => handleCheck(idx, 'NA')} className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${status === 'NA' ? 'bg-zinc-600 text-white shadow-inner' : 'text-zinc-500 hover:bg-zinc-100'}`}>N/A</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-6 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center">
                        <button onClick={() => setCurrentInspection(null)} className="px-5 py-3 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-sm">Cancel Check</button>
                        <button onClick={handleSaveInspection} className="px-8 py-3 bg-[#B45309] hover:bg-[#92400E] text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all shadow-sm">Sign-Off & Save Report</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* RA BILL MODAL */}
      {isRaModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div><h2 className="text-xl font-semibold text-zinc-900">Generate Contractor RA Bill</h2></div>
              <button onClick={() => setIsRaModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="raForm" onSubmit={handleSaveRa} className="space-y-4">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <select required value={raForm.projectId} onChange={e => setRaForm({...raForm, projectId: e.target.value})} className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                    <option value="">Select Project...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Subcontractor <span className="text-red-500">*</span></label>
                  <select required value={raForm.subcontractorId} onChange={e => setRaForm({...raForm, subcontractorId: e.target.value})} className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                    <option value="">Select Worker...</option>
                    {subcontractors.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.trade})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Bill No <span className="text-red-500">*</span></label><input type="text" required placeholder="RA-001" value={raForm.billNo} onChange={e => setRaForm({...raForm, billNo: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Gross Value (₹) <span className="text-red-500">*</span></label><input type="number" step="any" required placeholder="50000" value={raForm.grossAmount} onChange={e => setRaForm({...raForm, grossAmount: e.target.value})} className={inputClass} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Retention %</label><input type="number" step="any" value={raForm.retentionPercent} onChange={e => setRaForm({...raForm, retentionPercent: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Prev Paid (₹)</label><input type="number" step="any" placeholder="0" value={raForm.previousPaid} onChange={e => setRaForm({...raForm, previousPaid: e.target.value})} className={inputClass} /></div>
                </div>
                <div>
                  <label className={labelClass}>Attach Bill Copy</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setRaForm)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#B45309] file:text-white cursor-pointer" />
                </div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsRaModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm transition-all cursor-pointer">Cancel</button>
              <button type="submit" form="raForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] text-white rounded-xl text-sm shadow-sm transition-all cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* MILESTONE MODAL */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-semibold text-zinc-900">Add Payment Milestone</h2>
              <button onClick={() => setIsMilestoneModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="milestoneForm" onSubmit={handleSaveMilestone} className="space-y-4">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <select required value={milestoneForm.projectId} onChange={e => setMilestoneForm({...milestoneForm, projectId: e.target.value})} className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                    <option value="">Select Project...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Stage Name <span className="text-red-500">*</span></label><input type="text" required placeholder="e.g. 30% Frame Completion" value={milestoneForm.stageName} onChange={e => setMilestoneForm({...milestoneForm, stageName: e.target.value})} className={inputClass} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Percentage (%)</label><input type="number" step="any" value={milestoneForm.percentage} onChange={e => setMilestoneForm({...milestoneForm, percentage: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label><input type="number" step="any" required value={milestoneForm.amount} onChange={e => setMilestoneForm({...milestoneForm, amount: e.target.value})} className={inputClass} /></div>
                </div>
                <div><label className={labelClass}>Due Date</label><input type="date" value={milestoneForm.dueDate} onChange={e => setMilestoneForm({...milestoneForm, dueDate: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Attach Document</label><input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setMilestoneForm)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:bg-[#B45309] file:text-white cursor-pointer" /></div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsMilestoneModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm transition-all cursor-pointer">Cancel</button>
              <button type="submit" form="milestoneForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] text-white rounded-xl text-sm shadow-sm transition-all cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE ORDER MODAL */}
      {isCoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-semibold text-zinc-900">Log Scope Change</h2>
              <button onClick={() => setIsCoModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="coForm" onSubmit={handleSaveCo} className="space-y-4">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <select required value={coForm.projectId} onChange={e => setCoForm({...coForm, projectId: e.target.value})} className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                    <option value="">Select Project...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Variation Title <span className="text-red-500">*</span></label><input type="text" required value={coForm.title} onChange={e => setCoForm({...coForm, title: e.target.value})} className={inputClass} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={labelClass}>Additional Cost (₹) <span className="text-red-500">*</span></label><input type="number" step="any" required value={coForm.additionalCost} onChange={e => setCoForm({...coForm, additionalCost: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Extra Days Needed</label><input type="number" value={coForm.extraDays} onChange={e => setCoForm({...coForm, extraDays: e.target.value})} className={inputClass} /></div>
                </div>
                <div><label className={labelClass}>Attach Approval Document</label><input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setCoForm)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:bg-[#B45309] file:text-white cursor-pointer" /></div>
              </form>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsCoModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm transition-all cursor-pointer">Cancel</button>
              <button type="submit" form="coForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] text-white rounded-xl text-sm shadow-sm transition-all cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}