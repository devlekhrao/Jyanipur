import React, { useState, useEffect } from 'react';
import { sendWhatsAppMessage } from './WhatsAppHelper';
import { getPurchaseOrders, savePurchaseOrder, toggleCancelPurchaseOrder } from './db';

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
    await savePOToState();
    alert(`Purchase Order ${poDetails.poNo} saved!`);
    handleClear(false);
    setCurrentView('list');
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

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-white/30 bg-white/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  const isReadOnly = currentView === 'view';

  if (currentView === 'list') {
    return (
      <div className="w-full font-['Poppins'] print:hidden">
        <div className="flex justify-between items-end pb-4 border-b border-zinc-300/50 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Purchase Orders</h2>
            <p className="text-zinc-600 text-xs mt-1 font-medium">Generate official material procurements requests.</p>
          </div>
          <button onClick={() => { handleClear(false); setCurrentView('form'); }} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-lg hover:-translate-y-0.5">
            + Create PO
          </button>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-50/50 text-zinc-400 text-[10px] uppercase tracking-[0.15em] border-b border-zinc-200/80">
                <th className="py-4 px-6 font-semibold">Date</th>
                <th className="py-4 px-6 font-semibold">PO No.</th>
                <th className="py-4 px-6 font-semibold">Vendor</th>
                <th className="py-4 px-6 font-semibold text-right">Total Amount</th>
                <th className="py-4 px-6 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-sm">
              {loading ? (
                <tr><td colSpan="5" className="py-12 text-center text-zinc-500 text-xs">Loading Purchase Orders...</td></tr>
              ) : poList.length === 0 ? (
                <tr><td colSpan="5" className="py-12 text-center text-zinc-500 text-xs">No POs created yet. Click "+ Create PO" above.</td></tr>
              ) : (
                poList.map((po) => (
                  <tr key={po.id} className={`transition-all ${po.isCancelled ? 'bg-red-50/20 opacity-60' : 'hover:bg-zinc-50'}`}>
                    <td className={`py-4 px-6 text-xs font-medium ${po.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-600'}`}>{po.date}</td>
                    <td className={`py-4 px-6 font-bold text-xs ${po.isCancelled ? 'line-through text-zinc-400' : 'text-[#1E3A8A]'}`}>{po.poNo}</td>
                    <td className={`py-4 px-6 text-xs font-semibold ${po.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>{po.vendorName}</td>
                    <td className={`py-4 px-6 text-right font-bold text-xs ${po.isCancelled ? 'line-through text-zinc-400' : 'text-emerald-600'}`}>{po.amount}</td>
                    <td className="py-4 px-6 text-center space-x-3">
                      {!po.isCancelled ? (
                        <>
                          <button onClick={() => handleEdit(po)} className="text-[#1E3A8A] hover:text-blue-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider">Edit</button>
                          <button onClick={() => handleView(po)} className="text-zinc-600 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider">View</button>
                          <button onClick={() => handleDirectPrint(po)} className="text-amber-600 hover:text-amber-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider">Print</button>
                          <button onClick={() => handleSendWhatsApp(po)} className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider">💬 WhatsApp</button>
                          <button onClick={() => handleToggleCancel(po)} className="text-red-500 hover:text-red-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleView(po)} className="text-zinc-500 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider">View</button>
                          <button onClick={() => handleToggleCancel(po)} className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider">Restore</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full font-['Poppins']">
      <div className="print:hidden pb-12">
        <div className="flex items-center justify-between border-b border-zinc-300/50 pb-4 mb-6">
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
            {isReadOnly ? `Viewing PO ${poDetails.poNo}` : editingId ? `Edit PO ${poDetails.poNo}` : 'Create Purchase Order'}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-600 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors cursor-pointer bg-white/40 px-4 py-2 rounded-xl shadow-sm border border-white/50">
              &larr; Back
            </button>
            {isReadOnly && (
              <>
                <button onClick={() => handleSendWhatsApp(poDetails)} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-1 cursor-pointer">
                  💬 WhatsApp
                </button>
                <button onClick={() => window.print()} className="bg-[#1E3A8A] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                  🖨️ Print / Save PDF
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-[2] min-w-[200px]">
            <label className={labelClass}>Vendor / Supplier Name <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={poDetails.vendorName} onChange={(e) => { setPoDetails({...poDetails, vendorName: e.target.value}); if(errors.vendorName) setErrors({...errors, vendorName: false}); }} className={`${inputClass} ${errors.vendorName ? 'ring-1 ring-red-400 bg-red-50/50' : ''}`} />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className={labelClass}>Vendor GSTIN</label>
            <input disabled={isReadOnly} type="text" value={poDetails.vendorGst} onChange={(e) => setPoDetails({...poDetails, vendorGst: e.target.value.toUpperCase()})} className={`${inputClass} uppercase`} maxLength={15} />
          </div>
          <div className="flex-[3] min-w-[250px]">
            <label className={labelClass}>Vendor Address</label>
            <input disabled={isReadOnly} type="text" value={poDetails.vendorAddress} onChange={(e) => setPoDetails({...poDetails, vendorAddress: e.target.value})} className={inputClass} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>PO No. <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={poDetails.poNo} onChange={(e) => { setPoDetails({...poDetails, poNo: e.target.value}); if(errors.poNo) setErrors({...errors, poNo: false}); }} className={`${inputClass} ${errors.poNo ? 'ring-1 ring-red-400 bg-red-50/50' : ''}`} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>PO Date</label>
            <input disabled={isReadOnly} type="date" value={poDetails.date} onChange={(e) => setPoDetails({...poDetails, date: e.target.value})} className={inputClass} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>Expected Delivery Date</label>
            <input disabled={isReadOnly} type="date" value={poDetails.expectedDelivery} onChange={(e) => setPoDetails({...poDetails, expectedDelivery: e.target.value})} className={inputClass} />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className={labelClass}>Project Name / Code</label>
            <input disabled={isReadOnly} type="text" value={poDetails.projectName} onChange={(e) => setPoDetails({...poDetails, projectName: e.target.value})} className={inputClass} placeholder="e.g. Kondapur Villa Project" />
          </div>
        </div>

        <div className="mb-4 overflow-x-auto bg-white/60 backdrop-blur-xl border border-zinc-200 rounded-3xl p-4 shadow-sm">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-zinc-500 text-[9px] uppercase tracking-widest border-b border-zinc-200">
                <th className="py-3 pr-4 font-bold">Item Description (Material)</th>
                <th className="py-3 px-2 font-bold w-20 text-center">UOM</th>
                <th className="py-3 px-2 font-bold w-20 text-center">Qty</th>
                <th className="py-3 px-2 font-bold w-28 text-right">Rate</th>
                <th className="py-3 px-2 font-bold w-32 text-right">Base Amt</th>
                <th className="py-3 px-2 font-bold w-24 text-center">Tax %</th>
                <th className="py-3 px-2 font-bold w-32 text-right">Total Amt</th>
                {!isReadOnly && <th className="py-3 pl-2 w-6"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => {
                const rowCalc = calculateRow(item);
                const tInp = "w-full border-b border-transparent hover:border-zinc-300 focus:border-[#1E3A8A] bg-transparent focus:outline-none py-1.5 px-1 text-xs transition-all font-medium text-zinc-900 placeholder-zinc-400 disabled:opacity-75";
                return (
                  <tr key={item.id} className="group hover:bg-zinc-50 transition-colors">
                    <td className="py-2 pr-4"><input disabled={isReadOnly} type="text" placeholder="e.g. 53 Grade Cement" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className={tInp} /></td>
                    <td className="py-2 px-2">
                      <select disabled={isReadOnly} value={item.uom} onChange={(e) => updateItem(item.id, 'uom', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer`}>
                        <option value="Nos">Nos</option><option value="Bags">Bags</option><option value="SqFt">SqFt</option><option value="Rft">Rft</option><option value="Cum">Cum</option><option value="Kgs">Kgs</option><option value="Ltrs">Ltrs</option><option value="Box">Box</option><option value="Roll">Roll</option><option value="LumpSum">LumpSum</option>
                      </select>
                    </td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} className={`${tInp} text-center`} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className={`${tInp} text-right`} /></td>
                    <td className="py-2 px-2 text-right text-xs font-semibold text-zinc-800">{rowCalc.baseAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-2">
                      <select disabled={isReadOnly} value={item.tax} onChange={(e) => updateItem(item.id, 'tax', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer`}>
                        <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                      </select>
                    </td>
                    <td className="py-2 px-2 text-right text-xs font-bold text-zinc-900">{rowCalc.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    {!isReadOnly && (
                      <td className="py-2 pl-2 text-center">
                        <button onClick={() => removeItem(item.id)} className="text-zinc-400 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-all cursor-pointer">&times;</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isReadOnly && (
            <button onClick={addItem} className="mt-4 px-4 py-2 bg-[#1E3A8A]/10 hover:bg-[#1E3A8A]/20 text-[#1E3A8A] text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer">
              + Add Material
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="flex-1 space-y-5">
            <div>
              <label className={labelClass}>Shipping / Delivery Address</label>
              <textarea disabled={isReadOnly} value={poDetails.shippingAddress} onChange={(e) => setPoDetails({...poDetails, shippingAddress: e.target.value})} className={`${inputClass} resize-y min-h-[50px] py-2`} rows="2"></textarea>
            </div>
            <div>
              <label className={labelClass}>Remarks / Internal Notes</label>
              <textarea disabled={isReadOnly} value={poDetails.description} onChange={(e) => setPoDetails({...poDetails, description: e.target.value})} className={`${inputClass} resize-y min-h-[40px] py-2`} rows="1"></textarea>
            </div>
            <div>
              <label className={labelClass}>Purchase Order Terms</label>
              <textarea disabled={isReadOnly} value={poDetails.terms} onChange={(e) => setPoDetails({...poDetails, terms: e.target.value})} className={`${inputClass} resize-none h-[120px] text-[11px] leading-relaxed`}></textarea>
            </div>
          </div>

          <div className="w-full lg:w-80 flex flex-col justify-between">
            <div className="bg-[#1E3A8A] p-6 rounded-[2rem] shadow-xl text-blue-100 border border-blue-900/50">
              <div className="flex justify-between text-xs px-1 mb-2"><span>Total Base:</span><span className="text-white font-medium">₹ {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-xs px-1 mb-2"><span>Total Tax:</span><span className="text-white font-medium">₹ {totals.totalTax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
              
              <div className="flex justify-between text-base font-extrabold text-white border-t-2 border-blue-400/30 pt-4 px-1 mt-4">
                <span>PO Total:</span><span>₹ {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveOnly} className="flex-1 py-3.5 bg-zinc-900 hover:bg-black text-white rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">Save Draft</button>
                <button onClick={handleSaveAndPrint} className="flex-[2] py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-[0_8px_16px_rgba(30,58,138,0.3)] cursor-pointer">Save & Generate PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

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
                <h1 className="text-xl font-black tracking-tight text-[#1E3A8A]">{companySettings?.companyName || 'Company Name'}</h1>
                <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-0.5 max-w-xs">{companySettings?.companyAddress}</p>
                <p className="text-[10px] text-zinc-800 mt-1 font-bold">
                  GSTIN: <span className="font-medium text-zinc-600 mr-2">{companySettings?.companyGst}</span> 
                  Phone: <span className="font-medium text-zinc-600">{companySettings?.companyPhone}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] block mb-1">Purchase Order</span>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{poDetails.poNo || 'PO-000'}</h2>
              <p className="text-[10px] font-bold text-zinc-800 mt-1">Date: <span className="font-medium text-zinc-600">{poDetails.date}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-6 pb-4 border-b border-zinc-200">
            <div>
              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1.5">To (Vendor / Supplier)</span>
              <h3 className="text-sm font-bold text-zinc-900 uppercase">{poDetails.vendorName || 'Vendor Name'}</h3>
              <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-1 leading-relaxed">{poDetails.vendorAddress}</p>
              {poDetails.vendorGst && <p className="text-[10px] text-zinc-800 font-bold mt-1.5">GSTIN: <span className="font-medium text-zinc-600">{poDetails.vendorGst.toUpperCase()}</span></p>}
            </div>
            <div className="text-right space-y-1">
              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1.5">Delivery Details</span>
              {poDetails.expectedDelivery && <p className="text-[10px] text-zinc-800 font-bold">Expected By: <span className="font-medium text-zinc-600">{poDetails.expectedDelivery}</span></p>}
              {poDetails.projectName && <p className="text-[10px] text-zinc-800 font-bold mt-2">Project: <span className="font-medium text-[#1E3A8A]">{poDetails.projectName}</span></p>}
              <p className="text-[10px] text-zinc-800 font-bold mt-2">Ship To:<br/><span className="font-medium text-zinc-600 whitespace-pre-wrap leading-tight block mt-0.5">{poDetails.shippingAddress}</span></p>
            </div>
          </div>

          <table className="w-full text-left border-collapse mb-6">
            <thead>
              <tr className="bg-[#1E3A8A] text-white text-[9px] uppercase tracking-wider">
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
                    <td className="py-3 px-2 text-center font-bold text-zinc-800">{parseFloat(item.qty).toLocaleString()}</td>
                    <td className="py-3 px-2 text-center text-zinc-600">{item.uom}</td>
                    <td className="py-3 px-2 text-right text-zinc-800">₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-2 text-center text-zinc-500">{item.tax}%</td>
                    <td className="py-3 px-3 text-right font-black text-zinc-900">₹{row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
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
              
              <div className="flex justify-between font-black text-white bg-[#1E3A8A] px-2 py-2 rounded mt-2 text-sm">
                <span>Grand Total:</span><span>₹{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-[10px] break-inside-avoid">
            <div className="space-y-4">
              {companySettings?.showTermsOnPdf !== false && (
                <div>
                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Terms & Conditions</span>
                  <p className="whitespace-pre-wrap text-zinc-500 leading-tight">{poDetails.terms}</p>
                </div>
              )}

              {companySettings?.showRemarksOnPdf !== false && poDetails.description && (
                <div>
                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Remarks / Notes</span>
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