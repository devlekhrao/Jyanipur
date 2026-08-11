import React, { useState, useEffect } from 'react';
import { getPurchases, savePurchase, deletePurchase } from './db';

// Helper to auto-calculate Financial Year (e.g., "2026-27") based on Invoice Date
function getFinancialYear(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
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
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // State for the inline "Add Bill" row
  const [newBill, setNewBill] = useState({
    invoiceDate: currentDate.toISOString().split('T')[0],
    invoiceNo: '',
    vendorName: '',
    gstin: '',
    hsn: '',
    taxableAmount: '',
    gstAmount: '',
    returnStatus: 'Pending' // Pending, 2A/2B Matched, ITC Claimed
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

  // Filter purchases for the currently selected Month & Year
  const filteredPurchases = purchases.filter(p => {
    if (!p.invoiceDate) return false;
    const d = new Date(p.invoiceDate);
    return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
  });

  // Calculate totals for the summary cards
  const totalTaxable = filteredPurchases.reduce((sum, p) => sum + p.taxableAmount, 0);
  const totalGst = filteredPurchases.reduce((sum, p) => sum + p.gstAmount, 0);
  const totalGross = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

  const handleAddBill = async () => {
    if (!newBill.invoiceDate || !newBill.vendorName || !newBill.taxableAmount) {
      alert("Date, Vendor Name, and Taxable Amount are required.");
      return;
    }

    const taxable = parseFloat(newBill.taxableAmount) || 0;
    const gst = parseFloat(newBill.gstAmount) || 0;

    const payload = {
      ...newBill,
      fy: getFinancialYear(newBill.invoiceDate),
      taxableAmount: taxable,
      gstAmount: gst,
      totalAmount: taxable + gst
    };

    try {
      await savePurchase(payload);
      await loadData();
      
      // Reset input row (keep the date same for faster continuous entry)
      setNewBill({
        ...newBill,
        invoiceNo: '',
        vendorName: '',
        gstin: '',
        hsn: '',
        taxableAmount: '',
        gstAmount: '',
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

  const inputClass = "w-full px-2 py-1.5 rounded border border-white/40 bg-white/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-900 text-zinc-900 text-[10px] font-medium transition-all shadow-sm";

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Purchases & Inward Supplies</h2>
          <p className="text-zinc-600 text-xs mt-1 font-medium">Track vendor bills, input tax credit (ITC), and return matching.</p>
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))} 
            className="bg-white/60 border border-white/60 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-800 outline-none shadow-sm cursor-pointer"
          >
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))} 
            className="bg-white/60 border border-white/60 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-800 outline-none shadow-sm cursor-pointer"
          >
            <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
            <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
            <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
          </select>
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

      {/* Excel-Style Line-by-Line Entry Table */}
      <div className="bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1000px]">
          <thead>
            <tr className="text-zinc-500 text-[9px] uppercase tracking-widest border-b border-zinc-300/50">
              <th className="py-3 px-2 font-bold w-24">Inv Date</th>
              <th className="py-3 px-2 font-bold w-20">Inv No</th>
              <th className="py-3 px-2 font-bold min-w-[150px]">Vendor Name</th>
              <th className="py-3 px-2 font-bold w-32">GSTIN</th>
              <th className="py-3 px-2 font-bold w-20">HSN</th>
              <th className="py-3 px-2 font-bold text-right w-24">Taxable Amt</th>
              <th className="py-3 px-2 font-bold text-right w-24">GST Amt</th>
              <th className="py-3 px-2 font-bold text-right w-24">Total Amt</th>
              <th className="py-3 px-2 font-bold text-center w-28">Return Status</th>
              <th className="py-3 px-2 font-bold text-center w-16">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/40 text-xs">
            
            {/* INLINE ENTRY ROW */}
            <tr className="bg-amber-50/50 group">
              <td className="py-2 px-1"><input type="date" value={newBill.invoiceDate} onChange={e => setNewBill({...newBill, invoiceDate: e.target.value})} className={inputClass} /></td>
              <td className="py-2 px-1"><input type="text" placeholder="Bill No" value={newBill.invoiceNo} onChange={e => setNewBill({...newBill, invoiceNo: e.target.value})} className={inputClass} /></td>
              <td className="py-2 px-1"><input type="text" placeholder="Supplier / Vendor" value={newBill.vendorName} onChange={e => setNewBill({...newBill, vendorName: e.target.value})} className={inputClass} /></td>
              <td className="py-2 px-1"><input type="text" placeholder="GSTIN" value={newBill.gstin} onChange={e => setNewBill({...newBill, gstin: e.target.value.toUpperCase()})} className={inputClass} maxLength="15" /></td>
              <td className="py-2 px-1"><input type="text" placeholder="HSN/SAC" value={newBill.hsn} onChange={e => setNewBill({...newBill, hsn: e.target.value})} className={inputClass} /></td>
              <td className="py-2 px-1"><input type="number" placeholder="0.00" value={newBill.taxableAmount} onChange={e => setNewBill({...newBill, taxableAmount: e.target.value})} className={`${inputClass} text-right font-bold text-zinc-900`} /></td>
              <td className="py-2 px-1"><input type="number" placeholder="0.00" value={newBill.gstAmount} onChange={e => setNewBill({...newBill, gstAmount: e.target.value})} className={`${inputClass} text-right`} /></td>
              <td className="py-2 px-1 text-right font-black text-zinc-900 px-2">
                ₹ {((parseFloat(newBill.taxableAmount)||0) + (parseFloat(newBill.gstAmount)||0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}
              </td>
              <td className="py-2 px-1">
                <select value={newBill.returnStatus} onChange={e => setNewBill({...newBill, returnStatus: e.target.value})} className={`${inputClass} cursor-pointer`}>
                  <option value="Pending">Pending</option>
                  <option value="2B Matched">2B Matched</option>
                  <option value="ITC Claimed">ITC Claimed</option>
                </select>
              </td>
              <td className="py-2 px-1 text-center">
                <button onClick={handleAddBill} className="w-full bg-zinc-900 hover:bg-black text-white py-1.5 rounded font-bold text-[9px] uppercase tracking-wider transition-all shadow-md">Add</button>
              </td>
            </tr>

            {/* SAVED RECORDS */}
            {loading ? (
              <tr><td colSpan="10" className="py-8 text-center text-zinc-500">Loading purchases...</td></tr>
            ) : filteredPurchases.length === 0 ? (
              <tr><td colSpan="10" className="py-8 text-center text-zinc-400">No purchases found for this month. Use the row above to add a bill.</td></tr>
            ) : (
              filteredPurchases.map(p => (
                <tr key={p.id} className="hover:bg-white/40 transition-colors">
                  <td className="py-3 px-2 text-zinc-600">{p.invoiceDate}</td>
                  <td className="py-3 px-2 font-bold text-zinc-900">{p.invoiceNo || '-'}</td>
                  <td className="py-3 px-2 font-bold text-zinc-800 truncate max-w-[150px]">{p.vendorName}</td>
                  <td className="py-3 px-2 text-zinc-500 font-mono text-[10px]">{p.gstin || 'UNREGISTERED'}</td>
                  <td className="py-3 px-2 text-zinc-500">{p.hsn || '-'}</td>
                  <td className="py-3 px-2 text-right">₹ {p.taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="py-3 px-2 text-right text-emerald-600 font-bold">₹ {p.gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="py-3 px-2 text-right font-black text-zinc-900">₹ {p.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="py-3 px-2 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest border ${
                      p.returnStatus === '2B Matched' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      p.returnStatus === 'ITC Claimed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {p.returnStatus}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 font-bold text-[10px] uppercase tracking-wider transition-colors">Del</button>
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