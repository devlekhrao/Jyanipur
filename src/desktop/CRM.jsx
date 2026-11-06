import React, { useState, useEffect } from 'react';
import { 
  getLeads, 
  saveLead, 
  deleteLead, 
  getProjects, 
  saveProject, 
  saveTask 
} from '../db';
import { exportToCSV } from '../utils';
import { sendWhatsAppMessage } from '../WhatsAppHelper';

export default function CRM({ setActivePage, companySettings = {} }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null, 
    clientName: '', 
    phone: '', 
    email: '',
    occupation: '', 
    gst: '', 
    address: '',    
    projectType: 'Residential 3BHK', 
    estimatedValue: '', 
    source: 'Direct Inquiry',
    status: 'New Inquiry', 
    notes: '',
    followUpCount: 0,
    dateAdded: new Date().toISOString().split('T')[0]
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsData, projsData] = await Promise.all([
        getLeads(),
        getProjects ? getProjects() : Promise.resolve([])
      ]);
      const sortedData = (leadsData || []).sort((a, b) => (b.id || 0) - (a.id || 0));
      setLeads(sortedData);
      setProjects(projsData || []);
    } catch (e) {
      console.error("Error loading leads from cloud database:", e);
      setLeads([]);
      setProjects([]);
    }
    setLoading(false);
  };

  const checkPendingEstimationLeads = async () => {
    const pending = JSON.parse(localStorage.getItem('jyanipur_crm_leads') || '[]');
    if (pending.length > 0) {
      for (let lead of pending) {
        const numericValue = typeof lead.value === 'string' 
          ? parseFloat(lead.value.replace(/[^0-9.-]+/g, "")) 
          : (lead.value || 0);
        
        await saveLead({
          clientName: lead.name,
          phone: lead.phone || '',
          email: lead.email || '',
          occupation: lead.company || '', 
          gst: lead.gst || '',
          address: lead.address || '',
          projectType: 'Estimation Sync',
          estimatedValue: numericValue,
          source: lead.source || 'Estimation',
          status: lead.status || 'Negotiation', 
          notes: 'Auto-imported from Estimation module.',
          followUpCount: 0,
          dateAdded: new Date().toISOString().split('T')[0]
        });
      }
      localStorage.removeItem('jyanipur_crm_leads');
      await loadData();
    }
  };

  useEffect(() => {
    checkPendingEstimationLeads().then(() => loadData());
  }, []);

  // --- AUTOMATION 1: CONVERT WON LEAD TO ACTIVE PROJECT + KICKOFF TASKS ---
  const handleConvertLeadToProject = async (lead) => {
    const budgetVal = parseFloat(lead.estimatedValue) || 0;
    const projName = lead.projectType 
      ? `${lead.clientName} - ${lead.projectType}` 
      : `${lead.clientName} Interior Project`;

    if (!window.confirm(`Convert "${lead.clientName}" into an Active Project with a budget of ₹${budgetVal.toLocaleString('en-IN')}?`)) return;

    setSubmitting(true);
    try {
      let createdProject = null;
      if (saveProject) {
        createdProject = await saveProject({
          name: projName,
          clientName: lead.clientName,
          clientPhone: lead.phone || '',
          clientEmail: lead.email || '',
          clientAddress: lead.address || '',
          clientGstin: (lead.gst || '').toUpperCase(),
          budget: budgetVal,
          status: 'Active',
          poDate: new Date().toISOString().split('T')[0]
        });
      }

      // Auto-seed Initial Site Survey & Mobilization Task
      if (saveTask) {
        const linkedId = createdProject ? (createdProject.id || createdProject._id) : '';
        await saveTask({
          projectId: linkedId,
          projectName: projName,
          title: 'Site Mobilization & Laser Survey',
          description: `Initial site inspection and floor protection setup for ${lead.clientName}. Contact: ${lead.phone || 'N/A'}.`,
          status: 'To Do',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          assignedTo: 'Site Engineer'
        });
      }

      // Mark Lead as Won
      await saveLead({
        ...lead,
        status: 'Won',
        convertedProjectId: createdProject ? (createdProject.id || createdProject._id) : undefined
      });

      await loadData();
      alert(`Lead Converted!\n\n1. Project "${projName}" created in Projects\n2. Mobilization Task scheduled in Task Board\n3. Status updated to "Won"`);
    } catch (err) {
      console.error("Error auto-converting lead:", err);
      alert("Failed to convert lead to project.");
    }
    setSubmitting(false);
  };

  // Status mover with automated trigger
  const handleStatusMove = async (lead, newStatus) => {
    try {
      if (newStatus === 'Won' && lead.status !== 'Won') {
        await handleConvertLeadToProject(lead);
        return;
      }
      await saveLead({ ...lead, status: newStatus });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await saveLead({ 
        ...formData, 
        estimatedValue: parseFloat(formData.estimatedValue) || 0,
        followUpCount: formData.followUpCount || 0,
        dateAdded: formData.dateAdded || new Date().toISOString().split('T')[0]
      });
      setIsModalOpen(false);
      resetForm();
      await loadData();
    } catch (err) {
      alert("Failed to save lead profile.");
    }
    setSubmitting(false);
  };

  const handleEdit = (lead) => {
    setFormData({
      id: lead.id,
      clientName: lead.clientName || '',
      phone: lead.phone || '',
      email: lead.email || '',
      occupation: lead.occupation || '',
      gst: lead.gst || '', 
      address: lead.address || '',
      projectType: lead.projectType || 'Residential 3BHK',
      estimatedValue: lead.estimatedValue || '',
      source: lead.source || 'Direct Inquiry',
      status: lead.status || 'New Inquiry',
      notes: lead.notes || '',
      followUpCount: lead.followUpCount || 0,
      dateAdded: lead.dateAdded || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ 
      id: null, 
      clientName: '', 
      phone: '', 
      email: '', 
      occupation: '', 
      gst: '', 
      address: '', 
      projectType: 'Residential 3BHK', 
      estimatedValue: '', 
      source: 'Direct Inquiry', 
      status: 'New Inquiry', 
      notes: '', 
      followUpCount: 0, 
      dateAdded: new Date().toISOString().split('T')[0] 
    });
  };

  const handleAddFollowUp = async (lead) => {
    try {
      const newCount = (lead.followUpCount || 0) + 1;
      await saveLead({ ...lead, followUpCount: newCount });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this lead permanently?")) {
      setLoading(true);
      await deleteLead(id);
      await loadData();
    }
  };

  // --- AUTOMATION 2: 1-CLICK PIPELINE TO ESTIMATION ---
  const handleCreateEstimation = (lead) => {
    const draft = {
      partyName: lead.clientName || '',
      partyAddress: lead.address || '',
      partyPhone: lead.phone || '',
      partyEmail: lead.email || '',
      projectName: lead.projectType ? `${lead.clientName} - ${lead.projectType}` : `${lead.clientName} Project`,
      description: lead.notes || `Turnkey requirements for ${lead.projectType || 'interior design'}`
    };
    
    // Store in both session & localStorage for universal cross-module pickup
    sessionStorage.setItem('crm_to_estimation', JSON.stringify(draft));
    localStorage.setItem('jyanipur_desktop_estimate_draft', JSON.stringify({
      estimateDetails: {
        partyName: draft.partyName,
        partyAddress: draft.partyAddress,
        partyPhone: draft.partyPhone,
        partyEmail: draft.partyEmail,
        projectName: draft.projectName,
        description: draft.description,
        date: new Date().toISOString().split('T')[0],
        terms: companySettings.defaultEstimateTerms || ''
      },
      items: [{ id: 1, description: `Scope of Work: ${lead.projectType || 'General Execution'}`, unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', qty: 1, rate: parseFloat(lead.estimatedValue) || '', gst: 18 }],
      taxMode: 'CGST_SGST'
    }));
    
    if (setActivePage) {
      setActivePage('Estimation');
    } else {
      alert(`Client details for "${lead.clientName}" pre-filled!\n\nNavigate to the "Estimation" module to view the drafted BOQ.`);
    }
  };

  const handleSendWhatsApp = (lead) => {
    const template = companySettings.waInvoiceTemplate || 'Hello, thank you for contacting us regarding your interior project requirements.';
    const finalMessage = `Hello ${lead.clientName},\n\nThank you for reaching out to *${companySettings.companyName || 'Jyanipur Interiors'}*. We have noted your interest in *${lead.projectType || 'Interior Execution'}*.\n\nOur team is available to schedule your on-site survey at your earliest convenience.\n\nBest regards,\n*${companySettings.companyName || 'Jyanipur Interiors'}*`;
    sendWhatsAppMessage(lead.phone || '', finalMessage);
  };

  const handleExport = () => {
    const exportData = leads.map(l => ({
      'Date Added': l.dateAdded || '',
      'Client Name': l.clientName,
      'Phone': l.phone,
      'Email': l.email,
      'Occupation / Company': l.occupation,
      'GSTIN': l.gst,
      'Address': l.address,
      'Project Type': l.projectType,
      'Source': l.source,
      'Status': l.status,
      'Follow-ups': l.followUpCount || 0,
      'Est. Budget (INR)': l.estimatedValue,
      'Notes': l.notes
    }));
    exportToCSV('Jyanipur_CRM_Leads', exportData);
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = !searchQuery.trim() || (
      (l.clientName && l.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.phone && l.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.email && l.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.projectType && l.projectType.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.status && l.status.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = ['New Inquiry', 'Site Visited', 'Negotiation', 'Won', 'Lost'];

  const totalPipelineValue = leads.reduce((sum, l) => sum + (parseFloat(l.estimatedValue) || 0), 0);
  const wonPipelineValue = leads
    .filter(l => l.status === 'Won')
    .reduce((sum, l) => sum + (parseFloat(l.estimatedValue) || 0), 0);
  const conversionRate = leads.length > 0 
    ? Math.round((leads.filter(l => l.status === 'Won').length / leads.length) * 100) 
    : 0;

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">CRM Pipeline</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Track inquiries, follow-up attempts, and auto-convert won deals into active projects and estimations.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-auto focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
            <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search name, phone, scope..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full md:w-56 placeholder:text-zinc-400" 
            />
          </div>

          <button 
            onClick={handleExport} 
            className="h-10 bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
          
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }} 
            className="h-10 bg-zinc-900 hover:bg-black text-white px-5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Lead
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Inquiries</span>
          <p className="text-3xl font-black text-zinc-900 tracking-tight">{leads.length}</p>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Pipeline Value</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {totalPipelineValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">Won Deal Value</span>
          <p className="text-2xl font-black text-emerald-800 tracking-tight">₹ {wonPipelineValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>

        <div className="bg-zinc-900 border border-black p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden">
          <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 relative z-10">Conversion Rate</span>
          <p className="text-3xl font-black text-white tracking-tight relative z-10">{conversionRate}%</p>
        </div>
      </div>

      {/* STAGE FILTERS */}
      <div className="flex gap-2 mb-4 p-1 bg-zinc-100 rounded-lg w-fit shrink-0 border border-zinc-200">
        {['All', ...columns].map(stage => (
          <button
            key={stage}
            onClick={() => setStatusFilter(stage)}
            className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              statusFilter === stage
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {stage}
          </button>
        ))}
      </div>

      {/* TABLE VIEW */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-200 sticky top-0 z-10">
                <th className="py-4 px-6 w-36">Date Added</th>
                <th className="py-4 px-6">Client Profile</th>
                <th className="py-4 px-6 w-48">Contact Details</th>
                <th className="py-4 px-6 w-52">Project Scope</th>
                <th className="py-4 px-6 text-center w-36">Follow-ups</th>
                <th className="py-4 px-6 text-center w-40">Pipeline Stage</th>
                <th className="py-4 px-6 text-right w-44">Est. Budget</th>
                <th className="py-4 px-6 text-right w-64">Actions & Pipeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center text-zinc-400 font-medium text-xs">
                    Syncing CRM leads from cloud database...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-200">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-zinc-500 font-medium text-xs">No leads found in pipeline matching filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="transition-all hover:bg-zinc-50/80 group">
                    <td className="py-4 px-6 text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">
                      {lead.dateAdded || '-'}
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {lead.clientName ? lead.clientName.charAt(0).toUpperCase() : 'C'}
                        </span>
                        <div>
                          <p className="font-bold text-sm text-zinc-900 tracking-tight">{lead.clientName}</p>
                          {lead.occupation && <p className="text-[10px] text-zinc-500 font-medium mt-0.5 truncate max-w-[170px]">{lead.occupation}</p>}
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <p className="text-xs font-bold text-zinc-900">{lead.phone || 'No Phone'}</p>
                      {lead.email && <p className="text-[10px] text-zinc-500 font-medium mt-0.5 truncate max-w-[180px]">{lead.email}</p>}
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-block bg-zinc-100 border border-zinc-200 text-zinc-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded">
                          {lead.projectType}
                        </span>
                        {lead.source && <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{lead.source}</span>}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-mono font-bold text-zinc-900 text-xs bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md">
                          {lead.followUpCount || 0}
                        </span>
                        <button 
                          onClick={() => handleAddFollowUp(lead)} 
                          title="Record contact attempt" 
                          className="w-6 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 rounded border border-transparent hover:border-zinc-300 transition-all cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    
                    <td className="py-4 px-6 text-center">
                      <select
                        value={lead.status || 'New Inquiry'}
                        onChange={(e) => handleStatusMove(lead, e.target.value)}
                        className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:0.75rem_0.75rem] pr-6 pl-2.5 py-1 rounded-md border outline-none cursor-pointer transition-all text-[9px] font-bold uppercase tracking-widest ${
                          lead.status === 'Won' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                          lead.status === 'Lost' ? 'bg-red-50 text-red-700 border-red-200' :
                          lead.status === 'Negotiation' ? 'bg-zinc-900 text-white border-black' :
                          lead.status === 'Site Visited' ? 'bg-zinc-100 text-zinc-800 border-zinc-300' :
                          'bg-white text-zinc-700 border-zinc-200'
                        }`}
                      >
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>

                    <td className="py-4 px-6 text-right font-black text-sm text-zinc-900">
                      ₹ {(Number(lead.estimatedValue) || 0).toLocaleString('en-IN')}
                    </td>
                    
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.status !== 'Won' ? (
                          <button 
                            onClick={() => handleConvertLeadToProject(lead)}
                            disabled={submitting}
                            title="Auto-create Project in Projects + Task in TaskBoard"
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5 border border-black"
                          >
                            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Win
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                            Active Project
                          </span>
                        )}

                        <button 
                          onClick={() => handleCreateEstimation(lead)} 
                          title="Generate instant BOQ Estimate with pre-filled scope"
                          className="px-2.5 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm"
                        >
                          Estimate
                        </button>

                        <button 
                          onClick={() => handleSendWhatsApp(lead)} 
                          title="Send introductory proposal WhatsApp"
                          className="p-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg transition-all shadow-sm cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>

                        <button 
                          onClick={() => handleEdit(lead)} 
                          title="Edit Profile" 
                          className="px-2.5 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm"
                        >
                          Edit
                        </button>
                        
                        <button 
                          onClick={() => handleDelete(lead.id)} 
                          title="Delete Lead" 
                          className="p-1.5 bg-white text-red-500 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all cursor-pointer shadow-sm opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                  {formData.id ? 'Edit Client Profile' : 'New Client Onboarding'}
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Lead Prospect & Scope Particulars</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-[#F4F4F5]">
              <form id="leadForm" onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                
                <div>
                  <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-4 border-b border-zinc-100 pb-2">Client Identity & Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Client Full Name <span className="text-red-500">*</span></label>
                      <input type="text" required value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className={inputClass} placeholder="e.g. Anand Mahindra" />
                    </div>
                    <div>
                      <label className={labelClass}>Occupation / Business</label>
                      <input type="text" value={formData.occupation} onChange={e => setFormData({...formData, occupation: e.target.value})} className={inputClass} placeholder="e.g. IT Director" />
                    </div>
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} placeholder="+91 98765 43210" />
                    </div>
                    <div>
                      <label className={labelClass}>Email Address</label>
                      <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className={inputClass} placeholder="client@example.com" />
                    </div>
                    <div>
                      <label className={labelClass}>GSTIN (If Corporate Billing)</label>
                      <input type="text" value={formData.gst} onChange={e => setFormData({...formData, gst: e.target.value.toUpperCase()})} className={`${inputClass} font-mono uppercase`} placeholder="36ABCDE1234F1Z5" maxLength={15} />
                    </div>
                    <div>
                      <label className={labelClass}>Site / Residential Location</label>
                      <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className={inputClass} placeholder="Plot/Flat, Community, City" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-4 border-b border-zinc-100 pb-2">Requirement & Commercials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Project Type / Scope</label>
                      <input type="text" value={formData.projectType} onChange={e => setFormData({...formData, projectType: e.target.value})} className={inputClass} placeholder="e.g. Residential 3BHK" list="projectTypes" />
                      <datalist id="projectTypes">
                        <option value="Residential 2BHK" />
                        <option value="Residential 3BHK" />
                        <option value="Villa / Bungalow" />
                        <option value="Commercial Office" />
                        <option value="Retail Showroom" />
                        <option value="Turnkey Civil + Interior" />
                      </datalist>
                    </div>
                    <div>
                      <label className={labelClass}>Estimated Budget (₹)</label>
                      <input type="number" step="any" value={formData.estimatedValue} onChange={e => setFormData({...formData, estimatedValue: e.target.value})} className={`${inputClass} font-bold text-zinc-900`} placeholder="0.00" />
                    </div>
                    <div>
                      <label className={labelClass}>Lead Source</label>
                      <select 
                        value={formData.source} 
                        onChange={e => setFormData({...formData, source: e.target.value})} 
                        className={`${inputClass} appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                      >
                        <option value="Direct Inquiry">Direct Inquiry</option>
                        <option value="Architect Referral">Architect Referral</option>
                        <option value="Client Referral">Client Referral</option>
                        <option value="Instagram / Social">Instagram / Social</option>
                        <option value="Website">Website</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className={labelClass}>Client Preferences & Scope Notes</label>
                      <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Detailed client wish-list, material preferences, expected move-in date..." className={`${inputClass} resize-y min-h-[80px] leading-relaxed`} />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="leadForm" 
                disabled={submitting} 
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white font-bold rounded-lg text-[10px] uppercase tracking-widest shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-black"
              >
                {submitting ? 'Saving...' : formData.id ? 'Update Profile' : 'Save Lead'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}