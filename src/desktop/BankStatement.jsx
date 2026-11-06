import React, { useState } from 'react';

// --- MOCK API DATA (To be replaced by your Node.js ICICI fetch route) ---
const MOCK_TRANSACTIONS = [
  { id: 'TXN-9901', date: '21 Aug 2026 14:30', description: 'IMPS/SURESH KUMAR/EXP-1042', type: 'DEBIT', amount: '14,500', status: 'RECONCILED', category: 'Site Expense - Jubilee Hills' },
  { id: 'TXN-9902', date: '21 Aug 2026 10:15', description: 'NEFT/ULTRATECH CEMENT LTD/INV-88', type: 'DEBIT', amount: '4,50,000', status: 'UNRECONCILED', category: null },
  { id: 'TXN-9903', date: '20 Aug 2026 16:45', description: 'RTGS/APOLLO BUILDERS/ADVANCE-01', type: 'CREDIT', amount: '12,50,000', status: 'UNRECONCILED', category: null },
  { id: 'TXN-9904', date: '19 Aug 2026 09:00', description: 'UPI/KIRAN T/PUMP-MAINT', type: 'DEBIT', amount: '8,200', status: 'RECONCILED', category: 'Fleet Maintenance' },
];

export default function BankStatement() {
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'UNRECONCILED', 'CREDIT', 'DEBIT'
  
  // Reconciliation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [reconcileData, setReconcileData] = useState({ category: 'Client Invoice Payment', project: 'Jubilee Hills Monolith' });

  const openReconcileModal = (txn) => {
    setSelectedTxn(txn);
    setReconcileData({
      category: txn.type === 'CREDIT' ? 'Client Invoice Payment' : 'Raw Material Purchase',
      project: 'Jubilee Hills Monolith'
    });
    setIsModalOpen(true);
  };

  const handleReconcileSubmit = (e) => {
    e.preventDefault();
    // In production, this POSTs to your backend to update the database
    setTransactions(transactions.map(t => 
      t.id === selectedTxn.id 
        ? { ...t, status: 'RECONCILED', category: `${reconcileData.category} - ${reconcileData.project}` } 
        : t
    ));
    setIsModalOpen(false);
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'UNRECONCILED') return t.status === 'UNRECONCILED';
    if (filter === 'CREDIT') return t.type === 'CREDIT';
    if (filter === 'DEBIT') return t.type === 'DEBIT';
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER: ACCOUNT OVERVIEW */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 lg:p-8 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">ICICI Corporate Current</h2>
          </div>
          <p className="text-[11px] text-zinc-500 font-medium font-mono">A/C: 437405000324 • IFSC: ICIC0004374</p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Available Balance</p>
          <h3 className="text-4xl font-light text-zinc-900 tracking-tight">₹ 42,85,400<span className="text-xl text-zinc-400 font-medium">.00</span></h3>
        </div>
      </div>

      {/* TOOLBAR & FILTERS */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex bg-zinc-100 p-1.5 rounded-xl border border-zinc-200 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'UNRECONCILED', 'CREDIT', 'DEBIT'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        <button className="w-full sm:w-auto px-6 py-2.5 bg-zinc-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-zinc-900">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Sync ICICI Ledger
        </button>
      </div>

      {/* TRANSACTION STATEMENT TABLE */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-widest text-[10px]">
              <tr>
                <th className="p-5 font-bold">Date & Ref ID</th>
                <th className="p-5 font-bold">Bank Narration</th>
                <th className="p-5 font-bold">In/Out (₹)</th>
                <th className="p-5 font-bold">ERP Category</th>
                <th className="p-5 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-800">
              {filteredTransactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-zinc-50/80 transition-colors group">
                  <td className="p-5">
                    <div className="font-bold text-zinc-900 text-sm tracking-tight">{txn.date}</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-1 font-medium">{txn.id}</div>
                  </td>
                  <td className="p-5 font-mono text-zinc-600 text-[11px] max-w-[200px] truncate font-medium">
                    {txn.description}
                  </td>
                  <td className="p-5 font-sans font-bold text-sm tracking-tight">
                    {txn.type === 'CREDIT' ? (
                      <span className="text-emerald-600">+ {txn.amount}</span>
                    ) : (
                      <span className="text-zinc-900">- {txn.amount}</span>
                    )}
                  </td>
                  <td className="p-5">
                    {txn.status === 'RECONCILED' ? (
                      <span className="px-2.5 py-1 bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-md text-[9px] uppercase tracking-widest font-bold inline-block">
                        {txn.category}
                      </span>
                    ) : (
                      <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.5)]"></span> Requires Tag
                      </span>
                    )}
                  </td>
                  <td className="p-5 text-right">
                    {txn.status === 'UNRECONCILED' ? (
                      <button 
                        onClick={() => openReconcileModal(txn)}
                        className="px-4 py-2 bg-white text-zinc-900 hover:bg-zinc-900 hover:text-white border border-zinc-200 hover:border-zinc-900 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm cursor-pointer"
                      >
                        Reconcile
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-bold uppercase tracking-widest text-[10px] bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Matched
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECONCILIATION MODAL */}
      {isModalOpen && selectedTxn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-md p-8 relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <h3 className="text-2xl font-bold text-zinc-900 mb-2 tracking-tight">Reconcile Transaction</h3>
            <p className="text-xs text-zinc-500 font-mono mb-6 bg-zinc-50 p-4 rounded-xl border border-zinc-200 leading-relaxed font-medium">
              {selectedTxn.description} <br/>
              <span className={`font-bold mt-2 block text-sm font-sans ${selectedTxn.type === 'CREDIT' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                {selectedTxn.type === 'CREDIT' ? '+' : '-'} ₹{selectedTxn.amount}
              </span>
            </p>

            <form onSubmit={handleReconcileSubmit} className="space-y-5 text-xs font-sans">
              <div>
                <label className="block text-zinc-500 font-bold uppercase tracking-widest mb-2 text-[10px] ml-1">Financial Category</label>
                <select 
                  value={reconcileData.category}
                  onChange={(e) => setReconcileData({...reconcileData, category: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all cursor-pointer appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717A' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25rem' }}
                >
                  {selectedTxn.type === 'CREDIT' ? (
                    <>
                      <option value="Client Invoice Payment">Client Invoice Payment</option>
                      <option value="Project Advance">Project Advance</option>
                      <option value="Asset Sale">Asset Sale</option>
                    </>
                  ) : (
                    <>
                      <option value="Raw Material Purchase">Raw Material Purchase</option>
                      <option value="Site Expense (Petty Cash)">Site Expense (Petty Cash)</option>
                      <option value="Sub-contractor Payout">Sub-contractor Payout</option>
                      <option value="Fleet Maintenance">Fleet Maintenance</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-zinc-500 font-bold uppercase tracking-widest mb-2 text-[10px] ml-1">Tag to Active Site/Project</label>
                <select 
                  value={reconcileData.project}
                  onChange={(e) => setReconcileData({...reconcileData, project: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-zinc-900 font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white transition-all cursor-pointer appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717A' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25rem' }}
                >
                  <option value="HQ Operation">HQ Operation</option>
                  <option value="Jubilee Hills Monolith">Jubilee Hills Monolith</option>
                  <option value="HITEC Commercial Shell">HITEC Commercial Shell</option>
                  <option value="Mumbai High-Rise">Mumbai High-Rise</option>
                </select>
              </div>

              <button type="submit" className="w-full py-4 mt-4 bg-zinc-900 hover:bg-black text-white font-bold uppercase tracking-widest text-[11px] rounded-xl transition-all shadow-sm cursor-pointer">
                Tag & Save to Ledger
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}