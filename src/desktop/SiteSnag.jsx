import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { sendWhatsAppMessage } from '../WhatsAppHelper';
import { exportToCSV } from '../utils';

export default function SiteSnag({ companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snags, setSnags] = useState([]);
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  
  // Filtering & View Modes
  const [activeFilter, setActiveFilter] = useState('All'); // 'All', 'Open', 'In Progress', 'Resolved'
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedSubcontractor, setSelectedSubcontractor] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [activeSnagForResolve, setActiveSnagForResolve] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    projectId: '',
    title: '',
    roomLocation: '',
    description: '',
    subcontractor: '',
    priority: 'Medium',
    status: 'Open',
    costToRectify: '',
    photoUrl: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Rectification Verification Form State
  const [resolveForm, setResolveForm] = useState({
    rectifiedPhotoUrl: '',
    resolutionNotes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [snagData, projData, subData] = await Promise.all([
        db.getSnags ? db.getSnags() : Promise.resolve([]),
        db.getProjects ? db.getProjects() : Promise.resolve([]),
        db.getSubcontractors ? db.getSubcontractors() : Promise.resolve([])
      ]);

      // Cache fallback resilience
      const cachedSnags = JSON.parse(localStorage.getItem('jyanipur_snags') || '[]');
      const combinedSnags = [...(snagData || [])];
      cachedSnags.forEach(cs => {
        if (!combinedSnags.some(s => String(s.id || s._id) === String(cs.id || cs._id))) {
          combinedSnags.push(cs);
        }
      });

      combinedSnags.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

      setSnags(combinedSnags);
      setProjects((projData || []).filter(p => p.status !== 'Completed'));
      setSubcontractors(subData || []);
    } catch (e) {
      console.error("Error loading quality snags:", e);
      setSnags([]);
      setProjects([]);
      setSubcontractors([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePhotoUpload = (e, targetField = 'photoUrl', isResolve = false) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isResolve) {
          setResolveForm(prev => ({ ...prev, [targetField]: reader.result }));
        } else {
          setFormData(prev => ({ ...prev, [targetField]: reader.result }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- AUTOMATION: ATOMIC DEFECT RECORDING & SYNC ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.projectId || !formData.title.trim()) {
      alert("Please select a Project Site and enter a Defect Title.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(formData.projectId));
      const payload = {
        ...formData,
        id: formData.id || Date.now(),
        projectId: Number(formData.projectId) || formData.projectId,
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'Site Execution',
        costToRectify: parseFloat(formData.costToRectify) || 0,
        date: formData.date || new Date().toISOString().split('T')[0]
      };

      if (typeof db.saveSnag === 'function') {
        await db.saveSnag(payload);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_snags') || '[]');
        const updated = [payload, ...cached.filter(s => String(s.id || s._id) !== String(payload.id))];
        localStorage.setItem('jyanipur_snags', JSON.stringify(updated));
      }

      setIsModalOpen(false);
      setFormData({
        id: null,
        projectId: '',
        title: '',
        roomLocation: '',
        description: '',
        subcontractor: '',
        priority: 'Medium',
        status: 'Open',
        costToRectify: '',
        photoUrl: '',
        date: new Date().toISOString().split('T')[0]
      });
      await loadData();
      alert(`Snag Ticket "${payload.title}" recorded!`);
    } catch (err) {
      console.error("Failed to save snag:", err);
      alert("Failed to save snag defect.");
    }
    setSubmitting(false);
  };

  // --- AUTOMATION: STATUS CHANGE & VERIFICATION MODAL TRIGGER ---
  const handleStatusChange = async (snag, newStatus) => {
    if (newStatus === 'Resolved') {
      setActiveSnagForResolve(snag);
      setResolveForm({
        rectifiedPhotoUrl: snag.rectifiedPhotoUrl || '',
        resolutionNotes: snag.resolutionNotes || ''
      });
      setIsResolveModalOpen(true);
      return;
    }

    try {
      if (typeof db.updateSnagStatus === 'function') {
        await db.updateSnagStatus(snag.id || snag._id, newStatus);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_snags') || '[]');
        const updated = cached.map(s => String(s.id || s._id) === String(snag.id || snag._id) ? { ...s, status: newStatus } : s);
        localStorage.setItem('jyanipur_snags', JSON.stringify(updated));
      }
      await loadData();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Confirm Verification & Rectification Sign-off
  const handleConfirmResolution = async (e) => {
    e.preventDefault();
    if (!activeSnagForResolve) return;

    setSubmitting(true);
    try {
      const snagId = activeSnagForResolve.id || activeSnagForResolve._id;
      const updatedPayload = {
        ...activeSnagForResolve,
        status: 'Resolved',
        rectifiedPhotoUrl: resolveForm.rectifiedPhotoUrl,
        resolutionNotes: resolveForm.resolutionNotes,
        resolvedDate: new Date().toISOString().split('T')[0]
      };

      if (typeof db.saveSnag === 'function') {
        await db.saveSnag(updatedPayload);
      } else if (typeof db.updateSnagStatus === 'function') {
        await db.updateSnagStatus(snagId, 'Resolved');
      }

      const cached = JSON.parse(localStorage.getItem('jyanipur_snags') || '[]');
      const updatedCache = cached.map(s => String(s.id || s._id) === String(snagId) ? updatedPayload : s);
      localStorage.setItem('jyanipur_snags', JSON.stringify(updatedCache));

      setIsResolveModalOpen(false);
      setActiveSnagForResolve(null);
      await loadData();
      alert("Defect verified and marked RESOLVED! Punch list clearance updated.");
    } catch (err) {
      alert("Failed to confirm resolution.");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this quality defect ticket?")) {
      setLoading(true);
      try {
        if (typeof db.deleteSnag === 'function') {
          await db.deleteSnag(id);
        } else {
          const cached = JSON.parse(localStorage.getItem('jyanipur_snags') || '[]');
          const updated = cached.filter(s => String(s.id || s._id) !== String(id));
          localStorage.setItem('jyanipur_snags', JSON.stringify(updated));
        }
        await loadData();
      } catch (err) {
        console.error("Deletion error:", err);
      }
    }
  };

  // --- AUTOMATION: 1-CLICK WHATSAPP NOTICE TO SUBCONTRACTOR ---
  const notifySubcontractor = (snag) => {
    const sub = subcontractors.find(s => s.name === snag.subcontractor || (s.trade && s.trade.toLowerCase() === snag.subcontractor?.toLowerCase()));
    const phone = sub?.phone || prompt(`Enter contact number for ${snag.subcontractor || 'Contractor'} (+91):`);
    if (!phone) return;

    const msg = `*QUALITY DEFECT PUNCH TICKET - ${companySettings.companyName || 'Jyanipur Interiors'}*\n\n` +
                `Site: *${snag.projectName || 'Site Execution'}*\n` +
                (snag.roomLocation ? `Location: *${snag.roomLocation}*\n` : '') +
                `Defect: *${snag.title}*\n` +
                `Priority: *${snag.priority.toUpperCase()}*\n` +
                `Current Status: *${snag.status.toUpperCase()}*\n` +
                (snag.description ? `Instructions: ${snag.description}\n` : '') +
                `\n*Action Required:* Please dispatch your technician to clear this defect prior to final bill certification & retention release.`;
    
    sendWhatsAppMessage(phone, msg);
  };

  const handleExportPunchList = () => {
    const data = filteredSnags.map(s => ({
      'Ticket Date': s.date || '-',
      'Project Site': s.projectName || 'General Site',
      'Room Location': s.roomLocation || '-',
      'Defect Title': s.title,
      'Detailed Instructions': s.description || '-',
      'Assigned Subcontractor': s.subcontractor || 'Unassigned',
      'Priority': s.priority,
      'Current Status': s.status,
      'Estimated Rectification Cost': s.costToRectify || 0,
      'Resolved Date': s.resolvedDate || '-'
    }));
    exportToCSV(`Jyanipur_Punch_List_${selectedProject}_${new Date().toISOString().split('T')[0]}`, data);
  };

  // Filtering
  const filteredSnags = snags.filter(s => {
    const matchesStatus = activeFilter === 'All' || s.status === activeFilter;
    const matchesProj = selectedProject === 'All' || String(s.projectId) === String(selectedProject);
    const matchesSub = selectedSubcontractor === 'All' || s.subcontractor === selectedSubcontractor;
    
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.projectName && s.projectName.toLowerCase().includes(q)) ||
      (s.roomLocation && s.roomLocation.toLowerCase().includes(q)) ||
      (s.subcontractor && s.subcontractor.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q))
    );

    return matchesStatus && matchesProj && matchesSub && matchesSearch;
  });

  // KPI Metrics
  const openCount = snags.filter(s => s.status === 'Open').length;
  const inProgressCount = snags.filter(s => s.status === 'In Progress').length;
  const resolvedCount = snags.filter(s => s.status === 'Resolved').length;
  const criticalCount = snags.filter(s => s.priority === 'High' && s.status !== 'Resolved').length;

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Quality Punch List & Snag Management</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Log site defects, route tickets to trade gangs, gate final handovers, and verify photo rectifications.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-auto focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
            <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search snag, room, contractor..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full md:w-48 placeholder:text-zinc-400" 
            />
          </div>

          {/* Site Selector */}
          <select 
            value={selectedProject} 
            onChange={e => setSelectedProject(e.target.value)} 
            className="h-10 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-800 px-3 py-2 outline-none cursor-pointer shadow-sm"
          >
            <option value="All">All Projects</option>
            {projects.map(p => (
              <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>
            ))}
          </select>

          {/* Subcontractor Filter */}
          <select 
            value={selectedSubcontractor} 
            onChange={e => setSelectedSubcontractor(e.target.value)} 
            className="h-10 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-800 px-3 py-2 outline-none cursor-pointer shadow-sm"
          >
            <option value="All">All Subcontractors</option>
            {subcontractors.map(s => (
              <option key={s.id || s._id} value={s.name}>{s.name} ({s.trade})</option>
            ))}
          </select>

          {/* Grid / Table Toggle */}
          <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
              title="Card Grid View"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded cursor-pointer ${viewMode === 'table' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
              title="Punch List Table View"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

          <button 
            onClick={handleExportPunchList}
            className="h-10 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Punch List CSV
          </button>

          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 h-10 border border-black"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Defect Snag
          </button>
        </div>
      </div>

      {/* COMMERCIAL GATEKEEPER BANNER */}
      {criticalCount > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
              !
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-red-900">
                Final Handover & Subcontractor Retention Release Gated
              </p>
              <p className="text-[11px] font-medium text-red-700 mt-0.5">
                {criticalCount} critical high-priority defect{criticalCount > 1 ? 's' : ''} currently unverified. Subcontractor retention releases must be held until all snags are signed off.
              </p>
            </div>
          </div>
          <button
            onClick={() => { setActiveFilter('Open'); setSelectedSubcontractor('All'); }}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold uppercase tracking-widest rounded-lg shadow-sm transition-all"
          >
            View Critical Defects
          </button>
        </div>
      )}

      {/* KPI TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 shrink-0 print:hidden">
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Open Snags</span>
            <p className="text-3xl font-black text-red-600 tracking-tight">{openCount}</p>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">In Progress</span>
            <p className="text-3xl font-black text-amber-600 tracking-tight">{inProgressCount}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.07a4.5 4.5 0 004.486-6.32l-3.27 3.27-2.955-.591-.591-2.955 3.27-3.27a4.5 4.5 0 00-6.32 4.486c.118.58.094 1.193-.07 1.743" />
            </svg>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-1">Verified Handovers</span>
            <p className="text-3xl font-black text-emerald-800 tracking-tight">{resolvedCount}</p>
          </div>
          <div className="w-12 h-12 bg-white text-emerald-700 rounded-xl flex items-center justify-center border border-emerald-200 shadow-sm">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-zinc-900 border border-black p-6 rounded-xl shadow-sm flex items-center justify-between text-white">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest block mb-1 opacity-80">Resolution Rate</span>
            <p className="text-3xl font-black tracking-tight">
              {snags.length > 0 ? Math.round((resolvedCount / snags.length) * 100) : 100}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS */}
      <div className="flex gap-2 mb-4 p-1 bg-zinc-100 rounded-lg w-fit shrink-0 border border-zinc-200 print:hidden">
        {['All', 'Open', 'In Progress', 'Resolved'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveFilter(tab)} 
            className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeFilter === tab ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab} ({
              tab === 'All' ? snags.length :
              tab === 'Open' ? openCount :
              tab === 'In Progress' ? inProgressCount : resolvedCount
            })
          </button>
        ))}
      </div>

      {/* CONTENT: GRID VS TABLE */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex flex-col items-center justify-center space-y-3 flex-1">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
          <p>Syncing quality punch list from database...</p>
        </div>
      ) : filteredSnags.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest flex-1 flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3 text-zinc-400 border border-zinc-200">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          No defects or snags matching this filter.
        </div>
      ) : viewMode === 'grid' ? (
        
        /* CARD GRID VIEW */
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 [&::-webkit-scrollbar]:hidden pb-10">
          {filteredSnags.map(snag => (
            <div 
              key={snag.id || snag._id} 
              className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:border-zinc-400 transition-all flex flex-col justify-between group relative"
            >
              <button 
                onClick={() => handleDelete(snag.id || snag._id)} 
                className="absolute top-4 right-4 text-zinc-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                title="Delete Defect"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <div>
                <div className="flex justify-between items-start mb-2 pr-6">
                  <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded truncate max-w-[140px]">
                    {snag.projectName || 'Site Execution'}
                  </span>
                  <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                    snag.priority === 'High' 
                      ? 'bg-red-50 text-red-700 border-red-200' 
                      : snag.priority === 'Low'
                      ? 'bg-zinc-50 text-zinc-500 border-zinc-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {snag.priority}
                  </span>
                </div>

                {snag.roomLocation && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 block mb-1">
                    Loc: {snag.roomLocation}
                  </span>
                )}

                <h4 className="font-bold text-zinc-900 text-sm mb-1.5 tracking-tight">{snag.title}</h4>
                {snag.description && (
                  <p className="text-xs text-zinc-500 mb-3 leading-relaxed font-medium line-clamp-3">
                    {snag.description}
                  </p>
                )}

                {/* DEFECT PHOTO PREVIEW */}
                {(snag.photoUrl || snag.photo_link) && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-zinc-200 h-32 bg-zinc-50 flex items-center justify-center">
                    <img src={snag.photoUrl || snag.photo_link} alt="Defect" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* RECTIFIED PROOF PHOTO */}
                {snag.rectifiedPhotoUrl && (
                  <div className="mb-3 p-2 bg-emerald-50/50 rounded-lg border border-emerald-200">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-800 block mb-1">✓ Rectification Verified Photo</span>
                    <img src={snag.rectifiedPhotoUrl} alt="Rectified Proof" className="w-full h-24 object-cover rounded" />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-100 space-y-3 mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Trade Agency</span>
                  <span className="font-bold text-zinc-800 truncate max-w-[140px]">{snag.subcontractor || snag.assignedTo || 'Unassigned'}</span>
                </div>

                <div className="flex justify-between items-center gap-2">
                  <button 
                    onClick={() => notifySubcontractor(snag)} 
                    className="px-2.5 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all flex items-center gap-1"
                    title="Send WhatsApp Notice to Trade Agency"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Notify WA
                  </button>

                  <select 
                    value={snag.status || 'Open'} 
                    onChange={e => handleStatusChange(snag, e.target.value)} 
                    className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:0.75rem_0.75rem] pr-6 pl-2.5 py-1.5 rounded-md border outline-none cursor-pointer transition-all text-[9px] font-bold uppercase tracking-widest ${
                      snag.status === 'Resolved' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                        : snag.status === 'In Progress' 
                        ? 'bg-amber-50 text-amber-800 border-amber-300' 
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

      ) : (

        /* HIGH-DENSITY PUNCH LIST TABLE VIEW */
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-200 sticky top-0 z-10">
                  <th className="py-3.5 px-6 w-32">Date</th>
                  <th className="py-3.5 px-6 w-44">Project Site</th>
                  <th className="py-3.5 px-6 w-36">Room / Location</th>
                  <th className="py-3.5 px-6">Defect Description</th>
                  <th className="py-3.5 px-6 w-44">Assigned Contractor</th>
                  <th className="py-3.5 px-6 text-center w-28">Priority</th>
                  <th className="py-3.5 px-6 text-center w-36">Status</th>
                  <th className="py-3.5 px-6 text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredSnags.map(snag => (
                  <tr key={snag.id || snag._id} className="hover:bg-zinc-50/80 transition-colors group">
                    <td className="py-4 px-6 text-xs font-mono font-bold text-zinc-500">{snag.date || '-'}</td>
                    <td className="py-4 px-6 font-bold text-xs text-zinc-900 tracking-tight">{snag.projectName}</td>
                    <td className="py-4 px-6 text-xs text-zinc-600 font-medium">{snag.roomLocation || '-'}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-sm text-zinc-900 tracking-tight">{snag.title}</p>
                      {snag.description && <p className="text-[10px] text-zinc-500 truncate max-w-md mt-0.5">{snag.description}</p>}
                    </td>
                    <td className="py-4 px-6 text-xs font-bold text-zinc-800">{snag.subcontractor || snag.assignedTo || 'Unassigned'}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                        snag.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                        snag.priority === 'Low' ? 'bg-zinc-50 text-zinc-500 border-zinc-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {snag.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <select 
                        value={snag.status || 'Open'} 
                        onChange={e => handleStatusChange(snag, e.target.value)} 
                        className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border outline-none cursor-pointer ${
                          snag.status === 'Resolved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                          snag.status === 'In Progress' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => notifySubcontractor(snag)} 
                          className="px-2 py-1 bg-zinc-100 hover:bg-zinc-900 hover:text-white rounded text-[9px] font-bold uppercase tracking-widest border border-zinc-200"
                          title="WhatsApp Notice"
                        >
                          Notify
                        </button>
                        <button 
                          onClick={() => handleDelete(snag.id || snag._id)} 
                          className="p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {/* --- ADD DEFECT SNAG MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Report Quality Defect</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Punch List Ticket</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-4 overflow-y-auto bg-zinc-50/50">
              <div>
                <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                <select 
                  required 
                  value={formData.projectId} 
                  onChange={e => setFormData({...formData, projectId: e.target.value})} 
                  className={`${inputClass} font-bold`}
                >
                  <option value="" disabled>Select Project Site...</option>
                  {projects.map(p => (
                    <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Room / Site Location</label>
                  <input 
                    type="text" 
                    value={formData.roomLocation} 
                    onChange={e => setFormData({...formData, roomLocation: e.target.value})} 
                    placeholder="e.g. Master Bed Wardrobe" 
                    className={inputClass} 
                  />
                </div>
                <div>
                  <label className={labelClass}>Defect Priority</label>
                  <select 
                    value={formData.priority} 
                    onChange={e => setFormData({...formData, priority: e.target.value})} 
                    className={`${inputClass} font-bold`}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High (Gates Handover)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Defect Title <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  placeholder="e.g. Laminate bubbling on corner dresser" 
                  className={inputClass} 
                />
              </div>

              <div>
                <label className={labelClass}>Detailed Fix Instructions</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Scrape old adhesive, clamp with heat gun, re-trim..." 
                  className={`${inputClass} resize-y min-h-[70px] leading-relaxed`} 
                />
              </div>

              <div>
                <label className={labelClass}>Assign Subcontractor / Agency</label>
                <select 
                  value={formData.subcontractor} 
                  onChange={e => setFormData({...formData, subcontractor: e.target.value})} 
                  className={`${inputClass} font-bold`}
                >
                  <option value="">Choose contractor...</option>
                  {subcontractors.map(s => (
                    <option key={s.id || s._id} value={s.name}>{s.name} ({s.trade})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Attach Defect Photo</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => handlePhotoUpload(e, 'photoUrl', false)} 
                  className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-zinc-200 file:text-zinc-900 cursor-pointer border border-zinc-200 rounded-lg bg-zinc-50" 
                />
                {formData.photoUrl && (
                  <div className="mt-2.5 relative w-full h-32 rounded-lg overflow-hidden border border-zinc-200">
                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, photoUrl: ''})} 
                      className="absolute top-2 right-2 bg-black text-white w-5 h-5 rounded flex items-center justify-center text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest border border-black cursor-pointer">
                  {submitting ? 'Saving...' : 'Save Snag Defect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RESOLUTION VERIFICATION MODAL --- */}
      {isResolveModalOpen && activeSnagForResolve && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-zinc-200">
            <div className="px-8 py-6 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Verify Rectification</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Inspection Sign-off</p>
              </div>
              <button onClick={() => { setIsResolveModalOpen(false); setActiveSnagForResolve(null); }} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmResolution} className="p-8 space-y-4 bg-zinc-50/50">
              <div className="p-3 bg-white border border-zinc-200 rounded-lg">
                <p className="text-xs font-bold text-zinc-900">{activeSnagForResolve.title}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{activeSnagForResolve.projectName} • {activeSnagForResolve.subcontractor || 'General Agency'}</p>
              </div>

              <div>
                <label className={labelClass}>Upload Rectified Proof Photo</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={e => handlePhotoUpload(e, 'rectifiedPhotoUrl', true)} 
                  className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-zinc-200 file:text-zinc-900 cursor-pointer border border-zinc-200 rounded-lg bg-zinc-50" 
                />
                {resolveForm.rectifiedPhotoUrl && (
                  <div className="mt-2.5 relative w-full h-32 rounded-lg overflow-hidden border border-zinc-200">
                    <img src={resolveForm.rectifiedPhotoUrl} alt="Rectified Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Verification Sign-off Notes</label>
                <textarea 
                  value={resolveForm.resolutionNotes} 
                  onChange={e => setResolveForm({...resolveForm, resolutionNotes: e.target.value})} 
                  placeholder="Inspected on-site. Surface sanded, painted, and clean." 
                  className={`${inputClass} min-h-[70px]`} 
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200">
                <button type="button" onClick={() => { setIsResolveModalOpen(false); setActiveSnagForResolve(null); }} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-800 shadow-sm cursor-pointer">
                  {submitting ? 'Verifying...' : 'Sign Off & Mark Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}