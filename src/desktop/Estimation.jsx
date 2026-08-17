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
      items: [{ id: 1, description: 'Custom Wooden Counter Work', unit: 'Sq.Ft.', sizeL: '10', sizeB: '12', no: '1', rate: '2500', gst: 18 }],
      bankName: companySettings.bankName || 'ICICI BANK',
      accountName: companySettings.accountName || 'Jyanipur Interiors',
      accountNo: companySettings.accountNo || '437405000324',
      ifscCode: companySettings.ifscCode || 'ICIC0004374',
      terms: companySettings.defaultEstimateTerms || '1. 50% Mobilization advance upon booking.\n2. 40% against material delivery at site.\n3. 10% upon final hand-over.',
      description: 'Tentative BOQ estimation based on conceptual drawings.',
      discount: 0,
      advanceReceived: 0,
      amount: '₹ 3,54,000.00',
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
    advanceReceived: '', 
    discount: ''
  });

  const [items, setItems] = useState([
    { id: 1, description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', rate: '', gst: 18 },
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

  const addItem = () => setItems([...items, { id: Date.now(), description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', rate: '', gst: 18 }]);
  const updateItem = (id, field, value) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const calculateRow = (item) => {
    const l = parseFloat(item.sizeL) || 1, b = parseFloat(item.sizeB) || 1, no = parseFloat(item.no) || 0, rate = parseFloat(item.rate) || 0, gstRate = taxMode === 'NONE' ? 0 : (parseFloat(item.gst) || 0);
    const quantity = (item.sizeL !== '' || item.sizeB !== '') ? (l * b * no) : no;
    const baseAmount = quantity * rate;
    const gstAmount = (baseAmount * gstRate) / 100;
    return { quantity, baseAmount, gstAmount, totalAmount: baseAmount + gstAmount };
  };

  const totals = items.reduce((acc, item) => {
    const rowCalc = calculateRow(item);
    return { subtotal: acc.subtotal + rowCalc.baseAmount, totalGst: acc.totalGst + rowCalc.gstAmount, grandTotal: acc.grandTotal + rowCalc.totalAmount };
  }, { subtotal: 0, totalGst: 0, grandTotal: 0 });

  const netPayable = totals.grandTotal - (parseFloat(estimateDetails.discount) || 0) - (parseFloat(estimateDetails.advanceReceived) || 0);

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
      advanceReceived: estimateDetails.advanceReceived,
      amount: '₹ ' + (netPayable > 0 ? netPayable : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
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
      advanceReceived: est.advanceReceived || '',
      discount: est.discount || ''
    });
    setItems(est.items && est.items.length > 0 ? est.items : [{ id: 1, description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', rate: '', gst: 18 }]);
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

  const handleToggleCancel = (id) => {
    setEstimationsList(estimationsList.map(est => {
      if (est.id === id) {
        return { ...est, isCancelled: !est.isCancelled };
      }
      return est;
    }));
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the entire estimation?')) {
      setEditingId(null);
      setEstimateDetails({ 
        partyName: '', partyAddress: '', projectName: '', date: new Date().toISOString().split('T')[0], estimateNo: '', validUntil: '', description: '', terms: companySettings.defaultEstimateTerms || '1. 50% Mobilization advance upon booking.\n2. 40% against material delivery at site.\n3. 10% upon final hand-over.', 
        bankName: companySettings.bankName || '', accountName: companySettings.accountName || '', accountNo: companySettings.accountNo || '', ifscCode: companySettings.ifscCode || '', advanceReceived: '', discount: '' 
      });
      setItems([{ id: 1, description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', rate: '', gst: 18 }]);
      setErrors({});
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#B45309] text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
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
            <span>+</span> New Estimate
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
                  <th className="py-3.5 px-6 font-semibold">Total Amount</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {estimationsList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-zinc-400 font-medium text-xs">No estimations created yet. Click "+ New Estimate" above.</td>
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
                      <td className={`py-4 px-6 font-bold text-xs ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                        {est.amount}
                      </td>
                      <td className="py-4 px-6 text-right space-x-3">
                        {!est.isCancelled ? (
                          <>
                            <button onClick={() => handleEdit(est)} className="text-[#B45309] hover:text-[#92400E] font-bold cursor-pointer text-[10px] uppercase tracking-wider">Edit</button>
                            <button onClick={() => handleView(est)} className="text-zinc-600 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider">View</button>
                            <button onClick={() => handleDirectPrint(est)} className="text-amber-700 hover:text-amber-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider">Print</button>
                            <button onClick={() => handleToggleCancel(est.id)} className="text-red-500 hover:text-red-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleView(est)} className="text-zinc-500 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider">View</button>
                            <button onClick={() => handleToggleCancel(est.id)} className="text-amber-700 hover:text-amber-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider">Restore (Undo)</button>
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
            <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-600 hover:text-zinc-900 text-xs font-bold transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-zinc-200">
              &larr; Back
            </button>
            {isReadOnly && (
              <button onClick={() => window.print()} className="bg-[#B45309] text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-[#92400E]">
                🖨️ Print / Save PDF
              </button>
            )}
          </div>
        </div>

        {/* TOP METADATA INPUTS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
          <div>
            <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.partyName} onChange={(e) => { setEstimateDetails({...estimateDetails, partyName: e.target.value}); if(errors.partyName) setErrors({...errors, partyName: false}); }} className={`${inputClass} ${errors.partyName ? 'ring-2 ring-red-400' : ''}`} placeholder="e.g. Reliance Retail" />
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
            <input disabled={isReadOnly} type="text" value={estimateDetails.estimateNo} onChange={(e) => { setEstimateDetails({...estimateDetails, estimateNo: e.target.value}); if(errors.estimateNo) setErrors({...errors, estimateNo: false}); }} className={`${inputClass} ${errors.estimateNo ? 'ring-2 ring-red-400' : ''}`} placeholder="e.g. EST-001" />
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
                <th className="py-2.5 px-2 font-bold w-20 text-center">Qty</th>
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
                    <td className="py-2 px-2 text-center text-xs font-semibold text-zinc-500">{rowCalc.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
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
                        <button onClick={() => removeItem(item.id)} className="text-zinc-300 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-all cursor-pointer text-base">&times;</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isReadOnly && (
            <button onClick={addItem} className="mt-4 text-[#B45309] hover:text-[#92400E] text-xs font-bold transition-all cursor-pointer flex items-center gap-1">
              <span>+</span> Add BOQ Line Item
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
                  <input disabled={isReadOnly} type="number" value={estimateDetails.discount} onChange={(e) => setEstimateDetails({...estimateDetails, discount: e.target.value})} placeholder="0" className="w-24 bg-zinc-50 text-zinc-900 rounded-lg px-2.5 py-1 text-right outline-none border border-zinc-200 focus:border-[#B45309]" />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500">Advance:</span>
                  <input disabled={isReadOnly} type="number" value={estimateDetails.advanceReceived} onChange={(e) => setEstimateDetails({...estimateDetails, advanceReceived: e.target.value})} placeholder="0" className="w-24 bg-zinc-50 text-zinc-900 rounded-lg px-2.5 py-1 text-right outline-none border border-zinc-200 focus:border-[#B45309]" />
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

      {/* PERFECT A4 PDF DOCUMENT ENGINE (HIDDEN ON SCREEN) */}
      <div className="hidden print:block w-full bg-white text-zinc-900 font-['Poppins'] text-[11px] leading-tight print:p-0 print:m-0">
        
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { padding: 0 !important; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img { mix-blend-mode: multiply !important; }
          }
        `}} />

        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white">
          
          {/* Header Branding */}
          <div className="flex justify-between items-start border-b-2 border-zinc-800 pb-5 mb-5">
            <div className="flex items-center gap-4">
              {companySettings?.logoUrl && (
                <img src={companySettings.logoUrl} className="h-14 w-auto object-contain shrink-0" alt="Logo" />
              )}
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
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] block mb-1">Estimation / BOQ</span>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">{estimateDetails.estimateNo || 'EST-000'}</h2>
              <p className="text-[10px] font-bold text-zinc-800 mt-1">Date: <span className="font-medium text-zinc-600">{estimateDetails.date}</span></p>
            </div>
          </div>

          {/* Client & Project Info */}
          <div className="grid grid-cols-2 gap-8 mb-6 pb-4 border-b border-zinc-200">
            <div>
              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1.5">Prepared For</span>
              <h3 className="text-sm font-bold text-zinc-900 uppercase">{estimateDetails.partyName || 'Client Name'}</h3>
              <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-1 leading-relaxed">{estimateDetails.partyAddress}</p>
            </div>

            <div className="text-right space-y-1">
              <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1.5">Project Details</span>
              <p className="text-[10px] text-zinc-800 font-bold">Project: <span className="font-medium text-zinc-600">{estimateDetails.projectName || 'Interior Estimation'}</span></p>
              {estimateDetails.validUntil && <p className="text-[10px] text-zinc-800 font-bold">Valid Until: <span className="font-medium text-zinc-600">{estimateDetails.validUntil}</span></p>}
            </div>
          </div>

          {/* CLEAN ITEM TABLE */}
          <table className="w-full text-left border-collapse mb-6">
            <thead>
              <tr className="bg-zinc-800 text-white text-[9px] uppercase tracking-wider">
                <th className="py-2.5 px-2 font-bold text-center w-8 rounded-tl-md">#</th>
                <th className="py-2.5 px-3 font-bold">Scope of Work / Material Details</th>
                <th className="py-2.5 px-2 font-bold text-center w-12">Unit</th>
                <th className="py-2.5 px-2 font-bold text-center w-16">L x B</th>
                <th className="py-2.5 px-2 font-bold text-center w-10">No</th>
                <th className="py-2.5 px-2 font-bold text-center w-12">Qty</th>
                <th className="py-2.5 px-2 font-bold text-right w-20">Rate</th>
                {taxMode !== 'NONE' && <th className="py-2.5 px-2 font-bold text-center w-12">Tax</th>}
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
                    <td className="py-3 px-2 text-center text-zinc-600">{item.unit}</td>
                    <td className="py-3 px-2 text-center text-zinc-600">{measurement}</td>
                    <td className="py-3 px-2 text-center text-zinc-600">{item.no || '-'}</td>
                    <td className="py-3 px-2 text-center font-bold text-zinc-800">{row.quantity}</td>
                    <td className="py-3 px-2 text-right text-zinc-800">₹{parseFloat(item.rate || 0).toLocaleString('en-IN')}</td>
                    {taxMode !== 'NONE' && <td className="py-3 px-2 text-center text-zinc-500">{item.gst}%</td>}
                    <td className="py-3 px-3 text-right font-black text-zinc-900">₹{row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Amount in Words & Totals Box */}
          <div className="border-t-2 border-zinc-800 pt-3 mb-6 flex justify-between items-start break-inside-avoid">
            <div className="w-1/2 pr-4">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Estimated Amount in Words</span>
              <p className="text-[10px] font-bold text-zinc-900 capitalize">{numberToWords(netPayable > 0 ? netPayable : totals.grandTotal)}</p>
            </div>
            
            <div className="w-1/3 text-xs space-y-1.5 border border-zinc-200 bg-zinc-50 rounded-lg p-3">
              <div className="flex justify-between text-zinc-600">
                <span>Taxable BOQ Total:</span>
                <span className="font-bold text-zinc-900">₹{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between text-zinc-600">
                  <span>IGST Total:</span>
                  <span className="font-bold text-zinc-900">₹{totals.totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              ) : taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between text-zinc-600">
                    <span>CGST:</span><span className="font-bold text-zinc-900">₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>SGST:</span><span className="font-bold text-zinc-900">₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                </>
              ) : null}
              
              <div className="flex justify-between font-bold text-zinc-900 border-t border-zinc-300 pt-1.5 mt-1.5 text-sm">
                <span>Grand Total:</span><span>₹{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>

              {(estimateDetails.discount > 0) && (
                <div className="flex justify-between text-zinc-500 text-[10px] pt-1">
                  <span>Discount:</span><span>- ₹{parseFloat(estimateDetails.discount).toLocaleString('en-IN')}</span>
                </div>
              )}
              {(estimateDetails.advanceReceived > 0) && (
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>Advance Payable:</span><span>- ₹{parseFloat(estimateDetails.advanceReceived).toLocaleString('en-IN')}</span>
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
                    <span className="font-bold">Bank:</span><span>{estimateDetails.bankName}</span>
                    <span className="font-bold">Name:</span><span>{estimateDetails.accountName}</span>
                    <span className="font-bold">A/C No:</span><span>{estimateDetails.accountNo}</span>
                    <span className="font-bold">IFSC:</span><span>{estimateDetails.ifscCode}</span>
                  </div>
                </div>
              )}
              
              {companySettings?.showTermsOnPdf !== false && (
                <div>
                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Payment Terms & Schedule</span>
                  <p className="whitespace-pre-wrap text-zinc-500 leading-tight">{estimateDetails.terms}</p>
                </div>
              )}

              {companySettings?.showRemarksOnPdf !== false && estimateDetails.description && (
                <div>
                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Scope Remarks</span>
                  <p className="text-zinc-600 font-medium">{estimateDetails.description}</p>
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