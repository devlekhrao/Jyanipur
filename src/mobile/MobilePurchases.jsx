import React, { useState, useEffect } from 'react';
import { getPurchases, savePurchase, deletePurchase, updatePurchaseStatus, saveMaterialRate } from '../db';

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

export default function MobilePurchases() {
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState([]);
  
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

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-sans">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Purchases & ITC</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Inward Supply Invoices</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1E3A8A] hover:bg-blue-900 text-white font-semibold text-[11px] px-3.5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            + Log Bill
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white border border-zinc-200 rounded-2xl px-3 py-2 shadow-sm flex items-center mb-2">
          <span className="text-xs text-zinc-400 mr-2">🔍</span>
          <input 
            type="text" 
            placeholder="Search vendor, HSN, or inv no..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
          />
        </div>

        {/* PERIOD SELECTOR STRIP */}
        <div className="bg-white p-2.5 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <span className="text-[10px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest pl-1">Period:</span>
          <div className="flex gap-2">
            <select 
              value={selectedMonth} 
              onChange={handleMonthChange}
              className="bg-zinc-100 font-bold text-xs text-zinc-800 py-1.5 px-3 rounded-xl outline-none"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={handleYearChange}
              className="bg-zinc-100 font-bold text-xs text-zinc-800 py-1.5 px-3 rounded-xl outline-none"
            >
              <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
              <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
              <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
            </select>
          </div>
        </div>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
        <div className="bg-white p-2.5 rounded-2xl border border-zinc-200 shadow-sm text-center">
          <span className="text-[8px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest block">Taxable</span>
          <p className="text-xs font-semibold text-[11px] text-zinc-900 mt-0.5">₹ {totalTaxable.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>

        <div className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-100 shadow-sm text-center">
          <span className="text-[8px] font-semibold text-[11px] text-emerald-600 uppercase tracking-widest block">ITC Credit</span>
          <p className="text-xs font-semibold text-[11px] text-emerald-700 mt-0.5">₹ {totalGst.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>

        <div className="bg-zinc-900 text-white p-2.5 rounded-2xl shadow-sm text-center">
          <span className="text-[8px] font-semibold text-[11px] text-amber-400 uppercase tracking-widest block">Gross Total</span>
          <p className="text-xs font-semibold text-[11px] mt-0.5">₹ {totalGross.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* INVOICE STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading purchase bills...</div>
        ) : filteredPurchases.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">🧾</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No purchase bills found</p>
          </div>
        ) : (
          filteredPurchases.map(p => {
            const isExpanded = expandedRows.includes(p.id);
            const parsedItems = p.items ? (typeof p.items === 'string' ? JSON.parse(p.items) : p.items) : [];

            return (
              <div 
                key={p.id} 
                className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform"
              >
                {/* BILL CARD HEADER */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-50 text-[#1E3A8A] text-[9px] font-semibold text-[11px] px-2 py-0.5 rounded uppercase">
                        {p.invoiceNo || 'INV'}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400">{p.invoiceDate}</span>
                    </div>
                    <h4 className="font-bold text-zinc-900 text-sm mt-1">{p.vendorName}</h4>
                    <span className="text-[9px] font-mono text-zinc-400">{p.gstin || 'UNREGISTERED'}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-semibold text-[11px] text-zinc-900 block">₹ {p.totalAmount?.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                    <span className="text-[8px] font-bold text-emerald-600 block">ITC: ₹{p.gstAmount?.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                  </div>
                </div>

                {/* STATUS & ACTIONS ROW */}
                <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                  <div className="relative">
                    <select 
                      value={p.returnStatus} 
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                      className={`px-2.5 py-1 rounded-xl text-[9px] font-semibold text-[11px] uppercase tracking-wider outline-none appearance-none pr-6 ${
                        p.returnStatus === '2B Matched' ? 'bg-blue-50 text-[#1E3A8A]' :
                        p.returnStatus === 'ITC Claimed' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="2B Matched">2B Matched</option>
                      <option value="ITC Claimed">ITC Claimed</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-[8px] text-zinc-400">▼</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleRow(p.id)} 
                      className="bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase"
                    >
                      {isExpanded ? 'Hide Items ▲' : `Items (${parsedItems.length}) ▼`}
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)} 
                      className="text-zinc-300 hover:text-red-500 text-xs font-bold p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE ITEMS ACCORDION */}
                {isExpanded && (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 space-y-2 text-xs">
                    <h5 className="text-[9px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-1">
                      Itemized Bill Breakdown
                    </h5>

                    {parsedItems.length === 0 ? (
                      <p className="text-[10px] text-zinc-400 italic">No line items recorded for this bill.</p>
                    ) : (
                      parsedItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-zinc-100 last:border-0">
                          <div>
                            <p className="font-bold text-zinc-800">{item.materialName}</p>
                            <span className="text-[9px] text-zinc-400 font-mono">HSN: {item.hsn || '-'} • {item.qty} {item.unit} @ ₹{item.rate}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-zinc-900">₹{item.total?.toFixed(0)}</p>
                            <span className="text-[8px] text-emerald-600 font-bold">GST {item.gstPercent}%</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* CREATE PURCHASE BILL SHEET / MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[90vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Log Purchase Bill</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">RateBook Auto-Sync Active</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <form id="purchaseForm" onSubmit={handleSaveBill} className="space-y-4 pb-20">
                
                {/* SECTION 1: VENDOR INFO */}
                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200/80 space-y-3">
                  <h3 className="text-[10px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest">1. Vendor & Invoice Info</h3>

                  <div>
                    <label className={labelClass}>Vendor / Supplier Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required 
                      placeholder="e.g. Shri Ram Timbers" 
                      value={newBill.vendorName} 
                      onChange={e => setNewBill({...newBill, vendorName: e.target.value})} 
                      className={inputClass} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Invoice Date <span className="text-red-500">*</span></label>
                      <input 
                        type="date" 
                        required 
                        value={newBill.invoiceDate} 
                        onChange={e => setNewBill({...newBill, invoiceDate: e.target.value})} 
                        className={inputClass} 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Invoice No</label>
                      <input 
                        type="text" 
                        placeholder="e.g. INV-001" 
                        value={newBill.invoiceNo} 
                        onChange={e => setNewBill({...newBill, invoiceNo: e.target.value})} 
                        className={inputClass} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Vendor GSTIN</label>
                      <input 
                        type="text" 
                        placeholder="36OEYPS..." 
                        maxLength="15" 
                        value={newBill.gstin} 
                        onChange={e => setNewBill({...newBill, gstin: e.target.value.toUpperCase()})} 
                        className={`${inputClass} font-mono`} 
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Tax Type</label>
                      <select 
                        value={newBill.gstType} 
                        onChange={e => setNewBill({...newBill, gstType: e.target.value})} 
                        className={inputClass}
                      >
                        <option value="CGST/SGST">CGST / SGST (Local)</option>
                        <option value="IGST">IGST (Inter-state)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: BILL LINES */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-[10px] font-semibold text-[11px] text-zinc-400 uppercase tracking-widest">2. Itemized Bill Lines</h3>
                    <button 
                      type="button"
                      onClick={addItemRow} 
                      className="text-[10px] font-semibold text-[11px] text-[#1E3A8A] bg-blue-50 px-3 py-1 rounded-xl uppercase active:scale-95 transition-transform"
                    >
                      + Add Row
                    </button>
                  </div>

                  {enhancedItems.map((item, index) => (
                    <div key={index} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 relative">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                        <span className="text-[10px] font-semibold text-[11px] text-[#1E3A8A] bg-blue-50 px-2.5 py-0.5 rounded-md">
                          Item #{index + 1}
                        </span>
                        {billItems.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="text-zinc-300 hover:text-red-500 text-xs font-bold p-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div>
                        <label className={labelClass}>Material Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 18mm Plywood" 
                          value={item.materialName} 
                          onChange={e => updateItemRow(index, 'materialName', e.target.value)} 
                          className={inputClass} 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelClass}>HSN Code</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 4412" 
                            value={item.hsn} 
                            onChange={e => updateItemRow(index, 'hsn', e.target.value)} 
                            className={`${inputClass} font-mono`} 
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Unit</label>
                          <select 
                            value={item.unit} 
                            onChange={e => updateItemRow(index, 'unit', e.target.value)} 
                            className={inputClass}
                          >
                            <option value="Pcs">Pcs</option>
                            <option value="SqFt">SqFt</option>
                            <option value="Sheets">Sheets</option>
                            <option value="Bags">Bags</option>
                            <option value="Ltrs">Ltrs</option>
                            <option value="Mtrs">Mtrs</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className={labelClass}>Qty</label>
                          <input type="number" inputMode="decimal" placeholder="0" value={item.qty} onChange={e => updateItemRow(index, 'qty', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>Rate (₹)</label>
                          <input type="number" inputMode="decimal" placeholder="0.00" value={item.rate} onChange={e => updateItemRow(index, 'rate', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <label className={labelClass}>GST %</label>
                          <select value={item.gstPercent} onChange={e => updateItemRow(index, 'gstPercent', e.target.value)} className={inputClass}>
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-100 text-xs">
                        <div>
                          <span className="text-[8px] font-semibold text-[11px] text-zinc-400 uppercase">Taxable Value</span>
                          <p className="font-bold text-zinc-800">₹{item.taxable.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-semibold text-[11px] text-emerald-600 uppercase">Line Total</span>
                          <p className="font-semibold text-[11px] text-zinc-900">₹{item.total.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </form>
            </div>

            {/* Modal Footer (Live Calculated Totals) */}
            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center bg-zinc-50 p-2.5 rounded-2xl border border-zinc-200/80">
                <div>
                  <span className="block text-[8px] font-semibold text-[11px] text-zinc-400 uppercase">Taxable</span>
                  <span className="text-xs font-bold text-zinc-800">₹{liveTaxable.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-semibold text-[11px] text-emerald-600 uppercase">ITC Credit</span>
                  <span className="text-xs font-semibold text-[11px] text-emerald-700">₹{liveGstAmount.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-semibold text-[11px] text-zinc-900 uppercase">Gross Total</span>
                  <span className="text-xs font-semibold text-[11px] text-zinc-900">₹{liveTotalAmount.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                </div>
              </div>

              <button 
                type="submit" 
                form="purchaseForm"
                className="w-full py-4 bg-[#1E3A8A] text-white font-semibold text-[11px] rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform"
              >
                Save Purchase Bill
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}