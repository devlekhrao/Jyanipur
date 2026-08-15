import React, { useState, useEffect } from 'react';
import { getInvoices, saveInvoice, toggleCancelInvoice } from '../db';
import { sendWhatsAppMessage } from '../WhatsAppHelper';

const gstStateCodes = {
  '01': 'Jammu & Kashmir (01)', '02': 'Himachal Pradesh (02)', '03': 'Punjab (03)',
  '04': 'Chandigarh (04)', '05': 'Uttarakhand (05)', '06': 'Haryana (06)',
  '07': 'Delhi (07)', '08': 'Rajasthan (08)', '09': 'Uttar Pradesh (09)',
  '10': 'Bihar (10)', '11': 'Sikkim (11)', '12': 'Arunachal Pradesh (12)',
  '13': 'Nagaland (13)', '14': 'Manipur (14)', '15': 'Mizoram (15)',
  '16': 'Tripura (16)', '17': 'Meghalaya (17)', '18': 'Assam (18)',
  '19': 'West Bengal (19)', '20': 'Jharkhand (20)', '21': 'Odisha (21)',
  '22': 'Chhattisgarh (22)', '23': 'Madhya Pradesh (23)', '24': 'Gujarat (24)',
  '25': 'Daman & Diu (25)', '26': 'Dadra & Nagar Haveli (26)', '27': 'Maharashtra (27)',
  '28': 'Andhra Pradesh (Old) (28)', '29': 'Karnataka (29)', '30': 'Goa (30)',
  '31': 'Lakshadweep (31)', '32': 'Kerala (32)', '33': 'Tamil Nadu (33)',
  '34': 'Puducherry (34)', '35': 'Andaman & Nicobar Islands (35)', '36': 'Telangana (36)',
  '37': 'Andhra Pradesh (37)', '38': 'Ladakh (38)'
};

export default function MobileTaxInvoice({ companySettings = {}, updateDirtyState }) {
  const [currentView, setCurrentView] = useState(() => localStorage.getItem('draft_invoiceView') || 'list');
  
  const [editingId, setEditingId] = useState(() => {
    const saved = localStorage.getItem('draft_editingId');
    return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);
  const [invoiceList, setInvoiceList] = useState([]);
  
  const [taxMode, setTaxMode] = useState(() => localStorage.getItem('draft_taxMode') || 'CGST_SGST');

  const [invoiceDetails, setInvoiceDetails] = useState(() => {
    const saved = localStorage.getItem('draft_invoiceDetails');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      partyName: '', partyAddress: '', gstNo: '', placeOfSupply: 'Telangana (36)',
      date: new Date().toISOString().split('T')[0], 
      invoiceNo: companySettings.invoicePrefix || '', 
      poNumber: '', poDate: '', description: '', 
      terms: companySettings.defaultInvoiceTerms || '', 
      bankName: companySettings.bankName || '', accountName: companySettings.accountName || '', 
      accountNo: companySettings.accountNo || '', ifscCode: companySettings.ifscCode || '', advanceReceived: '', discount: ''
    };
  });

  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('draft_items');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [{ id: 1, description: '', hsn: companySettings.defaultHsnSac || '', sizeL: '', sizeB: '', no: '', rate: '', gst: companySettings.defaultGstRate || 18 }];
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    localStorage.setItem('draft_invoiceView', currentView);
    localStorage.setItem('draft_editingId', JSON.stringify(editingId));
    localStorage.setItem('draft_taxMode', taxMode);
    localStorage.setItem('draft_invoiceDetails', JSON.stringify(invoiceDetails));
    localStorage.setItem('draft_items', JSON.stringify(items));
  }, [currentView, editingId, taxMode, invoiceDetails, items]);

  useEffect(() => {
    if (updateDirtyState) {
      if (currentView === 'form') {
        const isDirty = invoiceDetails.partyName !== '' || 
                        (invoiceDetails.invoiceNo !== '' && invoiceDetails.invoiceNo !== companySettings.invoicePrefix) || 
                        items.length > 1 || 
                        items[0].description !== '';
        updateDirtyState('TaxInvoice', isDirty);
      } else {
        updateDirtyState('TaxInvoice', false);
      }
    }
  }, [currentView, invoiceDetails, items, updateDirtyState, companySettings.invoicePrefix]);

  const loadInvoicesFromDb = async () => {
    setLoading(true);
    try {
      const data = await getInvoices();
      setInvoiceList(data || []);
    } catch (e) {
      console.warn("Ensure getInvoices is implemented in db.js");
      setInvoiceList([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadInvoicesFromDb(); }, []);

  useEffect(() => {
    if (!editingId && currentView === 'form') {
      setInvoiceDetails(prev => ({
        ...prev,
        bankName: companySettings.bankName || prev.bankName,
        accountName: companySettings.accountName || prev.accountName,
        accountNo: companySettings.accountNo || prev.accountNo,
        ifscCode: companySettings.ifscCode || prev.ifscCode,
        invoiceNo: prev.invoiceNo === '' ? (companySettings.invoicePrefix || '') : prev.invoiceNo,
        terms: prev.terms === '' ? (companySettings.defaultInvoiceTerms || '') : prev.terms
      }));
    }
  }, [companySettings, editingId, currentView]);

  useEffect(() => {
    const clientStateCode = invoiceDetails.gstNo.trim().substring(0, 2);
    if (clientStateCode.length === 2 && !isNaN(clientStateCode)) {
      const detectedState = gstStateCodes[clientStateCode] || `State Code (${clientStateCode})`;
      
      if (clientStateCode === '36') {
        setTaxMode('CGST_SGST');
      } else {
        setTaxMode('IGST');
      }

      setInvoiceDetails(prev => {
        if (prev.placeOfSupply !== detectedState) {
          return { ...prev, placeOfSupply: detectedState };
        }
        return prev;
      });
    }
  }, [invoiceDetails.gstNo]);

  const addItem = () => setItems([...items, { 
    id: Date.now(), 
    description: '', 
    hsn: companySettings.defaultHsnSac || '', 
    sizeL: '', sizeB: '', no: '', rate: '', 
    gst: companySettings.defaultGstRate || 18 
  }]);
  
  const updateItem = (id, field, value) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const calculateRow = (item) => {
    const l = parseFloat(item.sizeL) || 1;
    const b = parseFloat(item.sizeB) || 1;
    const no = parseFloat(item.no) || 0;
    const rate = parseFloat(item.rate) || 0;
    const gstRate = parseFloat(item.gst) || 0;
    
    const quantity = (item.sizeL !== '' || item.sizeB !== '') ? (l * b * no) : no;
    const baseAmount = quantity * rate;
    const gstAmount = (baseAmount * gstRate) / 100;
    return { quantity, baseAmount, gstAmount, totalAmount: baseAmount + gstAmount };
  };

  const totals = items.reduce((acc, item) => {
    const rowCalc = calculateRow(item);
    return { subtotal: acc.subtotal + rowCalc.baseAmount, totalGst: acc.totalGst + rowCalc.gstAmount, grandTotal: acc.grandTotal + rowCalc.totalAmount };
  }, { subtotal: 0, totalGst: 0, grandTotal: 0 });

  const netPayable = totals.grandTotal - (parseFloat(invoiceDetails.discount) || 0) - (parseFloat(invoiceDetails.advanceReceived) || 0);

  const saveInvoiceToState = async () => {
    const newErrors = {};
    if (!invoiceDetails.partyName) newErrors.partyName = true;
    if (!invoiceDetails.invoiceNo) newErrors.invoiceNo = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Fill required fields: Party Name & Invoice No.');
      return false;
    }

    setErrors({});
    const record = {
      partyName: invoiceDetails.partyName,
      invoiceNo: invoiceDetails.invoiceNo,
      date: invoiceDetails.date,
      partyAddress: invoiceDetails.partyAddress,
      gstNo: invoiceDetails.gstNo,
      placeOfSupply: invoiceDetails.placeOfSupply,
      poNumber: invoiceDetails.poNumber,
      poDate: invoiceDetails.poDate,
      taxMode: taxMode,
      items: items,
      bankName: invoiceDetails.bankName,
      accountName: invoiceDetails.accountName,
      accountNo: invoiceDetails.accountNo,
      ifscCode: invoiceDetails.ifscCode,
      terms: invoiceDetails.terms,
      description: invoiceDetails.description,
      discount: invoiceDetails.discount,
      advanceReceived: invoiceDetails.advanceReceived,
      amount: '₹ ' + (netPayable > 0 ? netPayable : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };

    try {
      await saveInvoice(record);
      await loadInvoicesFromDb();
      return true;
    } catch (err) {
      alert('Failed to save to Database. Check connection.');
      return false;
    }
  };

  const handleSaveOnly = async () => {
    if (await saveInvoiceToState()) {
      alert(`Invoice ${invoiceDetails.invoiceNo} saved!`);
      handleClear(false);
      setCurrentView('list');
    }
  };

  const handleEdit = (inv) => {
    setEditingId(inv.id);
    setTaxMode(inv.taxMode || 'CGST_SGST');
    setInvoiceDetails({
      partyName: inv.client || '',
      partyAddress: inv.partyAddress || '',
      gstNo: inv.gstNo || '',
      placeOfSupply: inv.placeOfSupply || 'Telangana (36)',
      date: inv.date || new Date().toISOString().split('T')[0],
      invoiceNo: inv.invoiceNo || '',
      poNumber: inv.poNumber || '',
      poDate: inv.poDate || '',
      description: inv.description || '',
      terms: inv.terms || '',
      bankName: inv.bankName || companySettings.bankName || '',
      accountName: inv.accountName || companySettings.accountName || '',
      accountNo: inv.accountNo || companySettings.accountNo || '',
      ifscCode: inv.ifscCode || companySettings.ifscCode || '',
      advanceReceived: inv.advanceReceived || '',
      discount: inv.discount || ''
    });
    setItems(inv.items && inv.items.length > 0 ? inv.items : [{ id: 1, description: '', hsn: companySettings.defaultHsnSac || '', sizeL: '', sizeB: '', no: '', rate: '', gst: companySettings.defaultGstRate || 18 }]);
    setCurrentView('form');
  };

  const handleSendWhatsApp = (inv) => {
    const template = companySettings.waInvoiceTemplate || 'Hello! Attached is your latest invoice.';
    const finalMessage = `${template}\n\n*Invoice No:* ${inv.invoiceNo || 'INV'}\n*Amount:* ${inv.amount || '0'}\n*Company:* ${companySettings.companyName || 'Jyanipur Interiors'}`;
    sendWhatsAppMessage(inv.phone || '', finalMessage);
  };

  const handleToggleCancel = async (inv) => {
    await toggleCancelInvoice(inv.id, inv.isCancelled);
    await loadInvoicesFromDb();
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the entire invoice?')) {
      setEditingId(null);
      setInvoiceDetails({ 
        partyName: '', partyAddress: '', gstNo: '', placeOfSupply: 'Telangana (36)', date: new Date().toISOString().split('T')[0], 
        invoiceNo: companySettings.invoicePrefix || '', 
        poNumber: '', poDate: '', description: '', 
        terms: companySettings.defaultInvoiceTerms || '', 
        bankName: companySettings.bankName || '', accountName: companySettings.accountName || '', accountNo: companySettings.accountNo || '', ifscCode: companySettings.ifscCode || '', advanceReceived: '', discount: '' 
      });
      setItems([{ id: 1, description: '', hsn: companySettings.defaultHsnSac || '', sizeL: '', sizeB: '', no: '', rate: '', gst: companySettings.defaultGstRate || 18 }]);
      setErrors({});
      
      localStorage.removeItem('draft_invoiceDetails');
      localStorage.removeItem('draft_items');
      localStorage.removeItem('draft_taxMode');
      localStorage.removeItem('draft_editingId');
      if (updateDirtyState) updateDirtyState('TaxInvoice', false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  // LIST VIEW
  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col font-['Poppins']">
        
        {/* HEADER SECTION */}
        <div className="mb-3 shrink-0">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Tax Invoices</h2>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Sales & Billing Ledger</p>
            </div>
            <button 
              onClick={() => { handleClear(false); setCurrentView('form'); }}
              className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-black px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              + Create Invoice
            </button>
          </div>
        </div>

        {/* INVOICE STREAM CARDS */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {loading ? (
            <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading tax invoices...</div>
          ) : invoiceList.length === 0 ? (
            <div className="text-center py-12 bg-white border border-zinc-200 border-dashed rounded-3xl">
              <span className="text-3xl mb-2 block">📄</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No tax invoices generated yet.</p>
            </div>
          ) : (
            invoiceList.map((inv) => (
              <div 
                key={inv.id} 
                className={`bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 ${inv.isCancelled ? 'opacity-60 bg-zinc-50' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#1E3A8A] text-sm">{inv.invoiceNo}</span>
                      {inv.isCancelled && (
                        <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded uppercase">Cancelled</span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-zinc-900 text-sm mt-0.5">{inv.client}</h4>
                    {inv.gstNo && <p className="text-[9px] font-mono text-zinc-400">GST: {inv.gstNo}</p>}
                  </div>
                  <p className="text-base font-black text-emerald-600">{inv.amount}</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{inv.date}</span>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleSendWhatsApp(inv)}
                      className="bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform"
                    >
                      💬 WA
                    </button>
                    <button 
                      onClick={() => handleEdit(inv)} 
                      className="bg-blue-50 text-[#1E3A8A] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform"
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
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER BAR */}
      <div className="mb-3 shrink-0 flex justify-between items-center border-b border-zinc-100 pb-2">
        <div>
          <h2 className="text-xl font-extrabold text-zinc-900">
            {editingId ? `Edit ${invoiceDetails.invoiceNo}` : 'New Tax Invoice'}
          </h2>
          <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Client Sales Bill</p>
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
        
        {/* CLIENT & GST DETAILS SHEET */}
        <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">1. Billed To & GST Info</h3>

          <div>
            <label className={labelClass}>Client / Party Name <span className="text-red-500">*</span></label>
            <input type="text" value={invoiceDetails.partyName} onChange={(e) => setInvoiceDetails({...invoiceDetails, partyName: e.target.value})} placeholder="e.g. TechCorp Inc." className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Client GSTIN</label>
            <input type="text" value={invoiceDetails.gstNo} onChange={(e) => setInvoiceDetails({...invoiceDetails, gstNo: e.target.value.toUpperCase()})} placeholder="36OEYPS..." maxLength={15} className={`${inputClass} uppercase font-mono`} />
          </div>

          <div>
            <label className={labelClass}>Party Billing Address</label>
            <textarea placeholder="Full address..." value={invoiceDetails.partyAddress} onChange={(e) => setInvoiceDetails({...invoiceDetails, partyAddress: e.target.value})} className={`${inputClass} min-h-[70px] resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Invoice No <span className="text-red-500">*</span></label>
              <input type="text" value={invoiceDetails.invoiceNo} onChange={(e) => setInvoiceDetails({...invoiceDetails, invoiceNo: e.target.value})} placeholder="INV-001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Invoice Date</label>
              <input type="date" value={invoiceDetails.date} onChange={(e) => setInvoiceDetails({...invoiceDetails, date: e.target.value})} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tax Mode</label>
              <select value={taxMode} onChange={(e) => setTaxMode(e.target.value)} className={inputClass}>
                <option value="CGST_SGST">CGST + SGST (In State)</option>
                <option value="IGST">IGST (Out of State)</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Place of Supply</label>
              <input type="text" value={invoiceDetails.placeOfSupply} onChange={(e) => setInvoiceDetails({...invoiceDetails, placeOfSupply: e.target.value})} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>PO Number</label>
              <input type="text" value={invoiceDetails.poNumber} onChange={(e) => setInvoiceDetails({...invoiceDetails, poNumber: e.target.value})} placeholder="Ref PO" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>PO Date</label>
              <input type="date" value={invoiceDetails.poDate} onChange={(e) => setInvoiceDetails({...invoiceDetails, poDate: e.target.value})} className={inputClass} />
            </div>
          </div>
        </div>

        {/* LINE ITEMS SECTION */}
        <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-1">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">2. Bill Line Items</h3>
            <button onClick={addItem} className="text-[10px] font-black text-[#1E3A8A] bg-blue-50 px-2.5 py-1 rounded-lg uppercase">+ Add Row</button>
          </div>

          {items.map((item, index) => {
            const rowCalc = calculateRow(item);
            return (
              <div key={item.id} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 space-y-3 relative">
                <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 text-zinc-300 hover:text-red-500 font-bold text-xs">✕</button>

                <span className="text-[9px] font-black text-zinc-400 uppercase">Item #{index + 1}</span>

                <div>
                  <label className={labelClass}>Item Description</label>
                  <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="e.g. Interior Woodwork Execution" className={inputClass} />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className={labelClass}>HSN/SAC</label>
                    <input type="text" value={item.hsn} onChange={(e) => updateItem(item.id, 'hsn', e.target.value)} placeholder="9954" className={`${inputClass} font-mono`} />
                  </div>
                  <div>
                    <label className={labelClass}>L</label>
                    <input type="number" inputMode="decimal" value={item.sizeL} onChange={(e) => updateItem(item.id, 'sizeL', e.target.value)} placeholder="1" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>B</label>
                    <input type="number" inputMode="decimal" value={item.sizeB} onChange={(e) => updateItem(item.id, 'sizeB', e.target.value)} placeholder="1" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>No.</label>
                    <input type="number" inputMode="decimal" value={item.no} onChange={(e) => updateItem(item.id, 'no', e.target.value)} placeholder="1" className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>Rate (₹)</label>
                    <input type="number" inputMode="decimal" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} placeholder="0.00" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>GST %</label>
                    <select value={item.gst} onChange={(e) => updateItem(item.id, 'gst', e.target.value)} className={inputClass}>
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Total (₹)</label>
                    <div className="h-[46px] bg-zinc-200/60 rounded-xl px-2 flex items-center font-black text-zinc-900 text-xs">
                      ₹ {rowCalc.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* SUMMARY KPI CARD */}
        <div className="bg-zinc-900 text-white p-5 rounded-[1.5rem] shadow-md space-y-3">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Taxable Basic Total:</span>
            <span className="text-white font-bold">₹ {totals.subtotal.toLocaleString('en-IN')}</span>
          </div>

          {taxMode === 'IGST' ? (
            <div className="flex justify-between text-xs text-zinc-400">
              <span>IGST Total:</span>
              <span className="text-white font-bold">₹ {totals.totalGst.toLocaleString('en-IN')}</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>CGST:</span>
                <span className="text-white font-bold">₹ {(totals.totalGst / 2).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST:</span>
                <span className="text-white font-bold">₹ {(totals.totalGst / 2).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
            <div>
              <label className={labelClass}>Discount (₹)</label>
              <input type="number" inputMode="decimal" value={invoiceDetails.discount} onChange={(e) => setInvoiceDetails({...invoiceDetails, discount: e.target.value})} placeholder="0" className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2 text-xs outline-none" />
            </div>
            <div>
              <label className={labelClass}>Advance Recv (₹)</label>
              <input type="number" inputMode="decimal" value={invoiceDetails.advanceReceived} onChange={(e) => setInvoiceDetails({...invoiceDetails, advanceReceived: e.target.value})} placeholder="0" className="w-full bg-zinc-800 text-white rounded-xl px-3 py-2 text-xs outline-none" />
            </div>
          </div>

          <div className="flex justify-between text-base font-black text-emerald-400 pt-2 border-t border-zinc-800">
            <span>Balance Due:</span>
            <span>₹ {netPayable > 0 ? netPayable.toLocaleString('en-IN') : 0}</span>
          </div>
        </div>

      </div>

      {/* FIXED BOTTOM SAVE BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(env(safe-area-inset-bottom,20px)+12px)] bg-white border-t border-zinc-200 shadow-lg">
        <button 
          onClick={handleSaveOnly}
          className="w-full py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
        >
          Save Tax Invoice
        </button>
      </div>

    </div>
  );
}