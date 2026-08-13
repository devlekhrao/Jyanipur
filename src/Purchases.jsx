import React, { useState, useEffect, useRef } from 'react';
import { getPurchases, savePurchase, deletePurchase, updatePurchaseStatus, saveMaterialRate } from './db';

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

export default function Purchases() {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef(null);
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState([]);

  const getFirstDay = (y, m) => new Date(y, m - 1, 1).toISOString().split('T')[0];
  const getLastDay = (y, m) => new Date(y, m, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(getFirstDay(currentYear, currentMonth));
  const [endDate, setEndDate] = useState(getLastDay(currentYear, currentMonth));

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBill, setNewBill] = useState({
    invoiceDate: currentDate.toISOString().split('T')[0],
    invoiceNo: '',
    vendorName: '',
    gstin: '',
    gstType: 'CGST/SGST',
    returnStatus: 'Pending'
  });
  
  const [billItems, setBillItems] = useState([
    { materialName: '', hsn: '', qty: '', rate: '', unit: 'Pcs', gstPercent: 18 }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPurchases();
      setPurchases(data || []);
    } catch (e) {
      console.warn("Ensure getPurchases is implemented in db.js");
      setPurchases([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) setExportMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        (p.hsn && p.hsn.toLowerCase().includes(q)) ||
        (p.returnStatus && p.returnStatus.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalTaxable = filteredPurchases.reduce((sum, p) => sum + p.taxableAmount, 0);
  const totalGst = filteredPurchases.reduce((sum, p) => sum + p.gstAmount, 0);
  const totalGross = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  // --- Dynamic Calculations for Modal ---
  const enhancedItems = billItems.map(item => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const gstPercent = parseFloat(item.gstPercent) || 0;
    const taxable = qty * rate;
    const gstAmt = taxable * (gstPercent / 100);
    return { ...item, taxable, gstAmt, total: taxable + gstAmt };
  });

  const liveTaxable = enhancedItems.reduce((sum, i) => sum + i.taxable, 0);
  const liveGstAmount = enhancedItems.reduce((sum, i) => sum + i.gstAmt, 0);
  const liveTotalAmount = liveTaxable + liveGstAmount;

  const addItemRow = () => {
    setBillItems([...billItems, { materialName: '', hsn: '', qty: '', rate: '', unit: 'Pcs', gstPercent: 18 }]);
  };

  const updateItemRow = (index, field, value) => {
    const updated = [...billItems];
    updated[index][field] = value;
    setBillItems(updated);
  };

  const removeItemRow = (index) => {
    if (billItems.length === 1) return;
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();
    if (!newBill.invoiceDate || !newBill.vendorName || billItems.length === 0 || liveTaxable === 0) {
      alert("Please complete vendor details and add at least one valid item.");
      return;
    }

    const primaryHsn = enhancedItems.find(i => i.hsn)?.hsn || 'MIXED';

    const payload = {
      ...newBill,
      fy: getFinancialYear(newBill.invoiceDate),
      hsn: primaryHsn,
      taxableAmount: liveTaxable,
      gstPercent: 0,
      gstAmount: liveGstAmount,
      totalAmount: liveTotalAmount,
      items: JSON.stringify(enhancedItems)
    };

    try {
      await savePurchase(payload);

      for (const item of enhancedItems) {
        if (item.materialName && item.rate > 0) {
          await saveMaterialRate({
            materialName: item.materialName,
            vendorName: newBill.vendorName,
            rate: item.rate,
            unit: item.unit,
            date: newBill.invoiceDate,
            notes: `Auto-logged from Bill ${newBill.invoiceNo || 'N/A'}${item.hsn ? ` (HSN: ${item.hsn})` : ''}`
          });
        }
      }

      await loadData();
      setIsModalOpen(false);
      setNewBill({ invoiceDate: currentDate.toISOString().split('T')[0], invoiceNo: '', vendorName: '', gstin: '', gstType: 'CGST/SGST', returnStatus: 'Pending' });
      setBillItems([{ materialName: '', hsn: '', qty: '', rate: '', unit: 'Pcs', gstPercent: 18 }]);
    } catch (err) {
      alert("Failed to save bill. Check DB connection.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this purchase record?")) {
      await deletePurchase(id);
      await loadData();
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, returnStatus: newStatus } : p));
    try {
      await updatePurchaseStatus(id, newStatus);
    } catch (err) {
      alert("Failed to update status.");
      loadData(); 
    }
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]);
  };

  const modalInputClass = "w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header & Filters */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 print:hidden shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Purchases & Inward Supplies</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Log vendor bills, feed your Rate Book, and track ITC.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-2xl px-3.5 shadow-sm w-full md:w-auto">
            <span className="text-xs text-zinc-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search vendor, HSN, amt..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-zinc-800 outline-none px-2 w-full md:w-44 placeholder:text-zinc-400"
            />
          </div>

          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-2xl px-3 shadow-sm">
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

          <button 
            onClick={() => setIsModalOpen(true)} 
            className="flex items-center justify-center h-10 bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            + Log Purchase Bill
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 print:hidden shrink-0">
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Total Taxable Value</span>
          <p className="text-2xl font-black text-zinc-900">₹ {totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-emerald-50/70 p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
          <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest block mb-1">Total Input Tax (ITC)</span>
          <p className="text-2xl font-black text-emerald-700">₹ {totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-zinc-900 text-white p-6 rounded-[2rem] shadow-lg">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Total Gross Purchases</span>
          <p className="text-2xl font-black">₹ {totalGross.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-zinc-200 rounded-[2rem] shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
            <thead>
              <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-100 bg-zinc-50/50 sticky top-0 bg-zinc-50 z-10">
                <th className="py-3.5 px-3 w-8"></th>
                <th className="py-3.5 px-3 font-bold w-28">Inv Date</th>
                <th className="py-3.5 px-3 font-bold w-28">Inv No</th>
                <th className="py-3.5 px-3 font-bold min-w-[200px]">Vendor Name</th>
                <th className="py-3.5 px-3 font-bold w-32">GSTIN</th>
                <th className="py-3.5 px-3 font-bold text-right w-28">Taxable Amt</th>
                <th className="py-3.5 px-3 font-bold text-right w-28">GST Amt</th>
                <th className="py-3.5 px-3 font-bold text-right w-32">Total Amt</th>
                <th className="py-3.5 px-3 font-bold text-center w-28">Status</th>
                <th className="py-3.5 px-3 font-bold text-center w-20 print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs text-zinc-800">
              
              {loading ? (
                <tr><td colSpan="10" className="py-12 text-center text-zinc-400 font-medium">Loading purchases...</td></tr>
              ) : filteredPurchases.length === 0 ? (
                <tr><td colSpan="10" className="py-12 text-center text-zinc-400 font-medium">No purchases found. Click '+ Log Purchase Bill' above.</td></tr>
              ) : (
                filteredPurchases.map(p => (
                  <React.Fragment key={p.id}>
                    <tr className={`border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer ${expandedRows.includes(p.id) ? 'bg-zinc-50/80' : ''}`} onClick={() => toggleRow(p.id)}>
                      <td className="py-3.5 px-3 text-center text-zinc-400 font-bold text-xs">{expandedRows.includes(p.id) ? 'v' : '>'}</td>
                      <td className="py-3.5 px-3 font-medium text-zinc-600">{p.invoiceDate}</td>
                      <td className="py-3.5 px-3 font-extrabold text-[#1E3A8A]">{p.invoiceNo || '-'}</td>
                      <td className="py-3.5 px-3 font-extrabold text-zinc-900 truncate max-w-[200px]">{p.vendorName}</td>
                      <td className="py-3.5 px-3 text-zinc-400 font-mono text-[10px]">{p.gstin || 'UNREGISTERED'}</td>
                      <td className="py-3.5 px-3 text-right font-medium text-zinc-700">₹ {p.taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-3.5 px-3 text-right text-emerald-600 font-bold">₹ {p.gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-3.5 px-3 text-right font-black text-zinc-900">₹ {p.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <select 
                          value={p.returnStatus} 
                          onChange={(e) => handleStatusChange(p.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border border-zinc-200 outline-none cursor-pointer appearance-none ${
                            p.returnStatus === '2B Matched' ? 'bg-blue-50 text-[#1E3A8A]' :
                            p.returnStatus === 'ITC Claimed' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-amber-50 text-amber-600'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="2B Matched">2B Matched</option>
                          <option value="ITC Claimed">ITC Claimed</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-3 text-center opacity-0 group-hover:opacity-100 transition-opacity print:hidden" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 font-bold text-[10px] uppercase tracking-wider cursor-pointer">Del</button>
                      </td>
                    </tr>
                    
                    {/* EXPANDED HIDDEN ITEMS ROW */}
                    {expandedRows.includes(p.id) && (
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <td></td>
                        <td colSpan="9" className="py-4 pr-6">
                          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                            <h4 className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest mb-3">Itemized Details (Auto-Synced to RateBook)</h4>
                            {p.items && p.items.length > 0 ? (
                              <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                  <tr className="text-[9px] text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                                    <th className="pb-2 font-bold">Material</th>
                                    <th className="pb-2 font-bold text-center w-24">HSN Code</th>
                                    <th className="pb-2 font-bold text-right">Qty</th>
                                    <th className="pb-2 font-bold text-right">Rate</th>
                                    <th className="pb-2 font-bold text-right">Taxable</th>
                                    <th className="pb-2 font-bold text-right">GST %</th>
                                    <th className="pb-2 font-bold text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="text-xs text-zinc-800">
                                  {p.items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors">
                                      <td className="py-2.5 font-bold text-zinc-900">{item.materialName}</td>
                                      <td className="py-2.5 text-center font-mono text-[10px] text-zinc-500">{item.hsn || '-'}</td>
                                      <td className="py-2.5 text-right font-medium text-zinc-700">{item.qty} {item.unit}</td>
                                      <td className="py-2.5 text-right font-medium text-zinc-700">₹{item.rate}</td>
                                      <td className="py-2.5 text-right font-semibold text-zinc-800">₹{item.taxable?.toFixed(2)}</td>
                                      <td className="py-2.5 text-right font-medium text-zinc-500">{item.gstPercent}%</td>
                                      <td className="py-2.5 text-right font-black text-zinc-900">₹{item.total?.toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-xs text-zinc-400 italic font-medium">No line items recorded for this bill.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD BILL MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-[#1E3A8A] px-8 py-5 flex justify-between items-center text-white shrink-0">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Log Purchase Bill</h2>
                <p className="text-[10px] text-blue-200 uppercase tracking-widest font-bold mt-1">Items entered here automatically update your Material Rate Book.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-blue-200 hover:text-white text-2xl leading-none cursor-pointer">&times;</button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-zinc-50">
              
              {/* Vendor Section */}
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm mb-6">
                <h3 className="text-[10px] font-extrabold text-zinc-800 uppercase tracking-widest mb-4">1. Vendor Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Vendor / Supplier Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={newBill.vendorName} onChange={e => setNewBill({...newBill, vendorName: e.target.value})} placeholder="e.g., Shri Ram Timbers" className={modalInputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Invoice Date <span className="text-red-500">*</span></label>
                    <input type="date" required value={newBill.invoiceDate} onChange={e => setNewBill({...newBill, invoiceDate: e.target.value})} className={modalInputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Invoice Number</label>
                    <input type="text" value={newBill.invoiceNo} onChange={e => setNewBill({...newBill, invoiceNo: e.target.value})} placeholder="e.g., INV-001" className={modalInputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Vendor GSTIN</label>
                    <input type="text" value={newBill.gstin} onChange={e => setNewBill({...newBill, gstin: e.target.value.toUpperCase()})} placeholder="29ABCDE1234F1Z5" maxLength="15" className={`${modalInputClass} font-mono`} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Tax Type</label>
                    <select value={newBill.gstType} onChange={e => setNewBill({...newBill, gstType: e.target.value})} className={`${modalInputClass} cursor-pointer`}>
                      <option value="CGST/SGST">CGST / SGST (Local)</option>
                      <option value="IGST">IGST (Inter-state)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-extrabold text-zinc-800 uppercase tracking-widest">2. Itemized Bill Details</h3>
                  <button onClick={addItemRow} className="text-[10px] font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer">+ Add Row</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="text-[9px] text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                        <th className="pb-2 font-bold w-56">Material Name</th>
                        <th className="pb-2 font-bold w-24">HSN Code</th>
                        <th className="pb-2 font-bold w-20">Qty</th>
                        <th className="pb-2 font-bold w-20">Unit</th>
                        <th className="pb-2 font-bold w-24">Rate (₹)</th>
                        <th className="pb-2 font-bold w-20">GST %</th>
                        <th className="pb-2 font-bold text-right">Taxable</th>
                        <th className="pb-2 font-bold text-right">Total</th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {enhancedItems.map((item, index) => (
                        <tr key={index}>
                          <td className="py-2 pr-2"><input type="text" placeholder="e.g. 18mm Plywood" value={item.materialName} onChange={e => updateItemRow(index, 'materialName', e.target.value)} className={modalInputClass} /></td>
                          <td className="py-2 pr-2"><input type="text" placeholder="e.g. 4412" value={item.hsn} onChange={e => updateItemRow(index, 'hsn', e.target.value)} className={`${modalInputClass} font-mono`} /></td>
                          <td className="py-2 pr-2"><input type="number" placeholder="0" value={item.qty} onChange={e => updateItemRow(index, 'qty', e.target.value)} className={modalInputClass} /></td>
                          <td className="py-2 pr-2">
                            <select value={item.unit} onChange={e => updateItemRow(index, 'unit', e.target.value)} className={`${modalInputClass} cursor-pointer`}>
                              <option value="Pcs">Pcs</option><option value="SqFt">SqFt</option><option value="Sheets">Sheets</option><option value="Bags">Bags</option><option value="Ltrs">Ltrs</option><option value="Mtrs">Mtrs</option>
                            </select>
                          </td>
                          <td className="py-2 pr-2"><input type="number" step="any" placeholder="0.00" value={item.rate} onChange={e => updateItemRow(index, 'rate', e.target.value)} className={modalInputClass} /></td>
                          <td className="py-2 pr-2">
                            <select value={item.gstPercent} onChange={e => updateItemRow(index, 'gstPercent', e.target.value)} className={`${modalInputClass} cursor-pointer`}>
                              <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                            </select>
                          </td>
                          <td className="py-2 pr-2 text-right text-xs font-semibold text-zinc-600">₹{item.taxable.toFixed(2)}</td>
                          <td className="py-2 pr-2 text-right text-xs font-bold text-zinc-900">₹{item.total.toFixed(2)}</td>
                          <td className="py-2 text-center">
                            <button onClick={() => removeItemRow(index)} className="text-red-400 hover:text-red-600 text-lg font-bold cursor-pointer">&times;</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white border-t border-zinc-100 px-8 py-5 flex justify-between items-center shrink-0">
              <div className="flex gap-8">
                <div>
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Taxable Value</span>
                  <span className="text-lg font-bold text-zinc-700">₹{liveTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Input Tax (ITC)</span>
                  <span className="text-lg font-bold text-emerald-600">₹{liveGstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-zinc-900 uppercase tracking-widest">Gross Total</span>
                  <span className="text-2xl font-black text-zinc-900">₹{liveTotalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[10px] font-bold rounded-xl transition-colors uppercase tracking-wider cursor-pointer">Cancel</button>
                <button onClick={handleSaveBill} className="px-8 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white text-[10px] font-bold rounded-xl shadow-md transition-all uppercase tracking-wider cursor-pointer">Save Bill</button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}