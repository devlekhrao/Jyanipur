import React, { useState, useEffect } from 'react';
import { getEstimations, saveEstimation, deleteEstimation } from '../db';

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
  const [estimationsList, setEstimationsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load Estimations directly from Neon DB via db.js
  const loadEstimationsFromCloud = async () => {
    setLoading(true);
    try {
      const data = await getEstimations();
      setEstimationsList(data || []);
    } catch (e) {
      console.error("Error fetching estimations from cloud:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEstimationsFromCloud();
  }, []);

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

  const saveEstimationToState = async () => {
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
      id: editingId || undefined,
      date: estimateDetails.date,
      estimateNo: estimateDetails.estimateNo,
      clientName: estimateDetails.partyName,
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
      totalAmount: finalAmount > 0 ? finalAmount : 0,
      amount: '₹ ' + (finalAmount > 0 ? finalAmount : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      status: existingEst ? existingEst.status : 'Pending',
      isCancelled: false
    };

    setLoading(true);
    try {
      await saveEstimation(record);
      await loadEstimationsFromCloud();
      return true;
    } catch (err) {
      console.error("Error saving estimation to cloud:", err);
      alert("Error saving estimation. Please check database connection.");
      setLoading(false);
      return false;
    }
  };

  const handleSaveOnly = async () => {
    if (await saveEstimationToState()) {
      alert(`Estimation ${estimateDetails.estimateNo} saved!`);
      setCurrentView('list');
      setEditingId(null);
    }
  };

  const handleSaveAndPrint = async () => {
    if (await saveEstimationToState()) {
      setTimeout(() => window.print(), 100);
    }
  };

  const handleEdit = (est) => {
    setEditingId(est.id);
    setTaxMode(est.taxMode || 'CGST_SGST');
    setEstimateDetails({
      partyName: est.client || est.clientName || '',
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

  const handleDuplicate = async (est) => {
    const newEst = { 
      ...est, 
      id: undefined, 
      estimateNo: generateNextEstimateNo(), 
      date: new Date().toISOString().split('T')[0],
      status: 'Pending', 
      isCancelled: false
    };
    
    setLoading(true);
    try {
      await saveEstimation(newEst);
      await loadEstimationsFromCloud();
      alert(`Estimate duplicated as ${newEst.estimateNo}!`);
    } catch (e) {
      alert("Failed to duplicate estimate.");
      setLoading(false);
    }
  };

  const handleConvertToInvoice = (est) => {
    const invoiceDraft = {
      partyName: est.client || est.clientName || '',
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
      name: est.client || est.clientName,
      company: est.projectName || 'Estimation Lead',
      email: '',
      phone: '',
      address: est.partyAddress,
      status: 'Negotiation', 
      value: est.amount || est.totalAmount,
      source: 'Estimation'
    };
    existingLeads.push(newLead);
    localStorage.setItem('jyanipur_crm_leads', JSON.stringify(existingLeads));
    alert(`${est.client || est.clientName} has been added to your CRM leads!`);
  };

  const handleToggleCancel = async (id) => {
    const est = estimationsList.find(e => e.id === id);
    if (!est) return;
    
    const updated = { ...est, isCancelled: !est.isCancelled };
    setLoading(true);
    await saveEstimation(updated);
    await loadEstimationsFromCloud();
  };

  const handleStatusChange = async (id, newStatus) => {
    const est = estimationsList.find(e => e.id === id);
    if (!est) return;

    const updated = { ...est, status: newStatus };
    await saveEstimation(updated);
    await loadEstimationsFromCloud();
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
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-zinc-400 font-medium text-xs">
                      Syncing estimations from cloud database...
                    </td>
                  </tr>
                ) : estimationsList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-zinc-500 font-medium text-xs">No estimations created yet.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  estimationsList.map((est) => (
                    <tr 
                      key={est.id || est.estimateNo} 
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
                        {est.client || est.clientName}
                      </td>
                      
                      <td className="py-4 px-6">
                        <select
                          value={est.status || 'Pending'}
                          onChange={(e) => handleStatusChange(est.id, e.target.value)}
                          disabled={est.isCancelled}
                          className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23A1A1AA%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.8rem_0.8rem] pr-7 pl-3 py-1.5 rounded-full border outline-none cursor-pointer transition-all font-semibold text-[11px] uppercase tracking-widest ${
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
                        {est.amount || `₹ ${(Number(est.totalAmount) || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`}
                      </td>
                      
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!est.isCancelled ? (
                            <>
                              <button onClick={() => handleEdit(est)} title="Edit Estimate" className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                </svg>
                                Edit
                              </button>
                              
                              <button onClick={() => handleView(est)} title="View Detail" className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                View
                              </button>

                              <button onClick={() => handlePushToCRM(est)} title="Send to CRM as Lead" className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                </svg>
                                <span className="hidden xl:inline">To CRM</span>
                              </button>
                              
                              <button onClick={() => handleDirectPrint(est)} title="Print or Save PDF" className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" />
                                </svg>
                                Print
                              </button>
                              
                              <button onClick={() => handleDuplicate(est)} title="Duplicate Estimate" className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                                </svg>
                                Copy
                              </button>

                              <button onClick={() => handleConvertToInvoice(est)} title="Convert to Tax Invoice" className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                To Invoice
                              </button>
                              
                              <button onClick={() => handleToggleCancel(est.id)} title="Cancel/Reject Estimate" className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleView(est)} className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                View
                              </button>
                              <button onClick={() => handleToggleCancel(est.id)} className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold cursor-pointer text-[10px] uppercase tracking-widest transition-all flex items-center gap-1.5">
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
    <div className="w-full font-['Poppins'] flex flex-col print:h-auto print:overflow-visible">
      
      {/* GLOBAL CSS PRINT STYLES TO INJECT PAGINATION RULES DIRECTLY INTO YOUR DESIGN */}
      <style>{`
        @media print {
          body, html {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>

      {/* TOP HEADER CONTROLS (HIDDEN ON PRINT) */}
      <div className="print:hidden flex items-center justify-between border-b border-zinc-200 pb-4 mb-6 shrink-0">
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
          <button onClick={() => window.print()} className="bg-[#B45309] text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-[#92400E] flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" />
            </svg>
            Print / PDF
          </button>
        </div>
      </div>

      {/* PRINTABLE CONTAINER WRAPPING YOUR EXACT ORIGINAL LAYOUT */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-8 shadow-sm mb-6 print:border-none print:shadow-none print:p-0">
        
        {/* Company & Estimate Header */}
        <div className="flex justify-between items-start border-b border-zinc-200 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#B45309] tracking-tight">ESTIMATION / BOQ</h1>
            <p className="text-xs text-zinc-500 font-medium mt-1">Estimate No: <strong className="text-zinc-800">{estimateDetails.estimateNo}</strong></p>
            <p className="text-xs text-zinc-500 font-medium">Date: <strong className="text-zinc-800">{estimateDetails.date}</strong></p>
            {estimateDetails.validUntil && (
              <p className="text-xs text-zinc-500 font-medium">Valid Until: <strong className="text-zinc-800">{estimateDetails.validUntil}</strong></p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-base font-bold text-zinc-900">{companySettings.companyName || 'Jyanipur Interiors'}</h2>
            <p className="text-xs text-zinc-500 whitespace-pre-line mt-0.5">{companySettings.address || ''}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{companySettings.email || ''} {companySettings.phone ? `| ${companySettings.phone}` : ''}</p>
          </div>
        </div>

        {/* Client & Project Details */}
        <div className="grid grid-cols-2 gap-6 bg-zinc-50 p-4 rounded-xl border border-zinc-100 mb-6">
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Billed To:</p>
            <p className="text-sm font-bold text-zinc-900">{estimateDetails.partyName || '[Client Name]'}</p>
            {estimateDetails.partyAddress && <p className="text-xs text-zinc-600 mt-0.5">{estimateDetails.partyAddress}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Project Details:</p>
            <p className="text-sm font-bold text-zinc-900">{estimateDetails.projectName || '[Project Name]'}</p>
          </div>
        </div>

        {/* INPUT FIELDS SECTION (Hidden during print view or rendered clean) */}
        <div className="print:hidden space-y-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className={labelClass}>Client Name *</label>
              <input 
                type="text" 
                value={estimateDetails.partyName} 
                onChange={e => setEstimateDetails({...estimateDetails, partyName: e.target.value})} 
                placeholder="e.g. Rahul Sharma" 
                disabled={isReadOnly}
                className={`${inputClass} ${errors.partyName ? 'border-red-500' : ''}`} 
              />
            </div>
            <div>
              <label className={labelClass}>Project / Site Name</label>
              <input 
                type="text" 
                value={estimateDetails.projectName} 
                onChange={e => setEstimateDetails({...estimateDetails, projectName: e.target.value})} 
                placeholder="e.g. Flagship Store Interior" 
                disabled={isReadOnly}
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass}>Site Address</label>
              <input 
                type="text" 
                value={estimateDetails.partyAddress} 
                onChange={e => setEstimateDetails({...estimateDetails, partyAddress: e.target.value})} 
                placeholder="e.g. Commercial St, Mumbai" 
                disabled={isReadOnly}
                className={inputClass} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div>
              <label className={labelClass}>Estimate No. *</label>
              <input 
                type="text" 
                value={estimateDetails.estimateNo} 
                onChange={e => setEstimateDetails({...estimateDetails, estimateNo: e.target.value})} 
                disabled={isReadOnly}
                className={`${inputClass} ${errors.estimateNo ? 'border-red-500' : ''}`} 
              />
            </div>
            <div>
              <label className={labelClass}>Estimate Date</label>
              <input 
                type="date" 
                value={estimateDetails.date} 
                onChange={e => setEstimateDetails({...estimateDetails, date: e.target.value})} 
                disabled={isReadOnly}
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass}>Valid Until</label>
              <input 
                type="date" 
                value={estimateDetails.validUntil} 
                onChange={e => setEstimateDetails({...estimateDetails, validUntil: e.target.value})} 
                disabled={isReadOnly}
                className={inputClass} 
              />
            </div>
            <div>
              <label className={labelClass}>Tax Type</label>
              <select 
                value={taxMode} 
                onChange={e => setTaxMode(e.target.value)} 
                disabled={isReadOnly}
                className={inputClass}
              >
                <option value="CGST_SGST">GST (CGST + SGST)</option>
                <option value="IGST">IGST</option>
                <option value="NONE">No Tax (Quotation Only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* LINE ITEMS TABLE (With Multi-Page Header Repeat and Row Break Prevention) */}
        <div className="mb-6">
          <div className="print:hidden flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Line Items / BOQ</h3>
            {!isReadOnly && (
              <button onClick={addItem} className="bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer">
                + Add BOQ Line Item
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-[10px] text-zinc-400 uppercase bg-zinc-50/50 print:bg-zinc-100">
                  <th className="py-2.5 px-2">Description</th>
                  <th className="py-2.5 px-2 w-20 text-center">Unit</th>
                  <th className="py-2.5 px-2 w-14 text-center print:hidden">L</th>
                  <th className="py-2.5 px-2 w-14 text-center print:hidden">B</th>
                  <th className="py-2.5 px-2 w-14 text-center print:hidden">No</th>
                  <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                  <th className="py-2.5 px-2 w-24 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-2 w-28 text-right">Amount (₹)</th>
                  {!isReadOnly && <th className="py-2.5 px-2 w-10 print:hidden"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item, index) => {
                  const rCalc = calculateRow(item);
                  return (
                    <tr key={item.id || index} className="text-xs">
                      {/* Screen mode row input */}
                      <td className="py-2 px-2 print:hidden">
                        <input 
                          type="text" 
                          value={item.description} 
                          onChange={e => updateItem(item.id, 'description', e.target.value)} 
                          placeholder="Scope of work description..." 
                          disabled={isReadOnly}
                          className={inputClass} 
                        />
                      </td>
                      <td className="py-2 px-2 print:hidden">
                        <select 
                          value={item.unit} 
                          onChange={e => updateItem(item.id, 'unit', e.target.value)} 
                          disabled={isReadOnly}
                          className={inputClass}
                        >
                          <option value="Sq.Ft.">Sq.Ft.</option>
                          <option value="R.Ft.">R.Ft.</option>
                          <option value="Nos">Nos</option>
                          <option value="Cu.Ft.">Cu.Ft.</option>
                          <option value="L.S.">L.S.</option>
                          <option value="Set">Set</option>
                          <option value="Kg">Kg</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 print:hidden"><input type="number" value={item.sizeL} onChange={e => updateItem(item.id, 'sizeL', e.target.value)} disabled={isReadOnly} className={inputClass} /></td>
                      <td className="py-2 px-2 print:hidden"><input type="number" value={item.sizeB} onChange={e => updateItem(item.id, 'sizeB', e.target.value)} disabled={isReadOnly} className={inputClass} /></td>
                      <td className="py-2 px-2 print:hidden"><input type="number" value={item.no} onChange={e => updateItem(item.id, 'no', e.target.value)} disabled={isReadOnly} className={inputClass} /></td>
                      <td className="py-2 px-2 print:hidden"><input type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)} disabled={isReadOnly} className={inputClass} /></td>
                      <td className="py-2 px-2 print:hidden"><input type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)} disabled={isReadOnly} className={inputClass} /></td>
                      
                      {/* Print mode static view cells for exact original design fidelity */}
                      <td className="hidden print:table-cell py-3 px-2 text-zinc-900 font-medium">{item.description}</td>
                      <td className="hidden print:table-cell py-3 px-2 text-center text-zinc-600">{item.unit}</td>
                      <td className="py-2 px-2 text-center text-zinc-700 font-medium">{item.qty || 1}</td>
                      <td className="py-2 px-2 text-right text-zinc-600">{Number(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-2 px-2 text-right font-bold text-zinc-900">
                        ₹ {rCalc.baseAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                      {!isReadOnly && (
                        <td className="py-2 px-2 text-center print:hidden">
                          {items.length > 1 && (
                            <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 font-bold p-1">✕</button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER TOTALS & BANK DETAILS */}
        <div className="pt-6 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          <div className="space-y-4">
            {!isReadOnly ? (
              <div className="print:hidden">
                <label className={labelClass}>Discount Amount (₹)</label>
                <input 
                  type="number" 
                  value={estimateDetails.discount} 
                  onChange={e => setEstimateDetails({...estimateDetails, discount: e.target.value})} 
                  className={inputClass} 
                  placeholder="0.00"
                />
              </div>
            ) : null}

            <div className="text-[11px] text-zinc-600 space-y-1">
              <p className="font-bold uppercase text-[10px] text-zinc-700">Amount in Words:</p>
              <p className="font-medium">{numberToWords(finalAmount)}</p>
            </div>

            <div className="text-[11px] text-zinc-600 space-y-1 pt-2">
              <p className="font-bold uppercase text-[10px] text-zinc-700">Terms & Conditions:</p>
              <p className="whitespace-pre-line leading-relaxed">{estimateDetails.terms}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 space-y-2 text-right">
              <div className="flex justify-between text-xs text-zinc-600">
                <span>Subtotal:</span>
                <span>₹ {totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              {parseFloat(estimateDetails.discount) > 0 && (
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>Discount:</span>
                  <span>- ₹ {parseFloat(estimateDetails.discount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-zinc-900 border-t border-zinc-200 pt-2">
                <span>Grand Total:</span>
                <span className="text-[#B45309]">₹ {finalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
            </div>

            <div className="text-[11px] text-zinc-600 space-y-0.5 border border-zinc-100 p-3 rounded-xl bg-zinc-50/50">
              <p className="font-bold uppercase text-[10px] text-zinc-700 mb-1">Bank Details:</p>
              <p><strong>Bank:</strong> {estimateDetails.bankName}</p>
              <p><strong>A/c Name:</strong> {estimateDetails.accountName}</p>
              <p><strong>A/c No:</strong> {estimateDetails.accountNo}</p>
              <p><strong>IFSC Code:</strong> {estimateDetails.ifscCode}</p>
            </div>
          </div>

        </div>

        {/* SCREEN ACTION BUTTONS (Hidden on print) */}
        {!isReadOnly && (
          <div className="print:hidden mt-8 pt-6 border-t border-zinc-200 flex justify-end gap-3">
            <button onClick={handleSaveOnly} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer">
              Save Draft
            </button>
            <button onClick={handleSaveAndPrint} className="bg-[#B45309] hover:bg-[#92400E] text-white px-6 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm">
              Save & Print PDF
            </button>
          </div>
        )}

      </div>

    </div>
  );
}