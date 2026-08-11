import React, { useState, useEffect } from 'react';
import { getPurchases, savePurchase, deletePurchase } from './db';

// Helper to auto-calculate Financial Year (e.g., "2026-27") based on Invoice Date
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
  
  const currentDate = new Date();
  // Default to 1st of current month to end of current month
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

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

  // Filter by Date Range
  const filteredPurchases = purchases.filter(p => {
    if (!p.invoiceDate) return false;
    return p.invoiceDate >= startDate && p.invoiceDate <= endDate;
  });

  const totalTaxable = filteredPurchases.reduce((sum, p) => sum + p.taxableAmount, 0);
  const totalGst = filteredPurchases.reduce((sum, p) => sum + p.gstAmount, 0);
  const totalGross = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  // Live Calculations for the Input Row
  const liveTaxable = parseFloat(newBill.taxableAmount) || 0;
  const liveGstAmount = liveTaxable * (parseFloat(newBill.gstPercent) / 100);
  const liveTotalAmount = liveTaxable + liveGstAmount;

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

  const exportToCSV = () => {
    const headers = ["Inv Date", "Inv No", "Vendor Name", "GSTIN", "HSN", "Taxable Amt", "GST Type", "GST %", "GST Amt", "Total Amt", "Return Status"];
    const rows = filteredPurchases.map(p => [
      p.invoiceDate, 
      p.invoiceNo, 
      `"${p.vendorName}"`, // Encased in quotes in case of commas in name
      p.gstin, 
      p.hsn,
      p.taxableAmount, 
      p.gstType, 
      `${p.gstPercent}%`, 
      p.gstAmount, 
      p.totalAmount, 
      p.returnStatus
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Purchases_${startDate}_to_${endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Completely transparent borderless inputs, under-lined on hover/focus
  const inputClass = "w-full px-1.5 py-1.5 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:outline-none text-zinc-900 text-[10px] font-medium transition-all placeholder:text-zinc-400";

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Purchases & Inward Supplies</h2>
          <p className="text-zinc-600 text-xs mt-1 font-medium">Track vendor bills, input tax credit (ITC), and return matching.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-white/60 border border-white/60 rounded-xl px-2 py-1 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-500 uppercase px-2">From:</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer" />
          </div>
          <div className="flex items-center bg-white/60 border border-white/60 rounded-xl px-2 py-1 shadow-sm">
            <span className="text-[10px] font-bold text-zinc-500 uppercase px-2">To:</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer" />
          </div>
          <button onClick={exportToCSV} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg ml-2">
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-3xl border border-white/60 shadow-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Taxable Value</span>
          <p className="text-xl font-black text-zinc-900">₹ {totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-emerald-50/50 backdrop-blur-xl p-5 rounded-3xl border border-emerald-100 shadow-xl">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Total Input Tax (ITC)</span>
          <p className="text-xl font-black text-emerald-700">₹ {totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
        <div className="bg-zinc-900 text-white p-5 rounded-3xl shadow-xl">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Total Gross Purchases</span>
          <p className="text-xl font-black">₹ {totalGross.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Full Width Excel-Style Entry Table */}
      <div className="bg-white/50 backdrop-blur-xl p-4 rounded-3xl border border-white/60 shadow-xl overflow-x-auto w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1200px]">
          <thead>
            <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-300/50">
              <th className="py-3 px-1 font-bold w-24">Inv Date</th>
              <th className="py-3 px-1 font-bold w-20">Inv No</th>
              <th className="py-3 px-1 font-bold min-w-[150px]">Vendor Name</th>
              <th className="py-3 px-1 font-bold w-28">GSTIN</th>
              <th className="py-3 px-1 font-bold w-20">HSN</th>
              <th className="py-3 px-1 font-bold text-right w-24">Taxable Amt</th>
              <th className="py-3 px-1 font-bold text-center w-24">Tax Type</th>
              <th className="py-3 px-1 font-bold text-center w-14">GST %</th>
              <th className="py-3 px-1 font-bold text-right w-24">GST Amt</th>
              <th className="py-3 px-1 font-bold text-right w-24">Total Amt</th>
              <th className="py-3 px-1 font-bold text-center w-24">Status</th>
              <th className="py-3 px-1 font-bold text-center w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/40 text-xs">
            
            {/* INLINE ENTRY ROW (BORDERLESS) */}
            <tr className="bg-white/40 group">
              <td className="py-1.5 px-0.5"><input type="date" value={newBill.invoiceDate} onChange={e => setNewBill({...newBill, invoiceDate: e.target.value})} className={inputClass} /></td>
              <td className="py-1.5 px-0.5"><input type="text" placeholder="Bill No" value={newBill.invoiceNo} onChange={e => setNewBill({...newBill, invoiceNo: e.target.value})} className={inputClass} /></td>
              <td className="py-1.5 px-0.5"><input type="text" placeholder="Supplier / Vendor" value={newBill.vendorName} onChange={e => setNewBill({...newBill, vendorName: e.target.value})} className={inputClass} /></td>
              <td className="py-1.5 px-0.5"><input type="text" placeholder="GSTIN" value={newBill.gstin} onChange={e => setNewBill({...newBill, gstin: e.target.value.toUpperCase()})} className={inputClass} maxLength="15" /></td>
              <td className="py-1.5 px-0.5"><input type="text" placeholder="HSN/SAC" value={newBill.hsn} onChange={e => setNewBill({...newBill, hsn: e.target.value})} className={inputClass} /></td>
              <td className="py-1.5 px-0.5"><input type="number" placeholder="0.00" value={newBill.taxableAmount} onChange={e => setNewBill({...newBill, taxableAmount: e.target.value})} className={`${inputClass} text-right font-bold text-zinc-900`} /></td>
              
              <td className="py-1.5 px-0.5">
                <select value={newBill.gstType} onChange={e => setNewBill({...newBill, gstType: e.target.value})} className={`${inputClass} text-center cursor-pointer appearance-none`}>
                  <option value="CGST/SGST">CGST/SGST</option>
                  <option value="IGST">IGST</option>
                </select>
              </td>
              
              <td className="py-1.5 px-0.5">
                <select value={newBill.gstPercent} onChange={e => setNewBill({...newBill, gstPercent: e.target.value})} className={`${inputClass} text-center cursor-pointer appearance-none`}>
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="12">12%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
              </td>
              
              <td className="py-1.5 px-1 text-right font-medium text-emerald-600">
                {liveGstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
              </td>
              <td className="py-1.5 px-1 text-right font-black text-zinc-900">
                {liveTotalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
              </td>
              <td className="py-1.5 px-0.5">
                <select value={newBill.returnStatus} onChange={e => setNewBill({...newBill, returnStatus: e.target.value})} className={`${inputClass} text-center cursor-pointer appearance-none font-bold`}>
                  <option value="Pending">Pending</option>
                  <option value="2B Matched">2B Matched</option>
                  <option value="ITC Claimed">ITC Claimed</option>
                </select>
              </td>
              <td className="py-1.5 px-0.5 text-center">
                <button onClick={handleAddBill} className="w-full bg-zinc-900 hover:bg-black text-white py-1.5 rounded font-bold text-[9px] uppercase tracking-wider transition-all shadow-md">Add</button>
              </td>
            </tr>

            {/* SAVED RECORDS */}
            {loading ? (
              <tr><td colSpan="12" className="py-8 text-center text-zinc-500">Loading purchases...</td></tr>
            ) : filteredPurchases.length === 0 ? (
              <tr><td colSpan="12" className="py-8 text-center text-zinc-400">No purchases found for this date range. Type in the row above to add a bill.</td></tr>
            ) : (
              filteredPurchases.map(p => (
                <tr key={p.id} className="hover:bg-white/40 transition-colors group">
                  <td className="py-2.5 px-1.5 text-zinc-600">{p.invoiceDate}</td>
                  <td className="py-2.5 px-1.5 font-bold text-zinc-900">{p.invoiceNo || '-'}</td>
                  <td className="py-2.5 px-1.5 font-bold text-zinc-800 truncate max-w-[150px]">{p.vendorName}</td>
                  <td className="py-2.5 px-1.5 text-zinc-500 font-mono text-[10px]">{p.gstin || 'UNREGISTERED'}</td>
                  <td className="py-2.5 px-1.5 text-zinc-500">{p.hsn || '-'}</td>
                  <td className="py-2.5 px-1.5 text-right">₹ {p.taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="py-2.5 px-1.5 text-center text-zinc-500 text-[10px]">{p.gstType}</td>
                  <td className="py-2.5 px-1.5 text-center text-zinc-500">{p.gstPercent}%</td>
                  <td className="py-2.5 px-1.5 text-right text-emerald-600 font-bold">₹ {p.gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="py-2.5 px-1.5 text-right font-black text-zinc-900">₹ {p.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="py-2.5 px-1.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                      p.returnStatus === '2B Matched' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      p.returnStatus === 'ITC Claimed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {p.returnStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-1.5 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 font-bold text-[10px] uppercase tracking-wider">Del</button>
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