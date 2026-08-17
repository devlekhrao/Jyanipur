import React, { useState, useEffect } from 'react';
import { sendWhatsAppMessage } from '../WhatsAppHelper';
import { getPurchaseOrders, savePurchaseOrder, toggleCancelPurchaseOrder } from '../db';

export default function MobilePurchaseOrders({ companySettings = {}, updateDirtyState }) {
  const [currentView, setCurrentView] = useState(() => localStorage.getItem('draft_poView') || 'list');
  const [editingId, setEditingId] = useState(() => {
    const saved = localStorage.getItem('draft_poEditingId');
    return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);
  const [poList, setPoList] = useState([]);
  
  const [poDetails, setPoDetails] = useState(() => {
    const saved = localStorage.getItem('draft_poDetails');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      vendorName: '', vendorAddress: '', vendorGst: '', 
      date: new Date().toISOString().split('T')[0], expectedDelivery: '', 
      poNo: companySettings.poPrefix || 'PO/', 
      projectName: '', shippingAddress: 'Jyanipur Site Office', 
      terms: companySettings.defaultPOTerms || '', 
      description: ''
    };
  });

  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('draft_poItems');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [{ id: 1, description: '', uom: 'Nos', qty: '', rate: '', tax: companySettings.defaultGstRate || 18 }];
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    localStorage.setItem('draft_poView', currentView);
    localStorage.setItem('draft_poEditingId', JSON.stringify(editingId));
    localStorage.setItem('draft_poDetails', JSON.stringify(poDetails));
    localStorage.setItem('draft_poItems', JSON.stringify(items));
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
      const data = await getPurchaseOrders();
      setPoList(data || []);
    } catch (e) {
      console.warn("getPurchaseOrders not yet implemented in db.js");
      setPoList([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadPOsFromDb(); }, []);

  useEffect(() => {
    if (!editingId && currentView === 'form') {
      setPoDetails(prev => ({
        ...prev,
        poNo: prev.poNo === '' || prev.poNo === 'PO/' ? (companySettings.poPrefix || 'PO/') : prev.poNo,
        terms: prev.terms === '' ? (companySettings.defaultPOTerms || '') : prev.terms
      }));
    }
  }, [companySettings, editingId, currentView]);

  const addItem = () => setItems([...items, { id: Date.now(), description: '', uom: 'Nos', qty: '', rate: '', tax: companySettings.defaultGstRate || 18 }]);
  const updateItem = (id, field, value) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

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

    try {
      await savePurchaseOrder(record);
      await loadPOsFromDb();
      return true;
    } catch (err) {
      alert('Saved locally. (Ensure savePurchaseOrder is added to db.js)');
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

  const handleSendWhatsApp = (po) => {
    const template = companySettings.waPoTemplate || 'Hello, please find our official Purchase Order attached.';
    const finalMessage = `${template}\n\n*PO No:* ${po.poNo || 'PO'}\n*Vendor:* ${po.vendorName}\n*Amount:* ${po.amount || '0'}\n*Company:* ${companySettings.companyName || 'Jyanipur Interiors'}`;
    sendWhatsAppMessage(po.phone || '', finalMessage);
  };

  const handleToggleCancel = async (po) => {
    try {
      await toggleCancelPurchaseOrder(po.id, po.isCancelled);
      await loadPOsFromDb();
    } catch(e) {
      alert("Status toggled locally. Make sure toggleCancelPurchaseOrder is in db.js");
    }
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the entire PO?')) {
      setEditingId(null);
      setPoDetails({ 
        vendorName: '', vendorAddress: '', vendorGst: '', date: new Date().toISOString().split('T')[0], 
        expectedDelivery: '', poNo: companySettings.poPrefix || 'PO/', projectName: '', shippingAddress: 'Jyanipur Site Office', 
        terms: companySettings.defaultPOTerms || '', description: '' 
      });
      setItems([{ id: 1, description: '', uom: 'Nos', qty: '', rate: '', tax: companySettings.defaultGstRate || 18 }]);
      setErrors({});
      localStorage.removeItem('draft_poDetails');
      localStorage.removeItem('draft_poItems');
      localStorage.removeItem('draft_poEditingId');
      if (updateDirtyState) updateDirtyState('Purchase Orders', false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  // LIST VIEW
  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col font-sans">
        
        {/* HEADER SECTION */}
        <div className="mb-3 shrink-0">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Purchase Orders</h2>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Procurement & Vendors</p>
            </div>
            <button 
              onClick={() => { handleClear(false); setCurrentView('form'); }}
              className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-semibold text-[11px] px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              + Create PO
            </button>
          </div>
        </div>

        {/* PO STREAM CARDS */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {loading ? (
            <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading Purchase Orders...</div>
          ) : poList.length === 0 ? (
            <div className="text-center py-12 bg-white border border-zinc-200 border-dashed rounded-3xl">
              <span className="text-3xl mb-2 block">🛍️</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No Purchase Orders created yet.</p>
            </div>
          ) : (
            poList.map((po) => (
              <div 
                key={po.id} 
                className={`bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 ${po.isCancelled ? 'opacity-60 bg-zinc-50' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1E3A8A] text-sm">{po.poNo}</span>
                      {po.isCancelled && (
                        <span className="bg-red-100 text-red-600 text-[8px] font-semibold text-[11px] px-2 py-0.5 rounded uppercase">Cancelled</span>
                      )}
                    </div>
                    <h4 className="font-bold text-zinc-900 text-sm mt-0.5">{po.vendorName}</h4>
                    <p className="text-[10px] text-zinc-400 font-bold">{po.projectName || 'General Site'}</p>
                  </div>
                  <p className="text-base font-semibold text-[11px] text-emerald-600">{po.amount}</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{po.date}</span>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleSendWhatsApp(po)}
                      className="bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold text-[11px] uppercase active:scale-95 transition-transform"
                    >
                      💬 WA
                    </button>
                    <button 
                      onClick={() => handleEdit(po)} 
                      className="bg-blue-50 text-[#1E3A8A] px-3 py-1.5 rounded-xl text-[10px] font-semibold text-[11px] uppercase active:scale-95 transition-transform"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    );
  }

  // CREATE / EDIT FORM VIEW
  return (
    <div className="w-full h-full flex flex-col font-sans">
      
      {/* HEADER BAR */}
      <div className="mb-3 shrink-0 flex justify-between items-center border-b border-zinc-100 pb-2">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">
            {editingId ? `Edit ${poDetails.poNo}` : 'New Purchase Order'}
          </h2>
          <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Supplier Requisition</p>
        </div>
        <button 
          onClick={() => { setCurrentView('list'); handleClear(false); }}
          className="text-zinc-400 font-bold text-sm bg-zinc-100 px-3 py-1.5 rounded-xl"
        >
          ✕ Cancel
        </button>
      </div>

      {/* FORM SCROLL AREA */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* VENDOR & PO DETAILS SHEET */}
        <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
          <h3 className="text-[10px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">1. Supplier & Order Info</h3>

          <div>
            <label className={labelClass}>Vendor / Supplier Name <span className="text-red-500">*</span></label>
            <input type="text" value={poDetails.vendorName} onChange={(e) => setPoDetails({...poDetails, vendorName: e.target.value})} placeholder="e.g. Asian Paints Depot" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Vendor GSTIN</label>
            <input type="text" value={poDetails.vendorGst} onChange={(e) => setPoDetails({...poDetails, vendorGst: e.target.value.toUpperCase()})} placeholder="36OEYPS..." maxLength={15} className={`${inputClass} uppercase font-mono`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>PO Number <span className="text-red-500">*</span></label>
              <input type="text" value={poDetails.poNo} onChange={(e) => setPoDetails({...poDetails, poNo: e.target.value})} placeholder="PO-001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>PO Date</label>
              <input type="date" value={poDetails.date} onChange={(e) => setPoDetails({...poDetails, date: e.target.value})} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Expected Delivery</label>
              <input type="date" value={poDetails.expectedDelivery} onChange={(e) => setPoDetails({...poDetails, expectedDelivery: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Project Site</label>
              <input type="text" value={poDetails.projectName} onChange={(e) => setPoDetails({...poDetails, projectName: e.target.value})} placeholder="e.g. Kondapur Site" className={inputClass} />
            </div>
          </div>
        </div>

        {/* MATERIAL ITEMS SECTION */}
        <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-1">
            <h3 className="text-[10px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest">2. Procurement Items</h3>
            <button onClick={addItem} className="text-[10px] font-semibold text-[11px] text-[#1E3A8A] bg-blue-50 px-2.5 py-1 rounded-lg uppercase">+ Add Item</button>
          </div>

          {items.map((item, index) => {
            const rowCalc = calculateRow(item);
            return (
              <div key={item.id} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 space-y-3 relative">
                <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 text-zinc-300 hover:text-red-500 font-bold text-xs">✕</button>

                <span className="text-[9px] font-semibold text-[11px] text-zinc-400 uppercase">Item #{index + 1}</span>

                <div>
                  <label className={labelClass}>Material Description</label>
                  <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="e.g. 53 Grade Cement Bags" className={inputClass} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Quantity</label>
                    <input type="number" inputMode="decimal" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} placeholder="10" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>UOM</label>
                    <select value={item.uom} onChange={(e) => updateItem(item.id, 'uom', e.target.value)} className={inputClass}>
                      <option value="Nos">Nos</option>
                      <option value="Bags">Bags</option>
                      <option value="SqFt">SqFt</option>
                      <option value="Rft">Rft</option>
                      <option value="Cum">Cum</option>
                      <option value="Kgs">Kgs</option>
                      <option value="Ltrs">Ltrs</option>
                      <option value="Box">Box</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>Unit Rate (₹)</label>
                    <input type="number" inputMode="decimal" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} placeholder="0.00" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Tax %</label>
                    <select value={item.tax} onChange={(e) => updateItem(item.id, 'tax', e.target.value)} className={inputClass}>
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Total (₹)</label>
                    <div className="h-[46px] bg-zinc-200/60 rounded-xl px-2 flex items-center font-semibold text-[11px] text-zinc-900 text-xs">
                      ₹ {rowCalc.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* SUMMARY KPI CARD */}
        <div className="bg-[#1E3A8A] text-white p-5 rounded-[1.5rem] shadow-md space-y-2">
          <div className="flex justify-between text-xs text-blue-200">
            <span>Base Total:</span>
            <span className="text-white font-bold">₹ {totals.subtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-xs text-blue-200">
            <span>Estimated Tax:</span>
            <span className="text-white font-bold">₹ {totals.totalTax.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-[11px] text-amber-400 pt-2 border-t border-blue-800">
            <span>Grand Total:</span>
            <span>₹ {totals.grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

      </div>

      {/* FIXED BOTTOM SAVE BAR */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-4 bg-white border-t border-zinc-200 shadow-lg">
        <button 
          onClick={handleSaveOnly}
          className="w-full py-4 bg-[#1E3A8A] text-white font-semibold text-[11px] rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
        >
          Save Purchase Order
        </button>
      </div>

    </div>
  );
}