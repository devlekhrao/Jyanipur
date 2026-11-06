import React, { useState, useEffect } from 'react';
import { getProjects, getSubcontractors } from '../db';

export default function SiteSafety() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('TOOLBOX'); // TOOLBOX, PPE_VIOLATIONS, INCIDENTS
  
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [activeProject, setActiveProject] = useState('');

  // Module Data States
  const [toolboxTalks, setToolboxTalks] = useState([]);
  const [ppeViolations, setPpeViolations] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Modals
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [isPpeOpen, setIsPpeOpen] = useState(false);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);

  // Forms
  const [toolboxForm, setToolboxForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    topic: 'Working at Heights', 
    conductor: '', 
    attendees: '', 
    notes: '' 
  });
  
  const [ppeForm, setPpeForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    subcontractorId: '', 
    workerName: '', 
    violationType: 'No Helmet', 
    penaltyAmount: '500', 
    photoLink: '' 
  });
  
  const [incidentForm, setIncidentForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    severity: 'Near Miss', 
    description: '', 
    correctiveAction: '', 
    status: 'Open' 
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const projs = (await getProjects()) || [];
        const subs = (await getSubcontractors()) || [];
        
        const activeProjs = projs.filter(p => p.status !== 'Completed');
        setProjects(activeProjs);
        setSubcontractors(subs);
        
        if (activeProjs.length > 0) {
          setActiveProject(String(activeProjs[0].id || activeProjs[0]._id));
        }

        // Default seed data
        setToolboxTalks([
          { id: 1, projectId: activeProjs[0]?.id, date: new Date().toISOString().split('T')[0], topic: 'Electrical Safety', conductor: 'Site Engineer', attendees: 12 }
        ]);
        setPpeViolations([
          { id: 1, projectId: activeProjs[0]?.id, subcontractorId: subs[0]?.id, subName: subs[0]?.name, workerName: 'Raju', violationType: 'No Safety Shoes', penaltyAmount: 500, date: new Date().toISOString().split('T')[0] }
        ]);
        setIncidents([]);
      } catch (err) {
        console.error("Failed to load HSE data", err);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Submit Handlers
  const handleSaveToolbox = (e) => {
    e.preventDefault();
    setToolboxTalks([{ ...toolboxForm, id: Date.now(), projectId: activeProject }, ...toolboxTalks]);
    setIsToolboxOpen(false);
    setToolboxForm({ ...toolboxForm, conductor: '', attendees: '', notes: '' });
  };

  const handleSavePpe = (e) => {
    e.preventDefault();
    const sub = subcontractors.find(s => String(s.id) === String(ppeForm.subcontractorId));
    setPpeViolations([{ ...ppeForm, id: Date.now(), projectId: activeProject, subName: sub?.name || 'Unknown' }, ...ppeViolations]);
    setIsPpeOpen(false);
    setPpeForm({ ...ppeForm, workerName: '', photoLink: '' });
  };

  const handleSaveIncident = (e) => {
    e.preventDefault();
    setIncidents([{ ...incidentForm, id: Date.now(), projectId: activeProject }, ...incidents]);
    setIsIncidentOpen(false);
    setIncidentForm({ ...incidentForm, description: '', correctiveAction: '', status: 'Open' });
  };

  const handleFileUpload = (e, formSetter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => formSetter(prev => ({ ...prev, photoLink: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  const currentProjectName = projects.find(p => String(p.id || p._id) === String(activeProject))?.name || 'Select Project';

  if (!activeProject && !loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 font-['Inter',sans-serif]">
        <div className="bg-white p-10 rounded-2xl border border-zinc-200 shadow-sm max-w-md w-full text-center">
          <div className="w-14 h-14 bg-zinc-100 text-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-zinc-200">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2 tracking-tight">HSE Safety Tracker</h2>
          <p className="text-zinc-500 text-xs font-medium mb-8 leading-relaxed">Select an active project site to manage toolbox talks, safety penalties, and incident records.</p>
          <div className="text-left">
            <label className={labelClass}>Active Project Site</label>
            <select 
              value={activeProject} 
              onChange={e => setActiveProject(e.target.value)} 
              className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
            >
              <option value="" disabled>Select Project Site...</option>
              {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">HSE & Site Safety</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Site:</span>
            <select 
              value={activeProject} 
              onChange={e => setActiveProject(e.target.value)} 
              className="bg-zinc-50 hover:bg-zinc-100 text-zinc-900 font-bold border border-zinc-200 rounded-md px-3 py-1 text-xs outline-none cursor-pointer transition-colors shadow-sm appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.9rem_0.9rem]"
            >
              {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
            </select>
          </div>
        </div>

        <div className="flex bg-white p-1 rounded-lg shadow-sm border border-zinc-200 overflow-x-auto">
          {[
            { id: 'TOOLBOX', label: 'Toolbox Talks' },
            { id: 'PPE_VIOLATIONS', label: 'PPE Penalties' },
            { id: 'INCIDENTS', label: 'Incident Log' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-zinc-900 text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Safety Briefings (Total)</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">
            {toolboxTalks.filter(t => String(t.projectId) === String(activeProject)).length}
          </p>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">PPE Violations Logged</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">
            {ppeViolations.filter(v => String(v.projectId) === String(activeProject)).length}
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">Penalties Recoverable</span>
          <p className="text-2xl font-black text-emerald-800 tracking-tight">
            ₹{ppeViolations.filter(v => String(v.projectId) === String(activeProject)).reduce((sum, v) => sum + Number(v.penaltyAmount), 0).toLocaleString('en-IN')}
          </p>
        </div>

        <div className={`p-6 rounded-xl shadow-sm border flex flex-col justify-center ${
          incidents.filter(i => String(i.projectId) === String(activeProject) && i.status === 'Open').length > 0 
            ? 'bg-red-50 border-red-200' 
            : 'bg-white border-zinc-200'
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${
            incidents.filter(i => String(i.projectId) === String(activeProject) && i.status === 'Open').length > 0 
              ? 'text-red-700' 
              : 'text-zinc-400'
          }`}>
            Open Incident Reports
          </span>
          <p className={`text-2xl font-black tracking-tight ${
            incidents.filter(i => String(i.projectId) === String(activeProject) && i.status === 'Open').length > 0 
              ? 'text-red-700' 
              : 'text-zinc-900'
          }`}>
            {incidents.filter(i => String(i.projectId) === String(activeProject) && i.status === 'Open').length}
          </p>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        
        {/* TOOLBOX TALKS */}
        {activeTab === 'TOOLBOX' && (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-6 border-b border-zinc-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Toolbox Talk Register</h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Daily morning safety briefing logs for {currentProjectName}</p>
              </div>
              <button 
                onClick={() => setIsToolboxOpen(true)} 
                className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 border border-black"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Log Briefing
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                    <th className="py-4 px-6 w-36">Date</th>
                    <th className="py-4 px-6">Topic Discussed</th>
                    <th className="py-4 px-6 w-64">Conducted By</th>
                    <th className="py-4 px-6 font-bold text-center w-36">Headcount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {toolboxTalks.filter(t => String(t.projectId) === String(activeProject)).map(talk => (
                    <tr key={talk.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-zinc-500">{talk.date}</td>
                      <td className="py-4 px-6 font-bold text-zinc-900 tracking-tight">{talk.topic}</td>
                      <td className="py-4 px-6 text-xs font-semibold text-zinc-700">{talk.conductor}</td>
                      <td className="py-4 px-6 text-center font-mono font-bold text-xs text-zinc-900">
                        <span className="bg-zinc-100 px-3 py-1 rounded-md border border-zinc-200">
                          {talk.attendees}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {toolboxTalks.filter(t => String(t.projectId) === String(activeProject)).length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                        No safety briefings logged for this site.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PPE VIOLATIONS */}
        {activeTab === 'PPE_VIOLATIONS' && (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-6 border-b border-zinc-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">PPE Violation Penalties</h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Violations auto-flagged for direct debit in next Subcontractor RA Bill.</p>
              </div>
              <button 
                onClick={() => setIsPpeOpen(true)} 
                className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 border border-black"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Report Violation
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                    <th className="py-4 px-6 w-36">Date</th>
                    <th className="py-4 px-6 w-72">Subcontractor Agency</th>
                    <th className="py-4 px-6">Violation Type</th>
                    <th className="py-4 px-6 text-right w-40">Penalty Amount</th>
                    <th className="py-4 px-6 text-center w-36">Photo Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {ppeViolations.filter(v => String(v.projectId) === String(activeProject)).map(v => (
                    <tr key={v.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-zinc-500">{v.date}</td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-zinc-900 tracking-tight">{v.subName}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Worker: {v.workerName}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest">
                          {v.violationType}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-black text-sm text-red-600 bg-red-50/20">
                        ₹{Number(v.penaltyAmount).toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {v.photoLink ? (
                          <a 
                            href={v.photoLink} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-zinc-300 font-bold text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {ppeViolations.filter(v => String(v.projectId) === String(activeProject)).length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                        No PPE violations reported. Zero safety penalties.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INCIDENTS */}
        {activeTab === 'INCIDENTS' && (
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-6 border-b border-zinc-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Incident & Accident Log</h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Statutory audit reports and corrective preventative actions.</p>
              </div>
              <button 
                onClick={() => setIsIncidentOpen(true)} 
                className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 border border-black"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Log Incident
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                    <th className="py-4 px-6 w-36">Date</th>
                    <th className="py-4 px-6 w-36">Severity</th>
                    <th className="py-4 px-6">Description</th>
                    <th className="py-4 px-6 min-w-[200px]">Corrective Action</th>
                    <th className="py-4 px-6 text-center w-36">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-sm">
                  {incidents.filter(i => String(i.projectId) === String(activeProject)).map(inc => (
                    <tr key={inc.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-4 px-6 text-xs font-bold uppercase tracking-widest text-zinc-500">{inc.date}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                          inc.severity === 'Near Miss' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          inc.severity === 'Minor' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-zinc-900 tracking-tight truncate max-w-[250px]" title={inc.description}>
                        {inc.description}
                      </td>
                      <td className="py-4 px-6 text-zinc-600 text-xs font-medium truncate max-w-[250px]" title={inc.correctiveAction}>
                        {inc.correctiveAction || 'Pending review'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                          inc.status === 'Open' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {inc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {incidents.filter(i => String(i.projectId) === String(activeProject)).length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                        Zero incidents recorded. 100% incident-free safety standard.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* TOOLBOX MODAL */}
      {isToolboxOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Log Toolbox Talk</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Morning Site Safety Briefing</p>
              </div>
              <button 
                onClick={() => setIsToolboxOpen(false)} 
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-[#F4F4F5]">
              <form id="toolboxForm" onSubmit={handleSaveToolbox} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={toolboxForm.date} onChange={e => setToolboxForm({...toolboxForm, date: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Headcount <span className="text-red-500">*</span></label>
                    <input type="number" required value={toolboxForm.attendees} onChange={e => setToolboxForm({...toolboxForm, attendees: e.target.value})} className={inputClass} placeholder="Workers" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Topic Discussed <span className="text-red-500">*</span></label>
                  <select 
                    value={toolboxForm.topic} 
                    onChange={e => setToolboxForm({...toolboxForm, topic: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="Working at Heights">Working at Heights</option>
                    <option value="Electrical Safety">Electrical Safety</option>
                    <option value="Material Handling">Proper Material Handling</option>
                    <option value="Housekeeping">Site Housekeeping</option>
                    <option value="PPE Compliance">PPE Compliance</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Conducted By <span className="text-red-500">*</span></label>
                  <input type="text" required value={toolboxForm.conductor} onChange={e => setToolboxForm({...toolboxForm, conductor: e.target.value})} className={inputClass} placeholder="Site Engineer / Officer" />
                </div>
              </form>
            </div>

            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setIsToolboxOpen(false)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="toolboxForm"
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all cursor-pointer border border-black"
              >
                Save Briefing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PPE MODAL */}
      {isPpeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Report PPE Violation</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Direct Contractor Penalty</p>
              </div>
              <button 
                onClick={() => setIsPpeOpen(false)} 
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-[#F4F4F5]">
              <form id="ppeForm" onSubmit={handleSavePpe} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Subcontractor Agency <span className="text-red-500">*</span></label>
                  <select 
                    required 
                    value={ppeForm.subcontractorId} 
                    onChange={e => setPpeForm({...ppeForm, subcontractorId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="">Select Agency...</option>
                    {subcontractors.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.trade})</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Worker Name / Description</label>
                  <input type="text" required value={ppeForm.workerName} onChange={e => setPpeForm({...ppeForm, workerName: e.target.value})} className={inputClass} placeholder="e.g. Ramesh (Painter)" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Violation Type</label>
                    <select 
                      value={ppeForm.violationType} 
                      onChange={e => setPpeForm({...ppeForm, violationType: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="No Helmet">No Helmet</option>
                      <option value="No Safety Shoes">No Safety Shoes</option>
                      <option value="No Harness">No Safety Harness</option>
                      <option value="No Jacket">No Reflective Jacket</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Penalty (₹)</label>
                    <input type="number" required value={ppeForm.penaltyAmount} onChange={e => setPpeForm({...ppeForm, penaltyAmount: e.target.value})} className={`${inputClass} font-bold text-red-600`} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Photo Proof</label>
                  <input type="file" accept="image/*" onChange={e => handleFileUpload(e, setPpeForm)} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:tracking-widest file:bg-zinc-200 file:text-zinc-900 hover:file:bg-zinc-300 cursor-pointer border border-zinc-200 rounded-lg bg-zinc-50" />
                </div>
              </form>
            </div>

            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setIsPpeOpen(false)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="ppeForm"
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all cursor-pointer border border-black"
              >
                Log Penalty
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INCIDENT MODAL */}
      {isIncidentOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Log Safety Incident</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Audit Record & Mitigation</p>
              </div>
              <button 
                onClick={() => setIsIncidentOpen(false)} 
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-[#F4F4F5]">
              <form id="incidentForm" onSubmit={handleSaveIncident} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={incidentForm.date} onChange={e => setIncidentForm({...incidentForm, date: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Severity</label>
                    <select 
                      value={incidentForm.severity} 
                      onChange={e => setIncidentForm({...incidentForm, severity: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="Near Miss">Near Miss</option>
                      <option value="Minor">Minor Injury (First Aid)</option>
                      <option value="Major">Major (Hospital/LTI)</option>
                      <option value="Fatal">Fatal</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Description of Event <span className="text-red-500">*</span></label>
                  <textarea required rows="3" value={incidentForm.description} onChange={e => setIncidentForm({...incidentForm, description: e.target.value})} className={`${inputClass} resize-none`} placeholder="What happened on site?" />
                </div>

                <div>
                  <label className={labelClass}>Corrective Action Taken</label>
                  <textarea rows="3" value={incidentForm.correctiveAction} onChange={e => setIncidentForm({...incidentForm, correctiveAction: e.target.value})} className={`${inputClass} resize-none`} placeholder="How are we preventing recurrence?" />
                </div>
              </form>
            </div>

            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setIsIncidentOpen(false)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="incidentForm"
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all cursor-pointer border border-black"
              >
                Save Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}