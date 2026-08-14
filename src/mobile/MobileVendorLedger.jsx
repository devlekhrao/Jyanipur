import React, { useState, useEffect } from 'react';
import { getVendorLedgers, saveVendorPayment } from '../db';

export default function MobileVendorLedger() {
  const [loading, setLoading] = useState(true);
  const [ledgers, setLedgers] = useState([]);
  const [expandedVendor, setExpandedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
      const data = await getVendorLedgers();
      setLedgers(data || []);
    } catch (error) {
      console.warn("Ensure getVendorLedgers is implemented in db.js");
      setLedgers([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSavePay = async (e) => {
    e.preventDefault();
    if (!payForm.amount || isNaN(payForm.amount) || parseFloat(payForm.amount) <= 0) {
      alert("Please enter a valid payment amount.");
      return;
    }
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

  const filteredLedgers = ledgers.filter(l => 
    l.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBilled = filteredLedgers.reduce((sum, l) => sum + (l.totalBilled || 0), 0);
  const totalPaid = filteredLedgers.reduce((sum, l) => sum + (l.totalPaid || 0), 0);
  const totalBalance = totalBilled - totalPaid;

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Vendor Ledgers</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Accounts Payable</p>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="bg-white border border-zinc-200 rounded-2xl px-3.5 py-2 shadow-sm flex items-center">
          <span className="text-xs text-zinc-400 mr-2">🔍</span>
          <input 
            type="text" 
            placeholder="Search vendor or supplier..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs font-medium text-zinc-800 outline-none placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* 3-KPI STRIP */}
      <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
        <div className="bg-white p-2.5 rounded-2xl border border-zinc-200 shadow-sm text-center">
          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Total Billed</span>
          <p className="text-xs font-black text-zinc-900 mt-0.5">₹ {totalBilled.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>

        <div className="bg-emerald-50 p-2.5 rounded-2xl border border-emerald-100 shadow-sm text-center">
          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">Total Paid</span>
          <p className="text-xs font-black text-emerald-700 mt-0.5">₹ {totalPaid.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>

        <div className="bg-red-50 p-2.5 rounded-2xl border border-red-100 shadow-sm text-center">
          <span className="text-[8px] font-black text-red-500 uppercase tracking-widest block">Net Payable</span>
          <p className="text-xs font-black text-red-600 mt-0.5">₹ {totalBalance.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* VENDOR CARDS STREAM */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading vendor accounts...</div>
        ) : filteredLedgers.length === 0 ? (
          <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-2">
            <span className="text-3xl mb-2 block">🏪</span>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No vendor accounts found</p>
          </div>
        ) : (
          filteredLedgers.map(l => {
            const isExpanded = expandedVendor === l.vendorName;

            return (
              <div 
                key={l.vendorName} 
                className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3 active:scale-[0.99] transition-transform"
              >
                {/* CARD HEADER */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-blue-50 text-[#1E3A8A] text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                      Supplier
                    </span>
                    <h4 className="font-extrabold text-zinc-900 text-sm mt-1">{l.vendorName}</h4>
                  </div>

                  <button 
                    onClick={() => openPayModal(l.vendorName)}
                    className="bg-[#1E3A8A] text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 transition-transform"
                  >
                    Log Pay
                  </button>
                </div>

                {/* METRICS GRID */}
                <div className="grid grid-cols-3 gap-1.5 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 text-center text-xs">
                  <div>
                    <span className="text-[8px] font-black text-zinc-400 uppercase block">Billed</span>
                    <p className="font-black text-zinc-900 mt-0.5">₹{l.totalBilled?.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                  </div>

                  <div>
                    <span className="text-[8px] font-black text-emerald-600 uppercase block">Paid</span>
                    <p className="font-black text-emerald-700 mt-0.5">₹{l.totalPaid?.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                  </div>

                  <div>
                    <span className="text-[8px] font-black text-red-500 uppercase block">Payable</span>
                    <p className="font-black text-red-600 mt-0.5">₹{l.balance?.toLocaleString('en-IN', {maximumFractionDigits: 0})}</p>
                  </div>
                </div>

                {/* TOGGLE EXPAND PAYMENTS ROW */}
                <div className="pt-1 border-t border-zinc-100">
                  <button 
                    onClick={() => setExpandedVendor(isExpanded ? null : l.vendorName)} 
                    className="text-[10px] font-black text-zinc-500 hover:text-zinc-900 w-full text-left"
                  >
                    {isExpanded ? 'Hide History ▲' : `Payment History (${l.payments?.length || 0}) ▼`}
                  </button>
                </div>

                {/* EXPANDABLE PAYMENTS STREAM */}
                {isExpanded && (
                  <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3 space-y-2 text-xs">
                    <h5 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200 pb-1">
                      Payment Ledger
                    </h5>

                    {l.payments?.length === 0 ? (
                      <p className="text-[10px] text-zinc-400 italic">No payments logged yet.</p>
                    ) : (
                      l.payments?.map(pay => (
                        <div key={pay.id} className="flex justify-between items-center py-1.5 border-b border-zinc-100 last:border-0">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="bg-white border border-zinc-200 text-zinc-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                {pay.mode}
                              </span>
                              <span className="font-bold text-zinc-900 text-xs">₹{Number(pay.amount).toLocaleString('en-IN')}</span>
                            </div>
                            {pay.notes && <p className="text-[9px] text-zinc-400 mt-0.5">{pay.notes}</p>}
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-zinc-400 font-semibold block">{pay.date}</span>
                            {pay.ref && <span className="text-[8px] font-mono text-zinc-400">Ref: {pay.ref}</span>}
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

      {/* LOG PAYMENT BOTTOM SHEET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full rounded-t-[2.5rem] shadow-2xl p-6 flex flex-col animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-zinc-900">Pay Vendor</h2>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">Paying: <span className="text-[#1E3A8A]">{payForm.vendorName}</span></p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePay} className="space-y-4 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label>
                  <input type="number" inputMode="decimal" step="any" required placeholder="0.00" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Payment Mode</label>
                  <div className="relative">
                    <select value={payForm.mode} onChange={e => setPayForm({...payForm, mode: e.target.value})} className={`${inputClass} appearance-none font-bold`}>
                      <option value="Bank Transfer">Bank Tx</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Ref / UTR No.</label>
                  <input type="text" placeholder="UTR / Chq No." value={payForm.referenceNo} onChange={e => setPayForm({...payForm, referenceNo: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <input type="text" placeholder="Optional payment notes..." value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} className={inputClass} />
              </div>

              <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform mt-2">
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}