import React, { useState, useEffect, useRef } from 'react';
import * as db from '../db';
import { sendWhatsAppMessage } from '../WhatsAppHelper';
import { exportToCSV } from '../utils';

// Helper function to convert number to Words (Indian numbering system)
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

  const integerPart = Math.floor(Math.abs(Number(num)));
  const decimalPart = Math.round((Math.abs(Number(num)) - integerPart) * 100);
  let result = inWords(integerPart) + 'Rupees ';
  if (decimalPart > 0) result += 'and ' + inWords(decimalPart) + 'Paise ';
  return result.trim() + ' Only';
}

const defaultClientTerms = "1. 50% Advance on signing of this execution contract.\n2. 40% on material delivery and inspection at site.\n3. 10% on joint testing, snag clearance, and handover.\n4. Water & 3-phase electricity to be provided uninterrupted by client.\n5. Any extra work outside this agreed scope will be charged additionally per actuals.";

const defaultSubTerms = "1. Work to be executed strictly as per approved architectural working drawings.\n2. Subcontractor is strictly liable for worker safety, insurance, and mandatory PPE compliance.\n3. 5% Retention deposit will be withheld for 12 months post-handover (DLP).\n4. Payments will be disbursed based on certified Running Account (RA) milestone bills.\n5. Daily site cleanup, waste separation, and debris disposal is agency responsibility.";

export default function WorkOrders({ companySettings = {}, updateDirtyState }) {
  const [currentView, setCurrentView] = useState('list'); // 'list' | 'form' | 'view'
  const [activeTab, setActiveTab] = useState('Client'); // 'Client' or 'Subcontractor'
  
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Database Collections
  const [clientWoList, setClientWoList] = useState([]);
  const [subWoList, setSubWoList] = useState([]);
  const [crmLeads, setCrmLeads] = useState([]);
  const [subsList, setSubsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [estimationsList, setEstimationsList] = useState([]);
  
  // CRM Autocomplete State
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientDropdownRef = useRef(null);

  // Import Estimate Modal
  const [showEstimateImportModal, setShowEstimateImportModal] = useState(false);

  // Unified Contract Form State
  const [woDetails, setWoDetails] = useState({
    woType: 'Client',
    clientName: '', 
    clientAddress: '', 
    clientPhone: '', 
    date: new Date().toISOString().split('T')[0], 
    targetCompletion: '', 
    woNo: `WO/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`, 
    projectName: '', 
    subcontractorId: '', 
    projectId: '', 
    contractValue: '',
    retentionPercent: 5,
    paymentMilestonePreset: 'Turnkey 50-40-10',
    terms: defaultClientTerms, 
    scopeOfWork: ''
  });

  const [items, setItems] = useState([
    { id: 1, description: '', room: 'Living Room', qty: '1', rate: '', amount: 0 }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cWo, sWo, leadsData, subsData, projsData, estData] = await Promise.all([
        db.getClientWorkOrders ? db.getClientWorkOrders() : Promise.resolve([]),
        db.getSubcontractorWorkOrders ? db.getSubcontractorWorkOrders() : Promise.resolve([]),
        db.getLeads ? db.getLeads() : Promise.resolve([]),
        db.getSubcontractors ? db.getSubcontractors() : Promise.resolve([]),
        db.getProjects ? db.getProjects() : Promise.resolve([]),
        db.getEstimations ? db.getEstimations() : Promise.resolve([])
      ]);

      // Cache fallback
      const cachedClientWos = JSON.parse(localStorage.getItem('jyanipur_client_work_orders') || '[]');
      const combinedClientWos = [...(cWo || [])];
      cachedClientWos.forEach(cw => {
        if (!combinedClientWos.some(w => String(w.id || w._id) === String(cw.id || cw._id))) {
          combinedClientWos.push(cw);
        }
      });

      const cachedSubWos = JSON.parse(localStorage.getItem('jyanipur_sub_work_orders') || '[]');
      const combinedSubWos = [...(sWo || [])];
      cachedSubWos.forEach(sw => {
        if (!combinedSubWos.some(w => String(w.id || w._id) === String(sw.id || sw._id))) {
          combinedSubWos.push(sw);
        }
      });

      setClientWoList(combinedClientWos.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
      setSubWoList(combinedSubWos.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
      setCrmLeads(leadsData || []);
      setSubsList(subsData || []);
      setProjectsList((projsData || []).filter(p => p.status !== 'Completed'));
      setEstimationsList((estData || []).filter(e => !e.isCancelled));
    } catch (e) {
      console.error("Error loading Work Orders Data:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [currentView]);

  // Click outside CRM dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dirty State Tracker
  const markDirty = () => {
    if (typeof updateDirtyState === 'function') {
      updateDirtyState('Work Orders', true);
    }
  };

  const handleClientInputChange = (e) => {
    markDirty();
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
    markDirty();
    setWoDetails(prev => ({
      ...prev,
      clientName: client.clientName,
      clientAddress: client.address || '',
      clientPhone: client.phone || '',
      projectName: client.projectType || prev.projectName
    }));
    setShowClientDropdown(false);
  };

  // 1-Click Import from Approved Estimation BOQ
  const handleImportEstimate = (est) => {
    markDirty();
    const importedItems = (est.items || []).map((it, idx) => ({
      id: Date.now() + idx,
      room: it.room || it.section || 'General Scope',
      description: it.description || it.itemName || 'Interior Work Specification',
      qty: String(it.qty || 1),
      rate: String(it.rate || ''),
      amount: (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)
    }));

    setWoDetails(prev => ({
      ...prev,
      woType: 'Client',
      clientName: est.partyName || est.clientName || prev.clientName,
      clientAddress: est.partyAddress || est.clientAddress || prev.clientAddress,
      clientPhone: est.clientPhone || prev.clientPhone,
      projectName: est.projectName || prev.projectName,
      scopeOfWork: est.notes || est.description || prev.scopeOfWork
    }));

    setItems(importedItems.length > 0 ? importedItems : [{ id: 1, description: '', room: 'Scope', qty: '1', rate: '', amount: 0 }]);
    setShowEstimateImportModal(false);
    alert(`Imported ${importedItems.length} specification line items from Estimate #${est.estimateNo || est.id}!`);
  };

  const addItem = () => {
    markDirty();
    setItems([...items, { id: Date.now(), description: '', room: '', qty: '1', rate: '', amount: 0 }]);
  };

  const updateItem = (id, field, value) => {
    markDirty();
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id) => {
    markDirty();
    setItems(items.filter(item => item.id !== id));
  };

  const calculateRow = (item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    return qty * rate;
  };

  const totals = items.reduce((acc, item) => acc + calculateRow(item), 0);

  // Handle Milestone Presets
  const handleMilestonePresetChange = (preset) => {
    markDirty();
    let updatedTerms = woDetails.terms;
    if (preset === 'Turnkey 50-40-10') {
      updatedTerms = defaultClientTerms;
    } else if (preset === 'Civil 20-25-25-20-10') {
      updatedTerms = "1. 20% Initial mobilization advance.\n2. 25% on completion of foundation & plinth beam.\n3. 25% on casting of roof slab.\n4. 20% on brickwork, plastering & concealed MEP rough-in.\n5. 10% on flooring, painting and final inspection handover.";
    } else if (preset === 'Commercial 40-30-20-10') {
      updatedTerms = "1. 40% Advance for factory board procurement & carcass pressing.\n2. 30% on delivery of all modular carcasses at site.\n3. 20% on completion of glass partitions & acoustic ceiling.\n4. 10% post-handover testing and snag clearance.";
    }

    setWoDetails(prev => ({
      ...prev,
      paymentMilestonePreset: preset,
      terms: updatedTerms
    }));
  };

  // --- SAVE WORK ORDER ---
  const handleSaveOnly = async () => {
    setSubmitting(true);
    try {
      if (woDetails.woType === 'Client') {
        if (!woDetails.clientName || !woDetails.woNo) {
          alert('Client Name and Work Order No. are required for Client Contracts.');
          setSubmitting(false);
          return;
        }
        
        const record = {
          id: editingId || Date.now(),
          ...woDetails,
          items: items.filter(i => i.description.trim() !== ''),
          totalAmount: totals,
          isCancelled: false
        };

        if (typeof db.saveClientWorkOrder === 'function') {
          await db.saveClientWorkOrder(record);
        } else {
          const cached = JSON.parse(localStorage.getItem('jyanipur_client_work_orders') || '[]');
          const updated = [record, ...cached.filter(w => String(w.id || w._id) !== String(record.id))];
          localStorage.setItem('jyanipur_client_work_orders', JSON.stringify(updated));
        }
        
      } else {
        if (!woDetails.subcontractorId || !woDetails.projectId || !woDetails.contractValue) {
          alert('Subcontractor, Project, and Contract Value are required.');
          setSubmitting(false);
          return;
        }

        const selectedProj = projectsList.find(p => String(p.id || p._id) === String(woDetails.projectId));
        const selectedSub = subsList.find(s => String(s.id || s._id) === String(woDetails.subcontractorId));

        const record = {
          id: editingId || Date.now(),
          subcontractorId: Number(woDetails.subcontractorId) || woDetails.subcontractorId,
          subcontractorName: selectedSub ? selectedSub.name : 'Trade Contractor',
          trade: selectedSub ? selectedSub.trade : 'General',
          projectId: Number(woDetails.projectId) || woDetails.projectId,
          projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'Project Site',
          scope: woDetails.scopeOfWork || 'General Subcontractor Scope',
          contractValue: parseFloat(woDetails.contractValue) || 0,
          retentionPercent: parseFloat(woDetails.retentionPercent) || 5,
          date: woDetails.date,
          status: 'Active'
        };

        if (typeof db.saveSubcontractorWorkOrder === 'function') {
          await db.saveSubcontractorWorkOrder(record);
        } else {
          const cached = JSON.parse(localStorage.getItem('jyanipur_sub_work_orders') || '[]');
          const updated = [record, ...cached.filter(w => String(w.id || w._id) !== String(record.id))];
          localStorage.setItem('jyanipur_sub_work_orders', JSON.stringify(updated));
        }
      }

      if (typeof updateDirtyState === 'function') {
        updateDirtyState('Work Orders', false);
      }

      alert(`${woDetails.woType} Work Order contract saved successfully!`);
      handleClear();
      setCurrentView('list');
    } catch (err) {
      console.error(err);
      alert('Failed to save Work Order.');
    }
    setSubmitting(false);
  };

  const handleEditClient = (wo) => {
    setEditingId(wo.id || wo._id);
    setWoDetails({
      woType: 'Client',
      clientName: wo.clientName || '', 
      clientAddress: wo.clientAddress || '', 
      clientPhone: wo.clientPhone || '',
      date: wo.date || new Date().toISOString().split('T')[0], 
      targetCompletion: wo.targetCompletion || '',
      woNo: wo.woNo || '', 
      projectName: wo.projectName || '',
      terms: wo.terms || defaultClientTerms, 
      scopeOfWork: wo.scopeOfWork || '',
      paymentMilestonePreset: wo.paymentMilestonePreset || 'Turnkey 50-40-10',
      subcontractorId: '', 
      projectId: '', 
      contractValue: '',
      retentionPercent: 5
    });
    setItems(wo.items && wo.items.length > 0 ? wo.items : [{ id: 1, description: '', room: '', qty: '1', rate: '', amount: 0 }]);
    setCurrentView('form');
  };

  const handleViewClient = (wo) => {
    handleEditClient(wo);
    setCurrentView('view');
  };

  const handleViewSub = (wo) => {
    const matchedSub = subsList.find(s => s.name === wo.subcontractorName || s.name === wo.subName);
    const matchedProj = projectsList.find(p => (p.name || p.projectName) === wo.projectName);
    
    setEditingId(wo.id || wo._id);
    setWoDetails({
      woType: 'Subcontractor',
      clientName: '', 
      clientAddress: '', 
      clientPhone: '', 
      date: wo.date || new Date().toISOString().split('T')[0], 
      targetCompletion: '', 
      woNo: `SUB-WO/00${wo.id || wo._id}`, 
      projectName: wo.projectName || '', 
      subcontractorId: matchedSub ? (matchedSub.id || matchedSub._id) : '', 
      projectId: matchedProj ? (matchedProj.id || matchedProj._id) : '', 
      contractValue: wo.contractValue || '',
      retentionPercent: wo.retentionPercent || 5,
      terms: defaultSubTerms, 
      scopeOfWork: wo.scope || '',
      paymentMilestonePreset: ''
    });
    setCurrentView('view');
  };

  const handleClear = () => {
    if (typeof updateDirtyState === 'function') {
      updateDirtyState('Work Orders', false);
    }
    setEditingId(null);
    setWoDetails({
      woType: activeTab,
      clientName: '', 
      clientAddress: '', 
      clientPhone: '', 
      date: new Date().toISOString().split('T')[0], 
      targetCompletion: '', 
      woNo: `WO/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`, 
      projectName: '', 
      subcontractorId: '', 
      projectId: '', 
      contractValue: '',
      retentionPercent: 5,
      paymentMilestonePreset: 'Turnkey 50-40-10',
      terms: activeTab === 'Client' ? defaultClientTerms : defaultSubTerms, 
      scopeOfWork: ''
    });
    setItems([{ id: 1, description: '', room: 'Living Room', qty: '1', rate: '', amount: 0 }]);
  };

  const handleToggleCancelClient = async (wo) => {
    setLoading(true);
    try {
      if (typeof db.toggleCancelClientWorkOrder === 'function') {
        await db.toggleCancelClientWorkOrder(wo.id || wo._id, wo.isCancelled);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_client_work_orders') || '[]');
        const updated = cached.map(w => String(w.id || w._id) === String(wo.id || wo._id) ? { ...w, isCancelled: !w.isCancelled } : w);
        localStorage.setItem('jyanipur_client_work_orders', JSON.stringify(updated));
      }
      await loadData();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const switchWoTypeForm = (type) => {
    markDirty();
    setWoDetails(prev => ({
      ...prev,
      woType: type,
      terms: type === 'Client' ? defaultClientTerms : defaultSubTerms
    }));
  };

  const handleSendWhatsApp = (wo, isClient = true) => {
    const recipientPhone = isClient ? (wo.clientPhone || '') : '';
    const phone = recipientPhone || prompt("Enter WhatsApp phone number (+91):");
    if (!phone) return;

    const woNum = isClient ? (wo.woNo || 'WO') : `SUB-WO/00${wo.id || wo._id}`;
    const name = isClient ? (wo.clientName || 'Client') : (wo.subcontractorName || wo.subName || 'Vendor');
    const amountVal = isClient ? (wo.totalAmount || 0) : (wo.contractValue || 0);

    const finalMessage = `*OFFICIAL CONTRACT DOCUMENT - ${companySettings.companyName || 'Jyanipur Interiors & Construction'}*\n\n` +
                         `*Contract Reference:* ${woNum}\n` +
                         `*Party / Agency:* ${name}\n` +
                         `*Agreed Contract Value:* ₹${parseFloat(amountVal).toLocaleString('en-IN')}\n` +
                         `*Site Location:* ${wo.projectName || 'Project Site'}\n\n` +
                         `Please review the execution scope and payment milestone conditions. For any queries, contact accounts@jyanipur.in.`;
    
    sendWhatsAppMessage(phone, finalMessage);
  };

  const handleExportCSV = () => {
    if (activeTab === 'Client') {
      const data = clientWoList.map(wo => ({
        'Work Order No': wo.woNo,
        'Date': wo.date,
        'Client Name': wo.clientName,
        'Site Address': wo.clientAddress || '-',
        'Phone': wo.clientPhone || '-',
        'Project Name': wo.projectName || '-',
        'Contract Value (INR)': wo.totalAmount || 0,
        'Target Completion': wo.targetCompletion || 'TBD',
        'Status': wo.isCancelled ? 'Cancelled' : 'Active'
      }));
      exportToCSV('Client_Execution_Contracts', data);
    } else {
      const data = subWoList.map(wo => ({
        'Contract Ref': `SUB-WO/00${wo.id || wo._id}`,
        'Date': wo.date,
        'Subcontractor': wo.subcontractorName || wo.subName,
        'Trade': wo.trade || 'General',
        'Project Site': wo.projectName,
        'Contract Value (INR)': wo.contractValue,
        'Retention %': wo.retentionPercent || 5,
        'Status': wo.status || 'Active'
      }));
      exportToCSV('Subcontractor_Work_Order_Allocations', data);
    }
  };

  const filteredClientList = clientWoList.filter(wo => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (wo.woNo && wo.woNo.toLowerCase().includes(q)) ||
      (wo.clientName && wo.clientName.toLowerCase().includes(q)) ||
      (wo.projectName && wo.projectName.toLowerCase().includes(q)) ||
      (wo.clientPhone && wo.clientPhone.toLowerCase().includes(q))
    );
  });

  const filteredSubList = subWoList.filter(wo => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const sub = wo.subcontractorName || wo.subName || '';
    return (
      sub.toLowerCase().includes(q) ||
      (wo.projectName && wo.projectName.toLowerCase().includes(q)) ||
      (wo.trade && wo.trade.toLowerCase().includes(q))
    );
  });

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";
  const isReadOnly = currentView === 'view';

  // ==========================================
  // VIEW 1: CONTRACTS LIST VIEW
  // ==========================================
  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col font-['Inter',sans-serif] print:hidden">
        
        {/* Header */}
        <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Work Orders & Legal Contracts</h2>
            <p className="text-zinc-500 text-sm mt-1 font-medium">Issue and manage legally structured execution contracts for clients and trade agencies.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-56 focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
              <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search contract, party, site..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full placeholder:text-zinc-400" 
              />
            </div>

            <button 
              onClick={handleExportCSV}
              className="h-10 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>

            <button 
              onClick={() => { handleClear(); setCurrentView('form'); }} 
              className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-2 h-10 border border-black"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Work Order
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 mb-4 p-1 bg-zinc-100 rounded-lg w-fit shrink-0 border border-zinc-200">
          <button 
            onClick={() => setActiveTab('Client')} 
            className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'Client' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Client Contracts ({clientWoList.length})
          </button>
          <button 
            onClick={() => setActiveTab('Subcontractor')} 
            className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'Subcontractor' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Subcontractor Allocations ({subWoList.length})
          </button>
        </div>

        {/* Table Container */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
              
              {activeTab === 'Client' ? (
                <>
                  <thead>
                    <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                      <th className="py-4 px-6 w-36">Contract Date</th>
                      <th className="py-4 px-6 w-44">WO No.</th>
                      <th className="py-4 px-6">Client / Billed Party</th>
                      <th className="py-4 px-6 w-48">Project Site</th>
                      <th className="py-4 px-6 text-right w-44">Contract Value</th>
                      <th className="py-4 px-6 text-right w-64">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-16 text-center text-zinc-400 font-medium text-xs">
                          Syncing client work orders from database...
                        </td>
                      </tr>
                    ) : filteredClientList.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                          No Client Work Orders generated yet.
                        </td>
                      </tr>
                    ) : (
                      filteredClientList.map((wo) => (
                        <tr key={wo.id || wo._id} className={`transition-all ${wo.isCancelled ? 'bg-red-50/20 opacity-60' : 'hover:bg-zinc-50/80 group'}`}>
                          <td className={`py-4 px-6 text-xs font-bold uppercase tracking-widest font-mono ${wo.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-500'}`}>
                            {wo.date}
                          </td>
                          <td className={`py-4 px-6 font-bold text-xs tracking-tight font-mono ${wo.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                            {wo.woNo}
                            {wo.isCancelled && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-widest inline-block no-underline">
                                Cancelled
                              </span>
                            )}
                          </td>
                          <td className={`py-4 px-6 text-sm font-bold ${wo.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                            {wo.clientName}
                            {wo.clientPhone && <p className="text-[10px] text-zinc-400 font-medium">{wo.clientPhone}</p>}
                          </td>
                          <td className="py-4 px-6 text-xs font-semibold text-zinc-600">
                            {wo.projectName || '-'}
                          </td>
                          <td className={`py-4 px-6 text-right font-black text-sm ${wo.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                            ₹ {(parseFloat(wo.totalAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2">
                              {!wo.isCancelled ? (
                                <>
                                  <button 
                                    onClick={() => handleEditClient(wo)} 
                                    className="px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold text-[10px] uppercase tracking-widest cursor-pointer transition-all shadow-sm"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => handleViewClient(wo)} 
                                    className="px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold text-[10px] uppercase tracking-widest cursor-pointer transition-all shadow-sm"
                                  >
                                    Print A4
                                  </button>
                                  <button 
                                    onClick={() => handleSendWhatsApp(wo, true)} 
                                    className="px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold text-[10px] uppercase tracking-widest cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                                    title="Share contract on WhatsApp"
                                  >
                                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    WA
                                  </button>
                                  <button 
                                    onClick={() => handleToggleCancelClient(wo)} 
                                    className="p-1.5 bg-white text-red-500 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg font-bold cursor-pointer transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                    title="Cancel Contract"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <button 
                                  onClick={() => handleToggleCancelClient(wo)} 
                                  className="px-3 py-1.5 bg-zinc-900 text-white hover:bg-black border border-black rounded-lg font-bold text-[10px] uppercase tracking-widest cursor-pointer transition-all shadow-sm"
                                >
                                  Restore
                                </button>
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
                    <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                      <th className="py-4 px-6">Trade Contractor (Agency)</th>
                      <th className="py-4 px-6 w-56">Project Site</th>
                      <th className="py-4 px-6 w-36 text-center">Status</th>
                      <th className="py-4 px-6 text-right w-48">Allocated Contract Value</th>
                      <th className="py-4 px-6 text-right w-44">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="py-16 text-center text-zinc-400 font-medium text-xs">
                          Syncing subcontractor work orders from database...
                        </td>
                      </tr>
                    ) : filteredSubList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                          No Subcontractor Allocations generated yet.
                        </td>
                      </tr>
                    ) : (
                      filteredSubList.map((wo) => (
                        <tr key={wo.id || wo._id} className="transition-all hover:bg-zinc-50/80 group">
                          <td className="py-4 px-6">
                            <p className="font-bold text-sm text-zinc-900 tracking-tight">{wo.subcontractorName || wo.subName}</p>
                            <span className="inline-block bg-zinc-100 border border-zinc-200 text-zinc-700 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mt-0.5">
                              {wo.trade || 'Trade Agency'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-xs text-zinc-600 font-semibold">{wo.projectName}</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                              wo.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                            }`}>
                              {wo.status || 'Active'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right font-black text-sm text-zinc-900">
                            ₹ {(parseFloat(wo.contractValue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleViewSub(wo)} 
                                className="px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold text-[10px] uppercase tracking-widest cursor-pointer transition-all shadow-sm"
                              >
                                View / Print
                              </button>
                              <button 
                                onClick={() => handleSendWhatsApp(wo, false)} 
                                className="px-3 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold text-[10px] uppercase tracking-widest cursor-pointer transition-all shadow-sm"
                              >
                                WA
                              </button>
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

  // ==========================================
  // VIEW 2: FORM / PRINT VIEW
  // ==========================================
  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden print:overflow-visible">
        
        {/* Form Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-6 mb-6 shrink-0 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {isReadOnly 
                ? `${woDetails.woType} Work Order — ${woDetails.woNo}` 
                : editingId ? `Edit ${woDetails.woType} Contract` : `Draft New ${woDetails.woType} Contract`}
            </h2>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">Define specifications, milestone payment stages, and legal clauses.</p>
          </div>
          <div className="flex gap-2">
            {!isReadOnly && woDetails.woType === 'Client' && (
              <button
                type="button"
                onClick={() => setShowEstimateImportModal(true)}
                className="bg-white border border-zinc-300 hover:border-zinc-900 text-zinc-900 px-4 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Import Estimate BOQ
              </button>
            )}

            <button 
              onClick={() => { setCurrentView('list'); handleClear(); }} 
              className="text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer bg-white px-5 py-2.5 rounded-lg border border-zinc-200 flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to List
            </button>
            
            {isReadOnly && (
              <button 
                onClick={() => window.print()} 
                className="bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:bg-black shadow-sm flex items-center gap-2 border border-black"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Official A4
              </button>
            )}
          </div>
        </div>

        {/* WORK ORDER TYPE TOGGLE */}
        {!isReadOnly && !editingId && (
          <div className="flex gap-2 mb-6 p-1 bg-zinc-100 rounded-lg w-fit shrink-0 border border-zinc-200 print:hidden">
            <button 
              type="button" 
              onClick={() => switchWoTypeForm('Client')} 
              className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                woDetails.woType === 'Client' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Client Execution Contract
            </button>
            <button 
              type="button" 
              onClick={() => switchWoTypeForm('Subcontractor')} 
              className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                woDetails.woType === 'Subcontractor' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Subcontractor Trade Allocation
            </button>
          </div>
        )}

        {/* FORM CONTENT (HIDDEN IN PRINT) */}
        <div className="print:hidden">
          {woDetails.woType === 'Client' ? (
            <>
              {/* Client Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 shrink-0">
                <div className="md:col-span-2 relative bg-white p-4 rounded-xl border border-zinc-200 shadow-sm" ref={clientDropdownRef}>
                  <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
                  <input 
                    disabled={isReadOnly} 
                    type="text" 
                    value={woDetails.clientName} 
                    onChange={handleClientInputChange} 
                    onFocus={() => { if (clientSuggestions.length > 0) setShowClientDropdown(true); }} 
                    className={inputClass} 
                    placeholder="Type or select client from CRM..." 
                    autoComplete="off" 
                  />
                  {showClientDropdown && !isReadOnly && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl z-[120] max-h-56 overflow-y-auto">
                      <div className="p-3 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50">CRM Contacts</div>
                      {clientSuggestions.map((c) => (
                        <div 
                          key={c.id} 
                          onMouseDown={(e) => { e.preventDefault(); handleSelectClient(c); }} 
                          className="px-5 py-3 hover:bg-zinc-50 cursor-pointer border-b border-zinc-100 last:border-none"
                        >
                          <p className="font-bold text-xs text-zinc-900 tracking-tight">{c.clientName}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{c.phone || c.email}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <label className={labelClass}>Client Site Address</label>
                  <input 
                    disabled={isReadOnly} 
                    type="text" 
                    value={woDetails.clientAddress} 
                    onChange={e => { markDirty(); setWoDetails({...woDetails, clientAddress: e.target.value}); }} 
                    className={inputClass} 
                    placeholder="Project execution site location..." 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <label className={labelClass}>Contract Ref No. <span className="text-red-500">*</span></label>
                  <input disabled={isReadOnly} type="text" value={woDetails.woNo} onChange={e => { markDirty(); setWoDetails({...woDetails, woNo: e.target.value}); }} className={`${inputClass} font-bold text-zinc-900 font-mono`} />
                </div>
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <label className={labelClass}>Contract Date</label>
                  <input disabled={isReadOnly} type="date" value={woDetails.date} onChange={e => { markDirty(); setWoDetails({...woDetails, date: e.target.value}); }} className={inputClass} />
                </div>
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <label className={labelClass}>Target Handover Date</label>
                  <input disabled={isReadOnly} type="date" value={woDetails.targetCompletion} onChange={e => { markDirty(); setWoDetails({...woDetails, targetCompletion: e.target.value}); }} className={inputClass} />
                </div>
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <label className={labelClass}>Project Name</label>
                  <input disabled={isReadOnly} type="text" value={woDetails.projectName} onChange={e => { markDirty(); setWoDetails({...woDetails, projectName: e.target.value}); }} className={inputClass} placeholder="e.g. 3BHK Turnkey Interior" />
                </div>
              </div>

              {/* Scope of Work Table */}
              <div className="mb-6 bg-white border border-zinc-200 rounded-xl shadow-sm shrink-0 overflow-hidden">
                <div className="p-4 border-b border-zinc-100 bg-white flex justify-between items-center">
                  <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-widest">Scope of Work & Deliverables</p>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{items.length} Specifications</span>
                </div>
                <div className="overflow-x-visible">
                  <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4 w-48">Room / Area</th>
                        <th className="py-3 px-4">Work Description & Material Specs</th>
                        <th className="py-3 px-4 w-28 text-center bg-zinc-100 text-zinc-700">Qty / Area</th>
                        <th className="py-3 px-4 w-32 text-right">Rate (₹)</th>
                        <th className="py-3 px-4 w-36 text-right bg-zinc-100 text-zinc-900">Total (₹)</th>
                        {!isReadOnly && <th className="py-3 px-3 w-12"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {items.map((item, index) => {
                        const lineTotal = calculateRow(item);
                        const tInp = "w-full border border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:bg-white bg-transparent focus:outline-none py-1.5 px-2 rounded text-xs transition-all font-medium text-zinc-900 placeholder-zinc-400 disabled:opacity-75 disabled:cursor-not-allowed";
                        
                        return (
                          <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                            <td className="py-2 px-4 text-center text-xs font-bold text-zinc-400">{index + 1}</td>
                            <td className="py-2 px-4">
                              <input disabled={isReadOnly} type="text" placeholder="e.g. Master Bedroom" value={item.room} onChange={e => updateItem(item.id, 'room', e.target.value)} className={`${tInp} font-bold`} />
                            </td>
                            <td className="py-2 px-4">
                              <input disabled={isReadOnly} type="text" placeholder="e.g. Modular Wardrobe with Acrylic Laminate" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className={tInp} />
                            </td>
                            <td className="py-2 px-4 bg-zinc-50/50">
                              <input disabled={isReadOnly} type="number" step="any" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} className={`${tInp} text-center font-black text-zinc-900 bg-white shadow-sm border-zinc-200`} placeholder="1" />
                            </td>
                            <td className="py-2 px-4">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">₹</span>
                                <input disabled={isReadOnly} type="number" step="any" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)} className={`${tInp} text-right pl-6 font-bold text-zinc-900`} placeholder="0.00" />
                              </div>
                            </td>
                            <td className="py-2 px-4 text-right text-sm font-black text-zinc-900 bg-zinc-50/50">
                              ₹ {lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>
                            {!isReadOnly && (
                              <td className="py-2 px-3 text-center">
                                <button 
                                  onClick={() => removeItem(item.id)} 
                                  className="text-red-400 hover:text-white bg-white hover:bg-red-500 border border-red-200 opacity-0 group-hover:opacity-100 transition-all cursor-pointer p-1.5 rounded-md shadow-sm mx-auto flex items-center justify-center"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!isReadOnly && (
                  <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex justify-center">
                    <button 
                      onClick={addItem} 
                      className="px-4 py-2 bg-white text-zinc-900 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Scope Line Item
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Subcontractor Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 shrink-0">
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <label className={labelClass}>Subcontractor / Agency <span className="text-red-500">*</span></label>
                  <select 
                    disabled={isReadOnly} 
                    value={woDetails.subcontractorId} 
                    onChange={e => { markDirty(); setWoDetails({...woDetails, subcontractorId: e.target.value}); }} 
                    className={`${inputClass} font-bold`}
                  >
                    <option value="" disabled>Select Subcontractor...</option>
                    {subsList.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.trade})</option>)}
                  </select>
                </div>
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <label className={labelClass}>Assign to Project <span className="text-red-500">*</span></label>
                  <select 
                    disabled={isReadOnly} 
                    value={woDetails.projectId} 
                    onChange={e => { markDirty(); setWoDetails({...woDetails, projectId: e.target.value}); }} 
                    className={`${inputClass} font-bold`}
                  >
                    <option value="" disabled>Select Project Site...</option>
                    {projectsList.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <label className={labelClass}>Work Order No.</label>
                  <input disabled={isReadOnly} type="text" value={woDetails.woNo} onChange={e => { markDirty(); setWoDetails({...woDetails, woNo: e.target.value}); }} className={`${inputClass} font-mono`} placeholder="SUB-WO/..." />
                </div>
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <label className={labelClass}>Allocation Date</label>
                  <input disabled={isReadOnly} type="date" value={woDetails.date} onChange={e => { markDirty(); setWoDetails({...woDetails, date: e.target.value}); }} className={inputClass} />
                </div>
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <label className={labelClass}>Contract Value (₹) <span className="text-red-500">*</span></label>
                  <input disabled={isReadOnly} type="number" step="any" value={woDetails.contractValue} onChange={e => { markDirty(); setWoDetails({...woDetails, contractValue: e.target.value}); }} className={`${inputClass} font-bold text-zinc-900 text-sm`} placeholder="0.00" />
                </div>
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                  <label className={labelClass}>5% Retention Held %</label>
                  <input disabled={isReadOnly} type="number" value={woDetails.retentionPercent} onChange={e => { markDirty(); setWoDetails({...woDetails, retentionPercent: e.target.value}); }} className={`${inputClass} font-bold text-center`} placeholder="5" />
                </div>
              </div>
            </>
          )}

          {/* SHARED TERMS AND NOTES */}
          <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0">
            <div className="flex-1 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <label className={labelClass}>
                  {woDetails.woType === 'Client' ? 'Site Execution Summary' : 'Detailed Subcontractor Scope of Work'}
                </label>
                <textarea 
                  disabled={isReadOnly} 
                  value={woDetails.scopeOfWork} 
                  onChange={e => { markDirty(); setWoDetails({...woDetails, scopeOfWork: e.target.value}); }} 
                  className={`${inputClass} resize-y min-h-[70px] leading-relaxed`} 
                  placeholder={woDetails.woType === 'Client' ? "Turnkey architectural interior execution per design package..." : "E.g. Complete electrical conduit chasing, cabling, and DB dressing..."}
                />
              </div>

              {/* Milestone Presets */}
              {woDetails.woType === 'Client' && !isReadOnly && (
                <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex items-center justify-between">
                  <div>
                    <label className={labelClass}>Payment Milestone Preset</label>
                    <p className="text-[11px] text-zinc-500 font-medium">Standardized payment schedule structures</p>
                  </div>
                  <div className="flex gap-2">
                    {['Turnkey 50-40-10', 'Civil 20-25-25-20-10', 'Commercial 40-30-20-10'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleMilestonePresetChange(p)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                          woDetails.paymentMilestonePreset === p ? 'bg-zinc-900 text-white border-black' : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <label className={labelClass}>Legal Payment Terms, Liabilities & Handover Conditions</label>
                <textarea 
                  disabled={isReadOnly} 
                  value={woDetails.terms} 
                  onChange={e => { markDirty(); setWoDetails({...woDetails, terms: e.target.value}); }} 
                  className={`${inputClass} resize-y min-h-[110px] text-xs leading-relaxed font-mono`}
                />
              </div>
            </div>

            <div className="w-full lg:w-[360px] flex flex-col justify-between">
              {woDetails.woType === 'Client' ? (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 text-zinc-800 space-y-4">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Total Contract Value</span>
                  <p className="text-3xl font-black text-zinc-900 tracking-tight">
                    ₹ {totals.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                  <div className="border-t border-zinc-100 pt-3 text-[10px] text-zinc-500 font-medium">
                    50% Advance on Signing: <strong className="text-zinc-900">₹ {(totals * 0.5).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 text-zinc-800 space-y-4">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Allocated Contract Value</span>
                  <p className="text-3xl font-black text-zinc-900 tracking-tight">
                    ₹ {parseFloat(woDetails.contractValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                  <div className="border-t border-zinc-100 pt-3 text-[10px] text-zinc-500 font-medium">
                    {woDetails.retentionPercent || 5}% Retention Held: <strong className="text-zinc-900">₹ {(parseFloat(woDetails.contractValue || 0) * ((woDetails.retentionPercent || 5) / 100)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              )}

              {!isReadOnly && (
                <button 
                  onClick={handleSaveOnly} 
                  disabled={submitting} 
                  className="mt-6 w-full py-4 bg-zinc-900 hover:bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer disabled:opacity-50 border border-black flex items-center justify-center gap-2"
                >
                  {submitting ? 'Saving...' : `Save ${woDetails.woType} Contract`}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PRINT VIEW (OFFICIAL A4 CONTRACT FORMAT) */}
        <div className="hidden print:block w-full bg-white text-zinc-900 font-['Inter',sans-serif] text-[11px] leading-tight print:p-0 print:m-0">
          <style dangerouslySetInnerHTML={{__html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
            
            @media print {
              @page { margin: 8mm; size: A4 portrait; }
              body { padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Inter', sans-serif !important; }
              img { mix-blend-mode: multiply !important; }
            }
          `}} />

          <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white flex flex-col justify-between p-2">
            <div>
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                <div className="flex items-center gap-4">
                  {companySettings?.logoUrl && <img src={companySettings.logoUrl} className="h-14 w-auto object-contain shrink-0" alt="Logo" />}
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-black uppercase">{companySettings?.companyName || 'Jyanipur Interiors & Construction'}</h1>
                    <p className="text-[9px] text-zinc-600 whitespace-pre-wrap mt-0.5 leading-tight">{companySettings?.companyAddress}</p>
                    <p className="text-[9px] text-zinc-800 mt-1 font-bold">
                      GSTIN: <span className="font-medium text-zinc-600 mr-2">{companySettings?.companyGst}</span>
                      Phone: <span className="font-medium text-zinc-600">{companySettings?.companyPhone}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">
                    {woDetails.woType === 'Client' ? 'Client Work Order Contract' : 'Subcontractor Trade Work Order'}
                  </span>
                  <h2 className="text-xl font-black text-black tracking-tight font-mono">{woDetails.woNo || 'WO-000'}</h2>
                  <p className="text-[9px] font-bold text-zinc-800 mt-1 font-mono">Date: <span className="font-medium text-zinc-600">{woDetails.date}</span></p>
                </div>
              </div>

              {/* Particulars Grid */}
              <div className="grid grid-cols-2 gap-6 mb-4 pb-3 border-b border-zinc-200">
                <div>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                    {woDetails.woType === 'Client' ? 'Client Particulars' : 'Contractor Agency'}
                  </span>
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">
                    {woDetails.woType === 'Client' 
                      ? (woDetails.clientName || 'Client Name') 
                      : (subsList.find(s => String(s.id || s._id) === String(woDetails.subcontractorId))?.name || 'Subcontractor Name')}
                  </h3>
                  {woDetails.woType === 'Client' && <p className="text-[9px] text-zinc-600 whitespace-pre-wrap mt-0.5 leading-relaxed font-medium">{woDetails.clientAddress}</p>}
                  {woDetails.woType === 'Client' && <p className="text-[9px] text-zinc-800 font-bold mt-1">Phone: <span className="font-medium text-zinc-600">{woDetails.clientPhone}</span></p>}
                  
                  {woDetails.woType === 'Subcontractor' && (
                    <p className="text-[9px] text-zinc-600 mt-1 uppercase tracking-widest font-bold">
                      Speciality Trade: {subsList.find(s => String(s.id || s._id) === String(woDetails.subcontractorId))?.trade || 'General Execution'}
                    </p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Site Particulars</span>
                  <p className="text-[9px] text-zinc-800 font-bold mt-0.5">Project Site: <span className="font-bold text-zinc-900">
                    {woDetails.woType === 'Client' ? woDetails.projectName : (projectsList.find(p => String(p.id || p._id) === String(woDetails.projectId))?.name || woDetails.projectName)}
                  </span></p>
                  {woDetails.woType === 'Client' && <p className="text-[9px] text-zinc-800 font-bold mt-0.5">Target Handover: <span className="font-medium text-zinc-600">{woDetails.targetCompletion || 'As per schedule'}</span></p>}
                </div>
              </div>

              {/* Client Itemized Table */}
              {woDetails.woType === 'Client' && (
                <>
                  <table className="w-full text-left border-collapse mb-4 border border-zinc-300">
                    <thead>
                      <tr className="bg-zinc-100 text-zinc-900 text-[9px] uppercase tracking-widest font-bold border-b-2 border-zinc-300">
                        <th className="py-2 px-2.5 font-bold text-center w-8 border-r border-zinc-300">#</th>
                        <th className="py-2 px-3 font-bold w-36 border-r border-zinc-300">Room / Area</th>
                        <th className="py-2 px-3 font-bold border-r border-zinc-300">Scope of Work & Deliverables</th>
                        <th className="py-2 px-2.5 font-bold text-center w-12 border-r border-zinc-300 bg-white">Qty</th>
                        <th className="py-2 px-3 font-bold text-right w-20 border-r border-zinc-300">Rate</th>
                        <th className="py-2 px-3 font-bold text-right w-24 bg-white">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 text-[9px] font-medium text-zinc-900">
                      {items.map((item, index) => {
                        const rowTotal = calculateRow(item);
                        if (!item.description) return null;
                        return (
                          <tr key={item.id} className="break-inside-avoid even:bg-zinc-50/50">
                            <td className="py-2 px-2 text-center text-zinc-500 font-bold border-r border-zinc-200">{index + 1}</td>
                            <td className="py-2 px-3 font-bold text-zinc-900 border-r border-zinc-200">{item.room}</td>
                            <td className="py-2 px-3 text-zinc-900 whitespace-pre-wrap border-r border-zinc-200">{item.description}</td>
                            <td className="py-2 px-2 text-center font-bold border-r border-zinc-200 bg-zinc-50/50">{parseFloat(item.qty || 0).toLocaleString()}</td>
                            <td className="py-2 px-3 text-right border-r border-zinc-200 font-mono">₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
                            <td className="py-2 px-3 text-right font-black bg-zinc-50/50 font-mono">₹{rowTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="border-t-2 border-black pt-2 mb-4 flex justify-between items-start">
                    <div className="w-1/2 pr-4">
                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Contract Value in Words</span>
                      <p className="text-[9px] font-bold text-zinc-900 capitalize bg-zinc-50 p-2 rounded border border-zinc-200">{numberToWords(totals)}</p>
                    </div>
                    <div className="w-64 text-[10px] border border-zinc-200 bg-zinc-50 rounded-lg p-3">
                      <div className="flex justify-between font-black text-black text-xs">
                        <span className="uppercase tracking-widest text-[9px]">Grand Total:</span>
                        <span className="font-mono">₹{totals.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Subcontractor Print: Contract Value Block */}
              {woDetails.woType === 'Subcontractor' && (
                <div className="mb-4 border border-zinc-200 bg-zinc-50 rounded-lg p-4 flex justify-between items-center">
                   <div>
                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Contract Value in Words</span>
                      <p className="text-[10px] font-bold text-zinc-900 capitalize">{numberToWords(woDetails.contractValue)}</p>
                   </div>
                   <div className="text-right">
                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Total Contract Amount</span>
                      <p className="text-xl font-black text-black font-mono">₹{parseFloat(woDetails.contractValue || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                   </div>
                </div>
              )}

              <div className="space-y-3 text-[9px] break-inside-avoid">
                {woDetails.scopeOfWork && (
                  <div>
                    <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Scope of Work</span>
                    <p className="whitespace-pre-wrap text-zinc-900 font-medium p-2.5 border border-zinc-200 rounded-lg bg-white leading-relaxed">{woDetails.scopeOfWork}</p>
                  </div>
                )}
                <div>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Payment Schedule & Conditions of Contract</span>
                  <p className="whitespace-pre-wrap text-zinc-700 leading-relaxed p-2.5 border border-zinc-200 rounded-lg bg-zinc-50 font-medium">{woDetails.terms}</p>
                </div>
              </div>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-2 gap-8 text-[9px] break-inside-avoid mt-8 pt-4 border-t border-zinc-200">
              <div className="flex flex-col items-start justify-end text-left">
                <div className="border-t-2 border-black pt-2 w-52 mt-8">
                  <p className="font-black text-black uppercase">
                    {woDetails.woType === 'Client' ? 'Client Acceptance Signature' : 'Subcontractor Seal & Signature'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end justify-end text-right">
                {companySettings?.showSignatureImage && companySettings?.signatureUrl && (
                  <img src={companySettings.signatureUrl} alt="Signature" className="h-12 w-auto object-contain mb-1 mix-blend-multiply" />
                )}
                <div className="border-t-2 border-black pt-2 w-52 mt-1">
                  <p className="font-black text-black">For {companySettings?.companyName || 'Jyanipur Interiors'}</p>
                  <p className="text-[8px] text-zinc-500 mt-0.5 uppercase tracking-widest font-bold">Authorized Signatory</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* --- IMPORT ESTIMATE BOQ MODAL --- */}
      {showEstimateImportModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-zinc-200">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">Import Approved Estimation BOQ</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Converts estimate scope directly into contract lines</p>
              </div>
              <button onClick={() => setShowEstimateImportModal(false)} className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 bg-zinc-50/50 flex-1">
              {estimationsList.length === 0 ? (
                <div className="text-center py-10 text-xs text-zinc-400 font-bold uppercase tracking-widest">
                  No saved client estimates found.
                </div>
              ) : (
                estimationsList.map(est => (
                  <div 
                    key={est.id || est._id}
                    onClick={() => handleImportEstimate(est)}
                    className="p-4 bg-white border border-zinc-200 hover:border-black rounded-xl cursor-pointer transition-all shadow-sm flex justify-between items-center group"
                  >
                    <div>
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono block">
                        EST#{est.estimateNo || est.id} • {est.date}
                      </span>
                      <h4 className="text-sm font-bold text-zinc-900 tracking-tight mt-0.5 group-hover:text-black">
                        {est.partyName || est.clientName || 'General Client'}
                      </h4>
                      <p className="text-[10px] text-zinc-500">{est.projectName || 'Interior Fitout'} • {(est.items || []).length} items</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-zinc-900">₹{(parseFloat(est.totalAmount) || 0).toLocaleString('en-IN')}</p>
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest group-hover:underline">Import BOQ &rarr;</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-zinc-200 bg-white flex justify-end">
              <button 
                onClick={() => setShowEstimateImportModal(false)}
                className="px-5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}