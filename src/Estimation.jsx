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
  const [currentView, setCurrentView] = useState('list'); // 'list', 'form', 'view'
  const [editingId, setEditingId] = useState(null);

  // Full state array storing actual estimation records
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
      terms: '1. 50% Mobilization advance upon booking.\n2. 40% against material delivery at site.\n3. 10% upon final hand-over.',
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
    terms: '1. 50% Mobilization advance upon booking.\n2. 40% against material delivery at site.\n3. 10% upon final hand-over.', 
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

  // --- SAVE ACTION ---
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

  // --- EDIT ESTIMATION ACTION ---
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

  // --- VIEW ESTIMATION ACTION (READ-ONLY) ---
  const handleView = (est) => {
    handleEdit(est);
    setCurrentView('view');
  };

  // --- DIRECT PRINT FROM BOARD ---
  const handleDirectPrint = (est) => {
    handleEdit(est);
    setTimeout(() => window.print(), 150);
  };

  // --- TOGGLE CANCEL / UNDO (NO DELETE) ---
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
        partyName: '', partyAddress: '', projectName: '', date: new Date().toISOString().split('T')[0], estimateNo: '', validUntil: '', description: '', terms: '1. 50% Mobilization advance upon booking.\n2. 40% against material delivery at site.\n3. 10% upon final hand-over.', 
        bankName: companySettings.bankName || '', accountName: companySettings.accountName || '', accountNo: companySettings.accountNo || '', ifscCode: companySettings.ifscCode || '', advanceReceived: '', discount: '' 
      });
      setItems([{ id: 1, description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', rate: '', gst: 18 }]);
      setErrors({});
    }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-white/30 bg-white/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  // ==========================================
  // RENDER 1: ESTIMATION BOARD LIST VIEW
  // ==========================================
  if (currentView === 'list') {
    return (
      <div className="w-full print:hidden">
        <div className="flex justify-between items-end pb-4 border-b border-zinc-300/50 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Estimations</h2>
            <p className="text-zinc-600 text-xs mt-1 font-medium">Manage and track your client BOQs & estimates.</p>
          </div>
          <button 
            onClick={() => { handleClear(false); setCurrentView('form'); }}
            className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-lg hover:-translate-y-0.5"
          >
            + New Estimate
          </button>
        </div>

        <div className="overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-zinc-400 text-[10px] uppercase tracking-[0.15em] border-b border-zinc-300/50">
                <th className="py-4 pr-4 font-semibold">Date</th>
                <th className="py-4 pr-4 font-semibold">Estimate No.</th>
                <th className="py-4 pr-4 font-semibold">Client / Party</th>
                <th className="py-4 pr-4 font-semibold">Total Amount</th>
                <th className="py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/40 text-sm">
              {estimationsList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-zinc-500 text-xs">No estimations created yet. Click "+ New Estimate" above.</td>
                </tr>
              ) : (
                estimationsList.map((est) => (
                  <tr 
                    key={est.id} 
                    className={`transition-all ${
                      est.isCancelled 
                        ? 'bg-red-50/20 opacity-60' 
                        : 'hover:bg-white/30'
                    }`}
                  >
                    <td className={`py-4 pr-4 text-xs font-medium ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-600'}`}>
                      {est.date}
                    </td>
                    <td className={`py-4 pr-4 font-bold text-xs ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                      {est.estimateNo}
                      {est.isCancelled && (
                        <span className="ml-2 px-2 py-0.5 rounded-md text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-widest no-underline inline-block">
                          Cancelled
                        </span>
                      )}
                    </td>
                    <td className={`py-4 pr-4 text-xs font-semibold ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                      {est.client}
                    </td>
                    <td className={`py-4 pr-4 font-bold text-xs ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                      {est.amount}
                    </td>
                    <td className="py-4 text-right space-x-3">
                      {!est.isCancelled ? (
                        <>
                          <button onClick={() => handleEdit(est)} className="text-zinc-600 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">Edit</button>
                          <button onClick={() => handleView(est)} className="text-zinc-600 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">View</button>
                          <button onClick={() => handleDirectPrint(est)} className="text-amber-600 hover:text-amber-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">Print</button>
                          <button onClick={() => handleToggleCancel(est.id)} className="text-red-500 hover:text-red-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleView(est)} className="text-zinc-500 hover:text-zinc-900 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">View</button>
                          <button onClick={() => handleToggleCancel(est.id)} className="text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-colors">Restore (Undo)</button>
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

  // ==========================================
  // RENDER 2: CREATE / EDIT / VIEW FORM VIEW
  // ==========================================
  return (
    <div className="w-full font-['Poppins']">
      
      {/* SCREEN FORM VIEW */}
      <div className="print:hidden">
        <div className="flex items-center justify-between border-b border-zinc-300/50 pb-4 mb-6">
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
            {isReadOnly ? `Viewing Estimate ${estimateDetails.estimateNo}` : editingId ? `Edit Estimate ${estimateDetails.estimateNo}` : 'Create Estimation'}
          </h2>
          <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-500 hover:text-zinc-900 text-[10px] font-bold uppercase tracking-[0.15em] transition-colors cursor-pointer bg-white/40 px-4 py-2 rounded-full shadow-sm hover:shadow-md border border-white/50">
            ✕ Back to Board
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-[2] min-w-[200px]">
            <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.partyName} onChange={(e) => { setEstimateDetails({...estimateDetails, partyName: e.target.value}); if(errors.partyName) setErrors({...errors, partyName: false}); }} className={`${inputClass} ${errors.partyName ? 'ring-1 ring-red-400 bg-red-50/50' : ''}`} />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className={labelClass}>Project / Site Name</label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.projectName} onChange={(e) => setEstimateDetails({...estimateDetails, projectName: e.target.value})} className={inputClass} />
          </div>
          <div className="flex-[3] min-w-[250px]">
            <label className={labelClass}>Site Address</label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.partyAddress} onChange={(e) => setEstimateDetails({...estimateDetails, partyAddress: e.target.value})} className={inputClass} />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex-1 min-w-[100px]">
            <label className={labelClass}>Estimate No. <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.estimateNo} onChange={(e) => { setEstimateDetails({...estimateDetails, estimateNo: e.target.value}); if(errors.estimateNo) setErrors({...errors, estimateNo: false}); }} className={`${inputClass} ${errors.estimateNo ? 'ring-1 ring-red-400 bg-red-50/50' : ''}`} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>Estimate Date</label>
            <input disabled={isReadOnly} type="date" value={estimateDetails.date} onChange={(e) => setEstimateDetails({...estimateDetails, date: e.target.value})} className={inputClass} />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={labelClass}>Valid Until</label>
            <input disabled={isReadOnly} type="date" value={estimateDetails.validUntil} onChange={(e) => setEstimateDetails({...estimateDetails, validUntil: e.target.value})} className={inputClass} />
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
              <option value="NONE">No Tax (Quotation Only)</option>
            </select>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-zinc-500 text-[9px] uppercase tracking-widest border-b border-zinc-300/50">
                <th className="py-3 pr-4 font-bold">Scope of Work / Material Description</th>
                <th className="py-3 px-2 font-bold w-20 text-center">Unit</th>
                <th className="py-3 px-2 font-bold w-16 text-center">L</th>
                <th className="py-3 px-2 font-bold w-16 text-center">B</th>
                <th className="py-3 px-2 font-bold w-16 text-center">NO</th>
                <th className="py-3 px-2 font-bold w-20 text-center">Qty</th>
                <th className="py-3 px-2 font-bold w-24 text-right">Rate</th>
                <th className="py-3 px-2 font-bold w-28 text-right">Amount</th>
                {taxMode !== 'NONE' && <th className="py-3 px-2 font-bold w-20 text-center">GST %</th>}
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
                    <td className="py-2 pr-4"><input disabled={isReadOnly} type="text" placeholder="BOQ Description" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className={tInp} /></td>
                    <td className="py-2 px-2">
                      <select disabled={isReadOnly} value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer`}>
                        <option value="Sq.Ft.">Sq.Ft.</option><option value="Rft.">Rft.</option><option value="Nos">Nos</option><option value="L.S.">L.S.</option>
                      </select>
                    </td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.sizeL} onChange={(e) => updateItem(item.id, 'sizeL', e.target.value)} className={`${tInp} text-center`} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.sizeB} onChange={(e) => updateItem(item.id, 'sizeB', e.target.value)} className={`${tInp} text-center`} /></td>
                    <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.no} onChange={(e) => updateItem(item.id, 'no', e.target.value)} className={`${tInp} text-center`} /></td>
                    <td className="py-2 px-2 text-center text-xs font-semibold text-zinc-600">{rowCalc.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
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
            + Add BOQ Item
          </button>
        )}

        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="flex-1 space-y-5">
            <div>
              <label className={labelClass}>Scope Remarks / Notes</label>
              <textarea disabled={isReadOnly} value={estimateDetails.description} onChange={(e) => setEstimateDetails({...estimateDetails, description: e.target.value})} className={`${inputClass} resize-y min-h-[40px] py-2`} rows="1"></textarea>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/40 rounded-2xl p-4 border border-white/50 shadow-sm">
                <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Bank Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center border-b border-zinc-300/50 pb-0.5">
                    <span className="text-[10px] font-bold text-zinc-500 w-16 uppercase shrink-0">Bank:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Bank Name" value={estimateDetails.bankName} onChange={(e) => setEstimateDetails({...estimateDetails, bankName: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                  <div className="flex items-center border-b border-zinc-300/50 pb-0.5">
                    <span className="text-[10px] font-bold text-zinc-500 w-16 uppercase shrink-0">Name:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Account Holder" value={estimateDetails.accountName} onChange={(e) => setEstimateDetails({...estimateDetails, accountName: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                  <div className="flex items-center border-b border-zinc-300/50 pb-0.5">
                    <span className="text-[10px] font-bold text-zinc-500 w-16 uppercase shrink-0">A/C No:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Account Number" value={estimateDetails.accountNo} onChange={(e) => setEstimateDetails({...estimateDetails, accountNo: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                  <div className="flex items-center border-b border-zinc-300/50 pb-0.5">
                    <span className="text-[10px] font-bold text-zinc-500 w-16 uppercase shrink-0">IFSC:</span>
                    <input disabled={isReadOnly} type="text" placeholder="IFSC Code" value={estimateDetails.ifscCode} onChange={(e) => setEstimateDetails({...estimateDetails, ifscCode: e.target.value})} className="w-full bg-transparent focus:outline-none font-medium text-zinc-900" />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Payment Terms & Validity</label>
                <textarea disabled={isReadOnly} value={estimateDetails.terms} onChange={(e) => setEstimateDetails({...estimateDetails, terms: e.target.value})} className={`${inputClass} resize-none h-[140px] text-[11px] leading-relaxed`}></textarea>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-72 flex flex-col justify-between">
            <div className="bg-zinc-900 p-6 rounded-[2rem] shadow-2xl text-zinc-300 border border-zinc-800">
              <div className="flex justify-between text-xs px-1 mb-2">
                <span>Basic BOQ:</span><span className="text-white font-medium">₹ {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between text-xs px-1 mb-2"><span>IGST:</span><span className="text-white font-medium">₹ {totals.totalGst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
              ) : taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between text-xs px-1 mb-2"><span>CGST:</span><span className="text-white font-medium">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-xs px-1 mb-2"><span>SGST:</span><span className="text-white font-medium">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                </>
              ) : null}

              <div className="flex justify-between text-sm font-bold text-white border-t border-zinc-700/50 pt-3 px-1 mt-2">
                <span>Total Estimate:</span><span>₹ {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="border-t border-zinc-700/50 pt-4 space-y-3 mt-3">
                <div className="flex justify-between items-center text-xs px-1">
                  <span>Discount:</span><input disabled={isReadOnly} type="number" value={estimateDetails.discount} onChange={(e) => setEstimateDetails({...estimateDetails, discount: e.target.value})} placeholder="0" className="w-20 bg-zinc-800/80 text-white rounded-lg px-2 py-1.5 text-right outline-none focus:ring-1 focus:ring-zinc-500 border border-zinc-700 disabled:opacity-50" />
                </div>
                <div className="flex justify-between items-center text-xs px-1">
                  <span>Advance:</span><input disabled={isReadOnly} type="number" value={estimateDetails.advanceReceived} onChange={(e) => setEstimateDetails({...estimateDetails, advanceReceived: e.target.value})} placeholder="0" className="w-20 bg-zinc-800/80 text-white rounded-lg px-2 py-1.5 text-right outline-none focus:ring-1 focus:ring-zinc-500 border border-zinc-700 disabled:opacity-50" />
                </div>
              </div>
              <div className="flex justify-between text-base font-extrabold text-white border-t-2 border-zinc-600 pt-4 px-1 mt-4">
                <span>Balance Due:</span><span>₹ {netPayable > 0 ? netPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 0}</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
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

      {/* ========================================================= */}
      {/* MINIMALIST ARCHITECTURAL PRINT TEMPLATE (PRINT-ONLY)       */}
      {/* ========================================================= */}
      <div className="hidden print:block w-full bg-white text-zinc-900 font-['Poppins'] text-[11px] leading-tight">
        
        {/* Strictly scoped print styles */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 10mm; size: A4; }
            body { padding: 0 !important; background: white !important; }
          }
        `}} />

        {/* Header Branding */}
        <div className="flex justify-between items-start border-b border-zinc-300 pb-5 mb-5">
          <div className="flex items-center gap-4">
            <img 
              src={companySettings?.logoUrl || "/jyanipur.png"} 
              className="h-12 w-auto object-contain shrink-0" 
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
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] block">Estimation / BOQ</span>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight mt-1">{estimateDetails.estimateNo || 'EST-000'}</h2>
            <p className="text-[10px] text-zinc-500 mt-1"><strong>Date:</strong> {estimateDetails.date}</p>
          </div>
        </div>

        {/* Client & Billing Info */}
        <div className="grid grid-cols-2 gap-6 mb-6 pb-4 border-b border-zinc-200">
          <div>
            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Prepared For</span>
            <h3 className="text-xs font-bold text-zinc-900 uppercase">{estimateDetails.partyName || 'Client Name'}</h3>
            <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-0.5">{estimateDetails.partyAddress}</p>
          </div>

          <div className="text-right space-y-0.5">
            <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Project Details</span>
            <p className="text-[10px] text-zinc-600"><strong>Project:</strong> {estimateDetails.projectName || 'Interior Estimation'}</p>
            {estimateDetails.validUntil && <p className="text-[10px] text-zinc-600"><strong>Valid Until:</strong> {estimateDetails.validUntil}</p>}
          </div>
        </div>

        {/* CLEAN ITEM TABLE */}
        <table className="w-full text-left border-collapse mb-6">
          <thead>
            <tr className="text-zinc-500 text-[9px] uppercase tracking-wider border-y border-zinc-300">
              <th className="py-2.5 px-1 font-bold text-center w-8">#</th>
              <th className="py-2.5 px-2 font-bold">Scope of Work / Material Details</th>
              <th className="py-2.5 px-1 font-bold text-center w-16">Unit</th>
              <th className="py-2.5 px-1 font-bold text-center w-16">Qty</th>
              <th className="py-2.5 px-2 font-bold text-right w-24">Rate</th>
              {taxMode !== 'NONE' && <th className="py-2.5 px-2 font-bold text-center w-16">GST %</th>}
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
                  <td className="py-2.5 px-1 text-center text-zinc-500">{item.unit}</td>
                  <td className="py-2.5 px-1 text-center text-zinc-700">{row.quantity}</td>
                  <td className="py-2.5 px-2 text-right text-zinc-700">₹ {parseFloat(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  {taxMode !== 'NONE' && <td className="py-2.5 px-2 text-center text-zinc-500">{item.gst}%</td>}
                  <td className="py-2.5 px-2 text-right font-bold text-zinc-900">₹ {row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Amount in Words */}
        <div className="border-y border-zinc-200 py-2 mb-6">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">Estimated Amount in Words</span>
          <p className="text-[11px] font-bold text-zinc-900 capitalize mt-0.5">{numberToWords(netPayable > 0 ? netPayable : totals.grandTotal)}</p>
        </div>

        {/* Footer Grid: Banking, Terms, Signatory */}
        <div className="grid grid-cols-12 gap-6 pt-2 break-inside-avoid">
          
          <div className="col-span-7 space-y-3">
            {companySettings?.showBankDetailsOnPdf !== false && (
              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Company Bank Details</span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-zinc-700">
                  <p><strong>Bank:</strong> {estimateDetails.bankName}</p>
                  <p><strong>Name:</strong> {estimateDetails.accountName}</p>
                  <p><strong>A/C No:</strong> {estimateDetails.accountNo}</p>
                  <p><strong>IFSC:</strong> {estimateDetails.ifscCode}</p>
                </div>
              </div>
            )}

            {companySettings?.showTermsOnPdf !== false && (
              <div>
                <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-0.5">Payment Terms & Schedule</span>
                <p className="whitespace-pre-wrap text-[9px] text-zinc-500 leading-tight">{estimateDetails.terms}</p>
              </div>
            )}

            {companySettings?.showRemarksOnPdf !== false && estimateDetails.description && (
              <div>
                <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-0.5">Scope Remarks</span>
                <p className="text-[9px] text-zinc-600">{estimateDetails.description}</p>
              </div>
            )}
          </div>

          <div className="col-span-5 flex flex-col justify-between items-end text-right">
            <div className="w-full space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Taxable BOQ Total</span>
                <span className="font-semibold text-zinc-900">₹ {totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>

              {/* Explicit TAX BREAKDOWN WITH PERCENTAGES */}
              {taxMode === 'IGST' ? (
                <div className="flex justify-between text-zinc-600">
                  <span>IGST Total</span>
                  <span className="font-semibold text-zinc-900">₹ {totals.totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              ) : taxMode === 'CGST_SGST' ? (
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
              ) : null}

              <div className="flex justify-between font-bold text-zinc-900 border-t border-zinc-200 pt-1.5 text-sm">
                <span>Grand Total</span>
                <span>₹ {totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>

              {(estimateDetails.discount > 0) && (
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>Discount</span>
                  <span>- ₹ {parseFloat(estimateDetails.discount).toLocaleString('en-IN')}</span>
                </div>
              )}

              {(estimateDetails.advanceReceived > 0) && (
                <div className="flex justify-between text-zinc-500 text-[10px]">
                  <span>Advance Payable</span>
                  <span>- ₹ {parseFloat(estimateDetails.advanceReceived).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-zinc-900 bg-zinc-100 p-2.5 rounded-lg border border-zinc-200 mt-1">
                <span>Balance Due</span>
                <span>₹ {netPayable > 0 ? netPayable.toLocaleString('en-IN', {minimumFractionDigits: 2}) : 0}</span>
              </div>
            </div>

            {/* AUTHORIZED SIGNATORY WITH DIGITAL SIGNATURE IMAGE SUPPORT */}
            {companySettings?.showSignatoryOnPdf !== false && (
              <div className="pt-4 text-center w-44 flex flex-col items-center">
                {companySettings?.showSignatureImage && companySettings?.signatureUrl ? (
                  <img 
                    src={companySettings.signatureUrl} 
                    alt="Authorized Signature" 
                    className="h-12 w-auto object-contain mb-1"
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