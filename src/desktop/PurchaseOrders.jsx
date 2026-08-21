import React, { useState, useEffect, useRef } from 'react';
import { sendWhatsAppMessage } from '../WhatsAppHelper';
// Added getMaterialRates to import
import { getPurchaseOrders, savePurchaseOrder, toggleCancelPurchaseOrder, getVendors, getMaterialRates } from '../db';

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

export default function PurchaseOrders({ companySettings = {}, updateDirtyState }) {
  const [currentView, setCurrentView] = useState(() => sessionStorage.getItem('draft_poView') || 'list');
  const [editingId, setEditingId] = useState(() => {
    const saved = sessionStorage.getItem('draft_poEditingId');
    return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [poList, setPoList] = useState([]);
  
  // Vendor Autocomplete State
  const [vendorsList, setVendorsList] = useState([]);
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const vendorDropdownRef = useRef(null);

  // Material Rate Book State (For Line Items Sync)
  const [materialRates, setMaterialRates] = useState([]);
  const [focusedRowId, setFocusedRowId] = useState(null);

  const [poDetails, setPoDetails] = useState(() => {
    const saved = sessionStorage.getItem('draft_poDetails');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      vendorName: '', vendorAddress: '', vendorGst: '', 
      date: new Date().toISOString().split('T')[0], expectedDelivery: '', 
      poNo: companySettings.poPrefix || 'PO/', 
      projectName: '', shippingAddress: companySettings.companyAddress || 'Site Office', 
      terms: companySettings.defaultPOTerms || '', 
      description: ''
    };
  });

  const [items, setItems] = useState(() => {
    const saved = sessionStorage.getItem('draft_poItems');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [{ id: 1, description: '', uom: 'Nos', qty: '', rate: '', tax: companySettings.defaultGstRate || 18 }];
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    sessionStorage.setItem('draft_poView', currentView);
    sessionStorage.setItem('draft_poEditingId', JSON.stringify(editingId));
    sessionStorage.setItem('draft_poDetails', JSON.stringify(poDetails));
    sessionStorage.setItem('draft_poItems', JSON.stringify(items));
  }, [currentView, editingId, poDetails, items]);

  useEffect(() => {
    if (updateDirtyState) {
      if (currentView === 'form') {
        const isDirty = poDetails.vendorName !== '' || 
                        (poDetails.poNo !== '' && poDetails.poNo !== companySettings.poPrefix) || 
                        items.length > 1 || 
                        items[0].description !== '';
        updateDirtyState('Purchase Orders', isDirty);
      } else {
        updateDirtyState('Purchase Orders', false);
      }
    }
  }, [currentView, poDetails, items, updateDirtyState, companySettings.poPrefix]);

  const loadPOsFromDb = async () => {
    setLoading(true);
    try {
      const [poData, vData, mData] = await Promise.all([
        getPurchaseOrders(),
        getVendors ? getVendors() : Promise.resolve([]),
        getMaterialRates ? getMaterialRates() : Promise.resolve([])
      ]);
      setPoList(poData || []);
      setVendorsList(vData || []);
      setMaterialRates(mData || []);
    } catch (e) {
      console.error("Error loading POs from cloud DB:", e);
      setPoList([]);
      setVendorsList([]);
      setMaterialRates([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadPOsFromDb(); }, [currentView]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target)) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!editingId && currentView === 'form') {
      setPoDetails(prev => ({
        ...prev,
        poNo: prev.poNo === '' || prev.poNo === 'PO/' ? (companySettings.poPrefix || 'PO/') : prev.poNo,
        terms: prev.terms === '' ? (companySettings.defaultPOTerms || '') : prev.terms
      }));
    }
  }, [companySettings, editingId, currentView]);

  const handleVendorInputChange = (e) => {
    const val = e.target.value;
    const exactMatch = vendorsList.find(v => v.name && v.name.toLowerCase() === val.toLowerCase());
    
    if (exactMatch) {
      handleSelectVendor(exactMatch);
      return;
    }

    setPoDetails(prev => ({ ...prev, vendorName: val }));
    if (errors.vendorName) setErrors(prev => ({ ...prev, vendorName: false }));

    if (val.trim().length > 0) {
      const matches = vendorsList.filter(v => v.name && v.name.toLowerCase().includes(val.toLowerCase()));
      setVendorSuggestions(matches);
      setShowVendorDropdown(matches.length > 0);
    } else {
      setVendorSuggestions(vendorsList);
      setShowVendorDropdown(vendorsList.length > 0);
    }
  };

  const handleSelectVendor = (vendor) => {
    setPoDetails(prev => ({
      ...prev,
      vendorName: vendor.name,
      vendorGst: vendor.gstin || '',
      vendorAddress: vendor.address || ''
    }));
    setShowVendorDropdown(false);
  };

  const addItem = () => setItems([...items, { id: Date.now(), description: '', uom: 'Nos', qty: '', rate: '', tax: companySettings.defaultGstRate || 18 }]);
  
  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  // Auto-fill material details from the Rate Book suggestions
  const handleSelectMaterial = (rowId, material) => {
    setItems(items.map(item => item.id === rowId ? {
      ...item,
      description: material.materialName,
      uom: material.unit || 'Nos',
      rate: material.rate || ''
    } : item));
    setFocusedRowId(null);
  };

  const calculateRow = (item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const taxRate = parseFloat(item.tax) || 0;
    const baseAmount = qty * rate;
    const taxAmount = (baseAmount * taxRate) / 100;
    return { baseAmount, taxAmount, totalAmount: baseAmount + taxAmount };
  };

  const totals = items.reduce((acc, item) => {
    const rowCalc = calculateRow(item);
    return { subtotal: acc.subtotal + rowCalc.baseAmount, totalTax: acc.totalTax + rowCalc.taxAmount, grandTotal: acc.grandTotal + rowCalc.totalAmount };
  }, { subtotal: 0, totalTax: 0, grandTotal: 0 });

  const savePOToState = async () => {
    const newErrors = {};
    if (!poDetails.vendorName) newErrors.vendorName = true;
    if (!poDetails.poNo) newErrors.poNo = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Fill required fields: Vendor Name & PO No.');
      return false;
    }
    setErrors({});
    
    const record = {
      id: editingId || undefined,
      vendorName: poDetails.vendorName,
      vendorAddress: poDetails.vendorAddress,
      vendorGst: poDetails.vendorGst,
      poNo: poDetails.poNo,
      date: poDetails.date,
      expectedDelivery: poDetails.expectedDelivery,
      projectName: poDetails.projectName,
      shippingAddress: poDetails.shippingAddress,
      items: items,
      terms: poDetails.terms,
      description: poDetails.description,
      amount: '₹ ' + totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };

    setSubmitting(true);
    try {
      await savePurchaseOrder(record);
      await loadPOsFromDb();
      setSubmitting(false);
      return true;
    } catch (err) {
      console.error("Error saving PO to database:", err);
      alert('Failed to save PO to cloud database.');
      setSubmitting(false);
      return false;
    }
  };

  const handleSaveOnly = async () => {
    if (await savePOToState()) {
      alert(`Purchase Order ${poDetails.poNo} saved!`);
      handleClear(false);
      setCurrentView('list');
    }
  };

  const handleSaveAndPrint = async () => {
    if (await savePOToState()) {
      setTimeout(() => window.print(), 100);
    }
  };

  const handleEdit = (po) => {
    setEditingId(po.id);
    setPoDetails({
      vendorName: po.vendorName || '',
      vendorAddress: po.vendorAddress || '',
      vendorGst: po.vendorGst || '',
      date: po.date || new Date().toISOString().split('T')[0],
      expectedDelivery: po.expectedDelivery || '',
      poNo: po.poNo || '',
      projectName: po.projectName || '',
      shippingAddress: po.shippingAddress || '',
      terms: po.terms || '',
      description: po.description || ''
    });
    setItems(po.items && po.items.length > 0 ? po.items : [{ id: 1, description: '', uom: 'Nos', qty: '', rate: '', tax: companySettings.defaultGstRate || 18 }]);
    setCurrentView('form');
  };

  const handleView = (po) => {
    handleEdit(po);
    setCurrentView('view');
  };

  const handleDirectPrint = (po) => {
    handleEdit(po);
    setTimeout(() => window.print(), 150);
  };

  const handleSendWhatsApp = (po) => {
    const template = companySettings.waPoTemplate || 'Hello, please find our official Purchase Order attached.';
    const finalMessage = `${template}\n\n*PO No:* ${po.poNo || 'PO'}\n*Vendor:* ${po.vendorName}\n*Amount:* ${po.amount || '0'}\n*Company:* ${companySettings.companyName || 'Jyanipur Interiors'}`;
    sendWhatsAppMessage(po.phone || '', finalMessage);
  };

  const handleToggleCancel = async (po) => {
    setLoading(true);
    try {
      await toggleCancelPurchaseOrder(po.id, po.isCancelled);
      await loadPOsFromDb();
    } catch(e) {
      console.error("Error toggling PO cancellation status:", e);
      setLoading(false);
    }
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the entire PO?')) {
      setEditingId(null);
      setPoDetails({ 
        vendorName: '', vendorAddress: '', vendorGst: '', date: new Date().toISOString().split('T')[0], 
        expectedDelivery: '', poNo: companySettings.poPrefix || 'PO/', projectName: '', shippingAddress: companySettings.companyAddress || 'Site Office', 
        terms: companySettings.defaultPOTerms || '', description: '' 
      });
      setItems([{ id: 1, description: '', uom: 'Nos', qty: '', rate: '', tax: companySettings.defaultGstRate || 18 }]);
      setErrors({});
      setShowVendorDropdown(false);
      sessionStorage.removeItem('draft_poDetails');
      sessionStorage.removeItem('draft_poItems');
      sessionStorage.removeItem('draft_poEditingId');
      if (updateDirtyState) updateDirtyState('Purchase Orders', false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-0.5";

  const isReadOnly = currentView === 'view';

  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col print:hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
        
        {/* Header */}
        <div className="flex justify-between items-center pb-5 mb-6 border-b border-zinc-200 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Purchase Orders</h2>
            <p className="text-zinc-500 text-xs mt-0.5 font-medium">Generate official material procurement requests for suppliers.</p>
          </div>
          <button 
            onClick={() => { handleClear(false); setCurrentView('form'); }} 
            className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 h-10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Create PO
          </button>
        </div>

        {/* PO Table */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50/80 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200">
                  <th className="py-4 px-6 font-semibold">Date</th>
                  <th className="py-4 px-6 font-semibold">PO No.</th>
                  <th className="py-4 px-6 font-semibold">Vendor</th>
                  <th className="py-4 px-6 font-semibold text-right">Total Amount</th>
                  <th className="py-4 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {loading ? (
                  <tr><td colSpan="5" className="py-12 text-center text-zinc-400 font-medium text-xs">Syncing Purchase Orders from cloud DB...</td></tr>
                ) : poList.length === 0 ? (
                  <tr><td colSpan="5" className="py-12 text-center text-zinc-400 font-medium text-xs">No POs created yet. Click "+ Create PO" above.</td></tr>
                ) : (
                  poList.map((po) => (
                    <tr key={po.id} className={`transition-all ${po.isCancelled ? 'bg-red-50/20 opacity-60' : 'hover:bg-zinc-50/80'}`}>
                      <td className={`py-4 px-6 text-xs font-medium ${po.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-600'}`}>{po.date}</td>
                      <td className={`py-4 px-6 font-bold text-xs ${po.isCancelled ? 'line-through text-zinc-400' : 'text-[#B45309]'}`}>{po.poNo}</td>
                      <td className={`py-4 px-6 text-xs font-semibold ${po.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>{po.vendorName}</td>
                      <td className={`py-4 px-6 text-right font-semibold text-xs ${po.isCancelled ? 'line-through text-zinc-400' : 'text-emerald-600'}`}>{po.amount}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!po.isCancelled ? (
                            <>
                              <button onClick={() => handleEdit(po)} className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-wider transition-all">Edit</button>
                              <button onClick={() => handleView(po)} className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-wider transition-all">View</button>
                              <button onClick={() => handleDirectPrint(po)} className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-wider transition-all">Print</button>
                              <button onClick={() => handleSendWhatsApp(po)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-wider transition-all">💬 WhatsApp</button>
                              <button onClick={() => handleToggleCancel(po)} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-wider transition-all">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleView(po)} className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-wider transition-all">View</button>
                              <button onClick={() => handleToggleCancel(po)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-wider transition-all">Restore</button>
                            </>
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
        
        {/* Form View Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6 shrink-0">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            {isReadOnly ? `Viewing PO ${poDetails.poNo}` : editingId ? `Edit PO ${poDetails.poNo}` : 'Create Purchase Order'}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-600 hover:text-zinc-900 text-xs font-bold transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-zinc-200 flex items-center gap-1.5 shadow-sm">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>
            {isReadOnly && (
              <>
                <button onClick={() => handleSendWhatsApp(poDetails)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-emerald-700 transition-all flex items-center gap-1.5 cursor-pointer">
                  💬 WhatsApp
                </button>
                <button onClick={() => window.print()} className="bg-[#B45309] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-[#92400E] transition-all flex items-center gap-1.5 cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" /></svg>
                  Print / Save PDF
                </button>
              </>
            )}
          </div>
        </div>

        {/* Vendor Metadata Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
          <div className="md:col-span-1 relative" ref={vendorDropdownRef}>
            <label className={labelClass}>Vendor / Supplier Name <span className="text-red-500">*</span></label>
            <input 
              disabled={isReadOnly} 
              type="text" 
              list="po-vendors-datalist"
              value={poDetails.vendorName} 
              onChange={handleVendorInputChange} 
              onFocus={() => {
                const matches = vendorsList.filter(v => v.name);
                setVendorSuggestions(matches);
                setShowVendorDropdown(matches.length > 0);
              }}
              className={`${inputClass} ${errors.vendorName ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} 
              placeholder="Type or select vendor..." 
              autoComplete="off"
            />

            <datalist id="po-vendors-datalist">
              {vendorsList.map((v) => (
                <option key={v.id || v.name} value={v.name}>{v.gstin ? `GST: ${v.gstin}` : 'Unregistered'}</option>
              ))}
            </datalist>

            {showVendorDropdown && !isReadOnly && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-[120] max-h-52 overflow-y-auto">
                <div className="p-2 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex justify-between items-center">
                  <span>Saved Vendors ({vendorSuggestions.length})</span>
                  <span className="text-[9px] text-[#B45309]">Click to Auto-fill</span>
                </div>
                {vendorSuggestions.map((v) => (
                  <div
                    key={v.id || v.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectVendor(v);
                    }}
                    className="px-4 py-2.5 hover:bg-amber-50 cursor-pointer flex justify-between items-center transition-colors border-b border-zinc-50 last:border-none"
                  >
                    <div>
                      <p className="font-semibold text-xs text-zinc-900">{v.name}</p>
                      {v.tradeCategory && <p className="text-[10px] text-zinc-400 font-medium">{v.tradeCategory}</p>}
                    </div>
                    {v.gstin ? (
                      <span className="text-[10px] font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-700 font-semibold border border-zinc-200">
                        {v.gstin}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 italic">No GST</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Vendor GSTIN</label>
            <input disabled={isReadOnly} type="text" value={poDetails.vendorGst} onChange={(e) => setPoDetails({...poDetails, vendorGst: e.target.value.toUpperCase()})} className={`${inputClass} font-mono uppercase`} maxLength={15} placeholder="Optional" />
          </div>

          <div>
            <label className={labelClass}>Vendor Address</label>
            <input disabled={isReadOnly} type="text" value={poDetails.vendorAddress} onChange={(e) => setPoDetails({...poDetails, vendorAddress: e.target.value})} className={inputClass} placeholder="Supplier Operating Address" />
          </div>
        </div>

        {/* PO Dates & Project Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
          <div>
            <label className={labelClass}>PO No. <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={poDetails.poNo} onChange={(e) => { setPoDetails({...poDetails, poNo: e.target.value}); if(errors.poNo) setErrors({...errors, poNo: false}); }} className={`${inputClass} ${errors.poNo ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} />
          </div>
          <div>
            <label className={labelClass}>PO Date</label>
            <input disabled={isReadOnly} type="date" value={poDetails.date} onChange={(e) => setPoDetails({...poDetails, date: e.target.value})} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Expected Delivery Date</label>
            <input disabled={isReadOnly} type="date" value={poDetails.expectedDelivery} onChange={(e) => setPoDetails({...poDetails, expectedDelivery: e.target.value})} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Project Name / Code</label>
            <input disabled={isReadOnly} type="text" value={poDetails.projectName} onChange={(e) => setPoDetails({...poDetails, projectName: e.target.value})} className={inputClass} placeholder="e.g. Kondapur Site" />
          </div>
        </div>

        {/* Item Rows Table with Rate Book Suggestion Overlay */}
        <div className="mb-6 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm shrink-0">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 border-b border-zinc-100 pb-2">Procurement Items & Quantities</p>
          <div className="overflow-x-visible">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-100 pb-3">
                  <th className="py-2.5 pr-4 font-bold">Item Description (Material)</th>
                  <th className="py-2.5 px-2 font-bold w-20 text-center">UOM</th>
                  <th className="py-2.5 px-2 font-bold w-24 text-center">Qty</th>
                  <th className="py-2.5 px-2 font-bold w-28 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-2 font-bold w-28 text-right">Base Amt</th>
                  <th className="py-2.5 px-2 font-bold w-20 text-center">Tax %</th>
                  <th className="py-2.5 px-2 font-bold w-28 text-right">Total Amt</th>
                  {!isReadOnly && <th className="py-2.5 pl-2 w-6"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item) => {
                  const rowCalc = calculateRow(item);
                  const tInp = "w-full border-b border-transparent hover:border-zinc-300 focus:border-[#B45309] bg-transparent focus:outline-none py-2 px-1 text-xs transition-all font-medium text-zinc-900 placeholder-zinc-300 disabled:opacity-75";
                  
                  // Sort suggestions: Highlight current vendor's rate at top
                  const itemSuggestions = materialRates.filter(m => item.description && m.materialName && m.materialName.toLowerCase().includes(item.description.toLowerCase()));
                  itemSuggestions.sort((a, b) => {
                    const aIsVendor = a.vendorName === poDetails.vendorName;
                    const bIsVendor = b.vendorName === poDetails.vendorName;
                    if (aIsVendor && !bIsVendor) return -1;
                    if (!aIsVendor && bIsVendor) return 1;
                    return 0;
                  });

                  return (
                    <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-2 pr-4 relative">
                        <input 
                          disabled={isReadOnly} 
                          type="text" 
                          placeholder="e.g. 18mm Century Plywood" 
                          value={item.description} 
                          onChange={(e) => {
                            updateItem(item.id, 'description', e.target.value);
                            setFocusedRowId(item.id);
                          }}
                          onFocus={() => setFocusedRowId(item.id)}
                          onBlur={() => setTimeout(() => setFocusedRowId(null), 200)}
                          className={tInp} 
                          autoComplete="off"
                        />

                        {/* Rate Book Sync Overlay */}
                        {focusedRowId === item.id && itemSuggestions.length > 0 && !isReadOnly && (
                          <div className="absolute left-0 top-full mt-1 w-96 bg-white border border-zinc-200 rounded-xl shadow-2xl z-[150] max-h-60 overflow-y-auto">
                            <div className="p-2 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50 sticky top-0">
                              Historical Rates (Rate Book)
                            </div>
                            {itemSuggestions.map((m, idx) => {
                              const isCurrentVendor = m.vendorName === poDetails.vendorName;
                              return (
                                <div
                                  key={idx}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectMaterial(item.id, m);
                                  }}
                                  className={`px-4 py-2.5 cursor-pointer flex flex-col transition-colors border-b border-zinc-100 last:border-none ${isCurrentVendor ? 'bg-amber-50/60 hover:bg-amber-100' : 'hover:bg-zinc-50'}`}
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-xs text-zinc-900">{m.materialName}</span>
                                    <span className="font-bold text-[#B45309] text-xs">₹{m.rate} <span className="text-[9px] text-zinc-500 font-normal">/{m.unit}</span></span>
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                    <span className={`text-[9px] uppercase tracking-wider font-bold ${isCurrentVendor ? 'text-[#B45309]' : 'text-zinc-500'}`}>
                                      {m.vendorName || 'Unknown Vendor'} {isCurrentVendor && '(Current Supplier)'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <select disabled={isReadOnly} value={item.uom} onChange={(e) => updateItem(item.id, 'uom', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.25rem_center] bg-[length:0.75rem_0.75rem] pr-4`}>
                          <option value="Nos">Nos</option><option value="Bags">Bags</option><option value="SqFt">SqFt</option><option value="Rft">Rft</option><option value="Cum">Cum</option><option value="Kgs">Kgs</option><option value="Ltrs">Ltrs</option><option value="Box">Box</option><option value="Roll">Roll</option><option value="LumpSum">LumpSum</option><option value="Pcs">Pcs</option>
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input disabled={isReadOnly} type="number" step="any" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} className={`${tInp} text-center font-bold text-[#B45309]`} placeholder="0" />
                      </td>
                      <td className="py-2 px-2">
                        <input disabled={isReadOnly} type="number" step="any" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className={`${tInp} text-right`} placeholder="0.00" />
                      </td>
                      <td className="py-2 px-2 text-right text-xs font-semibold text-zinc-800">{rowCalc.baseAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      <td className="py-2 px-2">
                        <select disabled={isReadOnly} value={item.tax} onChange={(e) => updateItem(item.id, 'tax', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.25rem_center] bg-[length:0.75rem_0.75rem] pr-4`}>
                          <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 text-right text-xs font-bold text-zinc-900">{rowCalc.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      {!isReadOnly && (
                        <td className="py-2 pl-2 text-center">
                          <button onClick={() => removeItem(item.id)} className="text-zinc-300 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-base flex items-center justify-center">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
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
            <button onClick={addItem} className="mt-4 text-[#B45309] hover:text-[#92400E] text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Material Row
            </button>
          )}
        </div>

        {/* Bottom Terms & Totals Deck */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0">
          <div className="flex-1 space-y-4">
            <div>
              <label className={labelClass}>Shipping / Site Delivery Address</label>
              <textarea disabled={isReadOnly} value={poDetails.shippingAddress} onChange={(e) => setPoDetails({...poDetails, shippingAddress: e.target.value})} className={`${inputClass} resize-y min-h-[60px] py-2`} rows="2"></textarea>
            </div>
            <div>
              <label className={labelClass}>Internal Remarks / Notes</label>
              <textarea disabled={isReadOnly} value={poDetails.description} onChange={(e) => setPoDetails({...poDetails, description: e.target.value})} className={`${inputClass} resize-y min-h-[40px] py-2`} rows="1"></textarea>
            </div>
            <div>
              <label className={labelClass}>Purchase Order Terms & Conditions</label>
              <textarea disabled={isReadOnly} value={poDetails.terms} onChange={(e) => setPoDetails({...poDetails, terms: e.target.value})} className={`${inputClass} resize-y min-h-[100px] text-xs leading-relaxed`}></textarea>
            </div>
          </div>

          <div className="w-full lg:w-80 flex flex-col justify-between">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 text-zinc-800 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Base Amount:</span>
                <span className="font-semibold text-zinc-900">₹ {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Estimated Tax:</span>
                <span className="font-semibold text-emerald-600">₹ {totals.totalTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between text-base font-bold border-t border-zinc-200 pt-3">
                <span>Grand Total:</span>
                <span className="text-[#B45309]">₹ {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveOnly} disabled={submitting} className="flex-1 py-3 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-800 rounded-xl font-semibold text-xs transition-all cursor-pointer disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button onClick={handleSaveAndPrint} disabled={submitting} className="flex-1 py-3 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl font-medium text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save & Print'}
                </button>
              </div>
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
            img { mix-blend-mode: multiply !important; }
          }
        `}} />

        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white">
          
          <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-5 mb-5">
            <div className="flex items-center gap-4">
              {companySettings?.logoUrl && <img src={companySettings.logoUrl} className="h-14 w-auto object-contain shrink-0" alt="Logo" />}
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-[#B45309]">{companySettings?.companyName || 'Company Name'}</h1>
                <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-0.5 max-w-xs">{companySettings?.companyAddress}</p>
                <p className="text-[10px] text-zinc-800 mt-1 font-bold">
                  GSTIN: <span className="font-medium text-zinc-600 mr-2">{companySettings?.companyGst}</span> 
                  Phone: <span className="font-medium text-zinc-600">{companySettings?.companyPhone}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-[0.2em] block mb-1">Purchase Order</span>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{poDetails.poNo || 'PO-000'}</h2>
              <p className="text-[10px] font-bold text-zinc-800 mt-1">Date: <span className="font-medium text-zinc-600">{poDetails.date}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6 pb-4 border-b border-zinc-200">
            <div>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">To (Vendor / Supplier)</span>
              <h3 className="text-sm font-bold text-zinc-900 uppercase">{poDetails.vendorName || 'Vendor Name'}</h3>
              <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-1 leading-relaxed">{poDetails.vendorAddress}</p>
              {poDetails.vendorGst && <p className="text-[10px] text-zinc-800 font-bold mt-1.5">GSTIN: <span className="font-medium text-zinc-600">{poDetails.vendorGst.toUpperCase()}</span></p>}
            </div>
            <div className="text-right space-y-1">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Delivery Details</span>
              {poDetails.expectedDelivery && <p className="text-[10px] text-zinc-800 font-bold">Expected By: <span className="font-medium text-zinc-600">{poDetails.expectedDelivery}</span></p>}
              {poDetails.projectName && <p className="text-[10px] text-zinc-800 font-bold mt-2">Project: <span className="font-medium text-[#B45309]">{poDetails.projectName}</span></p>}
              <p className="text-[10px] text-zinc-800 font-bold mt-2">Ship To:<br/><span className="font-medium text-zinc-600 whitespace-pre-wrap leading-tight block mt-0.5">{poDetails.shippingAddress}</span></p>
            </div>
          </div>

          <table className="w-full text-left border-collapse mb-6">
            <thead>
              <tr className="bg-[#B45309] text-white text-[9px] uppercase tracking-wider">
                <th className="py-2.5 px-2 font-bold text-center w-8 rounded-tl-md">#</th>
                <th className="py-2.5 px-3 font-bold">Material / Description</th>
                <th className="py-2.5 px-2 font-bold text-center w-12">Qty</th>
                <th className="py-2.5 px-2 font-bold text-center w-12">UOM</th>
                <th className="py-2.5 px-2 font-bold text-right w-20">Unit Rate</th>
                <th className="py-2.5 px-2 font-bold text-center w-12">Tax</th>
                <th className="py-2.5 px-3 font-bold text-right w-24 rounded-tr-md">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-[10px]">
              {items.map((item, index) => {
                const row = calculateRow(item);
                if (!item.description) return null;
                
                return (
                  <tr key={item.id} className="break-inside-avoid">
                    <td className="py-3 px-2 text-center text-zinc-500">{index + 1}</td>
                    <td className="py-3 px-3 font-bold text-zinc-900">{item.description}</td>
                    <td className="py-3 px-2 text-center font-bold text-zinc-800">{parseFloat(item.qty || 0).toLocaleString()}</td>
                    <td className="py-3 px-2 text-center text-zinc-600">{item.uom}</td>
                    <td className="py-3 px-2 text-right text-zinc-800">₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-2 text-center text-zinc-500">{item.tax}%</td>
                    <td className="py-3 px-3 text-right font-semibold text-zinc-900">₹{row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="border-t-2 border-zinc-800 pt-3 mb-6 flex justify-between items-start">
            <div className="w-1/2 pr-4">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total in Words</span>
              <p className="text-[10px] font-bold text-zinc-900 capitalize">{numberToWords(totals.grandTotal)}</p>
            </div>
            
            <div className="w-1/3 text-xs space-y-1.5 border border-zinc-200 bg-zinc-50 rounded-lg p-3">
              <div className="flex justify-between text-zinc-600">
                <span>Base Total:</span>
                <span className="font-bold text-zinc-900">₹{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Estimated Tax:</span>
                <span className="font-bold text-zinc-900">₹{totals.totalTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              
              <div className="flex justify-between font-semibold text-white bg-[#B45309] px-2.5 py-2 rounded mt-2 text-sm">
                <span>Grand Total:</span><span>₹{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-[10px] break-inside-avoid">
            <div className="space-y-4">
              {companySettings?.showTermsOnPdf !== false && (
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Terms & Conditions</span>
                  <p className="whitespace-pre-wrap text-zinc-500 leading-tight">{poDetails.terms}</p>
                </div>
              )}

              {companySettings?.showRemarksOnPdf !== false && poDetails.description && (
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Remarks / Notes</span>
                  <p className="text-zinc-600 font-medium">{poDetails.description}</p>
                </div>
              )}
            </div>

            {companySettings?.showSignatoryOnPdf !== false && (
              <div className="flex flex-col items-end justify-end text-right">
                {companySettings?.showSignatureImage && companySettings?.signatureUrl ? (
                  <img src={companySettings.signatureUrl} alt="Signature" className="h-16 w-auto object-contain mb-2 mix-blend-multiply" />
                ) : <div className="h-16"></div>}
                <div className="border-t-2 border-zinc-800 pt-2 w-48">
                  <p className="font-bold text-zinc-900">For {companySettings?.companyName}</p>
                  <p className="text-[9px] text-zinc-500 mt-0.5 uppercase tracking-wider">Authorized Signatory</p>
                </div>
              </div>
            )}
          </div>

          {companySettings?.pdfFooterDisclaimer && (
            <div className="mt-8 pt-4 border-t border-zinc-200 text-center">
              <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-[0.2em]">{companySettings.pdfFooterDisclaimer}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}