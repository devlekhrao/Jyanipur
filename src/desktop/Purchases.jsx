import React, { useState, useEffect, useRef } from 'react';
import { getPurchases, savePurchase, deletePurchase, updatePurchaseStatus, saveMaterialRate, getVendors } from '../db';

function getFinancialYear(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

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
  if (decimalPart > 0) result += 'and ' + inWords(decimalPart) + 'Paise ';
  return result.trim() + ' Only';
}

export default function Purchases({ companySettings = {} }) {
  const [currentView, setCurrentView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  
  // Vendor Suggestions State
  const [vendorsList, setVendorsList] = useState([]);
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const vendorDropdownRef = useRef(null);

  // Filters for GSTR-2B
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [searchQuery, setSearchQuery] = useState('');

  const getFirstDay = (y, m) => new Date(y, m - 1, 1).toISOString().split('T')[0];
  const getLastDay = (y, m) => new Date(y, m, 0).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(getFirstDay(currentYear, currentMonth));
  const [endDate, setEndDate] = useState(getLastDay(currentYear, currentMonth));

  const [taxMode, setTaxMode] = useState('CGST_SGST');
  const [purchaseDetails, setPurchaseDetails] = useState({
    vendorName: '', 
    gstin: '', 
    projectName: '', 
    invoiceNo: '', 
    invoiceDate: new Date().toISOString().split('T')[0], 
    remarks: ''
  });

  const [items, setItems] = useState([
    { id: 1, materialName: '', hsn: '', qty: '', unit: 'Pcs', rate: '', gst: 18 },
  ]);

  const [errors, setErrors] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [purData, vData] = await Promise.all([
        getPurchases(),
        getVendors ? getVendors() : Promise.resolve([])
      ]);
      setPurchases(purData || []);
      setVendorsList(vData || []);
    } catch (e) {
      console.warn("Ensure getPurchases & getVendors are implemented in db.js");
      setPurchases([]);
      setVendorsList([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Close vendor suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target)) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVendorInputChange = (e) => {
    const val = e.target.value;
    setPurchaseDetails(prev => ({ ...prev, vendorName: val }));
    if (errors.vendorName) setErrors(prev => ({ ...prev, vendorName: false }));

    if (val.trim().length > 0) {
      const matches = vendorsList.filter(v => 
        v.name && v.name.toLowerCase().includes(val.toLowerCase())
      );
      setVendorSuggestions(matches);
      setShowVendorDropdown(matches.length > 0);
    } else {
      setVendorSuggestions([]);
      setShowVendorDropdown(false);
    }
  };

  const handleSelectVendor = (vendor) => {
    const isIgst = vendor.state && vendor.state.includes('IGST');
    setPurchaseDetails(prev => ({
      ...prev,
      vendorName: vendor.name,
      gstin: vendor.gstin || ''
    }));
    setTaxMode(isIgst ? 'IGST' : 'CGST_SGST');
    setShowVendorDropdown(false);
  };

  const handleMonthChange = (e) => {
    const m = Number(e.target.value);
    setSelectedMonth(m);
    setStartDate(getFirstDay(selectedYear, m));
    setEndDate(getLastDay(selectedYear, m));
  };

  const handleYearChange = (e) => {
    const y = Number(e.target.value);
    setSelectedYear(y);
    setStartDate(getFirstDay(y, selectedMonth));
    setEndDate(getLastDay(y, selectedMonth));
  };

  const filteredPurchases = purchases.filter(p => {
    if (!p.invoiceDate) return false;
    const inDateRange = p.invoiceDate >= startDate && p.invoiceDate <= endDate;
    if (!inDateRange) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        (p.invoiceNo && p.invoiceNo.toLowerCase().includes(q)) ||
        (p.vendorName && p.vendorName.toLowerCase().includes(q)) ||
        (p.gstin && p.gstin.toLowerCase().includes(q)) ||
        (p.projectName && p.projectName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalTaxable = filteredPurchases.reduce((sum, p) => sum + (p.taxableAmount || 0), 0);
  const totalGst = filteredPurchases.reduce((sum, p) => sum + (p.gstAmount || 0), 0);
  const totalGross = filteredPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);

  const addItem = () => setItems([...items, { id: Date.now(), materialName: '', hsn: '', qty: '', unit: 'Pcs', rate: '', gst: 18 }]);
  
  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const calculateRow = (item) => {
    const quantity = parseFloat(item.qty) || 0;
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

  const savePurchaseToState = async () => {
    const newErrors = {};
    if (!purchaseDetails.vendorName) newErrors.vendorName = true;
    if (!purchaseDetails.invoiceNo) newErrors.invoiceNo = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Fill required fields: Vendor Name & Invoice No.');
      return false;
    }

    setErrors({});
    const existingPur = purchases.find(e => e.id === editingId);

    const record = {
      id: editingId || Date.now(),
      vendorName: purchaseDetails.vendorName,
      gstin: purchaseDetails.gstin,
      projectName: purchaseDetails.projectName,
      invoiceNo: purchaseDetails.invoiceNo,
      invoiceDate: purchaseDetails.invoiceDate,
      fy: getFinancialYear(purchaseDetails.invoiceDate),
      taxMode: taxMode,
      items: items,
      remarks: purchaseDetails.remarks,
      taxableAmount: totals.subtotal,
      gstAmount: totals.totalGst,
      totalAmount: totals.grandTotal,
      returnStatus: existingPur ? existingPur.returnStatus : 'Pending',
      isCancelled: existingPur ? existingPur.isCancelled : false
    };

    try {
      await savePurchase(record);
      
      // Auto-feed line items to Rate Book
      for (const item of items) {
        if (item.materialName && item.rate > 0) {
          await saveMaterialRate({
            materialName: item.materialName,
            vendorName: purchaseDetails.vendorName,
            rate: parseFloat(item.rate),
            unit: item.unit,
            date: purchaseDetails.invoiceDate,
            notes: `Auto-logged from Bill ${purchaseDetails.invoiceNo || 'N/A'}${item.hsn ? ` (HSN: ${item.hsn})` : ''}`
          });
        }
      }

      await loadData();
      return true;
    } catch (err) {
      alert('Failed to save to Database. Check connection.');
      return false;
    }
  };

  const handleSaveOnly = async () => {
    if (await savePurchaseToState()) {
      alert(`Purchase Bill ${purchaseDetails.invoiceNo} saved! Rate Book updated.`);
      handleClear(false);
      setCurrentView('list');
    }
  };

  const handleSaveAndPrint = async () => {
    if (await savePurchaseToState()) {
      setTimeout(() => window.print(), 100);
    }
  };

  const handleEdit = (pur) => {
    setEditingId(pur.id);
    setTaxMode(pur.taxMode || 'CGST_SGST');
    setPurchaseDetails({
      vendorName: pur.vendorName || '',
      gstin: pur.gstin || '',
      projectName: pur.projectName || '',
      invoiceNo: pur.invoiceNo || '',
      invoiceDate: pur.invoiceDate || new Date().toISOString().split('T')[0],
      remarks: pur.remarks || ''
    });
    setItems(pur.items && pur.items.length > 0 ? pur.items : [{ id: 1, materialName: '', hsn: '', qty: '', unit: 'Pcs', rate: '', gst: 18 }]);
    setCurrentView('form');
  };

  const handleView = (pur) => {
    handleEdit(pur);
    setCurrentView('view');
  };

  const handleDirectPrint = (pur) => {
    handleEdit(pur);
    setTimeout(() => window.print(), 150);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Permanently delete this purchase record?")) {
      await deletePurchase(id);
      await loadData();
    }
  };

  const handleStatusChange = async (pur, newStatus) => {
    try {
      await updatePurchaseStatus(pur.id, newStatus);
      await loadData();
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the entire bill?')) {
      setEditingId(null);
      setPurchaseDetails({ 
        vendorName: '', gstin: '', projectName: '', invoiceNo: '', invoiceDate: new Date().toISOString().split('T')[0], remarks: ''
      });
      setItems([{ id: 1, materialName: '', hsn: '', qty: '', unit: 'Pcs', rate: '', gst: 18 }]);
      setErrors({});
      setShowVendorDropdown(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 ml-0.5";

  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col print:hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
        
        {/* Header & Filters */}
        <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Purchases & Inward Supplies</h2>
            <p className="text-zinc-500 text-xs mt-0.5 font-medium">Log vendor bills, assign to projects, and track ITC.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3.5 shadow-sm w-full md:w-auto">
              <span className="text-xs text-zinc-400">🔍</span>
              <input type="text" placeholder="Search vendor, project..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none text-xs font-medium text-zinc-800 outline-none px-2 w-full md:w-44 placeholder:text-zinc-400" />
            </div>

            <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3 shadow-sm">
              <select value={selectedMonth} onChange={handleMonthChange} className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer px-1">
                {Array.from({length: 12}, (_, i) => (
                  <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
                ))}
              </select>
              <select value={selectedYear} onChange={handleYearChange} className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer pr-1">
                <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
                <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
                <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
              </select>
            </div>

            <button onClick={() => { handleClear(false); setCurrentView('form'); }} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 h-10">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Log Purchase Bill
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Taxable Value (2B)</span>
            <p className="text-xl font-bold text-zinc-900">₹ {totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Input Tax Credit (ITC)</span>
            <p className="text-xl font-bold text-emerald-600">₹ {totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Purchases</span>
            <p className="text-xl font-bold text-[#B45309]">₹ {totalGross.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          </div>
        </div>

        {/* Table View */}
        <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-white text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200">
                  <th className="py-4 px-6 font-bold">Date</th>
                  <th className="py-4 px-6 font-bold">Inv No.</th>
                  <th className="py-4 px-6 font-bold">Vendor</th>
                  <th className="py-4 px-6 font-bold">Project</th>
                  <th className="py-4 px-6 font-bold text-right">Taxable</th>
                  <th className="py-4 px-6 font-bold text-right">ITC (GST)</th>
                  <th className="py-4 px-6 font-bold text-right">Total Amt</th>
                  <th className="py-4 px-6 font-bold text-center">Status</th>
                  <th className="py-4 px-6 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {loading ? (
                  <tr><td colSpan="9" className="py-12 text-center text-zinc-400 font-medium text-xs">Loading purchases...</td></tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-zinc-400 font-medium text-xs">
                      No purchases found for this period. Click '+ Log Purchase Bill' above.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((pur) => (
                    <tr key={pur.id} className="transition-all hover:bg-zinc-50/80">
                      <td className="py-4 px-6 text-xs font-medium text-zinc-600">{pur.invoiceDate}</td>
                      <td className="py-4 px-6 font-bold text-xs text-[#B45309]">{pur.invoiceNo}</td>
                      <td className="py-4 px-6 text-xs font-semibold text-zinc-800">{pur.vendorName}</td>
                      <td className="py-4 px-6 text-xs font-medium text-zinc-500 truncate max-w-[120px]">{pur.projectName || '-'}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-zinc-700">₹{pur.taxableAmount?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-bold text-xs text-emerald-600">₹{pur.gstAmount?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-semibold text-xs text-zinc-900">₹{pur.totalAmount?.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      
                      <td className="py-4 px-6 text-center">
                        <select
                          value={pur.returnStatus || 'Pending'}
                          onChange={(e) => handleStatusChange(pur, e.target.value)}
                          className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23A1A1AA%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.6rem_center] bg-[length:0.8rem_0.8rem] pr-7 pl-3 py-1.5 rounded-full border outline-none cursor-pointer transition-all text-[11px] uppercase tracking-widest ${
                            pur.returnStatus === '2B Matched' ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-2 focus:ring-blue-500/20' :
                            pur.returnStatus === 'ITC Claimed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-2 focus:ring-emerald-500/20' :
                            'bg-amber-50 text-[#B45309] border-amber-200 focus:ring-2 focus:ring-[#B45309]/20'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="2B Matched">2B Matched</option>
                          <option value="ITC Claimed">ITC Claimed</option>
                        </select>
                      </td>
                      
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(pur)} title="Edit Bill" className="px-3 py-1.5 bg-amber-50 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-amber-200/60 rounded-lg font-semibold text-[10px] cursor-pointer uppercase tracking-widest transition-all flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                            Edit
                          </button>
                          <button onClick={() => handleView(pur)} title="View Detail" className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-semibold text-[10px] cursor-pointer uppercase tracking-widest transition-all flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            View
                          </button>
                          <button onClick={() => handleDirectPrint(pur)} title="Print Voucher" className="px-3 py-1.5 bg-zinc-50 text-zinc-600 hover:bg-zinc-200 border border-zinc-200 rounded-lg font-semibold text-[10px] cursor-pointer uppercase tracking-widest transition-all flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" /></svg>
                            Print
                          </button>
                          <button onClick={() => handleDelete(pur.id)} title="Delete Purchase" className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg font-semibold text-[10px] cursor-pointer uppercase tracking-widest transition-all flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
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
  // RENDER 2: FORM VIEW (CREATE / EDIT / VIEW)
  // ==========================================
  return (
    <div className="w-full h-full flex flex-col print:hidden" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* SCREEN FORM VIEW (HIDDEN ON PRINT) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-6 shrink-0">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            {isReadOnly ? `Viewing Purchase ${purchaseDetails.invoiceNo}` : editingId ? `Edit Purchase ${purchaseDetails.invoiceNo}` : 'Log New Purchase'}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-600 hover:text-zinc-900 text-xs font-bold transition-colors cursor-pointer bg-white px-4 py-2 rounded-xl border border-zinc-200 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </button>
            {isReadOnly && (
              <button onClick={() => window.print()} className="bg-[#B45309] text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-[#92400E] flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" /></svg>
                Print Voucher
              </button>
            )}
          </div>
        </div>

        {/* METADATA WITH VENDOR AUTOCOMPLETE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 shrink-0">
          <div className="md:col-span-2 relative" ref={vendorDropdownRef}>
            <label className={labelClass}>Vendor Name <span className="text-red-500">*</span></label>
            <input 
              disabled={isReadOnly} 
              type="text" 
              value={purchaseDetails.vendorName} 
              onChange={handleVendorInputChange} 
              onFocus={() => {
                if (vendorSuggestions.length > 0) setShowVendorDropdown(true);
              }}
              className={`${inputClass} ${errors.vendorName ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} 
              placeholder="Supplier / Shop Name (Type to search)" 
              autoComplete="off"
            />
            
            {/* VENDOR AUTOCOMPLETE DROPDOWN */}
            {showVendorDropdown && !isReadOnly && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-[120] max-h-52 overflow-y-auto">
                <div className="p-2 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  Saved Vendors ({vendorSuggestions.length})
                </div>
                {vendorSuggestions.map((v) => (
                  <div
                    key={v.id || v.name}
                    onClick={() => handleSelectVendor(v)}
                    className="px-4 py-2.5 hover:bg-amber-50 cursor-pointer flex justify-between items-center transition-colors border-b border-zinc-50 last:border-none"
                  >
                    <div>
                      <p className="font-semibold text-xs text-zinc-900">{v.name}</p>
                      {v.tradeCategory && <p className="text-[10px] text-zinc-400 font-medium">{v.tradeCategory}</p>}
                    </div>
                    {v.gstin ? (
                      <span className="text-[10px] font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-600 font-semibold">
                        {v.gstin}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 italic">No GST</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelClass}>Vendor GSTIN</label>
            <input disabled={isReadOnly} type="text" value={purchaseDetails.gstin} onChange={(e) => setPurchaseDetails({...purchaseDetails, gstin: e.target.value.toUpperCase()})} className={`${inputClass} font-mono uppercase`} maxLength="15" placeholder="Optional" />
          </div>
          <div>
            <label className={labelClass}>Project / Site (Cost Center)</label>
            <input disabled={isReadOnly} type="text" value={purchaseDetails.projectName} onChange={(e) => setPurchaseDetails({...purchaseDetails, projectName: e.target.value})} className={inputClass} placeholder="e.g. Reliance Flagship" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
          <div>
            <label className={labelClass}>Bill / Invoice No. <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={purchaseDetails.invoiceNo} onChange={(e) => { setPurchaseDetails({...purchaseDetails, invoiceNo: e.target.value}); if(errors.invoiceNo) setErrors({...errors, invoiceNo: false}); }} className={`${inputClass} ${errors.invoiceNo ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} placeholder="e.g. INV-1234" />
          </div>
          <div>
            <label className={labelClass}>Bill Date</label>
            <input disabled={isReadOnly} type="date" value={purchaseDetails.invoiceDate} onChange={(e) => setPurchaseDetails({...purchaseDetails, invoiceDate: e.target.value})} className={inputClass} />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Tax Type</label>
            <select 
              disabled={isReadOnly}
              value={taxMode} 
              onChange={(e) => setTaxMode(e.target.value)}
              className={`${inputClass} cursor-pointer font-bold text-[#B45309] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%23B45309%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
            >
              <option value="CGST_SGST">CGST + SGST (Intra-State)</option>
              <option value="IGST">IGST (Inter-State)</option>
              <option value="NONE">Non-GST / Exempt (0%)</option>
            </select>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="mb-6 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm shrink-0">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-3 border-b border-zinc-100 pb-2">Material Items (Auto-Syncs to Rate Book)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="text-zinc-400 text-[10px] uppercase tracking-wider border-b border-zinc-100 pb-3">
                  <th className="py-2.5 pr-4 font-bold">Material / Item Description</th>
                  <th className="py-2.5 px-2 font-bold w-20 text-center">HSN</th>
                  <th className="py-2.5 px-2 font-bold w-24 text-center">Qty</th>
                  <th className="py-2.5 px-2 font-bold w-20 text-center">Unit</th>
                  <th className="py-2.5 px-2 font-bold w-28 text-right">Rate (₹)</th>
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
                      <td className="py-2 pr-4"><input disabled={isReadOnly} type="text" placeholder="e.g. 18mm Plywood" value={item.materialName} onChange={(e) => updateItem(item.id, 'materialName', e.target.value)} className={tInp} /></td>
                      <td className="py-2 px-2"><input disabled={isReadOnly} type="text" placeholder="Optional" value={item.hsn} onChange={(e) => updateItem(item.id, 'hsn', e.target.value)} className={`${tInp} text-center font-mono`} /></td>
                      <td className="py-2 px-2">
                        <input disabled={isReadOnly} type="number" step="any" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} className={`${tInp} text-center font-bold text-[#B45309]`} placeholder="0" />
                      </td>
                      <td className="py-2 px-2">
                        <select disabled={isReadOnly} value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.25rem_center] bg-[length:0.75rem_0.75rem] pr-4`}>
                          <option value="Pcs">Pcs</option><option value="Sq.Ft.">Sq.Ft.</option><option value="Rft.">Rft.</option><option value="Ltrs">Ltrs</option><option value="Bags">Bags</option><option value="Kgs">Kgs</option><option value="L.S.">L.S.</option>
                        </select>
                      </td>
                      <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className={`${tInp} text-right`} placeholder="0.00" /></td>
                      <td className="py-2 px-2 text-right text-xs font-semibold text-zinc-800">{rowCalc.baseAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                      {taxMode !== 'NONE' && (
                        <td className="py-2 px-2">
                          <select disabled={isReadOnly} value={item.gst} onChange={(e) => updateItem(item.id, 'gst', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.25rem_center] bg-[length:0.75rem_0.75rem] pr-4`}>
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
          </div>
          {!isReadOnly && (
            <button onClick={addItem} className="mt-4 text-[#B45309] hover:text-[#92400E] text-[10px] font-semibold text-[11px] uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Add Material Row
            </button>
          )}
        </div>

        {/* BOTTOM SECTION */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0">
          <div className="flex-1 space-y-5">
            <div>
              <label className={labelClass}>Internal Remarks / Notes</label>
              <textarea disabled={isReadOnly} value={purchaseDetails.remarks} onChange={(e) => setPurchaseDetails({...purchaseDetails, remarks: e.target.value})} className={`${inputClass} resize-y min-h-[80px] py-3`} placeholder="Note any discrepancies, transport costs, or specific project locations here."></textarea>
            </div>
          </div>

          {/* TOTALS SUMMARY DECK */}
          <div className="w-full lg:w-80 flex flex-col justify-between">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 text-zinc-800 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Taxable Value:</span><span className="font-semibold text-zinc-900">₹ {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between text-xs"><span className="text-zinc-500">IGST (ITC):</span><span className="font-semibold text-emerald-600">₹ {totals.totalGst.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
              ) : taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between text-xs"><span className="text-zinc-500">CGST (ITC):</span><span className="font-semibold text-emerald-600">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-zinc-500">SGST (ITC):</span><span className="font-semibold text-emerald-600">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
                </>
              ) : null}

              <div className="flex justify-between text-base font-semibold text-[11px] border-t border-zinc-200 pt-3">
                <span>Total Bill Value:</span><span className="text-[#B45309]">₹ {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveOnly} className="flex-1 py-3 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer">Save Purchase Bill</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PERFECT A4 PRINT VIEW */}
      <div className="hidden print:flex w-full bg-white text-black font-['Poppins'] text-xs print:p-0 print:m-0 flex-col items-center justify-between" style={{ minHeight: '100vh' }}>
        
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 0; size: A4 portrait; }
            body { padding: 0 !important; background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img { mix-blend-mode: multiply !important; }
          }
        `}} />

        <div className="w-full bg-white flex flex-col relative flex-1 print:p-[15mm]">
          
          <div className="flex justify-between items-start border-b border-gray-300 pb-5 mb-6">
            <div className="flex items-center gap-4">
              {companySettings?.logoUrl && (
                <img src={companySettings.logoUrl} className="h-14 w-auto object-contain shrink-0" alt="Logo" />
              )}
              <div>
                <h1 className="text-lg font-bold text-black">{companySettings?.companyName || 'Company Name'}</h1>
                <p className="text-[10px] text-gray-800 mt-1">
                  <span className="font-semibold">GSTIN:</span> {companySettings?.companyGst}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Inward Supply / Purchase Voucher</span>
              <h2 className="text-lg font-bold text-black">{purchaseDetails.invoiceNo || 'INV-000'}</h2>
              <p className="text-[10px] text-gray-800 mt-1"><span className="font-semibold">Date:</span> {purchaseDetails.invoiceDate}</p>
            </div>
          </div>

          <div className="flex justify-between mb-8">
            <div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Purchased From (Vendor)</span>
              <h3 className="text-sm font-bold text-black uppercase">{purchaseDetails.vendorName || 'Vendor Name'}</h3>
              {purchaseDetails.gstin && <p className="text-[10px] text-gray-800 font-bold mt-1.5">GSTIN: <span className="font-medium text-gray-600">{purchaseDetails.gstin.toUpperCase()}</span></p>}
            </div>

            <div className="text-right space-y-1 text-[10px]">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Internal Tracking</span>
              <p className="text-gray-800"><span className="font-semibold">Allocated Project:</span> {purchaseDetails.projectName || 'Unassigned / Inventory'}</p>
              <p className="text-gray-800"><span className="font-semibold">Logged On:</span> {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* ITEM TABLE */}
          <table className="w-full text-left border-collapse border border-gray-300 mb-6">
            <thead className="bg-gray-50 border-b border-gray-300">
              <tr className="text-gray-700 text-[10px] uppercase font-semibold">
                <th className="py-2 px-2 text-center w-8 border-r border-gray-200">#</th>
                <th className="py-2 px-3 border-r border-gray-200">Material Description</th>
                <th className="py-2 px-2 text-center w-16 border-r border-gray-200">HSN</th>
                <th className="py-2 px-2 text-center w-16 border-r border-gray-200">Qty</th>
                <th className="py-2 px-2 text-right w-20 border-r border-gray-200">Rate</th>
                {taxMode !== 'NONE' && <th className="py-2 px-2 text-center w-12 border-r border-gray-200">Tax</th>}
                <th className="py-2 px-3 text-right w-24">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[10px] text-black">
              {items.map((item, index) => {
                const row = calculateRow(item);
                if (!item.materialName) return null;
                return (
                  <tr key={item.id} className="break-inside-avoid">
                    <td className="py-2 px-2 text-center text-gray-500 border-r border-gray-200">{index + 1}</td>
                    <td className="py-2 px-3 border-r border-gray-200 font-medium">{item.materialName}</td>
                    <td className="py-2 px-2 text-center border-r border-gray-200">{item.hsn || '-'}</td>
                    <td className="py-2 px-2 text-center font-medium border-r border-gray-200">{row.quantity} {item.unit}</td>
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
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Bill Amount in Words</span>
              <p className="text-[10px] font-medium text-black capitalize">{numberToWords(totals.grandTotal)}</p>
              
              {purchaseDetails.remarks && (
                <div className="mt-6">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Internal Remarks</span>
                  <p className="text-[10px] text-gray-800">{purchaseDetails.remarks}</p>
                </div>
              )}
            </div>
            
            <div className="w-64 space-y-1.5 text-xs text-black border border-gray-300 rounded p-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Taxable Value:</span>
                <span className="font-medium">₹{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">IGST (ITC):</span>
                  <span className="font-medium">₹{totals.totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              ) : taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">CGST (ITC):</span><span className="font-medium">₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-1.5">
                    <span className="text-gray-600">SGST (ITC):</span><span className="font-medium">₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                </>
              ) : null}
              
              <div className="flex justify-between font-bold text-base pt-2 mt-2 border-t border-gray-300">
                <span>Total Bill Value:</span><span>₹{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          <div className="mt-auto pt-16 flex justify-between items-end break-inside-avoid">
            <div className="text-center w-48 border-t border-gray-400 pt-1">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Store Manager / Receiver</p>
            </div>
            <div className="text-center w-48 border-t border-gray-400 pt-1">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">Accounts Dept. (Verified)</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}