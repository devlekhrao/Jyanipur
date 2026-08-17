import React, { useState, useEffect } from 'react';
import { 
  getProjects, getSubcontractors,
  getRaBills, saveRaBill,
  getMilestones, saveMilestone, updateMilestoneStatus,
  getChangeOrders, saveChangeOrder,
  saveVaultDocument 
} from '../db';

export default function ProjectControl() {
  const [activeTab, setActiveTab] = useState('RA Bills');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
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

  // Forms with Document Support
  const [raForm, setRaForm] = useState({
    projectId: '', subcontractorId: '', billNo: '', billDate: new Date().toISOString().split('T')[0],
    grossAmount: '', retentionPercent: 5, previousPaid: '', notes: '', fileUrl: '', fileName: ''
  });

  const [milestoneForm, setMilestoneForm] = useState({
    projectId: '', stageName: '', percentage: '', amount: '', dueDate: '', status: 'Pending', notes: '', fileUrl: '', fileName: ''
  });

  const [coForm, setCoForm] = useState({
    projectId: '', title: '', description: '', additionalCost: '', extraDays: 0, date: new Date().toISOString().split('T')[0], fileUrl: '', fileName: ''
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
      console.error("Error fetching project control records from cloud DB:", e);
      setProjects([]);
      setSubcontractors([]);
      setRaBills([]);
      setMilestones([]);
      setChangeOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedProjectId]);

  // Helper for File Upload & Vault Sync
  const handleFileUpload = (e, formSetter) => {
    const file = e.target.files[0];
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      let detectedType = 'FILE';
      if (['pdf'].includes(extension)) detectedType = 'PDF';
      else if (['jpg', 'jpeg', 'png', 'webp'].includes(extension)) detectedType = 'IMAGE';

      const reader = new FileReader();
      reader.onloadend = () => {
        formSetter(prev => ({
          ...prev,
          fileUrl: reader.result,
          fileName: file.name,
          fileType: detectedType
        }));
      };
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
        documentName: docName,
        category: category,
        fileUrl: fileUrl,
        fileType: fileUrl.includes('data:application/pdf') ? 'PDF' : fileUrl.includes('data:image') ? 'IMAGE' : 'FILE',
        notes: notes || 'Auto-synced from Project Financial Control',
        uploadedAt: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      console.warn("Vault sync warning:", err);
    }
  };

  // Handle RA Bill Save
  const handleSaveRa = async (e) => {
    e.preventDefault();
    const gross = parseFloat(raForm.grossAmount) || 0;
    const retPct = parseFloat(raForm.retentionPercent) || 0;
    const retAmt = (gross * retPct) / 100;
    const prev = parseFloat(raForm.previousPaid) || 0;
    const net = gross - retAmt - prev;

    const payload = {
      ...raForm,
      projectId: raForm.projectId ? (Number(raForm.projectId) || raForm.projectId) : '',
      subcontractorId: raForm.subcontractorId ? (Number(raForm.subcontractorId) || raForm.subcontractorId) : '',
      grossAmount: gross,
      retentionAmount: retAmt,
      previousPaid: prev,
      netPayable: net > 0 ? net : 0,
      workDoneDetails: { note: raForm.notes }
    };

    setSubmitting(true);
    try {
      await saveRaBill(payload);

      // Sync attachment to Document Vault
      if (raForm.fileUrl) {
        await syncDocumentToVault(
          raForm.projectId, 
          `RA Bill ${raForm.billNo}`, 
          'Contracts & Legal', 
          raForm.fileUrl, 
          `Contractor RA Bill - ${raForm.notes}`
        );
      }

      setIsRaModalOpen(false);
      setRaForm({ projectId: '', subcontractorId: '', billNo: '', billDate: new Date().toISOString().split('T')[0], grossAmount: '', retentionPercent: 5, previousPaid: '', notes: '', fileUrl: '', fileName: '' });
      await loadData();
    } catch (err) {
      alert("Failed to save RA Bill. Check DB connection.");
    }
    setSubmitting(false);
  };

  // Handle Milestone Save
  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    const payload = {
      ...milestoneForm,
      projectId: milestoneForm.projectId ? (Number(milestoneForm.projectId) || milestoneForm.projectId) : '',
      percentage: parseFloat(milestoneForm.percentage) || 0,
      amount: parseFloat(milestoneForm.amount) || 0
    };

    setSubmitting(true);
    try {
      await saveMilestone(payload);

      // Sync attachment to Document Vault
      if (milestoneForm.fileUrl) {
        await syncDocumentToVault(
          milestoneForm.projectId, 
          `Milestone Approval - ${milestoneForm.stageName}`, 
          'Client Approvals', 
          milestoneForm.fileUrl, 
          milestoneForm.notes
        );
      }

      setIsMilestoneModalOpen(false);
      setMilestoneForm({ projectId: '', stageName: '', percentage: '', amount: '', dueDate: '', status: 'Pending', notes: '', fileUrl: '', fileName: '' });
      await loadData();
    } catch (err) {
      alert("Failed to save Milestone.");
    }
    setSubmitting(false);
  };

  // Handle Change Order Save
  const handleSaveCo = async (e) => {
    e.preventDefault();
    const payload = {
      ...coForm,
      projectId: coForm.projectId ? (Number(coForm.projectId) || coForm.projectId) : '',
      additionalCost: parseFloat(coForm.additionalCost) || 0,
      extraDays: parseInt(coForm.extraDays) || 0
    };

    setSubmitting(true);
    try {
      await saveChangeOrder(payload);

      // Sync attachment to Document Vault
      if (coForm.fileUrl) {
        await syncDocumentToVault(
          coForm.projectId, 
          `Change Order - ${coForm.title}`, 
          'Client Approvals', 
          coForm.fileUrl, 
          coForm.description
        );
      }

      setIsCoModalOpen(false);
      setCoForm({ projectId: '', title: '', description: '', additionalCost: '', extraDays: 0, date: new Date().toISOString().split('T')[0], fileUrl: '', fileName: '' });
      await loadData();
    } catch (err) {
      alert("Failed to save Change Order.");
    }
    setSubmitting(false);
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Project Financial Control</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Manage Contractor RA Bills, Payment Milestones & Change Orders.</p>
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Generate RA Bill
            </button>
          )}
          {activeTab === 'Milestones' && (
            <button onClick={() => setIsMilestoneModalOpen(true)} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Milestone
            </button>
          )}
          {activeTab === 'Change Orders' && (
            <button onClick={() => setIsCoModalOpen(true)} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              New Variation
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200 w-fit mb-6 shrink-0">
        {['RA Bills', 'Milestones', 'Change Orders'].map(tab => (
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

      {/* Content Rendering */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
            <p>Syncing financial records from cloud DB...</p>
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
              <div className="col-span-full py-16 text-center text-zinc-400 font-medium text-sm bg-white border border-dashed border-zinc-200 rounded-2xl">
                No client payment milestones created.
              </div>
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

        ) : (
          
          /* CHANGE ORDERS GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {changeOrders.length === 0 ? (
              <div className="col-span-full py-16 text-center text-zinc-400 font-medium text-sm bg-white border border-dashed border-zinc-200 rounded-2xl">
                No change orders or scope variations logged.
              </div>
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

        )}
      </div>

      {/* RA BILL MODAL */}
      {isRaModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Generate Contractor RA Bill</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Calculate retention and sync attachments to Vault</p>
              </div>
              <button onClick={() => setIsRaModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                  <div>
                    <label className={labelClass}>Bill No <span className="text-red-500">*</span></label>
                    <input type="text" required placeholder="RA-001" value={raForm.billNo} onChange={e => setRaForm({...raForm, billNo: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Gross Value (₹) <span className="text-red-500">*</span></label>
                    <input type="number" step="any" required placeholder="50000" value={raForm.grossAmount} onChange={e => setRaForm({...raForm, grossAmount: e.target.value})} className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Retention %</label>
                    <input type="number" step="any" value={raForm.retentionPercent} onChange={e => setRaForm({...raForm, retentionPercent: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Previous Paid (₹)</label>
                    <input type="number" step="any" placeholder="0" value={raForm.previousPaid} onChange={e => setRaForm({...raForm, previousPaid: e.target.value})} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Attach Supporting Bill / Measurement Copy</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setRaForm)} className="w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#B45309] file:text-white hover:file:bg-[#92400E] cursor-pointer" />
                  {raForm.fileName && <p className="text-xs text-emerald-600 font-semibold mt-1">Attached: {raForm.fileName} (Will sync to Vault)</p>}
                </div>

                <div>
                  <label className={labelClass}>Notes / Work Done Remarks</label>
                  <textarea value={raForm.notes} onChange={e => setRaForm({...raForm, notes: e.target.value})} placeholder="Details of work certified..." className={`${inputClass} resize-y min-h-[60px]`} />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsRaModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="raForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save RA Bill'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MILESTONE MODAL */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Add Payment Milestone</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Track client payment stages</p>
              </div>
              <button onClick={() => setIsMilestoneModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="milestoneForm" onSubmit={handleSaveMilestone} className="space-y-4">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <select required value={milestoneForm.projectId} onChange={e => setMilestoneForm({...milestoneForm, projectId: e.target.value})} className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                    <option value="">Select Project...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Stage Name <span className="text-red-500">*</span></label>
                  <input type="text" required placeholder="e.g. 30% Frame Completion" value={milestoneForm.stageName} onChange={e => setMilestoneForm({...milestoneForm, stageName: e.target.value})} className={inputClass} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Percentage (%)</label>
                    <input type="number" step="any" value={milestoneForm.percentage} onChange={e => setMilestoneForm({...milestoneForm, percentage: e.target.value})} className={inputClass} placeholder="30" />
                  </div>
                  <div>
                    <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                    <input type="number" step="any" required value={milestoneForm.amount} onChange={e => setMilestoneForm({...milestoneForm, amount: e.target.value})} className={inputClass} placeholder="150000" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Due Date</label>
                  <input type="date" value={milestoneForm.dueDate} onChange={e => setMilestoneForm({...milestoneForm, dueDate: e.target.value})} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Attach Approval Document / Signoff</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setMilestoneForm)} className="w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#B45309] file:text-white hover:file:bg-[#92400E] cursor-pointer" />
                  {milestoneForm.fileName && <p className="text-xs text-emerald-600 font-semibold mt-1">Attached: {milestoneForm.fileName} (Will sync to Vault)</p>}
                </div>

                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea value={milestoneForm.notes} onChange={e => setMilestoneForm({...milestoneForm, notes: e.target.value})} placeholder="Specific stage deliverables..." className={`${inputClass} resize-y min-h-[60px]`} />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsMilestoneModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="milestoneForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Milestone'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CHANGE ORDER MODAL */}
      {isCoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Log Scope Change / Variation</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Track extra cost & time extensions</p>
              </div>
              <button onClick={() => setIsCoModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="coForm" onSubmit={handleSaveCo} className="space-y-4">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <select required value={coForm.projectId} onChange={e => setCoForm({...coForm, projectId: e.target.value})} className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                    <option value="">Select Project...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Variation Title <span className="text-red-500">*</span></label>
                  <input type="text" required placeholder="e.g. Additional False Ceiling in Hallway" value={coForm.title} onChange={e => setCoForm({...coForm, title: e.target.value})} className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Description / Client Justification</label>
                  <textarea value={coForm.description} onChange={e => setCoForm({...coForm, description: e.target.value})} placeholder="Reason for scope change..." className={`${inputClass} resize-y min-h-[60px]`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Additional Cost (₹) <span className="text-red-500">*</span></label>
                    <input type="number" step="any" required value={coForm.additionalCost} onChange={e => setCoForm({...coForm, additionalCost: e.target.value})} className={inputClass} placeholder="25000" />
                  </div>
                  <div>
                    <label className={labelClass}>Extra Days Needed</label>
                    <input type="number" value={coForm.extraDays} onChange={e => setCoForm({...coForm, extraDays: e.target.value})} className={inputClass} placeholder="5" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Attach Client Approval / Signed Change Order</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setCoForm)} className="w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#B45309] file:text-white hover:file:bg-[#92400E] cursor-pointer" />
                  {coForm.fileName && <p className="text-xs text-emerald-600 font-semibold mt-1">Attached: {coForm.fileName} (Will sync to Vault)</p>}
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsCoModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="coForm" disabled={submitting} className="px-6 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Variation'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}