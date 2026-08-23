import React, { useState, useEffect } from 'react';
import { getProjects, getSiteOperations, saveDPR, saveDocument, saveSnag, updateSnagStatus } from '../db';

export default function SiteManager() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentView, setCurrentView] = useState('overview'); // 'overview' or 'detail'
  
  const [masterData, setMasterData] = useState([]);
  const [globalStats, setGlobalStats] = useState({ activeSites: 0, reportedToday: 0, pending: 0 });
  const [activeProject, setActiveProject] = useState(null);
  const [activeTab, setActiveTab] = useState('DPR'); // 'DPR', 'VAULT', 'SNAGS'

  // Professional Construction DPR Form State
  const [dprForm, setDprForm] = useState({
    date: new Date().toISOString().split('T')[0],
    loggedBy: '',
    weather: 'Clear / Sunny',
    manpower: '',
    workExecuted: '',
    materials: '',
    delays: '',
    photoLink: ''
  });

  const [docForm, setDocForm] = useState({ title: '', docType: 'AutoCAD 2D', fileLink: '', uploadedBy: '' });
  const [snagForm, setSnagForm] = useState({ description: '', assignedTo: '', photoLink: '' });

  const loadGlobalData = async () => {
    setLoading(true);
    try {
      const projs = await getProjects() || [];
      const activeProjects = projs.filter(p => p.status !== 'Completed');

      // Fetch Operations for all active projects simultaneously
      const opsPromises = activeProjects.map(p => getSiteOperations(p.id || p._id));
      const opsResults = await Promise.all(opsPromises);

      const todayStr = new Date().toISOString().split('T')[0];
      let reported = 0;

      const masterList = activeProjects.map((p, idx) => {
        const ops = opsResults[idx] || { dprs: [], docs: [], snags: [] };
        const dprs = ops.dprs || [];
        const sortedDprs = dprs.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestDpr = sortedDprs[0] || null;
        const isSubmittedToday = latestDpr && latestDpr.date === todayStr;

        if (isSubmittedToday) reported++;

        return {
          ...p,
          ops,
          latestDpr,
          isSubmittedToday,
          totalReports: dprs.length
        };
      });

      // Sort: Projects missing today's report bubble up to the top
      masterList.sort((a, b) => (a.isSubmittedToday === b.isSubmittedToday) ? 0 : a.isSubmittedToday ? 1 : -1);

      setMasterData(masterList);
      setGlobalStats({
        activeSites: activeProjects.length,
        reportedToday: reported,
        pending: activeProjects.length - reported
      });

    } catch (err) {
      console.error("Error loading master site data:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGlobalData();
  }, []);

  const handleViewDetail = (project) => {
    setActiveProject(project);
    setActiveTab('DPR');
    setDprForm({
      date: new Date().toISOString().split('T')[0],
      loggedBy: '', weather: 'Clear / Sunny', manpower: '',
      workExecuted: '', materials: '', delays: '', photoLink: ''
    });
    setCurrentView('detail');
  };

  const handleBackToOverview = () => {
    setActiveProject(null);
    setCurrentView('overview');
    loadGlobalData(); // Refresh to update masterboard stats
  };

  const refreshActiveProject = async () => {
    const updatedOps = await getSiteOperations(activeProject.id || activeProject._id);
    setActiveProject(prev => ({
      ...prev,
      ops: {
        ...updatedOps,
        dprs: (updatedOps?.dprs || []).sort((a, b) => new Date(b.date) - new Date(a.date))
      }
    }));
  };

  const handleFileUpload = (e, formSetter, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        formSetter(prev => ({ ...prev, [fieldName]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // --- SUBMIT HANDLERS ---
  const handleDprSubmit = async (e) => {
    e.preventDefault();
    if (!dprForm.workExecuted || !dprForm.loggedBy) return alert("Work Executed and Supervisor Name are required.");

    setSubmitting(true);
    try {
      // Pack the detailed construction data into the existing DB schema summary string to prevent breaking changes
      const packedSummary = `[WEATHER: ${dprForm.weather}]\n[MANPOWER: ${dprForm.manpower || 'Not Specified'}]\n\nWORK EXECUTED:\n${dprForm.workExecuted}\n\nBLOCKERS/DELAYS:\n${dprForm.delays || 'None reported.'}`;

      await saveDPR({
        projectId: activeProject.id || activeProject._id,
        date: dprForm.date,
        loggedBy: dprForm.loggedBy,
        summary: packedSummary,
        materials: dprForm.materials,
        photoLink: dprForm.photoLink
      });
      
      await refreshActiveProject();
      setDprForm(prev => ({ ...prev, manpower: '', workExecuted: '', materials: '', delays: '', photoLink: '' }));
      alert("Daily Progress Report submitted successfully!");
    } catch (err) { alert("Failed to submit DPR."); }
    setSubmitting(false);
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    if (!docForm.fileLink) return alert("Please upload a file.");
    setSubmitting(true);
    try {
      await saveDocument({ ...docForm, projectId: activeProject.id || activeProject._id });
      setDocForm({ title: '', docType: 'AutoCAD 2D', fileLink: '', uploadedBy: '' });
      await refreshActiveProject();
    } catch (err) { alert("Failed to save site document."); }
    setSubmitting(false);
  };

  const handleSnagSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await saveSnag({ ...snagForm, projectId: activeProject.id || activeProject._id });
      setSnagForm({ description: '', assignedTo: '', photoLink: '' });
      await refreshActiveProject();
    } catch (err) { alert("Failed to log snag."); }
    setSubmitting(false);
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  // ==========================================
  // VIEW 1: GLOBAL MASTERBOARD
  // ==========================================
  if (currentView === 'overview') {
    return (
      <div className="w-full h-full flex flex-col bg-zinc-50 print:bg-white print:p-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Site Operations Masterboard</h2>
            <p className="text-zinc-500 text-sm mt-0.5 font-medium">Track daily progress, drawings, and defect logs across all active sites.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadGlobalData} className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh Status
            </button>
            <button onClick={() => window.print()} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 h-10">
              🖨️ Print Report
            </button>
          </div>
        </div>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block border-b-2 border-zinc-800 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight uppercase">Daily Progress Master Report</h1>
          <p className="text-xs text-zinc-500 font-medium mt-1">Generated on: {new Date().toLocaleDateString()}</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3 flex-1">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-[#B45309] rounded-full animate-spin"></div>
            <p>Scanning all active sites for daily reports...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
            
            {/* GLOBAL STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-zinc-200 p-6 rounded-2xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-zinc-100 opacity-50 text-6xl">🏢</div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1 relative z-10">Total Active Sites</span>
                <p className="text-3xl font-black text-zinc-900 relative z-10">{globalStats.activeSites}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-emerald-100 opacity-50 text-6xl">✅</div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest block mb-1 relative z-10">Reports Submitted Today</span>
                <p className="text-3xl font-black text-emerald-800 relative z-10">{globalStats.reportedToday}</p>
              </div>
              <div className={`p-6 rounded-2xl shadow-sm border flex flex-col justify-center relative overflow-hidden ${
                globalStats.pending > 0 ? 'bg-red-50 border-red-200' : 'bg-zinc-50 border-zinc-200'
              }`}>
                {globalStats.pending > 0 && <div className="absolute -right-4 -bottom-4 text-red-100 opacity-50 text-6xl">⚠️</div>}
                <span className={`text-xs font-bold uppercase tracking-widest block mb-1 relative z-10 ${globalStats.pending > 0 ? 'text-red-700' : 'text-zinc-500'}`}>Missing Reports Today</span>
                <p className={`text-3xl font-black relative z-10 ${globalStats.pending > 0 ? 'text-red-800' : 'text-zinc-400'}`}>{globalStats.pending}</p>
              </div>
            </div>

            {/* MASTER PROJECT STATUS TABLE */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">Site Reporting Status</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-100">
                      <th className="py-4 px-6 font-bold w-64">Project Name & Client</th>
                      <th className="py-4 px-6 font-bold text-center">Status Today</th>
                      <th className="py-4 px-6 font-bold">Last Reported</th>
                      <th className="py-4 px-6 font-bold">Supervisor / Eng.</th>
                      <th className="py-4 px-6 font-bold text-center">Total Logs</th>
                      <th className="py-4 px-6 font-bold text-right print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 text-sm">
                    {masterData.map(proj => (
                      <tr key={proj.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-bold text-zinc-900 truncate max-w-[250px]">{proj.name || proj.projectName}</p>
                          <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">{proj.clientName}</p>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {proj.isSubmittedToday ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Submitted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-semibold text-zinc-700">
                          {proj.latestDpr ? proj.latestDpr.date : <span className="text-zinc-300 italic">Never</span>}
                        </td>
                        <td className="py-4 px-6 text-zinc-500 font-medium">
                          {proj.latestDpr ? (proj.latestDpr.logged_by || proj.latestDpr.loggedBy) : '-'}
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-zinc-400">
                          {proj.totalReports}
                        </td>
                        <td className="py-4 px-6 text-right print:hidden">
                          <button 
                            onClick={() => handleViewDetail(proj)} 
                            className="px-4 py-2 bg-[#B45309] hover:bg-[#92400E] text-white rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5 ml-auto"
                          >
                            Open Site Ops
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {masterData.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-sm">
                          No active projects found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW 2: PROJECT SITE OPERATIONS CENTER
  // ==========================================
  return (
    <div className="w-full h-full flex flex-col bg-zinc-50 print:bg-white print:p-0" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{activeProject.name || activeProject.projectName}</h2>
          <p className="text-[#B45309] text-xs font-bold uppercase tracking-widest mt-1">Client: {activeProject.clientName}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200 w-full sm:w-auto">
            {['DPR', 'VAULT', 'SNAGS'].map(tab => (
              <button 
                key={tab} onClick={() => setActiveTab(tab)} 
                className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {tab === 'DPR' ? 'Daily Reports' : tab === 'VAULT' ? 'Doc Vault' : 'Snag List'}
              </button>
            ))}
          </div>

          <button onClick={handleBackToOverview} className="w-full sm:w-auto text-zinc-600 hover:text-zinc-900 text-xs font-bold transition-colors cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-zinc-200 shadow-sm flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Masterboard
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: FORMS (Hidden in print) */}
          <div className="lg:col-span-5 space-y-6 print:hidden">
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden sticky top-0">
              
              {/* DPR FORM */}
              {activeTab === 'DPR' && (
                <>
                  <div className="px-6 py-4 border-b border-zinc-100 bg-[#B45309]">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Log Today's Progress
                    </h3>
                  </div>
                  <form onSubmit={handleDprSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Report Date <span className="text-red-500">*</span></label>
                        <input type="date" required value={dprForm.date} onChange={e => setDprForm({...dprForm, date: e.target.value})} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Supervisor Name <span className="text-red-500">*</span></label>
                        <input type="text" required value={dprForm.loggedBy} onChange={e => setDprForm({...dprForm, loggedBy: e.target.value})} placeholder="Your Name" className={inputClass} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4">
                      <div>
                        <label className={labelClass}>Site Weather</label>
                        <select value={dprForm.weather} onChange={e => setDprForm({...dprForm, weather: e.target.value})} className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                          <option value="Clear / Sunny">Clear / Sunny</option>
                          <option value="Cloudy">Cloudy</option>
                          <option value="Rainy (Work Delayed)">Rainy (Work Delayed)</option>
                          <option value="Extreme Heat">Extreme Heat</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Manpower Deployed</label>
                        <input type="text" value={dprForm.manpower} onChange={e => setDprForm({...dprForm, manpower: e.target.value})} placeholder="e.g. 4 Carpenters, 2 Helpers" className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Work Executed Today <span className="text-red-500">*</span></label>
                      <textarea required value={dprForm.workExecuted} onChange={e => setDprForm({...dprForm, workExecuted: e.target.value})} placeholder="E.g. Completed gypsum ceiling framework in Master Bedroom..." className={`${inputClass} min-h-[80px] resize-y`} />
                    </div>

                    <div>
                      <label className={labelClass}>Blockers / Delays (If Any)</label>
                      <textarea value={dprForm.delays} onChange={e => setDprForm({...dprForm, delays: e.target.value})} placeholder="E.g. Waiting for electrical casing clearance before painting..." className={`${inputClass} min-h-[60px] resize-y bg-red-50/30 border-red-200/50`} />
                    </div>

                    <div>
                      <label className={labelClass}>Material Indent / Next Day Plan</label>
                      <textarea value={dprForm.materials} onChange={e => setDprForm({...dprForm, materials: e.target.value})} placeholder="E.g. 5 bags cement, 10 sheets 18mm plywood..." className={`${inputClass} min-h-[60px] resize-y bg-amber-50/30 border-amber-200/50`} />
                    </div>

                    <div>
                      <label className={labelClass}>Site Photo (Proof of Progress)</label>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setDprForm, 'photoLink')} className="w-full text-sm text-zinc-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer border border-zinc-200 rounded-xl bg-zinc-50/50" />
                      {dprForm.photoLink && (
                        <div className="mt-3 relative w-full h-32 rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
                          <img src={dprForm.photoLink} alt="Preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setDprForm({...dprForm, photoLink: ''})} className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-md flex items-center justify-center text-xs shadow-md">✕</button>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-zinc-100">
                      <button type="submit" disabled={submitting} className="w-full py-3.5 bg-[#B45309] hover:bg-[#92400E] text-white font-bold tracking-widest uppercase rounded-xl text-[10px] shadow-sm transition-all cursor-pointer disabled:opacity-50">
                        {submitting ? 'Submitting Report...' : 'Submit Daily Report'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* VAULT FORM */}
              {activeTab === 'VAULT' && (
                <>
                  <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-800">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      Upload Site Document
                    </h3>
                  </div>
                  <form onSubmit={handleDocSubmit} className="p-6 space-y-4">
                    <div>
                      <label className={labelClass}>Document Title <span className="text-red-500">*</span></label>
                      <input type="text" required value={docForm.title} onChange={e => setDocForm({...docForm, title: e.target.value})} className={inputClass} placeholder="e.g. Approved Ceiling Layout" />
                    </div>
                    <div>
                      <label className={labelClass}>Document Type</label>
                      <select value={docForm.docType} onChange={e => setDocForm({...docForm, docType: e.target.value})} className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                        <option value="AutoCAD 2D">AutoCAD 2D</option>
                        <option value="3D Render">3D Render</option>
                        <option value="Contract / BOQ">Contract / BOQ</option>
                        <option value="Site Photos">Site Photos</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Upload File <span className="text-red-500">*</span></label>
                      <input type="file" required accept="image/*,.pdf,.dwg" onChange={(e) => handleFileUpload(e, setDocForm, 'fileLink')} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer border border-zinc-200 rounded-xl bg-zinc-50/50" />
                    </div>
                    <div>
                      <label className={labelClass}>Uploaded By <span className="text-red-500">*</span></label>
                      <input type="text" required value={docForm.uploadedBy} onChange={e => setDocForm({...docForm, uploadedBy: e.target.value})} className={inputClass} placeholder="Your name..." />
                    </div>
                    <div className="pt-4 border-t border-zinc-100">
                      <button type="submit" disabled={submitting} className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-900 text-white font-bold tracking-widest uppercase rounded-xl text-[10px] shadow-sm transition-all cursor-pointer disabled:opacity-50">
                        {submitting ? 'Saving...' : 'Save Document to Vault'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* SNAG FORM */}
              {activeTab === 'SNAGS' && (
                <>
                  <div className="px-6 py-4 border-b border-zinc-100 bg-red-600">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Log Defect / Snag
                    </h3>
                  </div>
                  <form onSubmit={handleSnagSubmit} className="p-6 space-y-4">
                    <div>
                      <label className={labelClass}>Issue Description <span className="text-red-500">*</span></label>
                      <textarea required value={snagForm.description} onChange={e => setSnagForm({...snagForm, description: e.target.value})} className={`${inputClass} resize-y min-h-[100px]`} placeholder="Describe defect, exact location, and fix required..."></textarea>
                    </div>
                    <div>
                      <label className={labelClass}>Assign To (Name or Subcontractor) <span className="text-red-500">*</span></label>
                      <input type="text" required value={snagForm.assignedTo} onChange={e => setSnagForm({...snagForm, assignedTo: e.target.value})} className={inputClass} placeholder="e.g. Ramesh Carpenter" />
                    </div>
                    <div>
                      <label className={labelClass}>Defect Photo</label>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setSnagForm, 'photoLink')} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-red-50 file:text-red-600 hover:file:bg-red-100 cursor-pointer border border-zinc-200 rounded-xl bg-zinc-50/50" />
                      {snagForm.photoLink && (
                        <div className="mt-3 relative w-full h-32 rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
                          <img src={snagForm.photoLink} alt="Preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setSnagForm({...snagForm, photoLink: ''})} className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-md flex items-center justify-center text-xs shadow-md">✕</button>
                        </div>
                      )}
                    </div>
                    <div className="pt-4 border-t border-zinc-100">
                      <button type="submit" disabled={submitting} className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase rounded-xl text-[10px] shadow-sm transition-all cursor-pointer disabled:opacity-50">
                        {submitting ? 'Adding...' : 'Add to Snag List'}
                      </button>
                    </div>
                  </form>
                </>
              )}

            </div>
          </div>

          {/* RIGHT: DATA LIST / FEED */}
          <div className="lg:col-span-7 print:col-span-12">
            
            {/* 1. DAILY PROGRESS REPORTS FEED */}
            {activeTab === 'DPR' && (
              <>
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest mb-6 flex items-center gap-2 print:hidden">
                  <span>📅</span> DPR Timeline History
                </h3>
                {activeProject.ops?.dprs?.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 before:to-transparent print:before:hidden print:space-y-8">
                    {activeProject.ops.dprs.map((dpr, idx) => (
                      <div key={dpr.id || idx} className="relative flex items-start md:odd:flex-row-reverse group is-active print:flex-row print:odd:flex-row print:mb-8 print:break-inside-avoid">
                        
                        {/* Timeline Dot */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-zinc-50 bg-zinc-900 text-white shadow shrink-0 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 mt-4 print:hidden">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        
                        {/* Report Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow ml-4 md:ml-0 print:w-full print:border-2 print:border-zinc-800 print:shadow-none print:m-0">
                          
                          {/* Card Header */}
                          <div className="flex justify-between items-start mb-4 border-b border-zinc-100 pb-3">
                            <div>
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-zinc-900 px-2.5 py-1 rounded-md">{dpr.date}</span>
                              <p className="text-[11px] font-semibold text-zinc-500 mt-2">Supervisor: <span className="text-zinc-900">{dpr.logged_by || dpr.loggedBy}</span></p>
                            </div>
                          </div>
                          
                          {/* Card Body */}
                          <div className="space-y-4">
                            {/* Summary Parser (Handles both old flat text and new packed formatting) */}
                            {(() => {
                              const raw = dpr.summary || '';
                              const weatherMatch = raw.match(/\[WEATHER: (.*?)\]/);
                              const manpowerMatch = raw.match(/\[MANPOWER: (.*?)\]/);
                              const workMatch = raw.includes('WORK EXECUTED:') ? raw.split('WORK EXECUTED:')[1].split('BLOCKERS/DELAYS:')[0].trim() : raw;
                              const delaysMatch = raw.includes('BLOCKERS/DELAYS:') ? raw.split('BLOCKERS/DELAYS:')[1].trim() : null;

                              return (
                                <>
                                  {(weatherMatch || manpowerMatch) && (
                                    <div className="flex gap-4 text-[10px] font-semibold text-zinc-500 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                                      {weatherMatch && <span>🌤️ {weatherMatch[1]}</span>}
                                      {manpowerMatch && <span>👷 {manpowerMatch[1]}</span>}
                                    </div>
                                  )}
                                  
                                  <div>
                                    <span className="text-[9px] font-bold text-[#B45309] uppercase tracking-widest block mb-1">Work Executed</span>
                                    <p className="text-sm text-zinc-800 font-medium leading-relaxed whitespace-pre-wrap">{workMatch}</p>
                                  </div>

                                  {delaysMatch && delaysMatch !== 'None reported.' && (
                                    <div className="bg-red-50/50 p-3 rounded-xl border border-red-100">
                                      <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest block mb-1">Blockers / Delays</span>
                                      <p className="text-xs text-red-900 font-medium whitespace-pre-wrap">{delaysMatch}</p>
                                    </div>
                                  )}
                                </>
                              );
                            })()}

                            {(dpr.materials_needed || dpr.materialsNeeded) && (
                              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest block mb-1">Material Indent & Next Plan</span>
                                <p className="text-xs text-amber-900 font-medium whitespace-pre-wrap">{dpr.materials_needed || dpr.materialsNeeded}</p>
                              </div>
                            )}

                            {(dpr.photo_link || dpr.photoLink) && (
                              <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center p-1">
                                <img src={dpr.photo_link || dpr.photoLink} alt="Site Progress" className="w-full h-auto object-cover max-h-64 rounded-lg" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-16 text-center print:hidden">
                    <div className="text-4xl mb-3 opacity-50">📭</div>
                    <h3 className="text-base font-bold text-zinc-900">No Reports Yet</h3>
                    <p className="text-sm text-zinc-500 mt-1 font-medium">Use the form on the left to log the first daily progress report for this site.</p>
                  </div>
                )}
              </>
            )}

            {/* 2. SITE DOCUMENTS */}
            {activeTab === 'VAULT' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>📁</span> Site Drawing & Document Vault
                </h3>
                {activeProject.ops?.docs?.map(d => (
                  <div key={d.id} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex justify-between items-center gap-4 hover:shadow-md transition-shadow">
                    <div>
                      <span className="bg-blue-50 text-blue-700 border border-blue-200/60 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1.5 inline-block">
                        {d.doc_type || d.docType || d.category}
                      </span>
                      <h4 className="text-sm font-bold text-zinc-900">{d.title || d.documentName}</h4>
                      <p className="text-xs text-zinc-400 font-medium mt-1">Uploaded {d.uploaded_at || d.uploadedAt} by {d.uploaded_by || d.uploadedBy || 'Staff'}</p>
                    </div>
                    <a href={d.file_link || d.fileUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-zinc-100 text-zinc-700 hover:bg-zinc-800 hover:text-white border border-zinc-200 hover:border-zinc-800 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shrink-0">
                      View File
                    </a>
                  </div>
                ))}
                {(!activeProject.ops?.docs || activeProject.ops.docs.length === 0) && (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-16 text-center">
                    <p className="text-sm text-zinc-500 font-medium">No site drawings or documents found.</p>
                  </div>
                )}
              </div>
            )}

            {/* 3. SNAG LIST */}
            {activeTab === 'SNAGS' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span>⚠️</span> Active Snag & Defect Log
                </h3>
                {activeProject.ops?.snags?.map(s => (
                  <div key={s.id} className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${s.status === 'Resolved' ? 'border-emerald-200 bg-emerald-50/30' : 'border-zinc-200 hover:shadow-md'}`}>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${s.status === 'Resolved' ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{s.description || s.title}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-medium text-zinc-500">Assignee: <strong className="text-zinc-800">{s.assigned_to || s.assignedTo || s.subcontractor || 'Unassigned'}</strong></span>
                        {(s.photo_link || s.photoLink) && <a href={s.photo_link || s.photoLink} target="_blank" rel="noreferrer" className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-100">View Photo</a>}
                      </div>
                    </div>
                    <select 
                      value={s.status || 'Pending'} 
                      onChange={async e => { 
                        setSubmitting(true);
                        await updateSnagStatus(s.id, e.target.value); 
                        await refreshActiveProject(); 
                        setSubmitting(false);
                      }}
                      disabled={submitting}
                      className={`appearance-none pr-8 pl-4 py-2 rounded-xl border outline-none cursor-pointer transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                        s.status === 'Resolved' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <option value="Pending">Pending Fix</option>
                      <option value="Resolved">Mark Resolved</option>
                    </select>
                  </div>
                ))}
                {(!activeProject.ops?.snags || activeProject.ops.snags.length === 0) && (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-2xl p-16 text-center">
                    <p className="text-sm text-zinc-500 font-medium">No defects or snags logged for this site.</p>
                  </div>
                )}
              </div>
            )}

          </div>
          
        </div>
      </div>
    </div>
  );
}