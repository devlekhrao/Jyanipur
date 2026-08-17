import React, { useState, useEffect } from 'react';
import { getVendorLedgers, saveVendorPayment } from '../db';

export default function VendorLedger() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
      console.error("Error fetching vendor ledgers from cloud DB:", error);
      setLedgers([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSavePay = async (e) => {
    e.preventDefault();
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }

    setSubmitting(true);
    try {
      await saveVendorPayment({ ...payForm, amount: parseFloat(payForm.amount) });
      setIsModalOpen(false);
      setPayForm({ vendorName: '', date: new Date().toISOString().split('T')[0], amount: '', mode: 'Bank Transfer', referenceNo: '', notes: '' });
      await loadData();
    } catch (error) {
      alert("Error saving payment to cloud database.");
    }
    setSubmitting(false);
  };

  const openPayModal = (vendorName) => {
    setPayForm(prev => ({ ...prev, vendorName }));
    setIsModalOpen(true);
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-end pb-5 mb-6 border-b border-zinc-200 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Vendor Accounts Payable</h2>
          <p className="text-zinc-500 text-xs mt-0.5 font-medium">Track total bills vs payments made to your suppliers.</p>
        </div>
      </div>

      {/* Accounts Payable Table Container */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200 sticky top-0 bg-zinc-50 z-10">
                <th className="py-4 px-6 w-8 text-center">#</th>
                <th className="py-4 px-4 font-semibold">Vendor / Supplier</th>
                <th className="py-4 px-4 font-semibold text-right">Total Billed</th>
                <th className="py-4 px-4 font-semibold text-right">Total Paid</th>
                <th className="py-4 px-4 font-semibold text-right">Net Payable</th>
                <th className="py-4 px-6 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm text-zinc-800 divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-xs">Syncing vendor accounts from cloud DB...</td></tr>
              ) : ledgers.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 font-medium text-xs">No vendor data found. Add purchases first.</td></tr>
              ) : (
                ledgers.map(l => (
                  <React.Fragment key={l.vendorName}>
                    <tr 
                      className={`hover:bg-zinc-50 transition-colors cursor-pointer ${expandedVendor === l.vendorName ? 'bg-zinc-50/80' : ''}`} 
                      onClick={() => setExpandedVendor(expandedVendor === l.vendorName ? null : l.vendorName)}
                    >
                      <td className="py-4 px-6 text-zinc-400 flex justify-center items-center">
                        <svg 
                          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${expandedVendor === l.vendorName ? 'rotate-90 text-[#B45309]' : ''}`} 
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                      <td className="py-4 px-4 font-semibold text-zinc-900">{l.vendorName}</td>
                      <td className="py-4 px-4 text-right font-medium text-zinc-700">₹{(parseFloat(l.totalBilled) || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-600">₹{(parseFloat(l.totalPaid) || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-4 text-right font-bold text-red-500">₹{(parseFloat(l.balance) || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openPayModal(l.vendorName)} className="px-3 py-1.5 bg-[#B45309] hover:bg-[#92400E] text-white font-semibold text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-sm cursor-pointer">
                          Log Payment
                        </button>
                      </td>
                    </tr>
                    
                    {expandedVendor === l.vendorName && (
                      <tr className="bg-zinc-50/60 border-b border-zinc-200">
                        <td></td>
                        <td colSpan="5" className="py-4 pr-6">
                          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Payment History</h4>
                            {(!l.payments || l.payments.length === 0) ? <p className="text-xs text-zinc-400 font-medium italic">No payments logged yet.</p> : (
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-[11px] text-zinc-500 uppercase tracking-wider border-b border-zinc-100">
                                    <th className="pb-2 font-semibold">Date</th>
                                    <th className="pb-2 font-semibold">Mode / Ref</th>
                                    <th className="pb-2 font-semibold">Notes</th>
                                    <th className="pb-2 font-semibold text-right">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="text-zinc-800 divide-y divide-zinc-50">
                                  {l.payments.map(pay => (
                                    <tr key={pay.id} className="hover:bg-zinc-50 transition-colors">
                                      <td className="py-2.5 font-medium text-zinc-600">{pay.date}</td>
                                      <td className="py-2.5">
                                        <span className="bg-zinc-100 px-2 py-0.5 rounded text-[10px] font-semibold mr-2 text-zinc-700">{pay.mode}</span> 
                                        <span className="font-mono text-zinc-500">{pay.ref || pay.referenceNo || ''}</span>
                                      </td>
                                      <td className="py-2.5 text-zinc-500 font-medium">{pay.notes || '-'}</td>
                                      <td className="py-2.5 text-right font-bold text-emerald-600">₹{(parseFloat(pay.amount) || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
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
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Pay Vendor</h2>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mt-0.5">Paying: <strong className="text-[#B45309]">{payForm.vendorName}</strong></p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <form id="payForm" onSubmit={handleSavePay} className="space-y-4">
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
              </form>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-semibold rounded-xl text-sm transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" form="payForm" disabled={submitting} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50">
                {submitting ? 'Recording...' : 'Record Payment'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}