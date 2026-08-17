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
    return [{ id: 1, description: '', hsn: companySettings.defaultHsnSac || '', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: companySettings.defaultGstRate || 18 }];
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

  // --- AUTO INCREMENT INVOICE NO ---
  const generateNextInvoiceNo = () => {
    const prefix = companySettings.invoicePrefix || 'FY26-27/';
    let maxNum = 0;
    
    invoiceList.forEach(inv => {
      if (inv.invoiceNo && inv.invoiceNo.startsWith(prefix)) {
        const numStr = inv.invoiceNo.replace(prefix, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum}`;
  };

  useEffect(() => {
    if (!editingId && currentView === 'form') {
      setInvoiceDetails(prev => ({
        ...prev,
        bankName: companySettings.bankName || prev.bankName,
        accountName: companySettings.accountName || prev.accountName,
        accountNo: companySettings.accountNo || prev.accountNo,
        ifscCode: companySettings.ifscCode || prev.ifscCode,
        invoiceNo: prev.invoiceNo === '' ? (generateNextInvoiceNo()) : prev.invoiceNo,
        terms: prev.terms === '' ? (companySettings.defaultInvoiceTerms || '') : prev.terms
      }));
    }
  }, [companySettings, editingId, currentView, invoiceList]);

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
    sizeL: '', sizeB: '', no: '', qty: '', rate: '', 
    gst: companySettings.defaultGstRate || 18 
  }]);
  
  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };

      if (['sizeL', 'sizeB', 'no'].includes(field)) {
        const l = parseFloat(updated.sizeL);
        const b = parseFloat(updated.sizeB);
        const n = parseFloat(updated.no);

        if (!isNaN(l) || !isNaN(b) || !isNaN(n)) {
          const effL = !isNaN(l) ? l : 1;
          const effB = !isNaN(b) ? b : 1;
          const effN = !isNaN(n) ? n : 1;
          updated.qty = parseFloat((effL * effB * effN).toFixed(2)).toString();
        } else {
          updated.qty = ''; 
        }
      }

      return updated;
    }));
  };

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const calculateRow = (item) => {
    let quantity = 0;
    if (item.qty !== undefined && item.qty !== '') {
      quantity = parseFloat(item.qty) || 0;
    } else {
      const l = parseFloat(item.sizeL);
      const b = parseFloat(item.sizeB);
      const n = parseFloat(item.no);
      if (!isNaN(l) || !isNaN(b) || !isNaN(n)) {
        const effL = !isNaN(l) ? l : 1;
        const effB = !isNaN(b) ? b : 1;
        const effN = !isNaN(n) ? n : 1;
        quantity = effL * effB * effN;
      }
    }

    const rate = parseFloat(item.rate) || 0;
    const gstRate = taxMode === 'NONE' ? 0 : (parseFloat(item.gst) || 0);

    const baseAmount = quantity * rate;
    const gstAmount = (baseAmount * gstRate) / 100;
    return { quantity, baseAmount, gstAmount, totalAmount: baseAmount + gstAmount };
  };

  const totals = items.reduce((acc, item) => {
    const rowCalc = calculateRow(item);
    return { subtotal: acc.subtotal + rowCalc.baseAmount, totalGst: acc.totalGst + rowCalc.gstAmount, grandTotal: acc.grandTotal + rowCalc.totalAmount };
  }, { subtotal: 0, totalGst: 0, grandTotal: 0 });

  const netPayable = totals.grandTotal - (parseFloat(invoiceDetails.discount) || 0) - (parseFloat(invoiceDetails.advanceReceived) || 0);

  const saveInvoiceToState = async (forcedStatus = null) => {
    const newErrors = {};
    if (!invoiceDetails.partyName) newErrors.partyName = true;
    if (!invoiceDetails.invoiceNo) newErrors.invoiceNo = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Fill required fields: Party Name & Invoice No.');
      return false;
    }

    setErrors({});
    const existingInv = invoiceList.find(e => e.id === editingId);

    const record = {
      id: editingId || Date.now(),
      client: invoiceDetails.partyName,
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
      amount: '₹ ' + (netPayable > 0 ? netPayable : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      status: forcedStatus || (existingInv ? existingInv.status : 'Pending'),
      isCancelled: existingInv ? existingInv.isCancelled : false
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
      partyName: inv.client || inv.partyName || '',
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
    setItems(inv.items && inv.items.length > 0 ? inv.items : [{ id: 1, description: '', hsn: companySettings.defaultHsnSac || '', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: 18 }]);
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

  const handleDuplicate = (inv) => {
    setEditingId(null);
    setTaxMode(inv.taxMode || 'CGST_SGST');
    setInvoiceDetails({
      partyName: inv.client || inv.partyName || '',
      partyAddress: inv.partyAddress || '',
      gstNo: inv.gstNo || '',
      placeOfSupply: inv.placeOfSupply || 'Telangana (36)',
      date: new Date().toISOString().split('T')[0],
      invoiceNo: generateNextInvoiceNo(), 
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
    setItems(inv.items && inv.items.length > 0 ? inv.items : [{ id: 1, description: '', hsn: companySettings.defaultHsnSac || '', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: 18 }]);
    setCurrentView('form');
    alert('Invoice duplicated. You can now make changes and save as new.');
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

  const handleStatusChange = async (inv, newStatus) => {
    try {
      const record = { ...inv, status: newStatus };
      await saveInvoice(record);
      await loadInvoicesFromDb();
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the entire invoice?')) {
      setEditingId(null);
      setInvoiceDetails({ 
        partyName: '', partyAddress: '', gstNo: '', placeOfSupply: 'Telangana (36)', date: new Date().toISOString().split('T')[0], 
        invoiceNo: generateNextInvoiceNo(), 
        poNumber: '', poDate: '', description: '', 
        terms: companySettings.defaultInvoiceTerms || '', 
        bankName: companySettings.bankName || '', accountName: companySettings.accountName || '', accountNo: companySettings.accountNo || '', ifscCode: companySettings.ifscCode || '', advanceReceived: '', discount: '' 
      });
      setItems([{ id: 1, description: '', hsn: companySettings.defaultHsnSac || '', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: companySettings.defaultGstRate || 18 }]);
      setErrors({});
      
      localStorage.removeItem('draft_invoiceDetails');
      localStorage.removeItem('draft_items');
      localStorage.removeItem('draft_taxMode');
      localStorage.removeItem('draft_editingId');
      if (updateDirtyState) updateDirtyState('TaxInvoice', false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-0.5";

  if (currentView === 'list') {
    return (
      <div className="w-full h-full font-['Poppins'] flex flex-col print:hidden">
        <div className="flex justify-between items-center pb-5 mb-6 border-b border-zinc-200 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Tax Invoices</h2>
            <p className="text-zinc-500 text-xs mt-0.5 font-medium">Manage and track your issued invoices.</p>
          </div>
          <button 
            onClick={() => { handleClear(false); setCurrentView('form'); }}
            className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Invoice
          </button>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50/80 text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-100">
                  <th className="py-3.5 px-6 font-semibold">Date</th>
                  <th className="py-3.5 px-6 font-semibold">Inv No.</th>
                  <th className="py-3.5 px-6 font-semibold">Client / Party</th>
                  <th className="py-3.5 px-6 font-semibold">Status</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Total Amount</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {loading ? (
                  <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-xs">Loading invoices...</td></tr>
                ) : invoiceList.length === 0 ? (
                  <tr><td colSpan="6" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <p className="text-zinc-500 font-medium text-xs">No invoices created yet.</p>
                    </div>
                  </td></tr>
                ) : (
                  invoiceList.map((inv) => (
                    <tr key={inv.id} className={`transition-all ${inv.isCancelled ? 'bg-red-50/20 opacity-60' : 'hover:bg-zinc-50/80'}`}>
                      <td className={`py-4 px-6 text-xs font-medium ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-600'}`}>{inv.date}</td>
                      <td className={`py-4 px-6 font-bold text-xs ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-[#B45309]'}`}>
                        {inv.invoiceNo}
                        {inv.isCancelled && <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-wider inline-block">Cancelled</span>}
                      </td>
                      <td className={`py-4 px-6 text-xs font-semibold ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>{inv.client || inv.partyName}</td>
                      
                      <td className="py-4 px-6">
                        <select
                          value={inv.status || 'Pending'}
                          onChange={(e) => handleStatusChange(inv, e.target.value)}
                          disabled={inv.isCancelled}
                          className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23A1A1AA%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.8rem_0.8rem] pr-7 pl-3 py-1.5 rounded-full border outline-none cursor-pointer transition-all text-[10px] font-black uppercase tracking-widest ${
                            inv.isCancelled ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed' :
                            inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-2 focus:ring-emerald-500/20' :
                            inv.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200 focus:ring-2 focus:ring-red-500/20' :
                            'bg-amber-50 text-[#B45309] border-amber-200 focus:ring-2 focus:ring-[#B45309]/20'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </td>

                      <td className={`py-4 px-6 text-right font-bold text-xs ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{inv.amount}</td>
                      
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!inv.isCancelled ? (
                            <>
                              <button onClick={() => handleEdit(inv)} title="Edit Invoice" className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                                Edit
                              </button>
                              
                              <button onClick={() => handleView(inv)} title="View Detail" className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                View
                              </button>
                              
                              <button onClick={() => handleDirectPrint(inv)} title="Print or Save PDF" className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" /></svg>
                                Print
                              </button>
                              
                              <button onClick={() => handleDuplicate(inv)} title="Duplicate Invoice" className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
                                Copy
                              </button>

                              <button onClick={() => handleSendWhatsApp(inv)} title="Send via WhatsApp" className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                                WA
                              </button>
                              
                              <button onClick={() => handleToggleCancel(inv)} title="Cancel Invoice" className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleView(inv)} className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                View
                              </button>
                              <button onClick={() => handleToggleCancel(inv)} className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                                Restore
                              </button>
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

  const isReadOnly = currentView === 'view';

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* SCREEN FORM VIEW (HIDDEN ON PRINT) */}
      <div className="print:hidden flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6 shrink-0">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            {isReadOnly ? `Viewing Invoice ${invoiceDetails.invoiceNo}` : editingId ? `Edit Invoice ${invoiceDetails.invoiceNo}` : 'New Tax Invoice'}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-600 hover:text-zinc-900 text-xs font-bold transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-zinc-200 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            {isReadOnly && (
              <button onClick={() => window.print()} className="bg-[#B45309] text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-[#92400E] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" />
                </svg>
                Print / Save PDF
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
          <div>
            <label className={labelClass}>GST No.</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.gstNo} onChange={(e) => setInvoiceDetails({...invoiceDetails, gstNo: e.target.value.toUpperCase()})} className={`${inputClass} uppercase`} maxLength={15} placeholder="e.g. 29AABC..." />
          </div>
          <div>
            <label className={labelClass}>Party Name <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.partyName} onChange={(e) => { setInvoiceDetails({...invoiceDetails, partyName: e.target.value}); if(errors.partyName) setErrors({...errors, partyName: false}); }} className={`${inputClass} ${errors.partyName ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} placeholder="e.g. Dodla Dairy Ltd" />
          </div>
          <div>
            <label className={labelClass}>Party Address</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.partyAddress} onChange={(e) => setInvoiceDetails({...invoiceDetails, partyAddress: e.target.value})} className={inputClass} placeholder="Billing Address" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 shrink-0">
          <div>
            <label className={labelClass}>Inv No. <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.invoiceNo} onChange={(e) => { setInvoiceDetails({...invoiceDetails, invoiceNo: e.target.value}); if(errors.invoiceNo) setErrors({...errors, invoiceNo: false}); }} className={`${inputClass} ${errors.invoiceNo ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} />
          </div>
          <div>
            <label className={labelClass}>Inv Date</label>
            <input disabled={isReadOnly} type="date" value={invoiceDetails.date} onChange={(e) => setInvoiceDetails({...invoiceDetails, date: e.target.value})} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Tax Calculation Type</label>
            <select 
              disabled={isReadOnly} 
              value={taxMode} 
              onChange={(e) => setTaxMode(e.target.value)} 
              className={`${inputClass} cursor-pointer font-bold text-[#B45309] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
            >
              <option value="CGST_SGST">CGST + SGST (In State)</option>
              <option value="IGST">IGST (Out of State)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Place of Supply</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.placeOfSupply} onChange={(e) => setInvoiceDetails({...invoiceDetails, placeOfSupply: e.target.value})} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>PO No.</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.poNumber} onChange={(e) => setInvoiceDetails({...invoiceDetails, poNumber: e.target.value})} className={inputClass} placeholder="Optional" />
          </div>
        </div>

        <div className="mb-6 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm shrink-0">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-100 pb-3">
                <th className="py-2.5 pr-4 font-bold">Item Description</th>
                <th className="py-2.5 px-2 font-bold w-16 text-center">HSN</th>
                <th className="py-2.5 px-2 font-bold w-16 text-center">L</th>
                <th className="py-2.5 px-2 font-bold w-16 text-center">B</th>
                <th className="py-2.5 px-2 font-bold w-16 text-center">NO</th>
                <th className="py-2.5 px-2 font-bold w-24 text-center">Qty</th>
                <th className="py-2.5 px-2 font-bold w-24 text-right">Rate</th>
                <th className="py-2.5 px-2 font-bold w-28 text-right">Amount</th>
                <th className="py-2.5 px-2 font-bold w-20 text-center">GST %</th>
                <th className="py-2.5 px-2 font-bold w-28 text-right">Total</th>
                {!isReadOnly && <th className="py-2.5 pl-2 w-6"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item) => {
                const rowCalc = calculateRow(item);
                const tInp = "w-full border-b border-transparent hover:border-zinc-300 focus:border-[#B45309] bg-transparent focus:outline-none py-2 px-1 text-xs transition-all font-medium text-zinc-900 placeholder-zinc-300 disabled:opacity-75";
                return (
                  <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                    <td className="py-2 pr-4"><input disabled={isReadOnly} type="text" placeholder="Item details..." value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className={tInp} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="text" value={item.hsn} onChange={(e) => updateItem(item.id, 'hsn', e.target.value)} className={`${tInp} text-center`} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.sizeL} onChange={(e) => updateItem(item.id, 'sizeL', e.target.value)} className={`${tInp} text-center`} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.sizeB} onChange={(e) => updateItem(item.id, 'sizeB', e.target.value)} className={`${tInp} text-center`} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.no} onChange={(e) => updateItem(item.id, 'no', e.target.value)} className={`${tInp} text-center`} /></td>
                    
                    {/* QTY FREE TEXT INPUT */}
                    <td className="py-2 px-2">
                      <input 
                        disabled={isReadOnly} 
                        type="number" 
                        step="any" 
                        value={item.qty !== undefined ? item.qty : rowCalc.quantity} 
                        onChange={(e) => updateItem(item.id, 'qty', e.target.value)} 
                        className={`${tInp} text-center font-bold text-[#B45309]`} 
                        placeholder="0"
                      />
                    </td>
                    
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className={`${tInp} text-right`} /></td>
                    <td className="py-2 px-2 text-right text-xs font-semibold text-zinc-800">{rowCalc.baseAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-2">
                      <select disabled={isReadOnly} value={item.gst} onChange={(e) => updateItem(item.id, 'gst', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.25rem_center] bg-[length:0.75rem_0.75rem] pr-4`}>
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
          {!isReadOnly && (
            <button onClick={addItem} className="mt-4 text-[#B45309] hover:text-[#92400E] text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Row
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0">
          <div className="flex-1 space-y-5">
            <div>
              <label className={labelClass}>Remarks</label>
              <textarea disabled={isReadOnly} value={invoiceDetails.description} onChange={(e) => setInvoiceDetails({...invoiceDetails, description: e.target.value})} className={`${inputClass} resize-y min-h-[40px] py-2`} rows="1"></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm">
                <h3 className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider mb-3">Bank Details</h3>
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
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm text-zinc-700 space-y-3">
              <div className="flex justify-between text-xs"><span className="text-zinc-500">Basic Value:</span><span className="text-zinc-900 font-semibold">₹ {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
              {taxMode === 'IGST' ? (
                <div className="flex justify-between text-xs"><span>IGST:</span><span className="text-zinc-900 font-semibold">₹ {totals.totalGst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
              ) : (
                <>
                  <div className="flex justify-between text-xs"><span className="text-zinc-500">CGST:</span><span className="text-zinc-900 font-semibold">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-zinc-500">SGST:</span><span className="text-zinc-900 font-semibold">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                </>
              )}
              <div className="flex justify-between text-sm font-bold text-zinc-900 border-t border-zinc-100 pt-3">
                <span>Grand Total:</span><span>₹ {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-zinc-100 pt-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Discount:</span><input disabled={isReadOnly} type="number" value={invoiceDetails.discount} onChange={(e) => setInvoiceDetails({...invoiceDetails, discount: e.target.value})} placeholder="0" className="w-24 bg-zinc-50 text-zinc-900 rounded-lg px-2.5 py-1 text-right outline-none border border-zinc-200 focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309]" />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Advance:</span><input disabled={isReadOnly} type="number" value={invoiceDetails.advanceReceived} onChange={(e) => setInvoiceDetails({...invoiceDetails, advanceReceived: e.target.value})} placeholder="0" className="w-24 bg-zinc-50 text-zinc-900 rounded-lg px-2.5 py-1 text-right outline-none border border-zinc-200 focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309]" />
                </div>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#B45309] border-t border-zinc-200 pt-3">
                <span>Balance Due:</span><span>₹ {netPayable > 0 ? netPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 0}</span>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveOnly} className="flex-1 py-3 bg-zinc-900 hover:bg-black text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer">Save</button>
                <button onClick={handleSaveAndPrint} className="flex-[1.5] py-3 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer">Save & Print PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* PERFECT A4 PDF DOCUMENT ENGINE (CLEAN CORPORATE STYLE) */}
      {/* ========================================== */}
      <div className="hidden print:flex w-full bg-white text-black font-sans text-xs print:p-0 print:m-0 flex-col items-center justify-between" style={{ minHeight: '100vh' }}>
        
        {/* DISABLES BROWSER HEADERS AND FOOTERS */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 0; size: A4 portrait; }
            body { padding: 0 !important; background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img { mix-blend-mode: multiply !important; }
          }
        `}} />

        <div className="w-full bg-white flex flex-col relative flex-1 print:p-[15mm]">
          
          {/* Header Branding */}
          <div className="flex justify-between items-start border-b border-gray-300 pb-5 mb-6">
            <div className="flex items-center gap-4">
              {companySettings?.logoUrl && (
                <img src={companySettings.logoUrl} className="h-14 w-auto object-contain shrink-0" alt="Logo" />
              )}
              <div>
                <h1 className="text-lg font-bold text-black">{companySettings?.companyName || 'Company Name'}</h1>
                <p className="text-[10px] text-gray-600 whitespace-pre-wrap mt-0.5 max-w-xs">{companySettings?.companyAddress}</p>
                <p className="text-[10px] text-gray-800 mt-1">
                  <span className="font-semibold">GSTIN:</span> {companySettings?.companyGst} <span className="mx-2">|</span> 
                  <span className="font-semibold">Phone:</span> {companySettings?.companyPhone}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Tax Invoice</span>
              <h2 className="text-lg font-bold text-black">{invoiceDetails.invoiceNo || 'INV-000'}</h2>
              <p className="text-[10px] text-gray-800 mt-1"><span className="font-semibold">Date:</span> {invoiceDetails.date}</p>
            </div>
          </div>

          {/* Client & Reference Info */}
          <div className="flex justify-between mb-8">
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Billed To</span>
              <h3 className="text-sm font-bold text-black uppercase">{invoiceDetails.partyName || 'Client Name'}</h3>
              <p className="text-[10px] text-gray-700 whitespace-pre-wrap mt-1 leading-relaxed">{invoiceDetails.partyAddress}</p>
              {invoiceDetails.gstNo && <p className="text-[10px] text-gray-800 font-bold mt-1.5">GSTIN: <span className="font-medium text-gray-600">{invoiceDetails.gstNo.toUpperCase()}</span></p>}
            </div>

            <div className="text-right space-y-1 text-[10px]">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Reference Info</span>
              {invoiceDetails.poNumber && <p className="text-gray-800"><span className="font-semibold">PO Number:</span> {invoiceDetails.poNumber}</p>}
              {invoiceDetails.poDate && <p className="text-gray-800"><span className="font-semibold">PO Date:</span> {invoiceDetails.poDate}</p>}
              <p className="text-gray-800"><span className="font-semibold">Place of Supply:</span> {invoiceDetails.placeOfSupply}</p>
            </div>
          </div>

          {/* CLEAN ITEM TABLE */}
          <table className="w-full text-left border-collapse border border-gray-300 mb-6">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr className="text-gray-700 text-[10px] uppercase font-semibold">
                <th className="py-2 px-2 text-center w-8 border-r border-gray-200">#</th>
                <th className="py-2 px-3 border-r border-gray-200">Item Description</th>
                <th className="py-2 px-2 text-center w-12 border-r border-gray-200">HSN</th>
                <th className="py-2 px-2 text-center w-16 border-r border-gray-200">L x B</th>
                <th className="py-2 px-2 text-center w-10 border-r border-gray-200">No</th>
                <th className="py-2 px-2 text-center w-12 border-r border-gray-200">Qty</th>
                <th className="py-2 px-2 text-right w-20 border-r border-gray-200">Rate</th>
                <th className="py-2 px-2 text-center w-12 border-r border-gray-200">Tax</th>
                <th className="py-2 px-3 text-right w-24">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[10px] text-black">
              {items.map((item, index) => {
                const row = calculateRow(item);
                if (!item.description) return null;
                const measurement = (item.sizeL || item.sizeB) ? `${item.sizeL || '-'} x ${item.sizeB || '-'}` : '-';

                return (
                  <tr key={item.id} className="break-inside-avoid">
                    <td className="py-2 px-2 text-center text-gray-500 border-r border-gray-200">{index + 1}</td>
                    <td className="py-2 px-3 border-r border-gray-200">{item.description}</td>
                    <td className="py-2 px-2 text-center border-r border-gray-200">{item.hsn || '-'}</td>
                    <td className="py-2 px-2 text-center border-r border-gray-200">{measurement}</td>
                    <td className="py-2 px-2 text-center border-r border-gray-200">{item.no || '-'}</td>
                    <td className="py-2 px-2 text-center font-medium border-r border-gray-200">{row.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-2 text-right border-r border-gray-200">₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-2 text-center border-r border-gray-200">{item.gst}%</td>
                    <td className="py-2 px-3 text-right font-medium">₹{row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Amount in Words & Totals Block */}
          <div className="flex justify-between items-start break-inside-avoid mb-10">
            <div className="w-1/2 pr-4 pt-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Amount in Words</span>
              <p className="text-[10px] font-medium text-black capitalize">{numberToWords(netPayable > 0 ? netPayable : totals.grandTotal)}</p>
            </div>
            
            <div className="w-64 space-y-1.5 text-xs text-black">
              <div className="flex justify-between">
                <span className="text-gray-600">Taxable Value:</span>
                <span>₹{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">IGST:</span>
                  <span>₹{totals.totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CGST:</span><span>₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1.5">
                    <span className="text-gray-600">SGST:</span><span>₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                </>
              )}
              
              <div className="flex justify-between font-semibold pt-1">
                <span>Grand Total:</span><span>₹{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>

              {(invoiceDetails.discount > 0) && (
                <div className="flex justify-between text-gray-500 text-[10px]">
                  <span>Discount:</span><span>- ₹{parseFloat(invoiceDetails.discount).toLocaleString('en-IN')}</span>
                </div>
              )}

              {(invoiceDetails.advanceReceived > 0) && (
                <div className="flex justify-between text-gray-500 text-[10px]">
                  <span>Advance Received:</span><span>- ₹{parseFloat(invoiceDetails.advanceReceived).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-base border-t-2 border-black pt-2 mt-2">
                <span>Balance Due:</span><span>₹{netPayable > 0 ? netPayable.toLocaleString('en-IN', {minimumFractionDigits: 2}) : 0}</span>
              </div>
            </div>
          </div>

          {/* Terms, Remarks, and Signatures */}
          <div className="grid grid-cols-2 gap-8 text-[10px] break-inside-avoid">
            <div className="space-y-5">
              {companySettings?.showBankDetailsOnPdf !== false && (
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Bank Details</span>
                  <div className="grid grid-cols-[50px_1fr] gap-y-0.5 text-black">
                    <span className="font-semibold">Bank:</span><span>{invoiceDetails.bankName}</span>
                    <span className="font-semibold">Name:</span><span>{invoiceDetails.accountName}</span>
                    <span className="font-semibold">A/C No:</span><span>{invoiceDetails.accountNo}</span>
                    <span className="font-semibold">IFSC:</span><span>{invoiceDetails.ifscCode}</span>
                  </div>
                </div>
              )}
              
              {companySettings?.showTermsOnPdf !== false && (
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Terms & Conditions</span>
                  <p className="whitespace-pre-wrap text-gray-600 leading-tight">{invoiceDetails.terms}</p>
                </div>
              )}

              {companySettings?.showRemarksOnPdf !== false && invoiceDetails.description && (
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Remarks</span>
                  <p className="text-gray-800">{invoiceDetails.description}</p>
                </div>
              )}
            </div>

            {companySettings?.showSignatoryOnPdf !== false && (
              <div className="flex flex-col items-end justify-end text-right pt-6">
                {companySettings?.showSignatureImage && companySettings?.signatureUrl ? (
                  <img src={companySettings.signatureUrl} alt="Signature" className="h-16 w-auto object-contain mb-2 mix-blend-multiply" />
                ) : <div className="h-16"></div>}
                <div className="border-t border-gray-400 pt-1 w-48">
                  <p className="font-bold text-black">For {companySettings?.companyName}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wider">Authorized Signatory</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Persistent Anchored Footer */}
        {companySettings?.pdfFooterDisclaimer && (
          <div className="mt-auto pt-4 pb-2 border-t border-gray-200 text-center w-full">
            <p className="text-[10px] text-gray-500">
              {companySettings.pdfFooterDisclaimer}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}