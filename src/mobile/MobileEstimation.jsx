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

export default function MobileEstimation({ companySettings = {} }) {
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

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  // LIST VIEW
  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col font-['Poppins']">
        
        {/* HEADER SECTION */}
        <div className="mb-3 shrink-0">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Estimations</h2>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">BOQ & Costing Quotes</p>
            </div>
            <button 
              onClick={() => { handleClear(false); setCurrentView('form'); }}
              className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-black px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              + New Estimate
            </button>
          </div>
        </div>

        {/* ESTIMATION CARDS STREAM */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {estimationsList.length === 0 ? (
            <div className="text-center py-12 bg-white border border-zinc-200 border-dashed rounded-3xl">
              <span className="text-3xl mb-2 block">📐</span>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No estimations created yet.</p>
            </div>
          ) : (
            estimationsList.map((est) => (
              <div 
                key={est.id} 
                className={`bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 ${est.isCancelled ? 'opacity-60 bg-zinc-50' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#1E3A8A] text-sm">{est.estimateNo}</span>
                      {est.isCancelled && (
                        <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded uppercase">Cancelled</span>
                      )}
                    </div>
                    <h4 className="font-extrabold text-zinc-900 text-sm mt-0.5">{est.client}</h4>
                    <p className="text-[10px] text-zinc-400 font-bold">{est.projectName || 'General BOQ'}</p>
                  </div>
                  <p className="text-base font-black text-emerald-600">{est.amount}</p>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{est.date}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(est)} 
                      className="bg-blue-50 text-[#1E3A8A] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-transform"
                    >
                      Edit / View
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
            {editingId ? `Edit ${estimateDetails.estimateNo}` : 'New BOQ Estimate'}
          </h2>
          <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">Client Proposal Sheet</p>
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
        
        {/* CLIENT & ESTIMATE DETAILS SHEET */}
        <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">1. Client & Proposal Reference</h3>

          <div>
            <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
            <input type="text" value={estimateDetails.partyName} onChange={(e) => setEstimateDetails({...estimateDetails, partyName: e.target.value})} placeholder="e.g. Reliance Retail" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Project / Site Name</label>
            <input type="text" value={estimateDetails.projectName} onChange={(e) => setEstimateDetails({...estimateDetails, projectName: e.target.value})} placeholder="e.g. Flagship Store Interior" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Estimate No <span className="text-red-500">*</span></label>
              <input type="text" value={estimateDetails.estimateNo} onChange={(e) => setEstimateDetails({...estimateDetails, estimateNo: e.target.value})} placeholder="EST-001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Estimate Date</label>
              <input type="date" value={estimateDetails.date} onChange={(e) => setEstimateDetails({...estimateDetails, date: e.target.value})} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Tax Mode</label>
            <select value={taxMode} onChange={(e) => setTaxMode(e.target.value)} className={inputClass}>
              <option value="CGST_SGST">CGST + SGST (In State)</option>
              <option value="IGST">IGST (Out of State)</option>
              <option value="NONE">No Tax (Quotation Only)</option>
            </select>
          </div>
        </div>

        {/* BOQ ITEMS SECTION */}
        <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-1">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">2. BOQ Scope Items</h3>
            <button onClick={addItem} className="text-[10px] font-black text-[#1E3A8A] bg-blue-50 px-2.5 py-1 rounded-lg uppercase">+ Add Item</button>
          </div>

          {items.map((item, index) => {
            const rowCalc = calculateRow(item);
            return (
              <div key={item.id} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 space-y-3 relative">
                <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 text-zinc-300 hover:text-red-500 font-bold text-xs">✕</button>

                <span className="text-[9px] font-black text-zinc-400 uppercase">Item #{index + 1}</span>

                <div>
                  <label className={labelClass}>Scope Description</label>
                  <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="e.g. Custom Wooden Counter" className={inputClass} />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className={labelClass}>L</label>
                    <input type="number" value={item.sizeL} onChange={(e) => updateItem(item.id, 'sizeL', e.target.value)} placeholder="1" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>B</label>
                    <input type="number" value={item.sizeB} onChange={(e) => updateItem(item.id, 'sizeB', e.target.value)} placeholder="1" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>No.</label>
                    <input type="number" value={item.no} onChange={(e) => updateItem(item.id, 'no', e.target.value)} placeholder="1" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Unit</label>
                    <select value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className={inputClass}>
                      <option value="Sq.Ft.">Sq.Ft.</option>
                      <option value="Rft.">Rft.</option>
                      <option value="Nos">Nos</option>
                      <option value="L.S.">L.S.</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Rate (₹)</label>
                    <input type="number" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} placeholder="0.00" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Line Total (₹)</label>
                    <div className="h-[46px] bg-zinc-200/60 rounded-xl px-3 flex items-center font-black text-zinc-900 text-xs">
                      ₹ {rowCalc.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* SUMMARY KPI CARD */}
        <div className="bg-zinc-900 text-white p-5 rounded-[1.5rem] shadow-md space-y-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Subtotal:</span>
            <span className="text-white font-bold">₹ {totals.subtotal.toLocaleString('en-IN')}</span>
          </div>
          {taxMode !== 'NONE' && (
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Total GST:</span>
              <span className="text-white font-bold">₹ {totals.totalGst.toLocaleString('en-IN')}</span>
            </div>
          )}
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
          Save Estimation
        </button>
      </div>

    </div>
  );
}