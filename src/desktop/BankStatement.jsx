import React, { useState, useEffect } from 'react';

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
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER: ACCOUNT OVERVIEW */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 lg:p-8 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-[#B45309] text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md">Live Sync</span>
            <h2 className="text-xl font-bold text-zinc-900">ICICI Corporate Current</h2>
          </div>
          <p className="text-xs text-zinc-500 font-mono">A/C: 437405000324 • IFSC: ICIC0004374</p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Available Balance</p>
          <h3 className="text-3xl font-light text-zinc-900 tracking-tight">₹ 42,85,400<span className="text-lg text-zinc-400">.00</span></h3>
        </div>
      </div>

      {/* TOOLBAR & FILTERS */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'UNRECONCILED', 'CREDIT', 'DEBIT'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>

        <button className="w-full sm:w-auto px-5 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-md transition-all">
          Sync ICICI Ledger
        </button>
      </div>

      {/* TRANSACTION STATEMENT TABLE */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex-1">
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
              <tr key={txn.id} className="hover:bg-zinc-50 transition-colors">
                <td className="p-5">
                  <div className="font-bold text-zinc-900">{txn.date}</div>
                  <div className="text-[10px] text-zinc-500 font-mono mt-1">{txn.id}</div>
                </td>
                <td className="p-5 font-mono text-zinc-600 text-[11px] max-w-[200px] truncate">
                  {txn.description}
                </td>
                <td className="p-5 font-sans font-bold text-sm">
                  {txn.type === 'CREDIT' ? (
                    <span className="text-emerald-600">+ {txn.amount}</span>
                  ) : (
                    <span className="text-zinc-900">- {txn.amount}</span>
                  )}
                </td>
                <td className="p-5">
                  {txn.status === 'RECONCILED' ? (
                    <span className="px-2.5 py-1 bg-zinc-100 border border-zinc-200 text-zinc-700 rounded-md text-[9px] uppercase tracking-widest font-bold">
                      {txn.category}
                    </span>
                  ) : (
                    <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> Requires Tag
                    </span>
                  )}
                </td>
                <td className="p-5 text-right">
                  {txn.status === 'UNRECONCILED' ? (
                    <button 
                      onClick={() => openReconcileModal(txn)}
                      className="px-4 py-2 bg-[#B45309]/10 text-[#B45309] hover:bg-[#B45309] hover:text-white border border-[#B45309]/20 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors"
                    >
                      Reconcile
                    </button>
                  ) : (
                    <span className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">✓ Matched</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RECONCILIATION MODAL */}
      {isModalOpen && selectedTxn && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-md p-8 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-800 font-mono text-xs uppercase font-bold">✕</button>
            
            <h3 className="text-xl font-light text-zinc-900 mb-2">Reconcile Transaction</h3>
            <p className="text-xs text-zinc-500 font-mono mb-6 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
              {selectedTxn.description} <br/>
              <span className={`font-bold mt-1 block ${selectedTxn.type === 'CREDIT' ? 'text-emerald-600' : 'text-zinc-900'}`}>
                {selectedTxn.type === 'CREDIT' ? '+' : '-'} ₹{selectedTxn.amount}
              </span>
            </p>

            <form onSubmit={handleReconcileSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-zinc-500 font-bold uppercase tracking-widest mb-2 text-[10px]">Financial Category</label>
                <select 
                  value={reconcileData.category}
                  onChange={(e) => setReconcileData({...reconcileData, category: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-[#B45309] focus:bg-white shadow-inner"
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
                <label className="block text-zinc-500 font-bold uppercase tracking-widest mb-2 text-[10px]">Tag to Active Site/Project</label>
                <select 
                  value={reconcileData.project}
                  onChange={(e) => setReconcileData({...reconcileData, project: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-zinc-900 focus:outline-none focus:border-[#B45309] focus:bg-white shadow-inner"
                >
                  <option value="HQ Operation">HQ Operation</option>
                  <option value="Jubilee Hills Monolith">Jubilee Hills Monolith</option>
                  <option value="HITEC Commercial Shell">HITEC Commercial Shell</option>
                  <option value="Mumbai High-Rise">Mumbai High-Rise</option>
                </select>
              </div>

              <button type="submit" className="w-full py-4 mt-2 bg-[#B45309] hover:bg-[#92400E] text-white font-bold uppercase tracking-widest rounded-xl transition-all shadow-md">
                Tag & Save to Ledger
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}