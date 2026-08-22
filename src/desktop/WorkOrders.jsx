import React, { useState, useEffect, useRef } from 'react';
import { getWorkOrders, saveWorkOrder, toggleCancelWorkOrder, getLeads } from '../db';

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

export default function WorkOrders({ companySettings = {}, updateDirtyState }) {
  const [currentView, setCurrentView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [woList, setWoList] = useState([]);
  const [crmLeads, setCrmLeads] = useState([]);
  
  // CRM Autocomplete State
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientDropdownRef = useRef(null);

  const [woDetails, setWoDetails] = useState({
    clientName: '', clientAddress: '', clientPhone: '', 
    date: new Date().toISOString().split('T')[0], targetCompletion: '', 
    woNo: 'WO/', projectName: '', 
    terms: '1. 50% Advance on signing.\n2. 40% on material delivery.\n3. 10% on handover.\n4. Water & Electricity to be provided by client.', 
    scopeOfWork: ''
  });

  const [items, setItems] = useState([
    { id: 1, description: '', room: 'Master Bedroom', qty: '1', rate: '', amount: 0 }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [woData, leadsData] = await Promise.all([
        getWorkOrders(),
        getLeads ? getLeads() : Promise.resolve([])
      ]);
      setWoList(woData || []);
      setCrmLeads(leadsData || []);
    } catch (e) {
      console.error("Error loading Work Orders:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [currentView]);

  // Click outside dropdown
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
    if (!woDetails.clientName || !woDetails.woNo) return alert('Client Name and WO No are required.');
    
    const record = {
      id: editingId || undefined,
      ...woDetails,
      items: items,
      totalAmount: totals
    };

    setSubmitting(true);
    try {
      await saveWorkOrder(record);
      alert(`Work Order ${woDetails.woNo} saved successfully!`);
      handleClear();
      setCurrentView('list');
    } catch (err) {
      console.error(err);
      alert('Failed to save Work Order.');
    }
    setSubmitting(false);
  };

  const handleEdit = (wo) => {
    setEditingId(wo.id);
    setWoDetails({
      clientName: wo.clientName || '', clientAddress: wo.clientAddress || '', clientPhone: wo.clientPhone || '',
      date: wo.date || new Date().toISOString().split('T')[0], targetCompletion: wo.targetCompletion || '',
      woNo: wo.woNo || '', projectName: wo.projectName || '',
      terms: wo.terms || '', scopeOfWork: wo.scopeOfWork || ''
    });
    setItems(wo.items && wo.items.length > 0 ? wo.items : [{ id: 1, description: '', room: '', qty: '1', rate: '', amount: 0 }]);
    setCurrentView('form');
  };

  const handleView = (wo) => {
    handleEdit(wo);
    setCurrentView('view');
  };

  const handleClear = () => {
    setEditingId(null);
    setWoDetails({
      clientName: '', clientAddress: '', clientPhone: '', date: new Date().toISOString().split('T')[0], 
      targetCompletion: '', woNo: 'WO/', projectName: '', 
      terms: '1. 50% Advance on signing.\n2. 40% on material delivery.\n3. 10% on handover.\n4. Water & Electricity to be provided by client.', scopeOfWork: ''
    });
    setItems([{ id: 1, description: '', room: 'Master Bedroom', qty: '1', rate: '', amount: 0 }]);
  };

  const handleToggleCancel = async (wo) => {
    setLoading(true);
    await toggleCancelWorkOrder(wo.id, wo.isCancelled);
    await loadData();
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-0.5";
  const isReadOnly = currentView === 'view';

  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col print:hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
        <div className="flex justify-between items-center pb-5 mb-6 border-b border-zinc-200 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Work Orders / Contracts</h2>
            <p className="text-zinc-500 text-xs mt-0.5 font-medium">Generate official execution contracts for your clients.</p>
          </div>
          <button onClick={() => { handleClear(); setCurrentView('form'); }} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 h-10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Create Work Order
          </button>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
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
                {woList.length === 0 ? (
                  <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-xs">No Work Orders generated yet.</td></tr>
                ) : (
                  woList.map((wo) => (
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
                              <button onClick={() => handleEdit(wo)} className="px-3 py-1.5 bg-amber-50 text-[#B45309] border border-amber-200/60 rounded-lg font-semibold text-[10px] uppercase tracking-wider">Edit</button>
                              <button onClick={() => handleView(wo)} className="px-3 py-1.5 bg-zinc-50 text-zinc-600 border border-zinc-200 rounded-lg font-semibold text-[10px] uppercase tracking-wider">View / Print</button>
                              <button onClick={() => handleToggleCancel(wo)} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-semibold text-[10px] uppercase tracking-wider">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => handleToggleCancel(wo)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-[10px] uppercase tracking-wider">Restore</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
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
            {isReadOnly ? `Work Order: ${woDetails.woNo}` : editingId ? `Edit Work Order ${woDetails.woNo}` : 'Draft Work Order'}
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

        {/* Terms & Totals */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0">
          <div className="flex-1 space-y-4">
            <div>
              <label className={labelClass}>Overall Project Description / Scope Note</label>
              <textarea disabled={isReadOnly} value={woDetails.scopeOfWork} onChange={e => setWoDetails({...woDetails, scopeOfWork: e.target.value})} className={`${inputClass} resize-y min-h-[60px] py-2`} placeholder="Turnkey interior execution as per approved 3D renders..."></textarea>
            </div>
            <div>
              <label className={labelClass}>Payment Terms & Conditions</label>
              <textarea disabled={isReadOnly} value={woDetails.terms} onChange={e => setWoDetails({...woDetails, terms: e.target.value})} className={`${inputClass} resize-y min-h-[100px] text-xs leading-relaxed`}></textarea>
            </div>
          </div>

          <div className="w-full lg:w-80 flex flex-col justify-between">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 text-zinc-800 space-y-3">
              <div className="flex justify-between text-base font-bold border-zinc-200">
                <span>Contract Value:</span>
                <span className="text-[#B45309]">₹ {totals.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {!isReadOnly && (
              <button onClick={handleSaveOnly} disabled={submitting} className="mt-4 w-full py-3 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50">
                {submitting ? 'Saving...' : 'Save Work Order'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PRINT VIEW (A4 FORMAT) */}
      <div className="hidden print:block w-full bg-white text-zinc-900 font-['Poppins'] text-[11px] leading-tight print:p-0 print:m-0">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}} />

        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white">
          <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-5 mb-5">
            <div className="flex items-center gap-4">
              {companySettings?.logoUrl && <img src={companySettings.logoUrl} className="h-14 w-auto object-contain shrink-0" alt="Logo" />}
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-[#B45309]">{companySettings?.companyName || 'Company Name'}</h1>
                <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-0.5">{companySettings?.companyAddress}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-[0.2em] block mb-1">Work Order / Contract</span>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{woDetails.woNo || 'WO-000'}</h2>
              <p className="text-[10px] font-bold text-zinc-800 mt-1">Date: <span className="font-medium text-zinc-600">{woDetails.date}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6 pb-4 border-b border-zinc-200">
            <div>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Client Details</span>
              <h3 className="text-sm font-bold text-zinc-900 uppercase">{woDetails.clientName || 'Client Name'}</h3>
              <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-1 leading-relaxed">{woDetails.clientAddress}</p>
              <p className="text-[10px] text-zinc-800 font-bold mt-1.5">Phone: <span className="font-medium text-zinc-600">{woDetails.clientPhone}</span></p>
            </div>
            <div className="text-right space-y-1">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Project Details</span>
              <p className="text-[10px] text-zinc-800 font-bold mt-2">Project: <span className="font-medium text-[#B45309]">{woDetails.projectName}</span></p>
              <p className="text-[10px] text-zinc-800 font-bold mt-2">Target Completion: <span className="font-medium text-zinc-600">{woDetails.targetCompletion || 'TBD'}</span></p>
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-8 text-[10px] break-inside-avoid">
            <div className="space-y-4">
              {woDetails.scopeOfWork && (
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Project Scope Notes</span>
                  <p className="whitespace-pre-wrap text-zinc-600 font-medium">{woDetails.scopeOfWork}</p>
                </div>
              )}
              <div>
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Terms & Conditions</span>
                <p className="whitespace-pre-wrap text-zinc-500 leading-tight">{woDetails.terms}</p>
              </div>
            </div>

            <div className="flex flex-col items-end justify-end text-right">
              <div className="h-16"></div>
              <div className="border-t-2 border-zinc-800 pt-2 w-48">
                <p className="font-bold text-zinc-900">Client Signature / Acceptance</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">{woDetails.clientName}</p>
              </div>
              <div className="h-16 mt-6"></div>
              <div className="border-t-2 border-zinc-800 pt-2 w-48">
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