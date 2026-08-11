import React, { useState, useEffect } from 'react';
import { getInvoices, saveInvoice, toggleCancelInvoice } from './db';

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

export default function TaxInvoice({ companySettings = {} }) {
  const [currentView, setCurrentView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [invoiceList, setInvoiceList] = useState([]);
  const [taxMode, setTaxMode] = useState('CGST_SGST');

  const [invoiceDetails, setInvoiceDetails] = useState({
    partyName: '', 
    partyAddress: '', 
    gstNo: '', 
    placeOfSupply: 'Telangana (36)',
    date: new Date().toISOString().split('T')[0], 
    invoiceNo: '', 
    poNumber: '', 
    poDate: '', 
    description: '', 
    terms: '1. Payment due within 15 days of invoice date.\n2. Goods/Services once rendered cannot be returned.', 
    bankName: companySettings.bankName || '', 
    accountName: companySettings.accountName || '', 
    accountNo: companySettings.accountNo || '', 
    ifscCode: companySettings.ifscCode || '', 
    advanceReceived: '', 
    discount: ''
  });

  const [items, setItems] = useState([
    { id: 1, description: '', hsn: '', sizeL: '', sizeB: '', no: '', rate: '', gst: 18 },
  ]);

  const [errors, setErrors] = useState({});

  // LOAD INVOICES FROM NEON DATABASE ON MOUNT
  const loadInvoicesFromDb = async () => {
    setLoading(true);
    const data = await getInvoices();
    setInvoiceList(data);
    setLoading(false);
  };

  useEffect(() => {
    loadInvoicesFromDb();
  }, []);

  useEffect(() => {
    if (!editingId) {
      setInvoiceDetails(prev => ({
        ...prev,
        bankName: companySettings.bankName || prev.bankName,
        accountName: companySettings.accountName || prev.accountName,
        accountNo: companySettings.accountNo || prev.accountNo,
        ifscCode: companySettings.ifscCode || prev.ifscCode,
      }));
    }
  }, [companySettings, editingId]);

  useEffect(() => {
    const clientStateCode = invoiceDetails.gstNo.trim().substring(0, 2);
    if (clientStateCode.length === 2) {
      if (clientStateCode === '36') {
        setTaxMode('CGST_SGST');
      } else {
        setTaxMode('IGST');
      }
    }
  }, [invoiceDetails.gstNo]);

  const addItem = () => setItems([...items, { id: Date.now(), description: '', hsn: '', sizeL: '', sizeB: '', no: '', rate: '', gst: 18 }]);
  const updateItem = (id, field, value) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const calculateRow = (item) => {
    const l = parseFloat(item.sizeL) || 1, b = parseFloat(item.sizeB) || 1, no = parseFloat(item.no) || 0, rate = parseFloat(item.rate) || 0, gstRate = parseFloat(item.gst) || 0;
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

  // SAVE TO NEON DB
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
      alert('Failed to save to Neon Database. Check connection.');
      return false;
    }
  };

  const handleSaveOnly = async () => {
    if (await saveInvoiceToState()) {
      alert(`Invoice ${invoiceDetails.invoiceNo} saved to Neon database!`);
      setCurrentView('list');
      handleClear(false);
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
    setItems(inv.items && inv.items.length > 0 ? inv.items : [{ id: 1, description: '', hsn: '', sizeL: '', sizeB: '', no: '', rate: '', gst: 18 }]);
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

  const handleToggleCancel = async (inv) => {
    await toggleCancelInvoice(inv.id, inv.isCancelled);
    await loadInvoicesFromDb();
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the entire invoice?')) {
      setEditingId(null);
      setInvoiceDetails({ 
        partyName: '', partyAddress: '', gstNo: '', placeOfSupply: 'Telangana (36)', date: new Date().toISOString().split('T')[0], invoiceNo: '', poNumber: '', poDate: '', description: '', terms: '1. Payment due within 15 days of invoice date.\n2. Goods/Services once rendered cannot be returned.', 
        bankName: companySettings.bankName || '', accountName: companySettings.accountName || '', accountNo: companySettings.accountNo || '', ifscCode: companySettings.ifscCode || '', advanceReceived: '', discount: '' 
      });
      setItems([{ id: 1, description: '', hsn: '', sizeL: '', sizeB: '', no: '', rate: '', gst: 18 }]);
      setErrors({});
    }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-white/30 bg-white/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  if (currentView === 'list') {
    return (
      <div className="w-full print:hidden">
        <div className="flex justify-between items-end pb-4 border-b border-zinc-300/50 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Invoice Board</h2>
            <p className="text-zinc-600 text-xs mt-1 font-medium">Manage and track your issued tax invoices (Connected to Neon DB).</p>
          </div>
          <button 
            onClick={() => { handleClear(false); setCurrentView('form'); }}
            className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-lg hover:-translate-y-0.5"
          >
            + New Invoice
          </button>
        </div>

        <div className="overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-zinc-400 text-[10px] uppercase tracking-[0.15em] border-b border-zinc-300/50">
                <th className="py-4 pr-4 font-semibold">Date</th>
                <th className="py-4 pr-4 font-semibold">Inv No.</th>
                <th className="py-4 pr-4 font-semibold">Client / Party</th>
                <th className="py-4 pr-4 font-semibold">Total Amount</th>
                <th className="py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/40 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-zinc-500 text-xs">Loading invoices from Neon.tech...</td>
                </tr>
              ) : invoiceList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-zinc-500 text-xs">No invoices created yet. Click "+ New Invoice" above.</td>
                </tr>
              ) : (
                invoiceList.map((inv) => (
                  <tr 
                    key={inv.id} 
                    className={`transition-all ${
                      inv.isCancelled 
                        ? 'bg-red-50/20 opacity-60' 
                        : 'hover:bg-white/30'
                    }`}
                  >
                    <td className={`py-4 pr-4 text-xs font-medium ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-600'}`}>
                      {inv.date}
                    </td>
                    <td className={`py-4 pr-4 font-bold text-xs ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                      {inv.invoiceNo}
                      {inv.isCancelled && (
                        <span className="ml-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-widest no-underline inline-block">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className={`py-4 pr-4 text-xs font-semibold ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                      {inv.client}
                    </td>
                    <td className={`py-4 pr-4 font-bold text-xs ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                      {inv.amount}
                    </td>
                    <td className="py-4 text-right space-x-3">
                      {!inv.isCancelled ? (
                        <>
                          <button onClick={() => handleEdit(inv)} className="text-zinc-600 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">Edit</button>
                          <button onClick={() => handleView(inv)} className="text-zinc-600 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">View</button>
                          <button onClick={() => handleDirectPrint(inv)} className="text-amber-600 hover:text-amber-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">Print</button>
                          <button onClick={() => handleToggleCancel(inv)} className="text-red-500 hover:text-red-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleView(inv)} className="text-zinc-500 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">View</button>
                          <button onClick={() => handleToggleCancel(inv)} className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">Restore (Undo)</button>
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

  const isReadOnly = currentView === 'view';

  return (
    <div className="w-full font-['Poppins']">
      <div className="print:hidden">
        <div className="flex items-center justify-between border-b border-zinc-300/50 pb-4 mb-6">
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
            {isReadOnly ? `Viewing Invoice ${invoiceDetails.invoiceNo}` : editingId ? `Edit Invoice ${invoiceDetails.invoiceNo}` : 'Create Invoice'}
          </h2>
          <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-500 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors cursor-pointer bg-white/40 px-4 py-2 rounded-full shadow-sm hover:shadow-md border border-white/50">
            ✕ Back to Board
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[150px]">
            <label className={labelClass}>GST No.</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.gstNo} onChange={(e) => setInvoiceDetails({...invoiceDetails, gstNo: e.target.value.toUpperCase()})} className={`${inputClass} uppercase`} maxLength={15} />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className={labelClass}>Party Name <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.partyName} onChange={(e) => { setInvoiceDetails({...invoiceDetails, partyName: e.target.value}); if(errors.partyName) setErrors({...errors, partyName: false}); }} className={`${inputClass} ${errors.partyName ? 'ring-1 ring-red-400 bg-red-50/50' : ''}`} />
          </div>
          <div className="flex-[3] min-w-[250px]">
            <label className={labelClass}>Party Address</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.partyAddress} onChange={(e) => setInvoiceDetails({...invoiceDetails, partyAddress: e.target.value})} className={inputClass} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-[100px]">
            <label className={labelClass}>Inv No. <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.invoiceNo} onChange={(e) => { setInvoiceDetails({...invoiceDetails, invoiceNo: e.target.value}); if(errors.invoiceNo) setErrors({...errors, invoiceNo: false}); }} className={`${inputClass} ${errors.invoiceNo ? 'ring-1 ring-red-400 bg-red-50/50' : ''}`} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>Inv Date</label>
            <input disabled={isReadOnly} type="date" value={invoiceDetails.date} onChange={(e) => setInvoiceDetails({...invoiceDetails, date: e.target.value})} className={inputClass} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className={labelClass}>Tax Calculation Type</label>
            <select 
              disabled={isReadOnly}
              value={taxMode} 
              onChange={(e) => setTaxMode(e.target.value)}
              className={`${inputClass} cursor-pointer font-bold text-zinc-900 bg-amber-50/50 border-amber-200`}
            >
              <option value="CGST_SGST">CGST + SGST (In State / Telangana)</option>
              <option value="IGST">IGST (Out of State)</option>
            </select>
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

        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-zinc-500 text-[9px] uppercase tracking-widest border-b border-zinc-300/50">
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
            <tbody className="divide-y divide-zinc-200/40">
              {items.map((item) => {
                const rowCalc = calculateRow(item);
                const tInp = "w-full border-b border-transparent hover:border-zinc-300 focus:border-zinc-900 bg-transparent focus:outline-none py-1.5 px-1 text-xs transition-all font-medium text-zinc-900 placeholder-zinc-400 disabled:opacity-75";
                
                return (
                  <tr key={item.id} className="group hover:bg-white/20 transition-colors">
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
                        <button onClick={() => removeItem(item.id)} className="text-zinc-400 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-all">&times;</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {!isReadOnly && (
          <button onClick={addItem} className="mb-8 px-4 py-2 bg-white/40 hover:bg-white border border-white/50 text-zinc-700 text-[10px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all cursor-pointer shadow-sm">
            + Add Row
          </button>
        )}

        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="flex-1 space-y-5">
            <div>
              <label className={labelClass}>Remarks</label>
              <textarea disabled={isReadOnly} value={invoiceDetails.description} onChange={(e) => setInvoiceDetails({...invoiceDetails, description: e.target.value})} className={`${inputClass} resize-y min-h-[40px] py-2`} rows="1"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/40 rounded-2xl p-4 border border-white/50 shadow-sm">
                <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Bank Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center border-b border-zinc-300/50 pb-0.5">
                    <span className="text-[10px] font-bold text-zinc-500 w-16 uppercase shrink-0">Bank:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Bank Name" value={invoiceDetails.bankName} onChange={(e) => setInvoiceDetails({...invoiceDetails, bankName: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                  <div className="flex items-center border-b border-zinc-300/50 pb-0.5">
                    <span className="text-[10px] font-bold text-zinc-500 w-16 uppercase shrink-0">Name:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Account Holder" value={invoiceDetails.accountName} onChange={(e) => setInvoiceDetails({...invoiceDetails, accountName: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                  <div className="flex items-center border-b border-zinc-300/50 pb-0.5">
                    <span className="text-[10px] font-bold text-zinc-500 w-16 uppercase shrink-0">A/C No:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Account Number" value={invoiceDetails.accountNo} onChange={(e) => setInvoiceDetails({...invoiceDetails, accountNo: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                  <div className="flex items-center border-b border-zinc-300/50 pb-0.5">
                    <span className="text-[10px] font-bold text-zinc-500 w-16 uppercase shrink-0">IFSC:</span>
                    <input disabled={isReadOnly} type="text" placeholder="IFSC Code" value={invoiceDetails.ifscCode} onChange={(e) => setInvoiceDetails({...invoiceDetails, ifscCode: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Terms</label>
                <textarea disabled={isReadOnly} value={invoiceDetails.terms} onChange={(e) => setInvoiceDetails({...invoiceDetails, terms: e.target.value})} className={`${inputClass} resize-none h-[140px] text-[11px] leading-relaxed`}></textarea>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-72 flex flex-col justify-between">
            <div className="bg-zinc-900 p-6 rounded-[2rem] shadow-2xl text-zinc-300 border border-zinc-800">
              <div className="flex justify-between text-xs px-1 mb-2">
                <span>Basic:</span><span className="text-white font-medium">₹ {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
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
                  <span>Discount:</span><input disabled={isReadOnly} type="number" value={invoiceDetails.discount} onChange={(e) => setInvoiceDetails({...invoiceDetails, discount: e.target.value})} placeholder="0" className="w-20 bg-zinc-800/80 text-white rounded-lg px-2 py-1.5 text-right outline-none focus:ring-1 focus:ring-zinc-500 border border-zinc-700 disabled:opacity-50" />
                </div>
                <div className="flex justify-between items-center text-xs px-1">
                  <span>Advance:</span><input disabled={isReadOnly} type="number" value={invoiceDetails.advanceReceived} onChange={(e) => setInvoiceDetails({...invoiceDetails, advanceReceived: e.target.value})} placeholder="0" className="w-20 bg-zinc-800/80 text-white rounded-lg px-2 py-1.5 text-right outline-none focus:ring-1 focus:ring-zinc-500 border border-zinc-700 disabled:opacity-50" />
                </div>
              </div>
              <div className="flex justify-between text-base font-extrabold text-white border-t-2 border-zinc-600 pt-4 px-1 mt-4">
                <span>Due:</span><span>₹ {netPayable > 0 ? netPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 0}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              {!isReadOnly ? (
                <>
                  <button 
                    onClick={() => handleClear(true)} 
                    className="px-3 py-3 bg-white/40 border border-white/50 shadow-sm hover:shadow-md rounded-2xl text-zinc-700 hover:bg-white font-bold text-[10px] uppercase tracking-wider transition-all"
                  >
                    Clear
                  </button>
                  <button 
                    onClick={handleSaveOnly} 
                    className="flex-1 py-3 bg-zinc-900 hover:bg-black text-white rounded-2xl font-extrabold text-[10px] uppercase tracking-wider transition-all shadow-md hover:-translate-y-0.5"
                  >
                    Save
                  </button>
                  <button 
                    onClick={handleSaveAndPrint} 
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded-2xl font-extrabold text-[10px] uppercase tracking-wider transition-all shadow-[0_8px_16px_rgba(245,158,11,0.2)] hover:shadow-[0_12px_20px_rgba(245,158,11,0.3)] hover:-translate-y-0.5"
                  >
                    Save & Print
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => window.print()} 
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-900 rounded-2xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-[0_8px_16px_rgba(245,158,11,0.2)] hover:shadow-[0_12px_20px_rgba(245,158,11,0.3)]"
                >
                  Print PDF Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY VIEW */}
      <div className="hidden print:block w-full bg-white text-zinc-900 font-['Poppins'] text-[11px] leading-tight">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 10mm; size: A4; }
            body { padding: 0 !important; background: white !important; }
            img { mix-blend-mode: multiply !important; }
          }
        `}} />

        <div className="flex justify-between items-start border-b border-zinc-300 pb-5 mb-5">
          <div className="flex items-center gap-4">
            <img 
              src={companySettings?.logoUrl || "/jyanipur.png"} 
              className="h-12 w-auto object-contain shrink-0 mix-blend-multiply" 
              alt="Logo" 
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-zinc-900">{companySettings?.companyName || 'Jyanipur Interiors'}</h1>
              <p className="text-[10px] text-zinc-500 whitespace-pre-wrap mt-0.5 max-w-sm">{companySettings?.companyAddress}</p>
              <p className="text-[10px] text-zinc-500 mt-1">
                <strong>GSTIN:</strong> {companySettings?.companyGst} | <strong>Mobile:</strong> {companySettings?.companyPhone}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] block">Tax Invoice</span>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mt-1">{invoiceDetails.invoiceNo || 'INV-000'}</h2>
            <p className="text-[10px] text-zinc-500 mt-1"><strong>Date:</strong> {invoiceDetails.date}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 pb-4 border-b border-zinc-200">
          <div>
            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Billed To</span>
            <h3 className="text-xs font-bold text-zinc-900 uppercase">{invoiceDetails.partyName || 'Client Name'}</h3>
            <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-0.5">{invoiceDetails.partyAddress}</p>
            {invoiceDetails.gstNo && (
              <p className="text-[10px] text-zinc-500 font-medium mt-1">GSTIN: {invoiceDetails.gstNo.toUpperCase()}</p>
            )}
          </div>

          <div className="text-right space-y-0.5">
            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Reference</span>
            {invoiceDetails.poNumber && <p className="text-[10px] text-zinc-600"><strong>PO Number:</strong> {invoiceDetails.poNumber}</p>}
            {invoiceDetails.poDate && <p className="text-[10px] text-zinc-600"><strong>PO Date:</strong> {invoiceDetails.poDate}</p>}
            <p className="text-[10px] text-zinc-600"><strong>Place of Supply:</strong> {invoiceDetails.placeOfSupply}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse mb-6">
          <thead>
            <tr className="text-zinc-500 text-[9px] uppercase tracking-wider border-y border-zinc-300">
              <th className="py-2.5 px-1 font-bold text-center w-8">#</th>
              <th className="py-2.5 px-2 font-bold">Item Description</th>
              <th className="py-2.5 px-1 font-bold text-center w-16">HSN</th>
              <th className="py-2.5 px-1 font-bold text-center w-16">Qty</th>
              <th className="py-2.5 px-2 font-bold text-right w-24">Rate</th>
              <th className="py-2.5 px-2 font-bold text-center w-16">GST %</th>
              <th className="py-2.5 px-2 font-bold text-right w-28">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-[10px]">
            {items.map((item, index) => {
              const row = calculateRow(item);
              if (!item.description) return null;

              return (
                <tr key={item.id} className="break-inside-avoid">
                  <td className="py-2.5 px-1 text-center text-zinc-400">{index + 1}</td>
                  <td className="py-2.5 px-2 font-medium text-zinc-900">{item.description}</td>
                  <td className="py-2.5 px-1 text-center text-zinc-500">{item.hsn || '-'}</td>
                  <td className="py-2.5 px-1 text-center text-zinc-700">{row.quantity}</td>
                  <td className="py-2.5 px-2 text-right text-zinc-700">₹ {parseFloat(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="py-2.5 px-2 text-center text-zinc-500">{item.gst}%</td>
                  <td className="py-2.5 px-2 text-right font-bold text-zinc-900">₹ {row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="border-y border-zinc-200 py-2 mb-6">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Amount in Words</span>
          <p className="text-[11px] font-bold text-zinc-900 capitalize mt-0.5">{numberToWords(netPayable > 0 ? netPayable : totals.grandTotal)}</p>
        </div>

        <div className="grid grid-cols-12 gap-6 pt-2 break-inside-avoid">
          <div className="col-span-7 space-y-3">
            {companySettings?.showBankDetailsOnPdf !== false && (
              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Company Bank Details</span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-zinc-700">
                  <p><strong>Bank:</strong> {invoiceDetails.bankName}</p>
                  <p><strong>Name:</strong> {invoiceDetails.accountName}</p>
                  <p><strong>A/C No:</strong> {invoiceDetails.accountNo}</p>
                  <p><strong>IFSC:</strong> {invoiceDetails.ifscCode}</p>
                </div>
              </div>
            )}

            {companySettings?.showTermsOnPdf !== false && (
              <div>
                <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-0.5">Terms & Conditions</span>
                <p className="whitespace-pre-wrap text-[9px] text-zinc-500 leading-tight">{invoiceDetails.terms}</p>
              </div>
            )}

            {companySettings?.showRemarksOnPdf !== false && invoiceDetails.description && (
              <div>
                <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-0.5">Remarks</span>
                <p className="text-[9px] text-zinc-600">{invoiceDetails.description}</p>
              </div>
            )}
          </div>

          <div className="col-span-5 flex flex-col justify-between items-end text-right">
            <div className="w-full space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Taxable Value</span>
                <span className="font-semibold text-zinc-900">₹ {totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>

              {taxMode === 'IGST' ? (
                <div className="flex justify-between text-zinc-600">
                  <span>IGST Total</span>
                  <span className="font-semibold text-zinc-900">₹ {totals.totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-zinc-600">
                    <span>CGST ({items[0]?.gst ? items[0].gst / 2 : 9}%)</span>
                    <span className="font-semibold text-zinc-900">₹ {(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>SGST ({items[0]?.gst ? items[0].gst / 2 : 9}%)</span>
                    <span className="font-semibold text-zinc-900">₹ {(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between font-bold text-zinc-900 border-t border-zinc-200 pt-1.5 text-sm">
                <span>Grand Total</span>
                <span>₹ {totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>

              {(invoiceDetails.discount > 0) && (
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>Discount</span>
                  <span>- ₹ {parseFloat(invoiceDetails.discount).toLocaleString('en-IN')}</span>
                </div>
              )}

              {(invoiceDetails.advanceReceived > 0) && (
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>Advance Received</span>
                  <span>- ₹ {parseFloat(invoiceDetails.advanceReceived).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-zinc-900 bg-zinc-100 p-2.5 rounded-lg border border-zinc-200 mt-1">
                <span>Balance Due</span>
                <span>₹ {netPayable > 0 ? netPayable.toLocaleString('en-IN', {minimumFractionDigits: 2}) : 0}</span>
              </div>
            </div>

            {companySettings?.showSignatoryOnPdf !== false && (
              <div className="pt-4 text-center w-44 flex flex-col items-center">
                {companySettings?.showSignatureImage && companySettings?.signatureUrl ? (
                  <img 
                    src={companySettings.signatureUrl} 
                    alt="Authorized Signature" 
                    className="h-12 w-auto object-contain mb-1 mix-blend-multiply"
                  />
                ) : (
                  <div className="h-10"></div>
                )}
                <div className="border-t border-zinc-400 pt-1 w-full">
                  <p className="text-[9px] font-bold text-zinc-700 uppercase tracking-wider">Authorized Signatory</p>
                  <p className="text-[8px] text-zinc-400 mt-0.5">{companySettings?.companyName || 'Jyanipur Interiors'}</p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}