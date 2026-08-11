import React, { useState, useEffect, useRef } from 'react';
import { getPurchases, savePurchase, deletePurchase, updatePurchaseStatus } from './db';

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

  const getFirstDay = (y, m) => new Date(y, m - 1, 1).toISOString().split('T')[0];
  const getLastDay = (y, m) => new Date(y, m, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(getFirstDay(currentYear, currentMonth));
  const [endDate, setEndDate] = useState(getLastDay(currentYear, currentMonth));

  const [newBill, setNewBill] = useState({
    invoiceDate: currentDate.toISOString().split('T')[0],
    invoiceNo: '',
    vendorName: '',
    gstin: '',
    hsn: '',
    taxableAmount: '',
    gstPercent: 18,
    gstType: 'CGST/SGST',
    returnStatus: 'Pending'
  });

  const loadData = async () => {
    setLoading(true);
    const data = await getPurchases();
    setPurchases(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
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
        (p.returnStatus && p.returnStatus.toLowerCase().includes(q)) ||
        (p.totalAmount && p.totalAmount.toString().includes(q)) ||
        (p.invoiceDate && p.invoiceDate.includes(q))
      );
    }
    return true;
  });

  const totalTaxable = filteredPurchases.reduce((sum, p) => sum + p.taxableAmount, 0);
  const totalGst = filteredPurchases.reduce((sum, p) => sum + p.gstAmount, 0);
  const totalGross = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  const liveTaxable = parseFloat(newBill.taxableAmount) || 0;
  const liveGstAmount = Number((liveTaxable * (parseFloat(newBill.gstPercent) / 100)).toFixed(2));
  const liveTotalAmount = Number((liveTaxable + liveGstAmount).toFixed(2));

  const handleAddBill = async () => {
    if (!newBill.invoiceDate || !newBill.vendorName || !newBill.taxableAmount) {
      alert("Date, Vendor Name, and Taxable Amount are required.");
      return;
    }

    const payload = {
      ...newBill,
      fy: getFinancialYear(newBill.invoiceDate),
      taxableAmount: liveTaxable,
      gstAmount: liveGstAmount,
      totalAmount: liveTotalAmount
    };

    try {
      await savePurchase(payload);
      await loadData();
      setNewBill({
        ...newBill,
        invoiceNo: '',
        vendorName: '',
        gstin: '',
        hsn: '',
        taxableAmount: '',
        returnStatus: 'Pending'
      });
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

  const getExportData = () => {
    const headers = ["Inv Date", "Inv No", "Vendor Name", "GSTIN", "HSN", "Taxable Amt", "Tax Type", "GST %", "GST Amt", "Total Amt", "Return Status"];
    const rows = filteredPurchases.map(p => [
      p.invoiceDate, 
      p.invoiceNo || '-', 
      `"${p.vendorName}"`, 
      p.gstin || '-', 
      p.hsn || '-',
      p.taxableAmount.toFixed(2), 
      p.gstType, 
      `${p.gstPercent}%`, 
      p.gstAmount.toFixed(2), 
      p.totalAmount.toFixed(2), 
      p.returnStatus
    ]);
    return { headers, rows };
  };

  const exportToCSV = () => {
    const { headers, rows } = getExportData();
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `Purchases_${startDate}_to_${endDate}.csv`);
    setExportMenuOpen(false);
  };

  const exportToXLS = () => {
    const { headers, rows } = getExportData();
    const xlsContent = [headers, ...rows].map(e => e.join("\t")).join("\n");
    const blob = new Blob([xlsContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    triggerDownload(blob, `Purchases_${startDate}_to_${endDate}.xls`);
    setExportMenuOpen(false);
  };

  const exportToPDF = () => {
    setExportMenuOpen(false);
    setTimeout(() => window.print(), 100);
  };

  const triggerDownload = (blob, filename) => {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inputClass = "w-full px-1 py-2 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:outline-none text-zinc-900 text-[11px] font-medium transition-all placeholder:text-zinc-400";

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header & Filters */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Purchases & Inward Supplies</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Track vendor bills, input tax credit (ITC), and return matching.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* Universal Search Bar */}
          <div className="flex items-center h-9 bg-white/60 border border-zinc-200/60 rounded-xl px-3 shadow-sm w-full md:w-auto">
            <span className="text-[10px] text-zinc-400">🔍</span>
            <input 
              type="text" 
              placeholder="Search vendor, amt, hsn..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-zinc-800 outline-none px-2 w-full md:w-36 placeholder:text-zinc-400"
            />
          </div>

          {/* Month / Year Quick Select */}
          <div className="flex items-center h-9 bg-white/60 border border-zinc-200/60 rounded-xl px-2 shadow-sm">
            <select value={selectedMonth} onChange={handleMonthChange} className="bg-transparent border-none text-xs font-semibold text-zinc-700 outline-none cursor-pointer px-1">
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
              ))}
            </select>
            <select value={selectedYear} onChange={handleYearChange} className="bg-transparent border-none text-xs font-semibold text-zinc-700 outline-none cursor-pointer pr-1">
              <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
              <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
              <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
            </select>
          </div>

          <span className="text-zinc-300 font-light hidden xl:inline">|</span>

          {/* Explicit Date Range */}
          <div className="flex items-center h-9 bg-white/60 border border-zinc-200/60 rounded-xl px-3 shadow-sm">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase mr-1.5">From:</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-xs font-semibold text-zinc-700 outline-none cursor-pointer" />
          </div>
          <div className="flex items-center h-9 bg-white/60 border border-zinc-200/60 rounded-xl px-3 shadow-sm">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase mr-1.5">To:</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-xs font-semibold text-zinc-700 outline-none cursor-pointer" />
          </div>

          {/* Export Dropdown */}
          <div className="relative" ref={exportRef}>
            <button 
              onClick={() => setExportMenuOpen(!exportMenuOpen)} 
              className="flex items-center justify-center h-9 bg-emerald-600 hover:bg-emerald-500 text-white px-5 rounded-xl text-xs font-bold transition-all shadow-md gap-2"
            >
              Export <span className="text-[9px]">▼</span>
            </button>
            
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.1)] border border-zinc-200 overflow-hidden z-50">
                <button onClick={exportToCSV} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 border-b border-zinc-100 transition-colors">.CSV File</button>
                <button onClick={exportToXLS} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 border-b border-zinc-100 transition-colors">.XLS (Excel)</button>
                <button onClick={exportToPDF} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">Print to PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:hidden">
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-2xl border border-white/60 shadow-sm">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Total Taxable Value</span>
          <p className="text-xl font-bold text-zinc-800">₹ {totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-emerald-50/50 backdrop-blur-xl p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest block mb-1">Total Input Tax (ITC)</span>
          <p className="text-xl font-bold text-emerald-700">₹ {totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-zinc-800 text-white p-5 rounded-2xl shadow-md">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Total Gross Purchases</span>
          <p className="text-xl font-bold">₹ {totalGross.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* PDF Header (Only visible when printing) */}
      <div className="hidden print:block mb-6">
        <h2 className="text-xl font-bold text-zinc-800">Purchase Register</h2>
        <p className="text-xs text-zinc-600">Period: {startDate} to {endDate}</p>
      </div>

      {/* Full Width Seamless Entry Table */}
      <div className="w-full overflow-x-auto pb-8">
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
          <thead>
            <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-200">
              <th className="py-3 px-2 font-semibold w-24">Inv Date</th>
              <th className="py-3 px-2 font-semibold w-24">Inv No</th>
              <th className="py-3 px-2 font-semibold min-w-[180px]">Vendor Name</th>
              <th className="py-3 px-2 font-semibold w-32">GSTIN</th>
              <th className="py-3 px-2 font-semibold w-20">HSN</th>
              <th className="py-3 px-2 font-semibold text-right w-24">Taxable Amt</th>
              <th className="py-3 px-2 font-semibold text-center w-24">Tax Type</th>
              <th className="py-3 px-2 font-semibold text-center w-16">GST %</th>
              <th className="py-3 px-2 font-semibold text-right w-24">GST Amt</th>
              <th className="py-3 px-2 font-semibold text-right w-28">Total Amt</th>
              <th className="py-3 px-2 font-semibold text-center w-24">Status</th>
              <th className="py-3 px-2 font-semibold text-center w-16 print:hidden">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs text-zinc-700">
            
            {/* INLINE ENTRY ROW (BORDERLESS) */}
            <tr className="border-b border-zinc-200/60 bg-white/20 print:hidden">
              <td className="py-1 px-1"><input type="date" value={newBill.invoiceDate} onChange={e => setNewBill({...newBill, invoiceDate: e.target.value})} className={inputClass} /></td>
              <td className="py-1 px-1"><input type="text" placeholder="Bill No" value={newBill.invoiceNo} onChange={e => setNewBill({...newBill, invoiceNo: e.target.value})} className={inputClass} /></td>
              <td className="py-1 px-1"><input type="text" placeholder="Supplier / Vendor" value={newBill.vendorName} onChange={e => setNewBill({...newBill, vendorName: e.target.value})} className={inputClass} /></td>
              <td className="py-1 px-1"><input type="text" placeholder="GSTIN" value={newBill.gstin} onChange={e => setNewBill({...newBill, gstin: e.target.value.toUpperCase()})} className={`${inputClass} font-mono`} maxLength="15" /></td>
              <td className="py-1 px-1"><input type="text" placeholder="HSN/SAC" value={newBill.hsn} onChange={e => setNewBill({...newBill, hsn: e.target.value})} className={inputClass} /></td>
              <td className="py-1 px-1"><input type="number" step="any" placeholder="0.00" value={newBill.taxableAmount} onChange={e => setNewBill({...newBill, taxableAmount: e.target.value})} className={`${inputClass} text-right font-semibold text-zinc-800`} /></td>
              
              <td className="py-1 px-1">
                <select value={newBill.gstType} onChange={e => setNewBill({...newBill, gstType: e.target.value})} className={`${inputClass} text-center cursor-pointer appearance-none`}>
                  <option value="CGST/SGST">CGST/SGST</option>
                  <option value="IGST">IGST</option>
                </select>
              </td>
              
              <td className="py-1 px-1">
                <select value={newBill.gstPercent} onChange={e => setNewBill({...newBill, gstPercent: e.target.value})} className={`${inputClass} text-center cursor-pointer appearance-none`}>
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </td>
              
              <td className="py-1 px-2 text-right font-semibold text-emerald-600">
                {liveGstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </td>
              <td className="py-1 px-2 text-right font-bold text-zinc-800">
                {liveTotalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </td>
              <td className="py-1 px-1">
                <select value={newBill.returnStatus} onChange={e => setNewBill({...newBill, returnStatus: e.target.value})} className={`${inputClass} text-center cursor-pointer appearance-none font-semibold`}>
                  <option value="Pending">Pending</option>
                  <option value="2B Matched">2B Matched</option>
                  <option value="ITC Claimed">ITC Claimed</option>
                </select>
              </td>
              <td className="py-1 px-1 text-center">
                <button onClick={handleAddBill} className="w-full bg-zinc-800 hover:bg-zinc-900 text-white py-2 rounded-lg font-bold text-[9px] uppercase tracking-wider transition-all shadow-sm">Add</button>
              </td>
            </tr>

            {/* SAVED RECORDS */}
            {loading ? (
              <tr><td colSpan="12" className="py-12 text-center text-zinc-500 font-medium">Loading purchases...</td></tr>
            ) : filteredPurchases.length === 0 ? (
              <tr><td colSpan="12" className="py-12 text-center text-zinc-400 font-medium">No purchases found for this criteria. Type in the row above to add a bill.</td></tr>
            ) : (
              filteredPurchases.map(p => (
                <tr key={p.id} className="border-b border-zinc-200/40 hover:bg-white/40 transition-colors group">
                  <td className="py-3.5 px-2 font-medium text-zinc-600">{p.invoiceDate}</td>
                  <td className="py-3.5 px-2 font-semibold text-zinc-800">{p.invoiceNo || '-'}</td>
                  <td className="py-3.5 px-2 font-semibold text-zinc-800 truncate max-w-[200px]">{p.vendorName}</td>
                  <td className="py-3.5 px-2 text-zinc-400 font-mono text-[10px]">{p.gstin || 'UNREGISTERED'}</td>
                  <td className="py-3.5 px-2 text-zinc-500">{p.hsn || '-'}</td>
                  <td className="py-3.5 px-2 text-right font-medium text-zinc-700">₹ {p.taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className="py-3.5 px-2 text-center text-zinc-500 text-[10px]">{p.gstType}</td>
                  <td className="py-3.5 px-2 text-center text-zinc-500 font-medium">{p.gstPercent}%</td>
                  <td className="py-3.5 px-2 text-right text-emerald-600 font-semibold">₹ {p.gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className="py-3.5 px-2 text-right font-bold text-zinc-800">₹ {p.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className="py-3.5 px-2 text-center">
                    {/* Live Update Status Dropdown */}
                    <select 
                      value={p.returnStatus} 
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                      className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-widest border outline-none cursor-pointer appearance-none ${
                        p.returnStatus === '2B Matched' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        p.returnStatus === 'ITC Claimed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        'bg-amber-50 text-amber-600 border-amber-200'
                      }`}
                    >
                      <option value="Pending" className="text-zinc-800 bg-white">Pending</option>
                      <option value="2B Matched" className="text-zinc-800 bg-white">2B Matched</option>
                      <option value="ITC Claimed" className="text-zinc-800 bg-white">ITC Claimed</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 font-semibold text-[10px] uppercase tracking-wider">Del</button>
                  </td>
                </tr>
              ))
            )}
            
            {/* Print Footer Totals (Only visible on PDF/Print) */}
            <tr className="hidden print:table-row font-bold text-zinc-800 border-t border-zinc-300">
              <td colSpan="5" className="py-4 text-right">GRAND TOTAL:</td>
              <td className="py-4 text-right">₹ {totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              <td colSpan="2"></td>
              <td className="py-4 text-right">₹ {totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              <td className="py-4 text-right">₹ {totalGross.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              <td colSpan="2"></td>
            </tr>

          </tbody>
        </table>
      </div>

    </div>
  );
}