import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { exportToCSV } from '../utils';

export default function SiteManager({ companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentView, setCurrentView] = useState('overview'); // 'overview' or 'detail'
  
  const [masterData, setMasterData] = useState([]);
  const [globalStats, setGlobalStats] = useState({ activeSites: 0, reportedToday: 0, pending: 0 });
  const [activeProject, setActiveProject] = useState(null);
  const [activeTab, setActiveTab] = useState('DPR'); // 'DPR', 'VAULT', 'SNAGS'
  const [inventoryList, setInventoryList] = useState([]);

  // Professional Construction DPR Form State
  const [dprForm, setDprForm] = useState({
    date: new Date().toISOString().split('T')[0],
    loggedBy: '',
    weather: 'Clear / Sunny',
    workExecuted: '',
    delays: '',
    flagBlocker: false,
    photoLink: ''
  });

  // Structured Trade Manpower Deployment
  const [manpowerBreakdown, setManpowerBreakdown] = useState({
    carpenters: '',
    electricians: '',
    plumbers: '',
    painters: '',
    masons: '',
    helpers: ''
  });

  // Dynamic Materials Consumed On-Site (Auto-deducts from Inventory)
  const [consumedMaterials, setConsumedMaterials] = useState([
    { id: 1, itemName: '', quantity: '', unit: 'Nos' }
  ]);

  const [docForm, setDocForm] = useState({ title: '', docType: 'AutoCAD 2D', fileLink: '', uploadedBy: '' });
  const [snagForm, setSnagForm] = useState({ description: '', assignedTo: '', priority: 'Medium', photoLink: '' });

  const loadGlobalData = async () => {
    setLoading(true);
    try {
      const [projs, invItems] = await Promise.all([
        db.getProjects ? db.getProjects() : Promise.resolve([]),
        db.getInventoryItems ? db.getInventoryItems() : Promise.resolve([])
      ]);
      
      const activeProjects = (projs || []).filter(p => p.status !== 'Completed');
      setInventoryList(invItems || []);

      // Fetch Operations for all active projects simultaneously
      const opsPromises = activeProjects.map(p => 
        db.getSiteOperations ? db.getSiteOperations(p.id || p._id) : Promise.resolve({ dprs: [], docs: [], snags: [] })
      );
      const opsResults = await Promise.all(opsPromises);

      const todayStr = new Date().toISOString().split('T')[0];
      let reported = 0;

      const masterList = activeProjects.map((p, idx) => {
        const ops = opsResults[idx] || { dprs: [], docs: [], snags: [] };
        const dprs = ops.dprs || [];
        const sortedDprs = dprs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
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

      // Projects missing today's report bubble up to the top
      masterList.sort((a, b) => (a.isSubmittedToday === b.isSubmittedToday ? 0 : a.isSubmittedToday ? 1 : -1));

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
      loggedBy: '',
      weather: 'Clear / Sunny',
      workExecuted: '',
      delays: '',
      flagBlocker: false,
      photoLink: ''
    });
    setManpowerBreakdown({
      carpenters: '',
      electricians: '',
      plumbers: '',
      painters: '',
      masons: '',
      helpers: ''
    });
    setConsumedMaterials([
      { id: Date.now(), itemName: '', quantity: '', unit: 'Nos' }
    ]);
    setCurrentView('detail');
  };

  const handleBackToOverview = () => {
    setActiveProject(null);
    setCurrentView('overview');
    loadGlobalData();
  };

  const refreshActiveProject = async () => {
    if (!activeProject) return;
    const projId = activeProject.id || activeProject._id;
    const updatedOps = db.getSiteOperations ? await db.getSiteOperations(projId) : { dprs: [], docs: [], snags: [] };
    
    setActiveProject(prev => ({
      ...prev,
      ops: {
        ...updatedOps,
        dprs: (updatedOps?.dprs || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
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

  // Consumed Materials Row Handlers
  const addMaterialRow = () => {
    setConsumedMaterials([
      ...consumedMaterials,
      { id: Date.now(), itemName: '', quantity: '', unit: 'Nos' }
    ]);
  };

  const updateMaterialRow = (id, field, val) => {
    setConsumedMaterials(consumedMaterials.map(m => {
      if (m.id === id) {
        if (field === 'itemName') {
          const matched = inventoryList.find(i => (i.name || i.materialName) === val);
          return { ...m, itemName: val, unit: matched?.unit || m.unit };
        }
        return { ...m, [field]: val };
      }
      return m;
    }));
  };

  const removeMaterialRow = (id) => {
    if (consumedMaterials.length === 1) {
      setConsumedMaterials([{ id: Date.now(), itemName: '', quantity: '', unit: 'Nos' }]);
    } else {
      setConsumedMaterials(consumedMaterials.filter(m => m.id !== id));
    }
  };

  // --- AUTOMATION: ATOMIC DPR SUBMISSION + STOCK BURN + BLOCKER ALERT ---
  const handleDprSubmit = async (e) => {
    e.preventDefault();
    if (!dprForm.workExecuted || !dprForm.loggedBy) {
      return alert("Work Executed and Supervisor Name are required.");
    }

    setSubmitting(true);
    try {
      const projId = activeProject.id || activeProject._id;
      const projName = activeProject.name || activeProject.projectName;

      // 1. Manpower String
      const manpowerParts = [];
      if (manpowerBreakdown.carpenters) manpowerParts.push(`${manpowerBreakdown.carpenters} Carpenters`);
      if (manpowerBreakdown.electricians) manpowerParts.push(`${manpowerBreakdown.electricians} Electricians`);
      if (manpowerBreakdown.plumbers) manpowerParts.push(`${manpowerBreakdown.plumbers} Plumbers`);
      if (manpowerBreakdown.painters) manpowerParts.push(`${manpowerBreakdown.painters} Painters`);
      if (manpowerBreakdown.masons) manpowerParts.push(`${manpowerBreakdown.masons} Masons`);
      if (manpowerBreakdown.helpers) manpowerParts.push(`${manpowerBreakdown.helpers} Helpers`);
      const manpowerSummary = manpowerParts.length > 0 ? manpowerParts.join(', ') : 'Not Specified';

      // 2. Format Material Consumption text
      const validMaterials = consumedMaterials.filter(m => m.itemName && parseFloat(m.quantity) > 0);
      const materialsSummary = validMaterials.length > 0
        ? validMaterials.map(m => `${m.quantity} ${m.unit} of ${m.itemName}`).join(', ')
        : 'No bulk inventory consumed';

      const packedSummary = `[WEATHER: ${dprForm.weather}]\n[MANPOWER: ${manpowerSummary}]\n\nWORK EXECUTED:\n${dprForm.workExecuted}\n\nMATERIALS USED:\n${materialsSummary}\n\nBLOCKERS/DELAYS:\n${dprForm.delays || 'None reported.'}`;

      // 3. Save DPR Record
      const dprPayload = {
        projectId: projId,
        date: dprForm.date,
        loggedBy: dprForm.loggedBy,
        summary: packedSummary,
        materials: materialsSummary,
        photoLink: dprForm.photoLink
      };

      if (typeof db.saveDPR === 'function') {
        await db.saveDPR(dprPayload);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_dprs') || '[]');
        cached.unshift({ id: Date.now(), ...dprPayload });
        localStorage.setItem('jyanipur_dprs', JSON.stringify(cached));
      }

      // 4. AUTOMATED STOCK DEDUCTION (-OUT) TO INVENTORY
      for (const mat of validMaterials) {
        const movementData = {
          id: Date.now() + Math.random(),
          projectId: projId,
          projectName: projName,
          itemName: mat.itemName,
          quantity: parseFloat(mat.quantity),
          unit: mat.unit,
          type: 'OUT',
          date: dprForm.date,
          notes: `Site consumption via DPR by ${dprForm.loggedBy}`
        };

        if (typeof db.recordInventoryMovement === 'function') {
          await db.recordInventoryMovement(movementData);
        } else if (typeof db.saveInventoryMovement === 'function') {
          await db.saveInventoryMovement(movementData);
        } else {
          const invCache = JSON.parse(localStorage.getItem('jyanipur_inventory') || '[]');
          invCache.unshift(movementData);
          localStorage.setItem('jyanipur_inventory', JSON.stringify(invCache));
        }
      }

      // 5. AUTOMATED BLOCKER ESCALATION TO SNAG LIST
      if (dprForm.flagBlocker && dprForm.delays.trim()) {
        const snagPayload = {
          projectId: projId,
          projectName: projName,
          title: `[SITE BLOCKER] ${dprForm.delays}`,
          description: `Logged during DPR on ${dprForm.date} by ${dprForm.loggedBy}`,
          priority: 'High',
          status: 'Open',
          date: dprForm.date,
          assignedTo: 'Project Head / PM'
        };

        if (typeof db.saveSnag === 'function') {
          await db.saveSnag(snagPayload);
        }
      }

      await refreshActiveProject();
      setDprForm(prev => ({ ...prev, workExecuted: '', delays: '', flagBlocker: false, photoLink: '' }));
      setConsumedMaterials([{ id: Date.now(), itemName: '', quantity: '', unit: 'Nos' }]);
      setManpowerBreakdown({ carpenters: '', electricians: '', plumbers: '', painters: '', masons: '', helpers: '' });

      alert(`Daily Progress Report Submitted!\n\n• Report archived to site timeline.\n• ${validMaterials.length} material lines deducted (-OUT) from Godown inventory.${dprForm.flagBlocker ? '\n• Critical Blocker escalated to Punch List.' : ''}`);
    } catch (err) {
      console.error("Failed to submit DPR:", err);
      alert("Failed to submit DPR. Please check database connectivity.");
    }
    setSubmitting(false);
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    if (!docForm.fileLink) return alert("Please upload a file.");
    setSubmitting(true);
    try {
      const projId = activeProject.id || activeProject._id;
      if (typeof db.saveDocument === 'function') {
        await db.saveDocument({ ...docForm, projectId: projId });
      }
      setDocForm({ title: '', docType: 'AutoCAD 2D', fileLink: '', uploadedBy: '' });
      await refreshActiveProject();
      alert("Document archived to site vault!");
    } catch (err) {
      alert("Failed to save site document.");
    }
    setSubmitting(false);
  };

  const handleSnagSubmit = async (e) => {
    e.preventDefault();
    if (!snagForm.description) return alert("Please describe the defect.");
    setSubmitting(true);
    try {
      const projId = activeProject.id || activeProject._id;
      const projName = activeProject.name || activeProject.projectName;
      
      if (typeof db.saveSnag === 'function') {
        await db.saveSnag({
          ...snagForm,
          projectId: projId,
          projectName: projName,
          title: snagForm.description.slice(0, 50),
          status: 'Open'
        });
      }
      setSnagForm({ description: '', assignedTo: '', priority: 'Medium', photoLink: '' });
      await refreshActiveProject();
      alert("Snag ticket logged!");
    } catch (err) {
      alert("Failed to log snag.");
    }
    setSubmitting(false);
  };

  const handleExportDprs = () => {
    if (!activeProject?.ops?.dprs) return;
    const data = activeProject.ops.dprs.map(d => ({
      'Date': d.date,
      'Supervisor': d.logged_by || d.loggedBy,
      'Work Summary': d.summary,
      'Materials Consumed': d.materials_needed || d.materials || '-'
    }));
    exportToCSV(`${activeProject.name || 'Site'}_DPR_History`, data);
  };

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  // ==========================================
  // VIEW 1: GLOBAL MASTERBOARD
  // ==========================================
  if (currentView === 'overview') {
    return (
      <div className="w-full h-full flex flex-col font-['Inter',sans-serif] print:bg-white print:p-0">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Site Operations & DPR Masterboard</h2>
            <p className="text-zinc-500 text-sm mt-1 font-medium">Daily work progress tracking, site drawing vault, on-site inventory burn, and quality punch logs.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={loadGlobalData} 
              className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-800 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 h-10"
            >
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button 
              onClick={() => window.print()} 
              className="bg-zinc-900 hover:bg-black text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black h-10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Masterboard
            </button>
          </div>
        </div>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-black text-black tracking-tight uppercase">{companySettings.companyName || 'Jyanipur Interiors'} - Site Operations</h1>
          <p className="text-xs text-zinc-600 font-bold mt-1 uppercase tracking-widest">Master Daily Progress Audit • {new Date().toLocaleDateString()}</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-sm flex flex-col items-center justify-center space-y-3 flex-1">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Scanning all active sites for daily reports...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 [&::-webkit-scrollbar]:hidden pb-10">
            
            {/* GLOBAL STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                <svg className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 relative z-10">Total Active Sites</span>
                <p className="text-3xl font-black text-zinc-900 tracking-tight relative z-10">{globalStats.activeSites}</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                <svg className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2 relative z-10">Reports Submitted Today</span>
                <p className="text-3xl font-black text-emerald-800 tracking-tight relative z-10">{globalStats.reportedToday}</p>
              </div>

              <div className={`p-6 rounded-xl shadow-sm border flex flex-col justify-center relative overflow-hidden ${
                globalStats.pending > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-zinc-200'
              }`}>
                {globalStats.pending > 0 && (
                  <svg className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 relative z-10 ${globalStats.pending > 0 ? 'text-red-700' : 'text-zinc-400'}`}>
                  Missing Reports Today
                </span>
                <p className={`text-3xl font-black tracking-tight relative z-10 ${globalStats.pending > 0 ? 'text-red-700' : 'text-zinc-900'}`}>
                  {globalStats.pending}
                </p>
              </div>
            </div>

            {/* MASTER PROJECT STATUS TABLE */}
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
              <div className="p-5 border-b border-zinc-200 bg-white flex justify-between items-center">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Site Reporting Compliance</h3>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded border border-zinc-200">
                  {masterData.length} Running Projects
                </span>
              </div>
              
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                      <th className="py-3.5 px-6 w-72">Project Site & Client</th>
                      <th className="py-3.5 px-6 font-bold text-center w-36">Daily Status</th>
                      <th className="py-3.5 px-6 font-bold w-40">Last Logged</th>
                      <th className="py-3.5 px-6 font-bold">Assigned Supervisor</th>
                      <th className="py-3.5 px-6 font-bold text-center w-32">Total DPRs</th>
                      <th className="py-3.5 px-6 font-bold text-right w-44 print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {masterData.map(proj => (
                      <tr key={proj.id} className="hover:bg-zinc-50/80 transition-colors group">
                        <td className="py-4 px-6">
                          <p className="font-bold text-zinc-900 truncate max-w-[280px] tracking-tight">{proj.name || proj.projectName}</p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{proj.clientName}</p>
                        </td>

                        <td className="py-4 px-6 text-center">
                          {proj.isSubmittedToday ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold uppercase tracking-widest">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Logged Today
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 text-[9px] font-bold uppercase tracking-widest">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Pending Report
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 font-bold text-xs uppercase tracking-widest text-zinc-700 font-mono">
                          {proj.latestDpr ? proj.latestDpr.date : <span className="text-zinc-400 font-normal italic">Never</span>}
                        </td>

                        <td className="py-4 px-6 text-zinc-800 text-xs font-semibold">
                          {proj.latestDpr ? (proj.latestDpr.logged_by || proj.latestDpr.loggedBy) : <span className="text-zinc-400">-</span>}
                        </td>

                        <td className="py-4 px-6 text-center">
                          <span className="bg-zinc-100 text-zinc-900 font-mono font-bold text-xs px-2.5 py-1 rounded-md border border-zinc-200">
                            {proj.totalReports}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right print:hidden">
                          <button 
                            onClick={() => handleViewDetail(proj)} 
                            className="px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 ml-auto border border-black"
                          >
                            Open Operations
                            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {masterData.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
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
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif] print:bg-white print:p-0">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded">
              Client: {activeProject.clientName}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">{activeProject.name || activeProject.projectName}</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex bg-white p-1 rounded-lg shadow-sm border border-zinc-200 w-full sm:w-auto">
            {['DPR', 'VAULT', 'SNAGS'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-zinc-900 text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                {tab === 'DPR' ? 'Daily Reports' : tab === 'VAULT' ? 'Site Drawings' : 'Punch List'}
              </button>
            ))}
          </div>

          <button 
            onClick={handleBackToOverview} 
            className="w-full sm:w-auto text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer bg-white px-5 py-2.5 rounded-lg border border-zinc-200 shadow-sm flex items-center justify-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Masterboard
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: FORMS */}
          <div className="lg:col-span-5 space-y-6 print:hidden">
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden sticky top-0">
              
              {/* DPR FORM WITH INVENTORY STOCK DEDUCTION */}
              {activeTab === 'DPR' && (
                <>
                  <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-900 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Submit Daily Progress Report
                    </h3>
                  </div>

                  <form onSubmit={handleDprSubmit} className="p-6 space-y-5 bg-white">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Report Date <span className="text-red-500">*</span></label>
                        <input type="date" required value={dprForm.date} onChange={e => setDprForm({...dprForm, date: e.target.value})} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Supervisor / Engineer <span className="text-red-500">*</span></label>
                        <input type="text" required value={dprForm.loggedBy} onChange={e => setDprForm({...dprForm, loggedBy: e.target.value})} placeholder="Site Engineer name" className={inputClass} />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Site Weather</label>
                      <select 
                        value={dprForm.weather} 
                        onChange={e => setDprForm({...dprForm, weather: e.target.value})} 
                        className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:1rem_1rem] pr-8`}
                      >
                        <option value="Clear / Sunny">Clear / Sunny</option>
                        <option value="Cloudy / Overcast">Cloudy / Overcast</option>
                        <option value="Rainy (Site Delay)">Rainy (Site Delay)</option>
                        <option value="High Temperature">High Temperature</option>
                      </select>
                    </div>

                    {/* MANPOWER DEPLOYED BY TRADE */}
                    <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50">
                      <label className="block text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-2.5">
                        Trade Labor Gang Deployment
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Carpenters</span>
                          <input type="number" min="0" value={manpowerBreakdown.carpenters} onChange={e => setManpowerBreakdown({...manpowerBreakdown, carpenters: e.target.value})} placeholder="0" className="w-full text-center px-2 py-1.5 text-xs font-bold bg-white border border-zinc-200 rounded-md" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Electricians</span>
                          <input type="number" min="0" value={manpowerBreakdown.electricians} onChange={e => setManpowerBreakdown({...manpowerBreakdown, electricians: e.target.value})} placeholder="0" className="w-full text-center px-2 py-1.5 text-xs font-bold bg-white border border-zinc-200 rounded-md" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Painters</span>
                          <input type="number" min="0" value={manpowerBreakdown.painters} onChange={e => setManpowerBreakdown({...manpowerBreakdown, painters: e.target.value})} placeholder="0" className="w-full text-center px-2 py-1.5 text-xs font-bold bg-white border border-zinc-200 rounded-md" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Plumbers</span>
                          <input type="number" min="0" value={manpowerBreakdown.plumbers} onChange={e => setManpowerBreakdown({...manpowerBreakdown, plumbers: e.target.value})} placeholder="0" className="w-full text-center px-2 py-1.5 text-xs font-bold bg-white border border-zinc-200 rounded-md" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Masons</span>
                          <input type="number" min="0" value={manpowerBreakdown.masons} onChange={e => setManpowerBreakdown({...manpowerBreakdown, masons: e.target.value})} placeholder="0" className="w-full text-center px-2 py-1.5 text-xs font-bold bg-white border border-zinc-200 rounded-md" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Helpers</span>
                          <input type="number" min="0" value={manpowerBreakdown.helpers} onChange={e => setManpowerBreakdown({...manpowerBreakdown, helpers: e.target.value})} placeholder="0" className="w-full text-center px-2 py-1.5 text-xs font-bold bg-white border border-zinc-200 rounded-md" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Work Executed Today <span className="text-red-500">*</span></label>
                      <textarea required value={dprForm.workExecuted} onChange={e => setDprForm({...dprForm, workExecuted: e.target.value})} placeholder="Describe milestones completed today, room-by-room progress..." className={`${inputClass} min-h-[90px] resize-y leading-relaxed`} />
                    </div>

                    {/* MATERIALS CONSUMED (AUTO-DEDUCTS INVENTORY) */}
                    <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-900 uppercase tracking-widest">
                            Materials Consumed (-OUT to Stock)
                          </label>
                          <span className="text-[9px] text-zinc-500">Auto-deducts balance from Godown inventory</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={addMaterialRow}
                          className="px-2.5 py-1 bg-white border border-zinc-300 hover:border-black rounded text-[9px] font-bold uppercase tracking-wider text-zinc-700 cursor-pointer"
                        >
                          + Add Item
                        </button>
                      </div>

                      {consumedMaterials.map((mat, i) => (
                        <div key={mat.id || i} className="flex gap-2 items-center">
                          <input 
                            type="text" 
                            list="dpr-inventory-datalist"
                            placeholder="Select or type material..." 
                            value={mat.itemName} 
                            onChange={e => updateMaterialRow(mat.id, 'itemName', e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-white border border-zinc-200 rounded text-xs font-medium outline-none" 
                          />
                          <input 
                            type="number" 
                            step="any"
                            placeholder="Qty" 
                            value={mat.quantity} 
                            onChange={e => updateMaterialRow(mat.id, 'quantity', e.target.value)}
                            className="w-16 px-2 py-1.5 bg-white border border-zinc-200 rounded text-xs text-center font-bold outline-none" 
                          />
                          <select 
                            value={mat.unit} 
                            onChange={e => updateMaterialRow(mat.id, 'unit', e.target.value)}
                            className="w-20 px-2 py-1.5 bg-white border border-zinc-200 rounded text-[11px] font-bold text-zinc-700 outline-none cursor-pointer"
                          >
                            <option value="Nos">Nos</option>
                            <option value="Bags">Bags</option>
                            <option value="SqFt">SqFt</option>
                            <option value="Sheets">Sheets</option>
                            <option value="Ltrs">Ltrs</option>
                            <option value="Kgs">Kgs</option>
                            <option value="Box">Box</option>
                          </select>
                          <button 
                            type="button" 
                            onClick={() => removeMaterialRow(mat.id)}
                            className="text-zinc-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      <datalist id="dpr-inventory-datalist">
                        {inventoryList.map(item => (
                          <option key={item.id} value={item.name || item.materialName} />
                        ))}
                      </datalist>
                    </div>

                    {/* BLOCKERS & DELAYS */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className={labelClass}>Blockers / Site Delays</label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={dprForm.flagBlocker} 
                            onChange={e => setDprForm({...dprForm, flagBlocker: e.target.checked})} 
                            className="w-3.5 h-3.5 accent-red-600 rounded cursor-pointer"
                          />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-red-600">Escalate as Snag Ticket</span>
                        </label>
                      </div>
                      <textarea 
                        value={dprForm.delays} 
                        onChange={e => setDprForm({...dprForm, delays: e.target.value})} 
                        placeholder="Power outage, client drawing hold, supplier delay..." 
                        className={`${inputClass} min-h-[60px] resize-y bg-red-50/20 border-red-200/50 text-red-950 placeholder:text-zinc-400`} 
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Site Progress Photo</label>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setDprForm, 'photoLink')} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-bold file:uppercase file:tracking-widest file:bg-zinc-200 file:text-zinc-900 hover:file:bg-zinc-300 cursor-pointer border border-zinc-200 rounded-lg bg-zinc-50" />
                      {dprForm.photoLink && (
                        <div className="mt-2.5 relative w-full h-32 rounded-lg overflow-hidden border border-zinc-200">
                          <img src={dprForm.photoLink} alt="Preview" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setDprForm({...dprForm, photoLink: ''})} className="absolute top-2 right-2 bg-black text-white w-5 h-5 rounded flex items-center justify-center text-xs">✕</button>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-100">
                      <button type="submit" disabled={submitting} className="w-full py-3.5 bg-zinc-900 hover:bg-black text-white font-bold tracking-widest uppercase rounded-lg text-[10px] shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-black">
                        {submitting ? 'Submitting...' : 'Submit DPR & Update Inventory'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* VAULT FORM */}
              {activeTab === 'VAULT' && (
                <>
                  <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-900 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Upload Site Drawing
                    </h3>
                  </div>

                  <form onSubmit={handleDocSubmit} className="p-6 space-y-4 bg-white">
                    <div>
                      <label className={labelClass}>Document / Drawing Title <span className="text-red-500">*</span></label>
                      <input type="text" required value={docForm.title} onChange={e => setDocForm({...docForm, title: e.target.value})} className={inputClass} placeholder="e.g. Master Electrical Layout Rev 2" />
                    </div>
                    <div>
                      <label className={labelClass}>Category</label>
                      <select value={docForm.docType} onChange={e => setDocForm({...docForm, docType: e.target.value})} className={inputClass}>
                        <option value="AutoCAD 2D">AutoCAD 2D (Architectural)</option>
                        <option value="3D Render">3D Interior Render</option>
                        <option value="MEP Layout">MEP (Plumbing/Electrical)</option>
                        <option value="Contract BOQ">Contract / Approved BOQ</option>
                        <option value="Site Photos">Site Handover Photos</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>File Attachment <span className="text-red-500">*</span></label>
                      <input type="file" required accept="image/*,.pdf,.dwg,.dxf" onChange={(e) => handleFileUpload(e, setDocForm, 'fileLink')} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-zinc-200 file:text-zinc-900 cursor-pointer border border-zinc-200 rounded-lg bg-zinc-50" />
                    </div>
                    <div>
                      <label className={labelClass}>Uploaded By</label>
                      <input type="text" value={docForm.uploadedBy} onChange={e => setDocForm({...docForm, uploadedBy: e.target.value})} className={inputClass} placeholder="Staff name" />
                    </div>
                    <div className="pt-2 border-t border-zinc-100">
                      <button type="submit" disabled={submitting} className="w-full py-3.5 bg-zinc-900 hover:bg-black text-white font-bold tracking-widest uppercase rounded-lg text-[10px] shadow-sm cursor-pointer border border-black">
                        {submitting ? 'Saving...' : 'Save Drawing to Site Vault'}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* SNAG FORM */}
              {activeTab === 'SNAGS' && (
                <>
                  <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-900 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Log Site Defect / Snag
                    </h3>
                  </div>

                  <form onSubmit={handleSnagSubmit} className="p-6 space-y-4 bg-white">
                    <div>
                      <label className={labelClass}>Issue Description <span className="text-red-500">*</span></label>
                      <textarea required value={snagForm.description} onChange={e => setSnagForm({...snagForm, description: e.target.value})} className={`${inputClass} min-h-[90px]`} placeholder="Describe defect, room location, and fix required..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Responsible Agency</label>
                        <input type="text" value={snagForm.assignedTo} onChange={e => setSnagForm({...snagForm, assignedTo: e.target.value})} className={inputClass} placeholder="e.g. Ramesh Carpenter" />
                      </div>
                      <div>
                        <label className={labelClass}>Priority</label>
                        <select value={snagForm.priority} onChange={e => setSnagForm({...snagForm, priority: e.target.value})} className={inputClass}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High (Critical Handover)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Defect Photo</label>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setSnagForm, 'photoLink')} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-zinc-200 file:text-zinc-900 cursor-pointer border border-zinc-200 rounded-lg bg-zinc-50" />
                    </div>
                    <div className="pt-2 border-t border-zinc-100">
                      <button type="submit" disabled={submitting} className="w-full py-3.5 bg-zinc-900 hover:bg-black text-white font-bold tracking-widest uppercase rounded-lg text-[10px] shadow-sm cursor-pointer border border-black">
                        {submitting ? 'Adding...' : 'Log Snag Ticket'}
                      </button>
                    </div>
                  </form>
                </>
              )}

            </div>
          </div>

          {/* RIGHT: DATA LIST / TIMELINE */}
          <div className="lg:col-span-7 print:col-span-12">
            
            {/* 1. DAILY PROGRESS REPORTS FEED */}
            {activeTab === 'DPR' && (
              <>
                <div className="flex justify-between items-center mb-6 print:hidden">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    DPR Timeline History ({activeProject.ops?.dprs?.length || 0})
                  </h3>
                  <button 
                    onClick={handleExportDprs}
                    className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer"
                  >
                    Export CSV
                  </button>
                </div>

                {activeProject.ops?.dprs?.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-zinc-200 print:before:hidden print:space-y-8">
                    {activeProject.ops.dprs.map((dpr, idx) => (
                      <div key={dpr.id || idx} className="relative flex items-start md:odd:flex-row-reverse group is-active print:flex-row print:odd:flex-row print:mb-8 print:break-inside-avoid">
                        
                        {/* Dot */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-zinc-100 bg-zinc-900 text-white shadow-sm shrink-0 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 mt-4 print:hidden">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        
                        {/* Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white border border-zinc-200 p-6 rounded-xl shadow-sm hover:border-zinc-300 transition-all ml-4 md:ml-0 print:w-full print:border-2 print:border-black print:shadow-none print:m-0">
                          
                          <div className="flex justify-between items-start mb-4 border-b border-zinc-100 pb-3">
                            <div>
                              <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-zinc-900 px-3 py-1 rounded-md font-mono">
                                {dpr.date}
                              </span>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-2.5">
                                Logged By: <span className="text-zinc-900">{dpr.logged_by || dpr.loggedBy}</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            {(() => {
                              const raw = dpr.summary || '';
                              const weatherMatch = raw.match(/\[WEATHER: (.*?)\]/);
                              const manpowerMatch = raw.match(/\[MANPOWER: (.*?)\]/);
                              const workMatch = raw.includes('WORK EXECUTED:') ? raw.split('WORK EXECUTED:')[1].split('MATERIALS USED:')[0].split('BLOCKERS/DELAYS:')[0].trim() : raw;
                              const materialsMatch = raw.includes('MATERIALS USED:') ? raw.split('MATERIALS USED:')[1].split('BLOCKERS/DELAYS:')[0].trim() : null;
                              const delaysMatch = raw.includes('BLOCKERS/DELAYS:') ? raw.split('BLOCKERS/DELAYS:')[1].trim() : null;

                              return (
                                <>
                                  {(weatherMatch || manpowerMatch) && (
                                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                                      {weatherMatch && <span>{weatherMatch[1]}</span>}
                                      {weatherMatch && manpowerMatch && <span className="text-zinc-300">•</span>}
                                      {manpowerMatch && <span>{manpowerMatch[1]}</span>}
                                    </div>
                                  )}
                                  
                                  <div>
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Work Progress</span>
                                    <p className="text-sm text-zinc-900 font-medium leading-relaxed whitespace-pre-wrap">{workMatch}</p>
                                  </div>

                                  {(materialsMatch || dpr.materials_needed || dpr.materials) && (
                                    <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Stock Consumed & Next Plan</span>
                                      <p className="text-xs text-zinc-800 font-medium whitespace-pre-wrap leading-relaxed">
                                        {materialsMatch || dpr.materials_needed || dpr.materials}
                                      </p>
                                    </div>
                                  )}

                                  {delaysMatch && delaysMatch !== 'None reported.' && (
                                    <div className="bg-red-50/60 p-3 rounded-lg border border-red-200">
                                      <span className="text-[9px] font-bold text-red-700 uppercase tracking-widest block mb-1">Site Blockers & Delays</span>
                                      <p className="text-xs text-red-950 font-medium whitespace-pre-wrap leading-relaxed">{delaysMatch}</p>
                                    </div>
                                  )}
                                </>
                              );
                            })()}

                            {(dpr.photo_link || dpr.photoLink) && (
                              <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                                <img src={dpr.photo_link || dpr.photoLink} alt="Site Progress" className="w-full h-auto object-cover max-h-64 rounded" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-16 text-center">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">No progress reports logged yet for this site.</p>
                  </div>
                )}
              </>
            )}

            {/* 2. SITE DRAWINGS */}
            {activeTab === 'VAULT' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  Site Drawing & Document Vault
                </h3>
                {activeProject.ops?.docs?.map(d => (
                  <div key={d.id} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center gap-4 hover:border-zinc-300 transition-colors">
                    <div>
                      <span className="bg-zinc-100 text-zinc-700 border border-zinc-200 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest mb-1.5 inline-block">
                        {d.doc_type || d.docType || d.category}
                      </span>
                      <h4 className="text-sm font-bold text-zinc-900 tracking-tight">{d.title || d.documentName}</h4>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                        Uploaded {d.uploaded_at || d.uploadedAt} by <span className="text-zinc-700">{d.uploaded_by || d.uploadedBy || 'Staff'}</span>
                      </p>
                    </div>
                    <a 
                      href={d.file_link || d.fileUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shrink-0 border border-black shadow-sm"
                    >
                      View File
                    </a>
                  </div>
                ))}
                {(!activeProject.ops?.docs || activeProject.ops.docs.length === 0) && (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-16 text-center">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">No site drawings or documents archived.</p>
                  </div>
                )}
              </div>
            )}

            {/* 3. SNAG PUNCH LIST */}
            {activeTab === 'SNAGS' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Punch List & Quality Defect Tickets
                </h3>
                {activeProject.ops?.snags?.map(s => (
                  <div key={s.id} className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${s.status === 'Resolved' ? 'border-emerald-200 bg-emerald-50/20' : 'border-zinc-200 hover:border-zinc-300'}`}>
                    <div className="flex-1">
                      <p className={`text-sm font-bold tracking-tight ${s.status === 'Resolved' ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{s.description || s.title}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          Agency: <strong className="text-zinc-900">{s.assigned_to || s.assignedTo || s.subcontractor || 'Unassigned'}</strong>
                        </span>
                        {s.priority && (
                          <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                            s.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}>
                            {s.priority}
                          </span>
                        )}
                        {(s.photo_link || s.photoLink) && (
                          <a href={s.photo_link || s.photoLink} target="_blank" rel="noreferrer" className="text-[9px] font-bold uppercase tracking-widest text-zinc-900 hover:underline bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                            Photo
                          </a>
                        )}
                      </div>
                    </div>
                    <select 
                      value={s.status || 'Pending'} 
                      onChange={async e => { 
                        setSubmitting(true);
                        if (typeof db.updateSnagStatus === 'function') {
                          await db.updateSnagStatus(s.id, e.target.value); 
                        }
                        await refreshActiveProject(); 
                        setSubmitting(false);
                      }}
                      disabled={submitting}
                      className={`appearance-none pr-8 pl-3.5 py-2 rounded-lg border outline-none cursor-pointer transition-all text-[10px] font-bold uppercase tracking-widest shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.85rem_0.85rem] ${
                        s.status === 'Resolved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      <option value="Pending">Pending Fix</option>
                      <option value="Resolved">Mark Resolved</option>
                    </select>
                  </div>
                ))}
                {(!activeProject.ops?.snags || activeProject.ops.snags.length === 0) && (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-16 text-center">
                    <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">No defect punch items recorded for this site.</p>
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