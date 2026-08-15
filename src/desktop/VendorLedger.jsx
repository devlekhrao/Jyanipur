import React, { useState, useEffect } from 'react';
import { getVendorLedgers, saveVendorPayment } from '.../db';

export default function VendorLedger() {
  const [loading, setLoading] = useState(true);
  const [ledgers, setLedgers] = useState([]);
  const [expandedVendor, setExpandedVendor] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({ 
    vendorName: '', 
    date: new Date().toISOString().split('T')[0], 
    amount: '', 
    mode: 'Bank Transfer', 
    referenceNo: '', 
    notes: '' 
  });

  const loadData = async () => {
    setLoading(true);
    try {
      setLedgers(await getVendorLedgers() || []);
    } catch (error) {
      console.warn("Ensure getVendorLedgers is implemented in db.js");
      setLedgers([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSavePay = async (e) => {
    e.preventDefault();
    try {
      await saveVendorPayment({ ...payForm, amount: parseFloat(payForm.amount) });
      setIsModalOpen(false);
      setPayForm({ vendorName: '', date: new Date().toISOString().split('T')[0], amount: '', mode: 'Bank Transfer', referenceNo: '', notes: '' });
      await loadData();
    } catch (error) {
      alert("Error saving payment. Ensure saveVendorPayment is implemented in db.js");
    }
  };

  const openPayModal = (vendorName) => {
    setPayForm(prev => ({ ...prev, vendorName }));
    setIsModalOpen(true);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-end pb-4 border-b border-zinc-200 mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Vendor Accounts Payable</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Track total bills vs payments made to your suppliers.</p>
        </div>
      </div>

      {/* Accounts Payable Table Container */}
      <div className="bg-white border border-zinc-200 rounded-[2rem] shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="text-zinc-400 text-[9px] uppercase tracking-[0.15em] border-b border-zinc-100 bg-zinc-50/50 sticky top-0 bg-zinc-50 z-10">
                <th className="py-3.5 px-6 w-8 text-center">#</th>
                <th className="py-3.5 px-4 font-bold">Vendor / Supplier</th>
                <th className="py-3.5 px-4 font-bold text-right">Total Billed</th>
                <th className="py-3.5 px-4 font-bold text-right">Total Paid</th>
                <th className="py-3.5 px-4 font-bold text-right">Net Payable</th>
                <th className="py-3.5 px-6 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs text-zinc-800 divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium">Loading accounts...</td></tr>
              ) : ledgers.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium">No vendor data found. Add purchases first.</td></tr>
              ) : (
                ledgers.map(l => (
                  <React.Fragment key={l.vendorName}>
                    <tr 
                      className={`hover:bg-zinc-50 transition-colors cursor-pointer ${expandedVendor === l.vendorName ? 'bg-zinc-50/80' : ''}`} 
                      onClick={() => setExpandedVendor(expandedVendor === l.vendorName ? null : l.vendorName)}
                    >
                      <td className="py-4 px-6 text-zinc-400 flex justify-center items-center">
                        <svg 
                          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${expandedVendor === l.vendorName ? 'rotate-90 text-[#1E3A8A]' : ''}`} 
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                      <td className="py-4 px-4 font-extrabold text-zinc-900">{l.vendorName}</td>
                      <td className="py-4 px-4 text-right font-medium text-zinc-700">₹{l.totalBilled.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-600">₹{l.totalPaid.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-4 text-right font-black text-red-500">₹{l.balance.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openPayModal(l.vendorName)} className="text-[10px] font-bold bg-[#1E3A8A] text-white hover:bg-blue-900 px-4 py-2 rounded-xl uppercase tracking-wider transition-all shadow-md cursor-pointer">
                          Log Payment
                        </button>
                      </td>
                    </tr>
                    
                    {expandedVendor === l.vendorName && (
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <td></td>
                        <td colSpan="5" className="py-4 pr-6">
                          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                            <h4 className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest mb-3">Payment History</h4>
                            {l.payments.length === 0 ? <p className="text-xs text-zinc-400 font-medium italic">No payments logged yet.</p> : (
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-[9px] text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                                    <th className="pb-2 font-bold">Date</th>
                                    <th className="pb-2 font-bold">Mode / Ref</th>
                                    <th className="pb-2 font-bold">Notes</th>
                                    <th className="pb-2 font-bold text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="text-zinc-800 divide-y divide-zinc-50">
                                  {l.payments.map(pay => (
                                    <tr key={pay.id} className="hover:bg-zinc-50 transition-colors">
                                      <td className="py-2.5 font-medium text-zinc-600">{pay.date}</td>
                                      <td className="py-2.5">
                                        <span className="bg-zinc-100 px-2 py-0.5 rounded text-[9px] font-bold mr-2 text-zinc-700">{pay.mode}</span> 
                                        {pay.ref}
                                      </td>
                                      <td className="py-2.5 text-zinc-500 font-medium">{pay.notes || '-'}</td>
                                      <td className="py-2.5 text-right font-black text-emerald-600">₹{pay.amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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

      {/* Pay Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-extrabold text-zinc-900 mb-1">Pay Vendor</h2>
            <p className="text-zinc-500 text-[10px] font-bold mb-6 uppercase tracking-widest">Paying: <span className="text-[#1E3A8A]">{payForm.vendorName}</span></p>
            
            <form onSubmit={handleSavePay} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                  <input type="number" step="any" required value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className={inputClass} placeholder="0.00" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Mode</label>
                  <select value={payForm.mode} onChange={e => setPayForm({...payForm, mode: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="Bank Transfer">Bank Tx</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Ref No.</label>
                  <input type="text" value={payForm.referenceNo} onChange={e => setPayForm({...payForm, referenceNo: e.target.value})} className={inputClass} placeholder="UTR / Chq No." />
                </div>
              </div>
              
              <div>
                <label className={labelClass}>Notes</label>
                <input type="text" value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} className={inputClass} placeholder="Optional payment details..." />
              </div>
              
              <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}