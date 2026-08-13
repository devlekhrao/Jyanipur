import React, { useState, useEffect } from 'react';
import { getVendorLedgers, saveVendorPayment } from './db';

export default function VendorLedger() {
  const [loading, setLoading] = useState(true);
  const [ledgers, setLedgers] = useState([]);
  const [expandedVendor, setExpandedVendor] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payForm, setPayForm] = useState({ vendorName: '', date: new Date().toISOString().split('T')[0], amount: '', mode: 'Bank Transfer', referenceNo: '', notes: '' });

  const loadData = async () => {
    setLoading(true);
    setLedgers(await getVendorLedgers());
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSavePay = async (e) => {
    e.preventDefault();
    await saveVendorPayment({ ...payForm, amount: parseFloat(payForm.amount) });
    setIsModalOpen(false);
    setPayForm({ vendorName: '', date: new Date().toISOString().split('T')[0], amount: '', mode: 'Bank Transfer', referenceNo: '', notes: '' });
    await loadData();
  };

  const openPayModal = (vendorName) => {
    setPayForm(prev => ({ ...prev, vendorName }));
    setIsModalOpen(true);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-zinc-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="w-full font-['Poppins'] pb-12 relative">
      <div className="flex justify-between items-end pb-4 border-b border-zinc-300/50 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Vendor Accounts Payable</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Track total bills vs payments made to your suppliers.</p>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] shadow-xl overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto w-full pb-6">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-200/80 bg-zinc-50/50">
                <th className="py-4 px-6 w-8"></th>
                <th className="py-4 px-4 font-semibold">Vendor / Supplier</th>
                <th className="py-4 px-4 font-semibold text-right">Total Billed</th>
                <th className="py-4 px-4 font-semibold text-right">Total Paid</th>
                <th className="py-4 px-4 font-semibold text-right">Net Payable</th>
                <th className="py-4 px-6 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm text-zinc-700 divide-y divide-zinc-100">
              {loading ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 text-xs">Loading accounts...</td></tr>
              ) : ledgers.length === 0 ? (
                <tr><td colSpan="6" className="py-12 text-center text-zinc-400 text-xs">No vendor data found. Add purchases first.</td></tr>
              ) : (
                ledgers.map(l => (
                  <React.Fragment key={l.vendorName}>
                    <tr className={`hover:bg-zinc-50 transition-colors cursor-pointer ${expandedVendor === l.vendorName ? 'bg-zinc-50' : ''}`} onClick={() => setExpandedVendor(expandedVendor === l.vendorName ? null : l.vendorName)}>
                      <td className="py-4 px-6 text-zinc-400 font-bold text-xs">{expandedVendor === l.vendorName ? 'v' : '>'}</td>
                      <td className="py-4 px-4 font-bold text-zinc-800">{l.vendorName}</td>
                      <td className="py-4 px-4 text-right font-medium text-zinc-600">₹{l.totalBilled.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right font-semibold text-emerald-600">₹{l.totalPaid.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-4 text-right font-bold text-red-500">₹{l.balance.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openPayModal(l.vendorName)} className="text-[10px] font-bold bg-zinc-800 text-white hover:bg-black px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors">Log Payment</button>
                      </td>
                    </tr>
                    {expandedVendor === l.vendorName && (
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <td></td>
                        <td colSpan="5" className="py-4 pr-6">
                          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-inner">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Payment History</h4>
                            {l.payments.length === 0 ? <p className="text-xs text-zinc-400 italic">No payments logged yet.</p> : (
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-[9px] text-zinc-400 uppercase tracking-wider border-b border-zinc-100"><th className="pb-2">Date</th><th className="pb-2">Mode / Ref</th><th className="pb-2">Notes</th><th className="pb-2 text-right">Amount</th></tr>
                                </thead>
                                <tbody>
                                  {l.payments.map(pay => (
                                    <tr key={pay.id} className="border-b border-zinc-50 last:border-0">
                                      <td className="py-2.5 font-medium text-zinc-600">{pay.date}</td>
                                      <td className="py-2.5"><span className="bg-zinc-100 px-2 py-0.5 rounded text-[9px] font-bold mr-2">{pay.mode}</span> {pay.ref}</td>
                                      <td className="py-2.5 text-zinc-500">{pay.notes}</td>
                                      <td className="py-2.5 text-right font-bold text-emerald-600">₹{pay.amount.toLocaleString('en-IN')}</td>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">Pay Vendor</h2>
            <p className="text-zinc-500 text-[10px] font-medium mb-6 uppercase tracking-widest">Paying: {payForm.vendorName}</p>
            <form onSubmit={handleSavePay} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Date *</label><input type="date" required value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Amount (₹) *</label><input type="number" required value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className={inputClass} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Mode</label>
                  <select value={payForm.mode} onChange={e => setPayForm({...payForm, mode: e.target.value})} className={inputClass}>
                    <option value="Bank Transfer">Bank Tx</option><option value="UPI">UPI</option><option value="Cheque">Cheque</option><option value="Cash">Cash</option>
                  </select>
                </div>
                <div><label className={labelClass}>Ref No.</label><input type="text" value={payForm.referenceNo} onChange={e => setPayForm({...payForm, referenceNo: e.target.value})} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Notes</label><input type="text" value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} className={inputClass} /></div>
              <div className="flex gap-3 pt-4 border-t border-zinc-100"><button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-xs">Cancel</button><button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl text-xs">Record Payment</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}