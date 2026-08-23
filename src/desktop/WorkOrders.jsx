import React, { useState, useEffect, useRef } from 'react';
import { 
  getClientWorkOrders, 
  saveClientWorkOrder, 
  toggleCancelClientWorkOrder, 
  getLeads,
  getSubcontractorWorkOrders,
  saveSubcontractorWorkOrder,
  getSubcontractors,
  getProjects
} from '../db';

// Helper function to convert number to Words
function numberToWords(num) {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'Overflow';
    let n_array = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return '';
    let str = '';
    str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
    str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
    str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
    str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
    str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
    return str;
  };
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  let result = inWords(integerPart) + 'Rupees ';
  if (decimalPart > 0) result += 'and ' + inWords(decimalPart) + 'Paise ';
  return result.trim() + ' Only';
}

const defaultClientTerms = "1. 50% Advance on signing.\n2. 40% on material delivery.\n3. 10% on handover.\n4. Water & Electricity to be provided by client.\n5. Any extra work outside this scope will be charged additionally.";
const defaultSubTerms = "1. Work to be executed strictly as per approved drawings & scope.\n2. Subcontractor is liable for their workers' safety & PPE.\n3. 5% Retention money will be held for 6 months post-completion.\n4. Payments will be made based on RA Bills certified by the Site Engineer.\n5. Site cleanup is the subcontractor's responsibility.";

export default function WorkOrders({ companySettings = {}, updateDirtyState }) {
  const [currentView, setCurrentView] = useState('list');
  const [activeTab, setActiveTab] = useState('Client'); // 'Client' or 'Subcontractor'
  
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Database States
  const [clientWoList, setClientWoList] = useState([]);
  const [subWoList, setSubWoList] = useState([]);
  const [crmLeads, setCrmLeads] = useState([]);
  const [subsList, setSubsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  
  // CRM Autocomplete State (For Clients)
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientDropdownRef = useRef(null);

  // Unified Form State
  const [woDetails, setWoDetails] = useState({
    woType: 'Client', // 'Client' or 'Subcontractor'
    // Client Fields
    clientName: '', clientAddress: '', clientPhone: '', 
    date: new Date().toISOString().split('T')[0], targetCompletion: '', 
    woNo: 'WO/', projectName: '', 
    // Subcontractor Fields
    subcontractorId: '', projectId: '', contractValue: '',
    // Shared Fields
    terms: defaultClientTerms, 
    scopeOfWork: ''
  });

  const [items, setItems] = useState([
    { id: 1, description: '', room: 'Master Bedroom', qty: '1', rate: '', amount: 0 }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cWo, sWo, leadsData, subsData, projsData] = await Promise.all([
        getClientWorkOrders(),
        getSubcontractorWorkOrders(),
        getLeads ? getLeads() : Promise.resolve([]),
        getSubcontractors ? getSubcontractors() : Promise.resolve([]),
        getProjects ? getProjects() : Promise.resolve([])
      ]);
      setClientWoList(cWo || []);
      setSubWoList(sWo || []);
      setCrmLeads(leadsData || []);
      setSubsList(subsData || []);
      setProjectsList(projsData || []);
    } catch (e) {
      console.error("Error loading Work Orders Data:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [currentView]);

  // Click outside dropdown (For Client Selection)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClientInputChange = (e) => {
    const val = e.target.value;
    setWoDetails(prev => ({ ...prev, clientName: val }));

    if (val.trim().length > 0) {
      const matches = crmLeads.filter(l => l.clientName && l.clientName.toLowerCase().includes(val.toLowerCase()));
      setClientSuggestions(matches);
      setShowClientDropdown(matches.length > 0);
    } else {
      setClientSuggestions(crmLeads);
      setShowClientDropdown(crmLeads.length > 0);
    }
  };

  const handleSelectClient = (client) => {
    setWoDetails(prev => ({
      ...prev,
      clientName: client.clientName,
      clientAddress: client.address || '',
      clientPhone: client.phone || '',
      projectName: client.projectType || ''
    }));
    setShowClientDropdown(false);
  };

  const addItem = () => setItems([...items, { id: Date.now(), description: '', room: '', qty: '1', rate: '', amount: 0 }]);
  const updateItem = (id, field, value) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const calculateRow = (item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    return qty * rate;
  };

  const totals = items.reduce((acc, item) => acc + calculateRow(item), 0);

  const handleSaveOnly = async () => {
    setSubmitting(true);
    try {
      if (woDetails.woType === 'Client') {
        if (!woDetails.clientName || !woDetails.woNo) {
          alert('Client Name and WO No are required for Client Contracts.');
          setSubmitting(false);
          return;
        }
        
        const record = {
          id: editingId || undefined,
          ...woDetails,
          items: items,
          totalAmount: totals
        };
        await saveClientWorkOrder(record);
        
      } else {
        // Subcontractor WO Save
        if (!woDetails.subcontractorId || !woDetails.projectId || !woDetails.contractValue) {
          alert('Subcontractor, Project, and Contract Value are required.');
          setSubmitting(false);
          return;
        }

        const record = {
          id: editingId || undefined,
          subcontractorId: woDetails.subcontractorId,
          projectId: woDetails.projectId,
          scope: woDetails.scopeOfWork || 'General Subcontractor Scope',
          contractValue: parseFloat(woDetails.contractValue) || 0
        };
        await saveSubcontractorWorkOrder(record);
      }

      alert(`${woDetails.woType} Work Order saved successfully!`);
      handleClear();
      setCurrentView('list');
    } catch (err) {
      console.error(err);
      alert('Failed to save Work Order.');
    }
    setSubmitting(false);
  };

  const handleEditClient = (wo) => {
    setEditingId(wo.id);
    setWoDetails({
      woType: 'Client',
      clientName: wo.clientName || '', clientAddress: wo.clientAddress || '', clientPhone: wo.clientPhone || '',
      date: wo.date || new Date().toISOString().split('T')[0], targetCompletion: wo.targetCompletion || '',
      woNo: wo.woNo || '', projectName: wo.projectName || '',
      terms: wo.terms || defaultClientTerms, scopeOfWork: wo.scopeOfWork || '',
      subcontractorId: '', projectId: '', contractValue: ''
    });
    setItems(wo.items && wo.items.length > 0 ? wo.items : [{ id: 1, description: '', room: '', qty: '1', rate: '', amount: 0 }]);
    setCurrentView('form');
  };

  const handleViewClient = (wo) => {
    handleEditClient(wo);
    setCurrentView('view');
  };

  const handleViewSub = (wo) => {
    // Reverse lookup IDs from names for viewing/printing
    const matchedSub = subsList.find(s => s.name === wo.subName);
    const matchedProj = projectsList.find(p => p.name === wo.projectName);
    
    setEditingId(wo.id);
    setWoDetails({
      woType: 'Subcontractor',
      clientName: '', clientAddress: '', clientPhone: '', 
      date: new Date().toISOString().split('T')[0], targetCompletion: '', 
      woNo: `SUB-WO/00${wo.id}`, projectName: wo.projectName || '', 
      subcontractorId: matchedSub ? matchedSub.id : '', 
      projectId: matchedProj ? matchedProj.id : '', 
      contractValue: wo.contractValue || '',
      terms: defaultSubTerms, scopeOfWork: wo.scope || ''
    });
    setCurrentView('view');
  };

  const handleClear = () => {
    setEditingId(null);
    setWoDetails({
      woType: activeTab, // Defaults to the current tab you are looking at
      clientName: '', clientAddress: '', clientPhone: '', date: new Date().toISOString().split('T')[0], 
      targetCompletion: '', woNo: 'WO/', projectName: '', subcontractorId: '', projectId: '', contractValue: '',
      terms: activeTab === 'Client' ? defaultClientTerms : defaultSubTerms, scopeOfWork: ''
    });
    setItems([{ id: 1, description: '', room: 'Master Bedroom', qty: '1', rate: '', amount: 0 }]);
  };

  const handleToggleCancelClient = async (wo) => {
    setLoading(true);
    await toggleCancelClientWorkOrder(wo.id, wo.isCancelled);
    await loadData();
  };

  const switchWoTypeForm = (type) => {
    setWoDetails(prev => ({
      ...prev,
      woType: type,
      terms: type === 'Client' ? defaultClientTerms : defaultSubTerms
    }));
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-0.5";
  const isReadOnly = currentView === 'view';

  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col print:hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="flex justify-between items-center pb-5 mb-4 border-b border-zinc-200 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Work Orders / Contracts</h2>
            <p className="text-zinc-500 text-xs mt-0.5 font-medium">Generate official execution contracts for clients and subcontractors.</p>
          </div>
          <button onClick={() => { handleClear(); setCurrentView('form'); }} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 h-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Create Work Order
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-6 mb-4 px-2 border-b border-zinc-200 shrink-0">
          <button onClick={() => setActiveTab('Client')} className={`pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${activeTab === 'Client' ? 'border-[#B45309] text-[#B45309]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
            Client Contracts
          </button>
          <button onClick={() => setActiveTab('Subcontractor')} className={`pb-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${activeTab === 'Subcontractor' ? 'border-[#B45309] text-[#B45309]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}>
            Subcontractor Allocations
          </button>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              
              {activeTab === 'Client' ? (
                <>
                  <thead>
                    <tr className="bg-zinc-50/80 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200">
                      <th className="py-4 px-6 font-semibold">Date</th>
                      <th className="py-4 px-6 font-semibold">WO No.</th>
                      <th className="py-4 px-6 font-semibold">Client Name</th>
                      <th className="py-4 px-6 font-semibold">Project</th>
                      <th className="py-4 px-6 font-semibold text-right">Contract Value</th>
                      <th className="py-4 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {clientWoList.length === 0 ? (
                      <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-xs">No Client Work Orders generated yet.</td></tr>
                    ) : (
                      clientWoList.map((wo) => (
                        <tr key={wo.id} className={`transition-all ${wo.isCancelled ? 'bg-red-50/20 opacity-60' : 'hover:bg-zinc-50/80'}`}>
                          <td className="py-4 px-6 text-xs font-medium text-zinc-600">{wo.date}</td>
                          <td className="py-4 px-6 font-bold text-xs text-[#B45309]">{wo.woNo}</td>
                          <td className="py-4 px-6 text-xs font-semibold text-zinc-800">{wo.clientName}</td>
                          <td className="py-4 px-6 text-xs text-zinc-500">{wo.projectName}</td>
                          <td className="py-4 px-6 text-right font-bold text-xs text-emerald-600">₹{(wo.totalAmount || 0).toLocaleString('en-IN')}</td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2">
                              {!wo.isCancelled ? (
                                <>
                                  <button onClick={() => handleEditClient(wo)} className="px-3 py-1.5 bg-amber-50 text-[#B45309] border border-amber-200/60 rounded-lg font-semibold text-[10px] uppercase tracking-wider cursor-pointer">Edit</button>
                                  <button onClick={() => handleViewClient(wo)} className="px-3 py-1.5 bg-zinc-50 text-zinc-600 border border-zinc-200 rounded-lg font-semibold text-[10px] uppercase tracking-wider cursor-pointer">View / Print</button>
                                  <button onClick={() => handleToggleCancelClient(wo)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold text-[10px] uppercase tracking-wider cursor-pointer">Cancel</button>
                                </>
                              ) : (
                                <button onClick={() => handleToggleCancelClient(wo)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-[10px] uppercase tracking-wider cursor-pointer">Restore</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </>
              ) : (
                <>
                  <thead>
                    <tr className="bg-zinc-50/80 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200">
                      <th className="py-4 px-6 font-semibold">Subcontractor (Trade)</th>
                      <th className="py-4 px-6 font-semibold">Project Location</th>
                      <th className="py-4 px-6 font-semibold">Current Status</th>
                      <th className="py-4 px-6 font-semibold text-right">Contract Value</th>
                      <th className="py-4 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {subWoList.length === 0 ? (
                      <tr><td colSpan="5" className="py-12 text-center text-zinc-400 font-medium text-xs">No Subcontractor Allocations generated yet.</td></tr>
                    ) : (
                      subWoList.map((wo) => (
                        <tr key={wo.id} className="transition-all hover:bg-zinc-50/80">
                          <td className="py-4 px-6">
                            <p className="font-bold text-xs text-zinc-800">{wo.subName}</p>
                            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">{wo.trade}</p>
                          </td>
                          <td className="py-4 px-6 text-xs text-zinc-600 font-medium">{wo.projectName}</td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border ${
                              wo.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              wo.status === 'Ongoing' ? 'bg-amber-50 text-[#B45309] border-amber-200' :
                              'bg-zinc-100 text-zinc-600 border-zinc-200'
                            }`}>
                              {wo.status || 'Ongoing'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-bold text-xs text-emerald-600">₹{(wo.contractValue || 0).toLocaleString('en-IN')}</td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2">
                              {/* Read-only view for Subcontractor WOs to prevent DB ID conflicts */}
                              <button onClick={() => handleViewSub(wo)} className="px-3 py-1.5 bg-zinc-50 text-zinc-600 border border-zinc-200 rounded-lg font-semibold text-[10px] uppercase tracking-wider cursor-pointer">View / Print</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </>
              )}
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col print:hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Form Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6 shrink-0">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            {isReadOnly 
              ? `${woDetails.woType} Work Order` 
              : editingId ? `Edit ${woDetails.woType} Contract` : `Draft New Work Order`}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => { setCurrentView('list'); handleClear(); }} className="text-zinc-600 hover:text-zinc-900 text-xs font-bold transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-zinc-200 flex items-center gap-1.5 shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg> Back
            </button>
            {isReadOnly && (
              <button onClick={() => window.print()} className="bg-[#B45309] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-[#92400E] transition-all flex items-center gap-1.5 cursor-pointer">
                🖨️ Print Document
              </button>
            )}
          </div>
        </div>

        {/* WORK ORDER TYPE TOGGLE (Hidden in Read-Only View) */}
        {!isReadOnly && !editingId && (
          <div className="flex gap-2 mb-6 p-1.5 bg-zinc-200/60 rounded-xl w-fit shrink-0">
            <button type="button" onClick={() => switchWoTypeForm('Client')} className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${woDetails.woType === 'Client' ? 'bg-white shadow-sm text-[#B45309]' : 'text-zinc-500 hover:text-zinc-700'}`}>
              Client Contract
            </button>
            <button type="button" onClick={() => switchWoTypeForm('Subcontractor')} className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${woDetails.woType === 'Subcontractor' ? 'bg-white shadow-sm text-[#B45309]' : 'text-zinc-500 hover:text-zinc-700'}`}>
              Subcontractor Allocation
            </button>
          </div>
        )}

        {/* --- DYNAMIC FORM: CLIENT VS SUBCONTRACTOR --- */}
        {woDetails.woType === 'Client' ? (
          <>
            {/* Client Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 shrink-0">
              <div className="md:col-span-2 relative" ref={clientDropdownRef}>
                <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
                <input disabled={isReadOnly} type="text" value={woDetails.clientName} onChange={handleClientInputChange} onFocus={() => { if (clientSuggestions.length > 0) setShowClientDropdown(true); }} className={inputClass} placeholder="Type or select client from CRM..." autoComplete="off" />
                {showClientDropdown && !isReadOnly && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-[120] max-h-52 overflow-y-auto">
                    <div className="p-2 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50">CRM Contacts</div>
                    {clientSuggestions.map((c) => (
                      <div key={c.id} onMouseDown={(e) => { e.preventDefault(); handleSelectClient(c); }} className="px-4 py-2.5 hover:bg-amber-50 cursor-pointer border-b border-zinc-50">
                        <p className="font-semibold text-xs text-zinc-900">{c.clientName}</p>
                        <p className="text-[10px] text-zinc-500">{c.phone || c.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Client Address / Site Address</label>
                <input disabled={isReadOnly} type="text" value={woDetails.clientAddress} onChange={e => setWoDetails({...woDetails, clientAddress: e.target.value})} className={inputClass} placeholder="Project execution location" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
              <div>
                <label className={labelClass}>Work Order No. <span className="text-red-500">*</span></label>
                <input disabled={isReadOnly} type="text" value={woDetails.woNo} onChange={e => setWoDetails({...woDetails, woNo: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contract Date</label>
                <input disabled={isReadOnly} type="date" value={woDetails.date} onChange={e => setWoDetails({...woDetails, date: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Target Completion Date</label>
                <input disabled={isReadOnly} type="date" value={woDetails.targetCompletion} onChange={e => setWoDetails({...woDetails, targetCompletion: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Project Name</label>
                <input disabled={isReadOnly} type="text" value={woDetails.projectName} onChange={e => setWoDetails({...woDetails, projectName: e.target.value})} className={inputClass} placeholder="e.g. 3BHK Interior" />
              </div>
            </div>

            {/* Scope of Work Table */}
            <div className="mb-6 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm shrink-0">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 border-b border-zinc-100 pb-2">Scope of Work & Deliverables</p>
              <div className="overflow-x-visible">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                  <thead>
                    <tr className="text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-100 pb-3">
                      <th className="py-2.5 pr-4 font-bold w-40">Room / Area</th>
                      <th className="py-2.5 pr-4 font-bold">Work Description</th>
                      <th className="py-2.5 px-2 font-bold w-20 text-center">Qty / Area</th>
                      <th className="py-2.5 px-2 font-bold w-28 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-2 font-bold w-28 text-right">Total (₹)</th>
                      {!isReadOnly && <th className="py-2.5 pl-2 w-6"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {items.map((item) => {
                      const lineTotal = calculateRow(item);
                      const tInp = "w-full border-b border-transparent hover:border-zinc-300 focus:border-[#B45309] bg-transparent focus:outline-none py-2 px-1 text-xs transition-all font-medium text-zinc-900 placeholder-zinc-300 disabled:opacity-75";
                      
                      return (
                        <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                          <td className="py-2 pr-4"><input disabled={isReadOnly} type="text" placeholder="e.g. Kitchen" value={item.room} onChange={e => updateItem(item.id, 'room', e.target.value)} className={tInp} /></td>
                          <td className="py-2 pr-4"><input disabled={isReadOnly} type="text" placeholder="e.g. Modular Kitchen with Acrylic Finish" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className={tInp} /></td>
                          <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} className={`${tInp} text-center font-bold text-[#B45309]`} placeholder="1" /></td>
                          <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)} className={`${tInp} text-right`} placeholder="0.00" /></td>
                          <td className="py-2 px-2 text-right text-xs font-bold text-zinc-900">{lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          {!isReadOnly && (
                            <td className="py-2 pl-2 text-center">
                              <button onClick={() => removeItem(item.id)} className="text-zinc-300 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-all cursor-pointer">✕</button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!isReadOnly && (
                <button onClick={addItem} className="mt-4 text-[#B45309] hover:text-[#92400E] text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5">
                  + Add Work Item
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Subcontractor Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 shrink-0">
              <div>
                <label className={labelClass}>Subcontractor / Agency <span className="text-red-500">*</span></label>
                <select disabled={isReadOnly} value={woDetails.subcontractorId} onChange={e => setWoDetails({...woDetails, subcontractorId: e.target.value})} className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                  <option value="" disabled>Select Subcontractor...</option>
                  {subsList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.trade})</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Assign to Project <span className="text-red-500">*</span></label>
                <select disabled={isReadOnly} value={woDetails.projectId} onChange={e => setWoDetails({...woDetails, projectId: e.target.value})} className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}>
                  <option value="" disabled>Select Project Site...</option>
                  {projectsList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
              <div>
                <label className={labelClass}>Work Order No.</label>
                <input disabled={isReadOnly} type="text" value={woDetails.woNo} onChange={e => setWoDetails({...woDetails, woNo: e.target.value})} className={inputClass} placeholder="SUB-WO/..." />
              </div>
              <div>
                <label className={labelClass}>Allocation Date</label>
                <input disabled={isReadOnly} type="date" value={woDetails.date} onChange={e => setWoDetails({...woDetails, date: e.target.value})} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Total Contract Value (₹) <span className="text-red-500">*</span></label>
                <input disabled={isReadOnly} type="number" step="any" value={woDetails.contractValue} onChange={e => setWoDetails({...woDetails, contractValue: e.target.value})} className={`${inputClass} font-bold text-[#B45309]`} placeholder="0.00" />
              </div>
            </div>
          </>
        )}

        {/* SHARED TERMS AND NOTES (For both Client and Subcontractor) */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0">
          <div className="flex-1 space-y-4">
            <div>
              <label className={labelClass}>{woDetails.woType === 'Client' ? 'Overall Project Description / Scope Note' : 'Detailed Subcontractor Scope of Work'}</label>
              <textarea disabled={isReadOnly} value={woDetails.scopeOfWork} onChange={e => setWoDetails({...woDetails, scopeOfWork: e.target.value})} className={`${inputClass} resize-y min-h-[80px] py-3`} placeholder={woDetails.woType === 'Client' ? "Turnkey interior execution..." : "E.g. Full electrical wiring and DB dressing for 1st Floor..."}></textarea>
            </div>
            <div>
              <label className={labelClass}>Legal Payment Terms, Liabilities & Conditions</label>
              <textarea disabled={isReadOnly} value={woDetails.terms} onChange={e => setWoDetails({...woDetails, terms: e.target.value})} className={`${inputClass} resize-y min-h-[120px] text-xs leading-relaxed`}></textarea>
            </div>
          </div>

          <div className="w-full lg:w-80 flex flex-col justify-between">
            {woDetails.woType === 'Client' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 text-zinc-800 space-y-3">
                <div className="flex justify-between text-base font-bold border-zinc-200">
                  <span>Contract Value:</span>
                  <span className="text-[#B45309]">₹ {totals.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            {!isReadOnly && (
              <button onClick={handleSaveOnly} disabled={submitting} className={`mt-4 w-full py-3 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm cursor-pointer disabled:opacity-50 ${woDetails.woType === 'Subcontractor' ? 'mt-auto' : ''}`}>
                {submitting ? 'Saving...' : `Save ${woDetails.woType} Work Order`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PRINT VIEW (A4 FORMAT) - DYNAMIC FOR CLIENT VS SUBCONTRACTOR */}
      <div className="hidden print:block w-full bg-white text-zinc-900 font-['Poppins'] text-[11px] leading-tight print:p-0 print:m-0">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}} />

        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-5 mb-5">
              <div className="flex items-center gap-4">
                {companySettings?.logoUrl && <img src={companySettings.logoUrl} className="h-14 w-auto object-contain shrink-0" alt="Logo" />}
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-[#B45309]">{companySettings?.companyName || 'Company Name'}</h1>
                  <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-0.5">{companySettings?.companyAddress}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-[0.2em] block mb-1">
                  {woDetails.woType === 'Client' ? 'Client Work Order / Contract' : 'Subcontractor Work Order'}
                </span>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{woDetails.woNo || 'WO-000'}</h2>
                <p className="text-[10px] font-bold text-zinc-800 mt-1">Date: <span className="font-medium text-zinc-600">{woDetails.date}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-6 pb-4 border-b border-zinc-200">
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">
                  {woDetails.woType === 'Client' ? 'Client Details' : 'Subcontractor Details'}
                </span>
                <h3 className="text-sm font-bold text-zinc-900 uppercase">
                  {woDetails.woType === 'Client' ? (woDetails.clientName || 'Client Name') : (subsList.find(s => s.id === parseInt(woDetails.subcontractorId))?.name || 'Subcontractor Name')}
                </h3>
                {woDetails.woType === 'Client' && <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-1 leading-relaxed">{woDetails.clientAddress}</p>}
                {woDetails.woType === 'Client' && <p className="text-[10px] text-zinc-800 font-bold mt-1.5">Phone: <span className="font-medium text-zinc-600">{woDetails.clientPhone}</span></p>}
                
                {woDetails.woType === 'Subcontractor' && (
                   <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed uppercase tracking-wider font-semibold">
                     Trade: {subsList.find(s => s.id === parseInt(woDetails.subcontractorId))?.trade || 'General'}
                   </p>
                )}
              </div>
              <div className="text-right space-y-1">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Project Allocation</span>
                <p className="text-[10px] text-zinc-800 font-bold mt-2">Project: <span className="font-medium text-[#B45309]">
                  {woDetails.woType === 'Client' ? woDetails.projectName : (projectsList.find(p => p.id === parseInt(woDetails.projectId))?.name || woDetails.projectName)}
                </span></p>
                {woDetails.woType === 'Client' && <p className="text-[10px] text-zinc-800 font-bold mt-2">Target Completion: <span className="font-medium text-zinc-600">{woDetails.targetCompletion || 'TBD'}</span></p>}
              </div>
            </div>

            {/* Client Print: Itemized Table */}
            {woDetails.woType === 'Client' && (
              <>
                <table className="w-full text-left border-collapse mb-6">
                  <thead>
                    <tr className="bg-[#B45309] text-white text-[9px] uppercase tracking-wider">
                      <th className="py-2.5 px-2 font-bold text-center w-8">#</th>
                      <th className="py-2.5 px-3 font-bold w-32">Room / Area</th>
                      <th className="py-2.5 px-3 font-bold">Scope of Work</th>
                      <th className="py-2.5 px-2 font-bold text-center w-12">Qty</th>
                      <th className="py-2.5 px-2 font-bold text-right w-20">Rate</th>
                      <th className="py-2.5 px-3 font-bold text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-[10px]">
                    {items.map((item, index) => {
                      const rowTotal = calculateRow(item);
                      if (!item.description) return null;
                      return (
                        <tr key={item.id}>
                          <td className="py-3 px-2 text-center text-zinc-500">{index + 1}</td>
                          <td className="py-3 px-3 font-bold text-zinc-800">{item.room}</td>
                          <td className="py-3 px-3 text-zinc-900 whitespace-pre-wrap">{item.description}</td>
                          <td className="py-3 px-2 text-center font-bold text-zinc-800">{parseFloat(item.qty || 0).toLocaleString()}</td>
                          <td className="py-3 px-2 text-right text-zinc-800">₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 text-right font-bold text-zinc-900">₹{rowTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="border-t-2 border-zinc-800 pt-3 mb-6 flex justify-between items-start">
                  <div className="w-1/2 pr-4">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Contract Value in Words</span>
                    <p className="text-[10px] font-bold text-zinc-900 capitalize">{numberToWords(totals)}</p>
                  </div>
                  <div className="w-1/3 text-xs border border-zinc-200 bg-zinc-50 rounded-lg p-3">
                    <div className="flex justify-between font-bold text-[#B45309] text-sm">
                      <span>Grand Total:</span><span>₹{totals.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Subcontractor Print: Contract Value Block */}
            {woDetails.woType === 'Subcontractor' && (
              <div className="mb-6 border border-zinc-200 bg-zinc-50 rounded-xl p-5 flex justify-between items-center">
                 <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Contract Value in Words</span>
                    <p className="text-xs font-bold text-zinc-900 capitalize">{numberToWords(woDetails.contractValue)}</p>
                 </div>
                 <div className="text-right">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Contract Amount</span>
                    <p className="text-xl font-bold text-[#B45309]">₹{parseFloat(woDetails.contractValue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                 </div>
              </div>
            )}

            <div className="space-y-6 text-[10px] break-inside-avoid">
              {woDetails.scopeOfWork && (
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Detailed Scope of Work</span>
                  <p className="whitespace-pre-wrap text-zinc-800 font-medium p-4 border border-zinc-200 rounded-lg bg-white">{woDetails.scopeOfWork}</p>
                </div>
              )}
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Legal Payment Terms & Liabilities</span>
                <p className="whitespace-pre-wrap text-zinc-600 leading-relaxed p-4 border border-zinc-200 rounded-lg bg-zinc-50/50">{woDetails.terms}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-[10px] break-inside-avoid mt-20 pt-4 border-t border-zinc-200">
            <div className="flex flex-col items-start justify-end text-left">
              <div className="border-t-2 border-zinc-800 pt-2 w-48 mt-12">
                <p className="font-bold text-zinc-900">
                  {woDetails.woType === 'Client' ? 'Client Signature / Acceptance' : 'Subcontractor Signature & Acceptance'}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end justify-end text-right">
              <div className="border-t-2 border-zinc-800 pt-2 w-48 mt-12">
                <p className="font-bold text-zinc-900">For {companySettings?.companyName}</p>
                <p className="text-[9px] text-zinc-500 mt-0.5 uppercase tracking-wider">Authorized Signatory</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}