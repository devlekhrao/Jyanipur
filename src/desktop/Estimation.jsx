import React, { useState, useEffect } from 'react';

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

export default function Estimation({ companySettings = {} }) {
  const [currentView, setCurrentView] = useState('list');
  const [editingId, setEditingId] = useState(null);

  const [estimationsList, setEstimationsList] = useState([
    {
      id: 1,
      date: '2026-08-10',
      estimateNo: 'EST-001',
      client: 'Reliance Retail',
      projectName: 'Flagship Store Interior',
      partyAddress: '123 Commercial Street, Mumbai',
      validUntil: '2026-09-10',
      taxMode: 'CGST_SGST',
      items: [{ id: 1, description: 'Custom Wooden Counter Work', unit: 'Sq.Ft.', sizeL: '10', sizeB: '12', no: '1', qty: '120', rate: '2500', gst: 18 }],
      bankName: companySettings.bankName || 'ICICI BANK',
      accountName: companySettings.accountName || 'Jyanipur Interiors',
      accountNo: companySettings.accountNo || '437405000324',
      ifscCode: companySettings.ifscCode || 'ICIC0004374',
      terms: companySettings.defaultEstimateTerms || '1. 50% Mobilization advance upon booking.\n2. 40% against material delivery at site.\n3. 10% upon final hand-over.',
      description: 'Tentative BOQ estimation based on conceptual drawings.',
      discount: 0,
      amount: '₹ 3,54,000.00',
      status: 'Pending',
      isCancelled: false
    }
  ]);

  const [taxMode, setTaxMode] = useState('CGST_SGST');

  const [estimateDetails, setEstimateDetails] = useState({
    partyName: '', 
    partyAddress: '', 
    projectName: '', 
    estimateNo: '', 
    date: new Date().toISOString().split('T')[0], 
    validUntil: '', 
    description: '', 
    terms: companySettings.defaultEstimateTerms || '1. 50% Mobilization advance upon booking.\n2. 40% against material delivery at site.\n3. 10% upon final hand-over.', 
    bankName: companySettings.bankName || '', 
    accountName: companySettings.accountName || '', 
    accountNo: companySettings.accountNo || '', 
    ifscCode: companySettings.ifscCode || '', 
    discount: ''
  });

  const [items, setItems] = useState([
    { id: 1, description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: 18 },
  ]);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!editingId) {
      setEstimateDetails(prev => ({
        ...prev,
        bankName: companySettings.bankName || prev.bankName,
        accountName: companySettings.accountName || prev.accountName,
        accountNo: companySettings.accountNo || prev.accountNo,
        ifscCode: companySettings.ifscCode || prev.ifscCode,
        terms: prev.terms || companySettings.defaultEstimateTerms || ''
      }));
    }
  }, [companySettings, editingId]);

  // --- AUTO INCREMENT ESTIMATE NO ---
  const generateNextEstimateNo = () => {
    const prefix = companySettings.estimatePrefix || 'EST/FY26-27/';
    let maxNum = 0;
    
    estimationsList.forEach(est => {
      if (est.estimateNo && est.estimateNo.startsWith(prefix)) {
        const numStr = est.estimateNo.replace(prefix, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  const addItem = () => setItems([...items, { id: Date.now(), description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: 18 }]);
  
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

  const finalAmount = totals.grandTotal - (parseFloat(estimateDetails.discount) || 0);

  const saveEstimationToState = () => {
    const newErrors = {};
    if (!estimateDetails.partyName) newErrors.partyName = true;
    if (!estimateDetails.estimateNo) newErrors.estimateNo = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Fill required fields: Client Name & Estimate No.');
      return false;
    }

    setErrors({});
    const existingEst = estimationsList.find(e => e.id === editingId);

    const record = {
      id: editingId || Date.now(),
      date: estimateDetails.date,
      estimateNo: estimateDetails.estimateNo,
      client: estimateDetails.partyName,
      projectName: estimateDetails.projectName,
      partyAddress: estimateDetails.partyAddress,
      validUntil: estimateDetails.validUntil,
      taxMode: taxMode,
      items: items,
      bankName: estimateDetails.bankName,
      accountName: estimateDetails.accountName,
      accountNo: estimateDetails.accountNo,
      ifscCode: estimateDetails.ifscCode,
      terms: estimateDetails.terms,
      description: estimateDetails.description,
      discount: estimateDetails.discount,
      amount: '₹ ' + (finalAmount > 0 ? finalAmount : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      status: existingEst ? existingEst.status : 'Pending',
      isCancelled: false
    };

    if (editingId) {
      setEstimationsList(estimationsList.map(est => est.id === editingId ? { ...record, isCancelled: est.isCancelled } : est));
    } else {
      setEstimationsList([record, ...estimationsList]);
    }
    return true;
  };

  const handleSaveOnly = () => {
    if (saveEstimationToState()) {
      alert(`Estimation ${estimateDetails.estimateNo} saved!`);
      setCurrentView('list');
      handleClear(false);
    }
  };

  const handleSaveAndPrint = () => {
    if (saveEstimationToState()) {
      setTimeout(() => window.print(), 100);
    }
  };

  const handleEdit = (est) => {
    setEditingId(est.id);
    setTaxMode(est.taxMode || 'CGST_SGST');
    setEstimateDetails({
      partyName: est.client || '',
      projectName: est.projectName || '',
      partyAddress: est.partyAddress || '',
      date: est.date || new Date().toISOString().split('T')[0],
      estimateNo: est.estimateNo || '',
      validUntil: est.validUntil || '',
      description: est.description || '',
      terms: est.terms || '',
      bankName: est.bankName || companySettings.bankName || '',
      accountName: est.accountName || companySettings.accountName || '',
      accountNo: est.accountNo || companySettings.accountNo || '',
      ifscCode: est.ifscCode || companySettings.ifscCode || '',
      discount: est.discount || ''
    });
    setItems(est.items && est.items.length > 0 ? est.items : [{ id: 1, description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: 18 }]);
    setCurrentView('form');
  };

  const handleView = (est) => {
    handleEdit(est);
    setCurrentView('view');
  };

  const handleDirectPrint = (est) => {
    handleEdit(est);
    setTimeout(() => window.print(), 150);
  };

  const handleDuplicate = (est) => {
    const newEst = { 
      ...est, 
      id: Date.now(), 
      estimateNo: generateNextEstimateNo(), 
      date: new Date().toISOString().split('T')[0],
      status: 'Pending', 
      isCancelled: false
    };
    setEstimationsList([newEst, ...estimationsList]);
    alert(`Estimate duplicated as ${newEst.estimateNo}!`);
  };

  const handleConvertToInvoice = (est) => {
    const invoiceDraft = {
      partyName: est.client || '',
      partyAddress: est.partyAddress || '',
      projectName: est.projectName || '',
      date: new Date().toISOString().split('T')[0],
      poRef: est.estimateNo || '', 
      description: est.description || '',
      bankName: est.bankName || '',
      accountName: est.accountName || '',
      accountNo: est.accountNo || '',
      ifscCode: est.ifscCode || '',
      discount: est.discount || '',
      terms: est.terms || ''
    };
    localStorage.setItem('draft_invoiceDetails', JSON.stringify(invoiceDraft));
    localStorage.setItem('draft_items', JSON.stringify(est.items || []));
    localStorage.setItem('draft_taxMode', est.taxMode || 'CGST_SGST');
    alert('Estimate details copied! Navigate to the "Tax Invoice" module and click "+ New Invoice" to complete the conversion.');
  };

  const handlePushToCRM = (est) => {
    const existingLeads = JSON.parse(localStorage.getItem('jyanipur_crm_leads') || '[]');
    const newLead = {
      id: Date.now(),
      dateAdded: new Date().toISOString().split('T')[0],
      name: est.client,
      company: est.projectName || 'Estimation Lead',
      email: '',
      phone: '',
      address: est.partyAddress,
      status: 'Negotiation', 
      value: est.amount,
      source: 'Estimation'
    };
    existingLeads.push(newLead);
    localStorage.setItem('jyanipur_crm_leads', JSON.stringify(existingLeads));
    alert(`${est.client} has been added to your CRM leads!`);
  };

  const handleToggleCancel = (id) => {
    setEstimationsList(estimationsList.map(est => {
      if (est.id === id) {
        return { ...est, isCancelled: !est.isCancelled };
      }
      return est;
    }));
  };

  const handleStatusChange = (id, newStatus) => {
    setEstimationsList(estimationsList.map(est => {
      if (est.id === id) {
        return { ...est, status: newStatus };
      }
      return est;
    }));
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the entire estimation?')) {
      setEditingId(null);
      setEstimateDetails({ 
        partyName: '', partyAddress: '', projectName: '', date: new Date().toISOString().split('T')[0], 
        estimateNo: generateNextEstimateNo(),
        validUntil: '', description: '', terms: companySettings.defaultEstimateTerms || '1. 50% Mobilization advance upon booking.\n2. 40% against material delivery at site.\n3. 10% upon final hand-over.', 
        bankName: companySettings.bankName || '', accountName: companySettings.accountName || '', accountNo: companySettings.accountNo || '', ifscCode: companySettings.ifscCode || '', discount: '' 
      });
      setItems([{ id: 1, description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: 18 }]);
      setErrors({});
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-0.5";

  // ==========================================
  // RENDER 1: ESTIMATION BOARD LIST VIEW
  // ==========================================
  if (currentView === 'list') {
    return (
      <div className="w-full h-full font-['Poppins'] flex flex-col print:hidden">
        <div className="flex justify-between items-center pb-5 mb-6 border-b border-zinc-200 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Estimations & BOQs</h2>
            <p className="text-zinc-500 text-xs mt-0.5 font-medium">Create and review client estimations.</p>
          </div>
          <button 
            onClick={() => { handleClear(false); setCurrentView('form'); }}
            className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Estimate
          </button>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50/80 text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-100">
                  <th className="py-3.5 px-6 font-semibold">Date</th>
                  <th className="py-3.5 px-6 font-semibold">Estimate No.</th>
                  <th className="py-3.5 px-6 font-semibold">Client / Party</th>
                  <th className="py-3.5 px-6 font-semibold">Status</th>
                  <th className="py-3.5 px-6 font-semibold">Total Amount</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {estimationsList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-xs">No estimations created yet. Click "+ New Estimate" above.</td>
                  </tr>
                ) : (
                  estimationsList.map((est) => (
                    <tr 
                      key={est.id} 
                      className={`transition-all ${est.isCancelled ? 'bg-red-50/20 opacity-60' : 'hover:bg-zinc-50/80'}`}
                    >
                      <td className={`py-4 px-6 text-xs font-medium ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-600'}`}>
                        {est.date}
                      </td>
                      <td className={`py-4 px-6 font-bold text-xs ${est.isCancelled ? 'line-through text-zinc-400' : 'text-[#B45309]'}`}>
                        {est.estimateNo}
                        {est.isCancelled && (
                          <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-wider no-underline inline-block">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className={`py-4 px-6 text-xs font-semibold ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                        {est.client}
                      </td>
                      
                      <td className="py-4 px-6">
                        <select
                          value={est.status || 'Pending'}
                          onChange={(e) => handleStatusChange(est.id, e.target.value)}
                          disabled={est.isCancelled}
                          className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border outline-none cursor-pointer transition-all ${
                            est.isCancelled ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed' :
                            est.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-2 focus:ring-emerald-500/20' :
                            est.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200 focus:ring-2 focus:ring-red-500/20' :
                            est.status === 'PO Received' ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-2 focus:ring-blue-500/20' :
                            'bg-amber-50 text-[#B45309] border-amber-200 focus:ring-2 focus:ring-[#B45309]/20'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Accepted">Accepted</option>
                          <option value="PO Received">PO Received</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>

                      <td className={`py-4 px-6 font-bold text-xs ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                        {est.amount}
                      </td>
                      
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!est.isCancelled ? (
                            <>
                              <button onClick={() => handleEdit(est)} title="Edit Estimate" className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                </svg>
                                Edit
                              </button>
                              
                              <button onClick={() => handleView(est)} title="View Detail" className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                View
                              </button>

                              <button onClick={() => handlePushToCRM(est)} title="Send to CRM as Lead" className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                </svg>
                                <span className="hidden xl:inline">To CRM</span>
                              </button>
                              
                              <button onClick={() => handleDirectPrint(est)} title="Print or Save PDF" className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" />
                                </svg>
                                Print
                              </button>
                              
                              <button onClick={() => handleDuplicate(est)} title="Duplicate Estimate" className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                                </svg>
                                Copy
                              </button>

                              <button onClick={() => handleConvertToInvoice(est)} title="Convert to Tax Invoice" className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                To Invoice
                              </button>
                              
                              <button onClick={() => handleToggleCancel(est.id)} title="Cancel/Reject Estimate" className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleView(est)} className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                View
                              </button>
                              <button onClick={() => handleToggleCancel(est.id)} className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-black cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                </svg>
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

  // ==========================================
  // RENDER 2: CREATE / EDIT / VIEW FORM VIEW
  // ==========================================
  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* SCREEN FORM VIEW (HIDDEN ON PRINT) */}
      <div className="print:hidden flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6 shrink-0">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            {isReadOnly ? `Viewing Estimate ${estimateDetails.estimateNo}` : editingId ? `Edit Estimate ${estimateDetails.estimateNo}` : 'New Estimation'}
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

        {/* TOP METADATA INPUTS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
          <div>
            <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.partyName} onChange={(e) => { setEstimateDetails({...estimateDetails, partyName: e.target.value}); if(errors.partyName) setErrors({...errors, partyName: false}); }} className={`${inputClass} ${errors.partyName ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} placeholder="e.g. Reliance Retail" />
          </div>
          <div>
            <label className={labelClass}>Project / Site Name</label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.projectName} onChange={(e) => setEstimateDetails({...estimateDetails, projectName: e.target.value})} className={inputClass} placeholder="e.g. Flagship Store Interior" />
          </div>
          <div>
            <label className={labelClass}>Site Address</label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.partyAddress} onChange={(e) => setEstimateDetails({...estimateDetails, partyAddress: e.target.value})} className={inputClass} placeholder="e.g. Commercial St, Mumbai" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
          <div>
            <label className={labelClass}>Estimate No. <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.estimateNo} onChange={(e) => { setEstimateDetails({...estimateDetails, estimateNo: e.target.value}); if(errors.estimateNo) setErrors({...errors, estimateNo: false}); }} className={`${inputClass} ${errors.estimateNo ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} placeholder="e.g. EST-001" />
          </div>
          <div>
            <label className={labelClass}>Estimate Date</label>
            <input disabled={isReadOnly} type="date" value={estimateDetails.date} onChange={(e) => setEstimateDetails({...estimateDetails, date: e.target.value})} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Valid Until</label>
            <input disabled={isReadOnly} type="date" value={estimateDetails.validUntil} onChange={(e) => setEstimateDetails({...estimateDetails, validUntil: e.target.value})} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tax Type</label>
            <select 
              disabled={isReadOnly}
              value={taxMode} 
              onChange={(e) => setTaxMode(e.target.value)}
              className={`${inputClass} cursor-pointer font-bold text-[#B45309]`}
            >
              <option value="CGST_SGST">CGST + SGST (In State)</option>
              <option value="IGST">IGST (Out of State)</option>
              <option value="NONE">No Tax (Quotation Only)</option>
            </select>
          </div>
        </div>

        {/* BOQ ITEMS TABLE */}
        <div className="mb-6 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm shrink-0">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-100 pb-3">
                <th className="py-2.5 pr-4 font-bold">Scope of Work / Material Description</th>
                <th className="py-2.5 px-2 font-bold w-20 text-center">Unit</th>
                <th className="py-2.5 px-2 font-bold w-16 text-center">L</th>
                <th className="py-2.5 px-2 font-bold w-16 text-center">B</th>
                <th className="py-2.5 px-2 font-bold w-16 text-center">NO</th>
                <th className="py-2.5 px-2 font-bold w-24 text-center">Qty</th>
                <th className="py-2.5 px-2 font-bold w-24 text-right">Rate</th>
                <th className="py-2.5 px-2 font-bold w-28 text-right">Amount</th>
                {taxMode !== 'NONE' && <th className="py-2.5 px-2 font-bold w-20 text-center">GST %</th>}
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
                    <td className="py-2 pr-4"><input disabled={isReadOnly} type="text" placeholder="BOQ Description" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className={tInp} /></td>
                    <td className="py-2 px-2">
                      <select disabled={isReadOnly} value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer`}>
                        <option value="Sq.Ft.">Sq.Ft.</option><option value="Rft.">Rft.</option><option value="Nos">Nos</option><option value="L.S.">L.S.</option>
                      </select>
                    </td>
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
                    {taxMode !== 'NONE' && (
                      <td className="py-2 px-2">
                        <select disabled={isReadOnly} value={item.gst} onChange={(e) => updateItem(item.id, 'gst', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer`}>
                          <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                        </select>
                      </td>
                    )}
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
              Add BOQ Line Item
            </button>
          )}
        </div>

        {/* BOTTOM SECTION */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0">
          <div className="flex-1 space-y-5">
            <div>
              <label className={labelClass}>Scope Remarks / Notes</label>
              <textarea disabled={isReadOnly} value={estimateDetails.description} onChange={(e) => setEstimateDetails({...estimateDetails, description: e.target.value})} className={`${inputClass} resize-y min-h-[40px] py-2`} rows="1"></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm">
                <h3 className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider mb-3">Bank Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center border-b border-zinc-100 pb-1">
                    <span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">Bank:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Bank Name" value={estimateDetails.bankName} onChange={(e) => setEstimateDetails({...estimateDetails, bankName: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                  <div className="flex items-center border-b border-zinc-100 pb-1">
                    <span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">Name:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Account Holder" value={estimateDetails.accountName} onChange={(e) => setEstimateDetails({...estimateDetails, accountName: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                  <div className="flex items-center border-b border-zinc-100 pb-1">
                    <span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">A/C No:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Account Number" value={estimateDetails.accountNo} onChange={(e) => setEstimateDetails({...estimateDetails, accountNo: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                  <div className="flex items-center border-b border-zinc-100 pb-1">
                    <span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">IFSC:</span>
                    <input disabled={isReadOnly} type="text" placeholder="IFSC Code" value={estimateDetails.ifscCode} onChange={(e) => setEstimateDetails({...estimateDetails, ifscCode: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Payment Terms & Schedule</label>
                <textarea disabled={isReadOnly} value={estimateDetails.terms} onChange={(e) => setEstimateDetails({...estimateDetails, terms: e.target.value})} className={`${inputClass} resize-none h-[140px] text-[11px] leading-relaxed`}></textarea>
              </div>
            </div>
          </div>

          {/* TOTALS SUMMARY DECK */}
          <div className="w-full lg:w-80 flex flex-col justify-between">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm text-zinc-700 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Basic BOQ Total:</span><span className="text-zinc-900 font-semibold">₹ {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between text-xs"><span>IGST:</span><span className="text-zinc-900 font-semibold">₹ {totals.totalGst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
              ) : taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between text-xs"><span className="text-zinc-500">CGST:</span><span className="text-zinc-900 font-semibold">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-zinc-500">SGST:</span><span className="text-zinc-900 font-semibold">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                </>
              ) : null}

              <div className="flex justify-between text-sm font-bold text-zinc-900 border-t border-zinc-100 pt-3">
                <span>Grand Total:</span><span>₹ {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>

              <div className="border-t border-zinc-100 pt-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Discount:</span>
                  <input disabled={isReadOnly} type="number" value={estimateDetails.discount} onChange={(e) => setEstimateDetails({...estimateDetails, discount: e.target.value})} placeholder="0" className="w-24 bg-zinc-50 text-zinc-900 rounded-lg px-2.5 py-1 text-right outline-none border border-zinc-200 focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309]" />
                </div>
              </div>

              <div className="flex justify-between text-base font-extrabold text-[#B45309] border-t border-zinc-200 pt-3">
                <span>Final Estimate:</span><span>₹ {finalAmount > 0 ? finalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 0}</span>
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
      <div className="hidden print:flex w-full bg-white text-black font-sans text-xs print:p-0 print:m-0 flex-col items-center justify-between" style={{ minHeight: 'calc(100vh - 20mm)' }}>
        
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { padding: 0 !important; background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img { mix-blend-mode: multiply !important; }
          }
        `}} />

        <div className="w-full bg-white flex flex-col relative flex-1">
          
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
                  <span className="font-semibold">Phone:</span> {companySettings?.companyPhone} <span className="mx-2">|</span> 
                  <span className="font-semibold">Email:</span> {companySettings?.companyEmail || 'accounts@jyanipur.in'}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Estimation / BOQ</span>
              <h2 className="text-lg font-bold text-black">{estimateDetails.estimateNo || 'EST-000'}</h2>
              <p className="text-[10px] text-gray-800 mt-1"><span className="font-semibold">Date:</span> {estimateDetails.date}</p>
            </div>
          </div>

          {/* Client & Project Info */}
          <div className="flex justify-between mb-8">
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">To</span>
              <h3 className="text-sm font-bold text-black uppercase">{estimateDetails.partyName || 'Client Name'}</h3>
              <p className="text-[10px] text-gray-700 whitespace-pre-wrap mt-1 leading-relaxed">{estimateDetails.partyAddress}</p>
            </div>

            <div className="text-right space-y-1 text-[10px]">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Project Details</span>
              <p className="text-gray-800"><span className="font-semibold">Project:</span> {estimateDetails.projectName || 'Interior Estimation'}</p>
              {estimateDetails.validUntil && <p className="text-gray-800"><span className="font-semibold">Valid Until:</span> {estimateDetails.validUntil}</p>}
            </div>
          </div>

          {/* CLEAN ITEM TABLE */}
          <table className="w-full text-left border-collapse border border-gray-300 mb-6">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr className="text-gray-700 text-[10px] uppercase font-semibold">
                <th className="py-2 px-2 text-center w-8 border-r border-gray-200">#</th>
                <th className="py-2 px-3 border-r border-gray-200">Scope of Work / Material Details</th>
                <th className="py-2 px-2 text-center w-12 border-r border-gray-200">Unit</th>
                <th className="py-2 px-2 text-center w-16 border-r border-gray-200">L x B</th>
                <th className="py-2 px-2 text-center w-10 border-r border-gray-200">No</th>
                <th className="py-2 px-2 text-center w-12 border-r border-gray-200">Qty</th>
                <th className="py-2 px-2 text-right w-20 border-r border-gray-200">Rate</th>
                {taxMode !== 'NONE' && <th className="py-2 px-2 text-center w-12 border-r border-gray-200">Tax</th>}
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
                    <td className="py-2 px-2 text-center border-r border-gray-200">{item.unit}</td>
                    <td className="py-2 px-2 text-center border-r border-gray-200">{measurement}</td>
                    <td className="py-2 px-2 text-center border-r border-gray-200">{item.no || '-'}</td>
                    <td className="py-2 px-2 text-center font-medium border-r border-gray-200">{row.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-2 text-right border-r border-gray-200">₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
                    {taxMode !== 'NONE' && <td className="py-2 px-2 text-center border-r border-gray-200">{item.gst}%</td>}
                    <td className="py-2 px-3 text-right font-medium">₹{row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Amount in Words & Totals Block */}
          <div className="flex justify-between items-start break-inside-avoid mb-10">
            <div className="w-1/2 pr-4 pt-2">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Estimated Amount in Words</span>
              <p className="text-[10px] font-medium text-black capitalize">{numberToWords(finalAmount > 0 ? finalAmount : totals.grandTotal)}</p>
            </div>
            
            <div className="w-64 space-y-1.5 text-xs text-black">
              <div className="flex justify-between">
                <span className="text-gray-600">Taxable BOQ Total:</span>
                <span>₹{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">IGST Total:</span>
                  <span>₹{totals.totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              ) : taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CGST:</span><span>₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1.5">
                    <span className="text-gray-600">SGST:</span><span>₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                </>
              ) : null}
              
              <div className="flex justify-between font-semibold pt-1">
                <span>Grand Total:</span><span>₹{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>

              {(estimateDetails.discount > 0) && (
                <div className="flex justify-between text-gray-500 text-[10px]">
                  <span>Discount:</span><span>- ₹{parseFloat(estimateDetails.discount).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-base border-t-2 border-black pt-2 mt-2">
                <span>Final Estimate:</span><span>₹{finalAmount > 0 ? finalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2}) : 0}</span>
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
                    <span className="font-semibold">Bank:</span><span>{estimateDetails.bankName}</span>
                    <span className="font-semibold">Name:</span><span>{estimateDetails.accountName}</span>
                    <span className="font-semibold">A/C No:</span><span>{estimateDetails.accountNo}</span>
                    <span className="font-semibold">IFSC:</span><span>{estimateDetails.ifscCode}</span>
                  </div>
                </div>
              )}
              
              {companySettings?.showTermsOnPdf !== false && (
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Payment Terms & Schedule</span>
                  <p className="whitespace-pre-wrap text-gray-600 leading-tight">{estimateDetails.terms}</p>
                </div>
              )}

              {companySettings?.showRemarksOnPdf !== false && estimateDetails.description && (
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Scope Remarks</span>
                  <p className="text-gray-800">{estimateDetails.description}</p>
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
          <div className="mt-8 pt-4 pb-2 border-t border-gray-200 text-center w-full">
            <p className="text-[10px] text-gray-500">
              {companySettings.pdfFooterDisclaimer}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}