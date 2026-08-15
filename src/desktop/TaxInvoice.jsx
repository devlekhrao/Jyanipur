import React, { useState, useEffect } from 'react';
import { getInvoices, saveInvoice, toggleCancelInvoice } from '../db';
import { sendWhatsAppMessage } from '../WhatsAppHelper';

// Helper function to convert number to Indian Currency Words
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
  if (decimalPart > 0) {
    result += 'and ' + inWords(decimalPart) + 'Paise ';
  }
  return result.trim() + ' Only';
}

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

export default function TaxInvoice({ companySettings = {}, updateDirtyState }) {
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

  const handleSaveAndPrint = async () => {
    if (await saveInvoiceToState()) {
      setTimeout(() => window.print(), 100);
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

  const handleView = (inv) => {
    handleEdit(inv);
    setCurrentView('view');
  };

  const handleDirectPrint = (inv) => {
    handleEdit(inv);
    setTimeout(() => window.print(), 150);
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

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  if (currentView === 'list') {
    return (
      <div className="w-full h-full font-['Poppins'] flex flex-col print:hidden">
        <div className="flex justify-between items-end pb-4 border-b border-zinc-200 mb-6 shrink-0">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Tax Invoices</h2>
            <p className="text-zinc-500 text-xs mt-1 font-medium">Manage and track your issued invoices.</p>
          </div>
          <button 
            onClick={() => { handleClear(false); setCurrentView('form'); }}
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
          >
            + Create Invoice
          </button>
        </div>

        <div className="bg-white border border-zinc-200 rounded-[2rem] shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50/50 text-zinc-400 text-[10px] uppercase tracking-[0.15em] border-b border-zinc-100">
                  <th className="py-4 px-6 font-semibold">Date</th>
                  <th className="py-4 px-6 font-semibold">Inv No.</th>
                  <th className="py-4 px-6 font-semibold">Client / Party</th>
                  <th className="py-4 px-6 font-semibold text-right">Total Amount</th>
                  <th className="py-4 px-6 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {loading ? (
                  <tr><td colSpan="5" className="py-12 text-center text-zinc-400 font-medium text-xs">Loading invoices...</td></tr>
                ) : invoiceList.length === 0 ? (
                  <tr><td colSpan="5" className="py-12 text-center text-zinc-400 font-medium text-xs">No invoices created yet. Click "+ Create Invoice" above.</td></tr>
                ) : (
                  invoiceList.map((inv) => (
                    <tr key={inv.id} className={`transition-all ${inv.isCancelled ? 'bg-red-50/20 opacity-60' : 'hover:bg-zinc-50'}`}>
                      <td className={`py-4 px-6 text-xs font-medium ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-600'}`}>{inv.date}</td>
                      <td className={`py-4 px-6 font-extrabold text-xs ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-[#1E3A8A]'}`}>
                        {inv.invoiceNo}
                        {inv.isCancelled && <span className="ml-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-widest inline-block">Cancelled</span>}
                      </td>
                      <td className={`py-4 px-6 text-xs font-semibold ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>{inv.client}</td>
                      <td className={`py-4 px-6 text-right font-black text-xs ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-emerald-600'}`}>{inv.amount}</td>
                      <td className="py-4 px-6 text-center space-x-3">
                        {!inv.isCancelled ? (
                          <>
                            <button onClick={() => handleEdit(inv)} className="text-[#1E3A8A] hover:text-blue-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider">Edit</button>
                            <button onClick={() => handleView(inv)} className="text-zinc-600 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider">View</button>
                            <button onClick={() => handleDirectPrint(inv)} className="text-amber-600 hover:text-amber-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider">Print</button>
                            <button onClick={() => handleSendWhatsApp(inv)} className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider">💬 WhatsApp</button>
                            <button onClick={() => handleToggleCancel(inv)} className="text-red-500 hover:text-red-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleView(inv)} className="text-zinc-500 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider">View</button>
                            <button onClick={() => handleToggleCancel(inv)} className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider">Restore</button>
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
      </div>
    );
  }

  const isReadOnly = currentView === 'view';

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* INTERACTIVE UI (Hidden on Print) */}
      <div className="print:hidden flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6 shrink-0">
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
            {isReadOnly ? `Viewing Invoice ${invoiceDetails.invoiceNo}` : editingId ? `Edit Invoice ${invoiceDetails.invoiceNo}` : 'Create New Invoice'}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-600 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl shadow-sm border border-zinc-200">
              &larr; Back
            </button>
            {isReadOnly && (
              <>
                <button 
                  onClick={() => {
                    const template = companySettings.waInvoiceTemplate || 'Hello! Attached is your latest invoice.';
                    const msg = `${template}\n\n*Invoice No:* ${invoiceDetails.invoiceNo || 'INV'}\n*Amount:* ₹ ${(netPayable > 0 ? netPayable : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n*Company:* ${companySettings.companyName || 'Jyanipur Interiors'}`;
                    sendWhatsAppMessage('', msg);
                  }} 
                  className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:bg-emerald-500 transition-all flex items-center gap-1 cursor-pointer"
                >
                  💬 WhatsApp
                </button>
                <button onClick={() => window.print()} className="bg-[#1E3A8A] text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:bg-blue-900 transition-all cursor-pointer">
                  🖨️ Print / Save PDF
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-4 shrink-0">
          <div className="flex-1 min-w-[150px]">
            <label className={labelClass}>GST No.</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.gstNo} onChange={(e) => setInvoiceDetails({...invoiceDetails, gstNo: e.target.value.toUpperCase()})} className={`${inputClass} uppercase`} maxLength={15} />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className={labelClass}>Party Name <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.partyName} onChange={(e) => { setInvoiceDetails({...invoiceDetails, partyName: e.target.value}); if(errors.partyName) setErrors({...errors, partyName: false}); }} className={`${inputClass} ${errors.partyName ? 'ring-1 ring-red-400 bg-red-50' : ''}`} />
          </div>
          <div className="flex-[3] min-w-[250px]">
            <label className={labelClass}>Party Address</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.partyAddress} onChange={(e) => setInvoiceDetails({...invoiceDetails, partyAddress: e.target.value})} className={inputClass} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-8 shrink-0">
          <div className="flex-1 min-w-[100px]">
            <label className={labelClass}>Inv No. <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.invoiceNo} onChange={(e) => { setInvoiceDetails({...invoiceDetails, invoiceNo: e.target.value}); if(errors.invoiceNo) setErrors({...errors, invoiceNo: false}); }} className={`${inputClass} ${errors.invoiceNo ? 'ring-1 ring-red-400 bg-red-50' : ''}`} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>Inv Date</label>
            <input disabled={isReadOnly} type="date" value={invoiceDetails.date} onChange={(e) => setInvoiceDetails({...invoiceDetails, date: e.target.value})} className={inputClass} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className={labelClass}>Tax Calculation Type</label>
            <select disabled={isReadOnly} value={taxMode} onChange={(e) => setTaxMode(e.target.value)} className={`${inputClass} cursor-pointer font-bold text-zinc-900 bg-amber-50/50 border-amber-200`}>
              <option value="CGST_SGST">CGST + SGST (In State)</option>
              <option value="IGST">IGST (Out of State)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className={labelClass}>Place of Supply</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.placeOfSupply} onChange={(e) => setInvoiceDetails({...invoiceDetails, placeOfSupply: e.target.value})} className={inputClass} />
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className={labelClass}>PO No.</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.poNumber} onChange={(e) => setInvoiceDetails({...invoiceDetails, poNumber: e.target.value})} className={inputClass} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>PO Date</label>
            <input disabled={isReadOnly} type="date" value={invoiceDetails.poDate} onChange={(e) => setInvoiceDetails({...invoiceDetails, poDate: e.target.value})} className={inputClass} />
          </div>
        </div>

        <div className="mb-6 overflow-x-auto bg-white border border-zinc-200 rounded-[2rem] p-5 shadow-sm shrink-0">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-100">
                <th className="py-3 pr-4 font-bold">Description</th>
                <th className="py-3 px-2 font-bold w-16 text-center">HSN</th>
                <th className="py-3 px-2 font-bold w-16 text-center">L</th>
                <th className="py-3 px-2 font-bold w-16 text-center">B</th>
                <th className="py-3 px-2 font-bold w-16 text-center">NO</th>
                <th className="py-3 px-2 font-bold w-24 text-right">Rate</th>
                <th className="py-3 px-2 font-bold w-28 text-right">Amount</th>
                <th className="py-3 px-2 font-bold w-20 text-center">GST %</th>
                <th className="py-3 px-2 font-bold w-28 text-right">Total</th>
                {!isReadOnly && <th className="py-3 pl-2 w-6"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => {
                const rowCalc = calculateRow(item);
                const tInp = "w-full border-b border-transparent hover:border-zinc-300 focus:border-[#1E3A8A] bg-transparent focus:outline-none py-1.5 px-1 text-xs transition-all font-medium text-zinc-900 placeholder-zinc-400 disabled:opacity-75";
                return (
                  <tr key={item.id} className="group hover:bg-zinc-50 transition-colors">
                    <td className="py-2 pr-4"><input disabled={isReadOnly} type="text" placeholder="Item description" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className={tInp} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="text" value={item.hsn} onChange={(e) => updateItem(item.id, 'hsn', e.target.value)} className={`${tInp} text-center`} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.sizeL} onChange={(e) => updateItem(item.id, 'sizeL', e.target.value)} className={`${tInp} text-center`} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.sizeB} onChange={(e) => updateItem(item.id, 'sizeB', e.target.value)} className={`${tInp} text-center`} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.no} onChange={(e) => updateItem(item.id, 'no', e.target.value)} className={`${tInp} text-center`} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className={`${tInp} text-right`} /></td>
                    <td className="py-2 px-2 text-right text-xs font-semibold text-zinc-800">{rowCalc.baseAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-2">
                      <select disabled={isReadOnly} value={item.gst} onChange={(e) => updateItem(item.id, 'gst', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer`}>
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
            <button onClick={addItem} className="mt-4 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer">
              + Add Row
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0">
          <div className="flex-1 space-y-5">
            <div>
              <label className={labelClass}>Remarks</label>
              <textarea disabled={isReadOnly} value={invoiceDetails.description} onChange={(e) => setInvoiceDetails({...invoiceDetails, description: e.target.value})} className={`${inputClass} resize-y min-h-[40px] py-2`} rows="1"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm">
                <h3 className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest mb-3">Bank Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center border-b border-zinc-100 pb-1"><span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">Bank:</span><input disabled={isReadOnly} type="text" value={invoiceDetails.bankName} onChange={(e) => setInvoiceDetails({...invoiceDetails, bankName: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" /></div>
                  <div className="flex items-center border-b border-zinc-100 pb-1"><span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">Name:</span><input disabled={isReadOnly} type="text" value={invoiceDetails.accountName} onChange={(e) => setInvoiceDetails({...invoiceDetails, accountName: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" /></div>
                  <div className="flex items-center border-b border-zinc-100 pb-1"><span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">A/C No:</span><input disabled={isReadOnly} type="text" value={invoiceDetails.accountNo} onChange={(e) => setInvoiceDetails({...invoiceDetails, accountNo: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" /></div>
                  <div className="flex items-center border-b border-zinc-100 pb-1"><span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">IFSC:</span><input disabled={isReadOnly} type="text" value={invoiceDetails.ifscCode} onChange={(e) => setInvoiceDetails({...invoiceDetails, ifscCode: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" /></div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Terms</label>
                <textarea disabled={isReadOnly} value={invoiceDetails.terms} onChange={(e) => setInvoiceDetails({...invoiceDetails, terms: e.target.value})} className={`${inputClass} resize-none h-[140px] text-[11px] leading-relaxed`}></textarea>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-80 flex flex-col justify-between">
            <div className="bg-zinc-900 p-6 rounded-[2rem] shadow-xl text-zinc-300 border border-zinc-800">
              <div className="flex justify-between text-xs px-1 mb-2"><span>Basic:</span><span className="text-white font-medium">₹ {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
              {taxMode === 'IGST' ? (
                <div className="flex justify-between text-xs px-1 mb-2"><span>IGST:</span><span className="text-white font-medium">₹ {totals.totalGst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
              ) : (
                <>
                  <div className="flex justify-between text-xs px-1 mb-2"><span>CGST:</span><span className="text-white font-medium">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-xs px-1 mb-2"><span>SGST:</span><span className="text-white font-medium">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                </>
              )}
              <div className="flex justify-between text-sm font-bold text-white border-t border-zinc-700/50 pt-3 px-1 mt-2">
                <span>Total:</span><span>₹ {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-zinc-700/50 pt-4 space-y-3 mt-3">
                <div className="flex justify-between items-center text-xs px-1">
                  <span>Discount:</span><input disabled={isReadOnly} type="number" value={invoiceDetails.discount} onChange={(e) => setInvoiceDetails({...invoiceDetails, discount: e.target.value})} placeholder="0" className="w-24 bg-zinc-800/80 text-white rounded-lg px-2 py-1.5 text-right outline-none focus:ring-1 focus:ring-zinc-500 border border-zinc-700 disabled:opacity-50" />
                </div>
                <div className="flex justify-between items-center text-xs px-1">
                  <span>Advance:</span><input disabled={isReadOnly} type="number" value={invoiceDetails.advanceReceived} onChange={(e) => setInvoiceDetails({...invoiceDetails, advanceReceived: e.target.value})} placeholder="0" className="w-24 bg-zinc-800/80 text-white rounded-lg px-2 py-1.5 text-right outline-none focus:ring-1 focus:ring-zinc-500 border border-zinc-700 disabled:opacity-50" />
                </div>
              </div>
              <div className="flex justify-between text-base font-extrabold text-emerald-400 border-t-2 border-zinc-600 pt-4 px-1 mt-4">
                <span>Due:</span><span>₹ {netPayable > 0 ? netPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 0}</span>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveOnly} className="flex-1 py-3.5 bg-zinc-900 hover:bg-black text-white rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">Save</button>
                <button onClick={handleSaveAndPrint} className="flex-[2] py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-900 rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all shadow-[0_8px_16px_rgba(16,185,129,0.2)] cursor-pointer">Save & Print PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PERFECT A4 PDF DOCUMENT (Hidden on screen) */}
      <div className="hidden print:block w-full bg-white text-zinc-900 font-['Poppins'] text-[11px] leading-tight print:p-0 print:m-0">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img { mix-blend-mode: multiply !important; }
          }
        `}} />

        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-5 mb-5">
            <div className="flex items-center gap-4">
              {companySettings?.logoUrl && <img src={companySettings.logoUrl} className="h-14 w-auto object-contain shrink-0" alt="Logo" />}
              <div>
                <h1 className="text-xl font-black tracking-tight text-zinc-900">{companySettings?.companyName || 'Company Name'}</h1>
                <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-0.5 max-w-xs">{companySettings?.companyAddress}</p>
                <p className="text-[10px] text-zinc-800 mt-1 font-bold">
                  GSTIN: <span className="font-medium text-zinc-600 mr-2">{companySettings?.companyGst}</span> 
                  Phone: <span className="font-medium text-zinc-600">{companySettings?.companyPhone}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] block mb-1">Tax Invoice</span>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{invoiceDetails.invoiceNo || 'INV-000'}</h2>
              <p className="text-[10px] font-bold text-zinc-800 mt-1">Date: <span className="font-medium text-zinc-600">{invoiceDetails.date}</span></p>
            </div>
          </div>

          {/* Client & Reference Info */}
          <div className="grid grid-cols-2 gap-8 mb-6 pb-4 border-b border-zinc-200">
            <div>
              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1.5">Billed To</span>
              <h3 className="text-sm font-bold text-zinc-900 uppercase">{invoiceDetails.partyName || 'Client Name'}</h3>
              <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-1 leading-relaxed">{invoiceDetails.partyAddress}</p>
              {invoiceDetails.gstNo && <p className="text-[10px] text-zinc-800 font-bold mt-1.5">GSTIN: <span className="font-medium text-zinc-600">{invoiceDetails.gstNo.toUpperCase()}</span></p>}
            </div>
            <div className="text-right space-y-1">
              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1.5">Reference Info</span>
              {invoiceDetails.poNumber && <p className="text-[10px] text-zinc-800 font-bold">PO Number: <span className="font-medium text-zinc-600">{invoiceDetails.poNumber}</span></p>}
              {invoiceDetails.poDate && <p className="text-[10px] text-zinc-800 font-bold">PO Date: <span className="font-medium text-zinc-600">{invoiceDetails.poDate}</span></p>}
              <p className="text-[10px] text-zinc-800 font-bold">Place of Supply: <span className="font-medium text-zinc-600">{invoiceDetails.placeOfSupply}</span></p>
            </div>
          </div>

          {/* Itemized Table */}
          <table className="w-full text-left border-collapse mb-6">
            <thead>
              <tr className="bg-zinc-800 text-white text-[9px] uppercase tracking-wider">
                <th className="py-2.5 px-2 font-bold text-center w-8 rounded-tl-md">#</th>
                <th className="py-2.5 px-3 font-bold">Item Description</th>
                <th className="py-2.5 px-2 font-bold text-center w-12">HSN</th>
                <th className="py-2.5 px-2 font-bold text-center w-16">L x B</th>
                <th className="py-2.5 px-2 font-bold text-center w-10">No</th>
                <th className="py-2.5 px-2 font-bold text-center w-12">Qty</th>
                <th className="py-2.5 px-2 font-bold text-right w-20">Rate</th>
                <th className="py-2.5 px-2 font-bold text-center w-12">Tax</th>
                <th className="py-2.5 px-3 font-bold text-right w-24 rounded-tr-md">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-[10px]">
              {items.map((item, index) => {
                const row = calculateRow(item);
                if (!item.description) return null;
                const measurement = (item.sizeL || item.sizeB) ? `${item.sizeL || '-'} x ${item.sizeB || '-'}` : '-';
                
                return (
                  <tr key={item.id} className="break-inside-avoid">
                    <td className="py-3 px-2 text-center text-zinc-500">{index + 1}</td>
                    <td className="py-3 px-3 font-bold text-zinc-900">{item.description}</td>
                    <td className="py-3 px-2 text-center text-zinc-600">{item.hsn || '-'}</td>
                    <td className="py-3 px-2 text-center text-zinc-600">{measurement}</td>
                    <td className="py-3 px-2 text-center text-zinc-600">{item.no || '-'}</td>
                    <td className="py-3 px-2 text-center font-bold text-zinc-800">{row.quantity}</td>
                    <td className="py-3 px-2 text-right text-zinc-800">₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-2 text-center text-zinc-500">{item.gst}%</td>
                    <td className="py-3 px-3 text-right font-black text-zinc-900">₹{row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Amount in words */}
          <div className="border-t-2 border-zinc-800 pt-3 mb-6 flex justify-between items-start">
            <div className="w-1/2 pr-4">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Amount in Words</span>
              <p className="text-[10px] font-bold text-zinc-900 capitalize">{numberToWords(netPayable > 0 ? netPayable : totals.grandTotal)}</p>
            </div>
            
            {/* Totals Box */}
            <div className="w-1/3 text-xs space-y-1.5 border border-zinc-200 bg-zinc-50 rounded-lg p-3">
              <div className="flex justify-between text-zinc-600">
                <span>Taxable Value:</span>
                <span className="font-bold text-zinc-900">₹{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              {taxMode === 'IGST' ? (
                <div className="flex justify-between text-zinc-600">
                  <span>IGST:</span>
                  <span className="font-bold text-zinc-900">₹{totals.totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-zinc-600">
                    <span>CGST:</span><span className="font-bold text-zinc-900">₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>SGST:</span><span className="font-bold text-zinc-900">₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between font-bold text-zinc-900 border-t border-zinc-300 pt-1.5 mt-1.5 text-sm">
                <span>Grand Total:</span><span>₹{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>

              {(invoiceDetails.discount > 0) && (
                <div className="flex justify-between text-zinc-500 text-[10px] pt-1">
                  <span>Discount:</span><span>- ₹{parseFloat(invoiceDetails.discount).toLocaleString('en-IN')}</span>
                </div>
              )}
              {(invoiceDetails.advanceReceived > 0) && (
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>Advance Received:</span><span>- ₹{parseFloat(invoiceDetails.advanceReceived).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-zinc-900 bg-zinc-200 px-2 py-1.5 rounded mt-2 text-sm">
                <span>Balance Due:</span><span>₹{netPayable > 0 ? netPayable.toLocaleString('en-IN', {minimumFractionDigits: 2}) : 0}</span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="grid grid-cols-2 gap-8 text-[10px] break-inside-avoid">
            <div className="space-y-4">
              {companySettings?.showBankDetailsOnPdf !== false && (
                <div>
                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Bank Details</span>
                  <div className="grid grid-cols-[50px_1fr] gap-y-0.5 text-zinc-800">
                    <span className="font-bold">Bank:</span><span>{invoiceDetails.bankName}</span>
                    <span className="font-bold">Name:</span><span>{invoiceDetails.accountName}</span>
                    <span className="font-bold">A/C No:</span><span>{invoiceDetails.accountNo}</span>
                    <span className="font-bold">IFSC:</span><span>{invoiceDetails.ifscCode}</span>
                  </div>
                </div>
              )}
              
              {companySettings?.showTermsOnPdf !== false && (
                <div>
                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Terms & Conditions</span>
                  <p className="whitespace-pre-wrap text-zinc-500 leading-tight">{invoiceDetails.terms}</p>
                </div>
              )}

              {companySettings?.showRemarksOnPdf !== false && invoiceDetails.description && (
                <div>
                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Remarks</span>
                  <p className="text-zinc-600 font-medium">{invoiceDetails.description}</p>
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