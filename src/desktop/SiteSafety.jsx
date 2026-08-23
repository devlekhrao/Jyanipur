import React, { useState, useEffect } from 'react';
import { getProjects, getSubcontractors } from '../db';

export default function SiteSafety() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('TOOLBOX'); // TOOLBOX, PPE_VIOLATIONS, INCIDENTS
  
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [activeProject, setActiveProject] = useState('');

  // Module Data States (In production, replace with DB calls)
  const [toolboxTalks, setToolboxTalks] = useState([]);
  const [ppeViolations, setPpeViolations] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Modals
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [isPpeOpen, setIsPpeOpen] = useState(false);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);

  // Forms
  const [toolboxForm, setToolboxForm] = useState({ date: new Date().toISOString().split('T')[0], topic: 'Working at Heights', conductor: '', attendees: '', notes: '' });
  const [ppeForm, setPpeForm] = useState({ date: new Date().toISOString().split('T')[0], subcontractorId: '', workerName: '', violationType: 'No Helmet', penaltyAmount: '500', photoLink: '' });
  const [incidentForm, setIncidentForm] = useState({ date: new Date().toISOString().split('T')[0], severity: 'Near Miss', description: '', correctiveAction: '', status: 'Open' });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const projs = await getProjects() || [];
        const subs = await getSubcontractors() || [];
        
        const activeProjs = projs.filter(p => p.status !== 'Completed');
        setProjects(activeProjs);
        setSubcontractors(subs);
        
        if (activeProjs.length > 0) {
          setActiveProject(String(activeProjs[0].id || activeProjs[0]._id));
        }

        // Seed some mock data for demonstration
        setToolboxTalks([{ id: 1, projectId: activeProjs[0]?.id, date: new Date().toISOString().split('T')[0], topic: 'Electrical Safety', conductor: 'Site Engineer', attendees: 12 }]);
        setPpeViolations([{ id: 1, projectId: activeProjs[0]?.id, subcontractorId: subs[0]?.id, subName: subs[0]?.name, workerName: 'Raju', violationType: 'No Safety Shoes', penaltyAmount: 500, date: new Date().toISOString().split('T')[0] }]);
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

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  const currentProjectName = projects.find(p => String(p.id) === String(activeProject))?.name || 'Select Project';

  if (!activeProject && !loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="bg-white p-10 rounded-[2rem] border border-zinc-200 shadow-sm max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl shadow-sm">🦺</div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">HSE Safety Tracker</h2>
          <p className="text-zinc-500 text-xs font-medium mb-8">Select an active project site to manage toolbox talks, safety penalties, and incidents.</p>
          <div className="text-left">
            <select value={activeProject} onChange={e => setActiveProject(e.target.value)} className={inputClass}>
              <option value="" disabled>Select Project Site...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-zinc-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">HSE & Site Safety</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Active Site:</span>
            <select value={activeProject} onChange={e => setActiveProject(e.target.value)} className="bg-white text-[#B45309] font-bold border border-zinc-200 rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer shadow-sm">
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200">
          {[
            { id: 'TOOLBOX', label: 'Toolbox Talks' },
            { id: 'PPE_VIOLATIONS', label: 'PPE Penalties' },
            { id: 'INCIDENTS', label: 'Incident Log' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === tab.id ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Safety Briefings (Total)</span>
          <p className="text-xl font-bold text-zinc-900">{toolboxTalks.filter(t => String(t.projectId) === String(activeProject)).length}</p>
        </div>
        <div className="bg-white border border-zinc-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-1">PPE Violations Caught</span>
          <p className="text-xl font-bold text-amber-600">{ppeViolations.filter(v => String(v.projectId) === String(activeProject)).length}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Penalties Recoverable</span>
          <p className="text-xl font-bold text-emerald-700">₹{ppeViolations.filter(v => String(v.projectId) === String(activeProject)).reduce((sum, v) => sum + Number(v.penaltyAmount), 0).toLocaleString('en-IN')}</p>
        </div>
        <div className={`p-5 rounded-2xl shadow-sm border flex flex-col justify-center ${incidents.filter(i => String(i.projectId) === String(activeProject) && i.status === 'Open').length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-zinc-200'}`}>
          <span className={`text-[10px] font-bold uppercase tracking-widest block mb-1 ${incidents.filter(i => String(i.projectId) === String(activeProject) && i.status === 'Open').length > 0 ? 'text-red-500' : 'text-zinc-400'}`}>Open Incident Reports</span>
          <p className={`text-xl font-bold ${incidents.filter(i => String(i.projectId) === String(activeProject) && i.status === 'Open').length > 0 ? 'text-red-600' : 'text-zinc-900'}`}>{incidents.filter(i => String(i.projectId) === String(activeProject) && i.status === 'Open').length}</p>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        
        {/* TOOLBOX TALKS */}
        {activeTab === 'TOOLBOX' && (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">Toolbox Talk Register</h3>
                <p className="text-xs text-zinc-500 font-medium">Daily morning safety briefing logs for {currentProjectName}</p>
              </div>
              <button onClick={() => setIsToolboxOpen(true)} className="bg-[#B45309] hover:bg-[#92400E] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
                + Log Briefing
              </button>
            </div>
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200">
                  <th className="py-4 px-6 font-bold">Date</th>
                  <th className="py-4 px-6 font-bold">Topic Discussed</th>
                  <th className="py-4 px-6 font-bold">Conducted By</th>
                  <th className="py-4 px-6 font-bold text-center">Attendees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 text-sm">
                {toolboxTalks.filter(t => String(t.projectId) === String(activeProject)).map(talk => (
                  <tr key={talk.id} className="hover:bg-zinc-50">
                    <td className="py-4 px-6 font-bold text-zinc-900">{talk.date}</td>
                    <td className="py-4 px-6 font-medium text-zinc-700">{talk.topic}</td>
                    <td className="py-4 px-6 text-zinc-600">{talk.conductor}</td>
                    <td className="py-4 px-6 text-center font-bold text-[#B45309]">{talk.attendees}</td>
                  </tr>
                ))}
                {toolboxTalks.filter(t => String(t.projectId) === String(activeProject)).length === 0 && (
                  <tr><td colSpan="4" className="py-12 text-center text-zinc-400 font-medium text-sm">No safety briefings logged for this site.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PPE VIOLATIONS */}
        {activeTab === 'PPE_VIOLATIONS' && (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100 bg-amber-50/30 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-amber-800 uppercase tracking-widest">PPE Violation Penalties</h3>
                <p className="text-xs text-amber-600 font-medium">Violations auto-flagged for deduction in next RA Bill.</p>
              </div>
              <button onClick={() => setIsPpeOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
                + Report Violation
              </button>
            </div>
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200">
                  <th className="py-4 px-6 font-bold">Date</th>
                  <th className="py-4 px-6 font-bold">Subcontractor Agency</th>
                  <th className="py-4 px-6 font-bold">Violation Type</th>
                  <th className="py-4 px-6 font-bold text-right">Penalty Amount</th>
                  <th className="py-4 px-6 font-bold text-center">Photo Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 text-sm">
                {ppeViolations.filter(v => String(v.projectId) === String(activeProject)).map(v => (
                  <tr key={v.id} className="hover:bg-red-50/30">
                    <td className="py-4 px-6 font-semibold text-zinc-600">{v.date}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-zinc-900">{v.subName}</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Worker: {v.workerName}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider">{v.violationType}</span>
                    </td>
                    <td className="py-4 px-6 text-right font-black text-red-600">₹{Number(v.penaltyAmount).toLocaleString('en-IN')}</td>
                    <td className="py-4 px-6 text-center">
                      {v.photoLink ? <a href={v.photoLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">View Photo</a> : '-'}
                    </td>
                  </tr>
                ))}
                {ppeViolations.filter(v => String(v.projectId) === String(activeProject)).length === 0 && (
                  <tr><td colSpan="5" className="py-12 text-center text-zinc-400 font-medium text-sm">No PPE violations reported. Safe site!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* INCIDENTS */}
        {activeTab === 'INCIDENTS' && (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-100 bg-red-50/30 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-red-800 uppercase tracking-widest">Incident & Accident Log</h3>
                <p className="text-xs text-red-600 font-medium">Formal reporting for compliance and corrective actions.</p>
              </div>
              <button onClick={() => setIsIncidentOpen(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
                + Log Incident
              </button>
            </div>
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200">
                  <th className="py-4 px-6 font-bold">Date</th>
                  <th className="py-4 px-6 font-bold">Severity</th>
                  <th className="py-4 px-6 font-bold">Description</th>
                  <th className="py-4 px-6 font-bold">Corrective Action</th>
                  <th className="py-4 px-6 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 text-sm">
                {incidents.filter(i => String(i.projectId) === String(activeProject)).map(inc => (
                  <tr key={inc.id} className="hover:bg-zinc-50">
                    <td className="py-4 px-6 font-semibold text-zinc-600">{inc.date}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        inc.severity === 'Near Miss' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        inc.severity === 'Minor' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-zinc-800 font-medium truncate max-w-[200px]" title={inc.description}>{inc.description}</td>
                    <td className="py-4 px-6 text-zinc-500 text-xs truncate max-w-[200px]" title={inc.correctiveAction}>{inc.correctiveAction || 'Pending review'}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${inc.status === 'Open' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {inc.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {incidents.filter(i => String(i.projectId) === String(activeProject)).length === 0 && (
                  <tr><td colSpan="5" className="py-12 text-center text-zinc-400 font-medium text-sm">No incidents logged. Zero-harm achieved.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      
      {/* TOOLBOX MODAL */}
      {isToolboxOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Log Toolbox Talk</h2>
              <button onClick={() => setIsToolboxOpen(false)} className="text-zinc-400 hover:text-zinc-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSaveToolbox} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Date</label><input type="date" required value={toolboxForm.date} onChange={e => setToolboxForm({...toolboxForm, date: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Headcount</label><input type="number" required value={toolboxForm.attendees} onChange={e => setToolboxForm({...toolboxForm, attendees: e.target.value})} className={inputClass} placeholder="No. of workers" /></div>
              </div>
              <div>
                <label className={labelClass}>Topic Discussed <span className="text-red-500">*</span></label>
                <select value={toolboxForm.topic} onChange={e => setToolboxForm({...toolboxForm, topic: e.target.value})} className={inputClass}>
                  <option value="Working at Heights">Working at Heights</option>
                  <option value="Electrical Safety">Electrical Safety</option>
                  <option value="Material Handling">Proper Material Handling</option>
                  <option value="Housekeeping">Site Housekeeping</option>
                  <option value="PPE Compliance">PPE Compliance</option>
                </select>
              </div>
              <div><label className={labelClass}>Conducted By <span className="text-red-500">*</span></label><input type="text" required value={toolboxForm.conductor} onChange={e => setToolboxForm({...toolboxForm, conductor: e.target.value})} className={inputClass} placeholder="Site Engineer Name" /></div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
                <button type="button" onClick={() => setIsToolboxOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-bold uppercase text-zinc-700">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-[#B45309] text-white rounded-xl text-xs font-bold uppercase shadow-sm">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PPE MODAL */}
      {isPpeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-amber-50">
              <h2 className="text-lg font-bold text-amber-900 tracking-tight">Report PPE Violation</h2>
              <button onClick={() => setIsPpeOpen(false)} className="text-zinc-400 hover:text-zinc-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSavePpe} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Subcontractor Agency <span className="text-red-500">*</span></label>
                <select required value={ppeForm.subcontractorId} onChange={e => setPpeForm({...ppeForm, subcontractorId: e.target.value})} className={inputClass}>
                  <option value="">Select Agency...</option>
                  {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.trade})</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Worker Name / Description</label><input type="text" required value={ppeForm.workerName} onChange={e => setPpeForm({...ppeForm, workerName: e.target.value})} className={inputClass} placeholder="e.g. Ramesh (Painter)" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Violation Type</label>
                  <select value={ppeForm.violationType} onChange={e => setPpeForm({...ppeForm, violationType: e.target.value})} className={inputClass}>
                    <option value="No Helmet">No Helmet</option>
                    <option value="No Safety Shoes">No Safety Shoes</option>
                    <option value="No Harness">No Safety Harness</option>
                    <option value="No Jacket">No Reflective Jacket</option>
                  </select>
                </div>
                <div><label className={labelClass}>Penalty (₹)</label><input type="number" required value={ppeForm.penaltyAmount} onChange={e => setPpeForm({...ppeForm, penaltyAmount: e.target.value})} className={`${inputClass} text-red-600 font-bold`} /></div>
              </div>
              <div><label className={labelClass}>Photo Proof</label><input type="file" accept="image/*" onChange={e => handleFileUpload(e, setPpeForm)} className="w-full text-xs file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-amber-100 file:text-amber-800 cursor-pointer" /></div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
                <button type="button" onClick={() => setIsPpeOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-bold uppercase text-zinc-700">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-bold uppercase shadow-sm">Log Penalty</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INCIDENT MODAL */}
      {isIncidentOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-red-50">
              <h2 className="text-lg font-bold text-red-900 tracking-tight">Log Safety Incident</h2>
              <button onClick={() => setIsIncidentOpen(false)} className="text-zinc-400 hover:text-zinc-700"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSaveIncident} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Date</label><input type="date" required value={incidentForm.date} onChange={e => setIncidentForm({...incidentForm, date: e.target.value})} className={inputClass} /></div>
                <div>
                  <label className={labelClass}>Severity</label>
                  <select value={incidentForm.severity} onChange={e => setIncidentForm({...incidentForm, severity: e.target.value})} className={inputClass}>
                    <option value="Near Miss">Near Miss</option>
                    <option value="Minor">Minor Injury (First Aid)</option>
                    <option value="Major">Major (Hospital/LTI)</option>
                    <option value="Fatal">Fatal</option>
                  </select>
                </div>
              </div>
              <div><label className={labelClass}>Description of Event <span className="text-red-500">*</span></label><textarea required rows="2" value={incidentForm.description} onChange={e => setIncidentForm({...incidentForm, description: e.target.value})} className={`${inputClass} resize-none`} placeholder="What happened?" /></div>
              <div><label className={labelClass}>Corrective Action Taken</label><textarea rows="2" value={incidentForm.correctiveAction} onChange={e => setIncidentForm({...incidentForm, correctiveAction: e.target.value})} className={`${inputClass} resize-none`} placeholder="How are we preventing this?" /></div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100">
                <button type="button" onClick={() => setIsIncidentOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-bold uppercase text-zinc-700">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold uppercase shadow-sm">Save Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}