import React, { useState } from 'react';

export default function GST() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [activeTab, setActiveTab] = useState('GSTR-3B');
  const [syncing, setSyncing] = useState(false);

  // Simulated live calculation data (Later, this will map from your DB)
  const taxData = {
    outward: { cgst: 14500, sgst: 14500, igst: 42000, total: 71000 },
    inward: { cgst: 8200, sgst: 8200, igst: 15000, total: 31400 },
  };

  const netPayable = {
    cgst: Math.max(0, taxData.outward.cgst - taxData.inward.cgst),
    sgst: Math.max(0, taxData.outward.sgst - taxData.inward.sgst),
    igst: Math.max(0, taxData.outward.igst - taxData.inward.igst),
    total: Math.max(0, taxData.outward.total - taxData.inward.total)
  };

  // Mock API Handlers
  const handlePushToGSTN = async (formType) => {
    setSyncing(true);
    // Future API logic: fetch('/api/gst-push', { method: 'POST', body: JSON.stringify(payload) })
    setTimeout(() => {
      alert(`${formType} Payload successfully prepared and pushed to GSP Sandbox!`);
      setSyncing(false);
    }, 1500);
  };

  const handleFetch2B = async () => {
    setSyncing(true);
    setTimeout(() => {
      alert("GSTR-2B Data successfully fetched from Government Portal and reconciled!");
      setSyncing(false);
    }, 1500);
  };

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">GST & Compliance</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Automated GSTR-1, GSTR-2B, and GSTR-3B summaries. Ready for GSP API integration.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 h-9 bg-white/60 border border-zinc-200/60 rounded-xl px-2 shadow-sm">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent border-none text-xs font-semibold text-zinc-700 outline-none cursor-pointer px-1">
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'long' })}</option>
              ))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent border-none text-xs font-semibold text-zinc-700 outline-none cursor-pointer pr-1">
              <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
              <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
            </select>
          </div>
          <button className="h-9 bg-zinc-900 hover:bg-black text-white px-5 rounded-xl text-xs font-bold transition-all shadow-md">
            Export JSON
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
        {['GSTR-3B', 'GSTR-1 (Sales)', 'GSTR-2B (Purchases)'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab ? 'bg-zinc-900 text-white shadow-md' : 'bg-white/60 text-zinc-600 hover:bg-white border border-white/60'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-3xl border border-white/60 shadow-sm">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest block mb-1">Outward Tax Liability (GSTR-1)</span>
          <p className="text-2xl font-bold text-zinc-800">₹ {taxData.outward.total.toLocaleString('en-IN')}</p>
          <span className="text-[9px] text-zinc-400 mt-1 block">Total Tax Collected on Sales</span>
        </div>
        <div className="bg-white/50 backdrop-blur-xl p-5 rounded-3xl border border-emerald-100 shadow-sm">
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest block mb-1">Input Tax Credit (GSTR-2B)</span>
          <p className="text-2xl font-bold text-emerald-700">₹ {taxData.inward.total.toLocaleString('en-IN')}</p>
          <span className="text-[9px] text-emerald-600/70 mt-1 block">Total Eligible ITC on Purchases</span>
        </div>
        <div className="bg-zinc-900 text-white p-5 rounded-3xl shadow-md">
          <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest block mb-1">Net Tax Payable (GSTR-3B)</span>
          <p className="text-2xl font-bold">₹ {netPayable.total.toLocaleString('en-IN')}</p>
          <span className="text-[9px] text-zinc-400 mt-1 block">Payable to Government via Cash Ledger</span>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl w-full overflow-x-auto">
        <div className="flex justify-between items-center mb-6 min-w-[600px]">
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">{activeTab} RETURN BREAKDOWN</h3>
          
          {/* Dynamic Action Buttons based on Tab */}
          {activeTab === 'GSTR-1 (Sales)' && (
            <button onClick={() => handlePushToGSTN('GSTR-1')} disabled={syncing} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md">
              {syncing ? 'Pushing...' : 'Push GSTR-1 to Portal'}
            </button>
          )}
          {activeTab === 'GSTR-2B (Purchases)' && (
            <button onClick={handleFetch2B} disabled={syncing} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2">
              <span>⬇️</span> {syncing ? 'Fetching...' : 'Fetch Live 2B Data'}
            </button>
          )}
          {activeTab === 'GSTR-3B' && (
            <button onClick={() => handlePushToGSTN('GSTR-3B')} disabled={syncing} className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md">
              {syncing ? 'Filing...' : 'File GSTR-3B via GSP'}
            </button>
          )}
        </div>

        <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
          <thead>
            <tr className="text-zinc-400 text-[10px] uppercase tracking-widest border-b-2 border-zinc-200">
              <th className="py-3 px-2 font-semibold">Tax Head</th>
              <th className="py-3 px-2 font-semibold text-right">Output Tax (Sales)</th>
              <th className="py-3 px-2 font-semibold text-right">Input Tax Credit (Purchases)</th>
              <th className="py-3 px-2 font-semibold text-right">Net Tax Payable</th>
            </tr>
          </thead>
          <tbody className="text-sm text-zinc-700 divide-y divide-zinc-200/40">
            <tr className="hover:bg-white/40 transition-colors">
              <td className="py-4 px-2 font-semibold text-zinc-800">CGST (Central Tax)</td>
              <td className="py-4 px-2 text-right">₹ {taxData.outward.cgst.toLocaleString('en-IN')}</td>
              <td className="py-4 px-2 text-right text-emerald-600 font-medium">₹ {taxData.inward.cgst.toLocaleString('en-IN')}</td>
              <td className="py-4 px-2 text-right font-bold text-zinc-900">₹ {netPayable.cgst.toLocaleString('en-IN')}</td>
            </tr>
            <tr className="hover:bg-white/40 transition-colors">
              <td className="py-4 px-2 font-semibold text-zinc-800">SGST (State Tax)</td>
              <td className="py-4 px-2 text-right">₹ {taxData.outward.sgst.toLocaleString('en-IN')}</td>
              <td className="py-4 px-2 text-right text-emerald-600 font-medium">₹ {taxData.inward.sgst.toLocaleString('en-IN')}</td>
              <td className="py-4 px-2 text-right font-bold text-zinc-900">₹ {netPayable.sgst.toLocaleString('en-IN')}</td>
            </tr>
            <tr className="hover:bg-white/40 transition-colors">
              <td className="py-4 px-2 font-semibold text-zinc-800">IGST (Integrated Tax)</td>
              <td className="py-4 px-2 text-right">₹ {taxData.outward.igst.toLocaleString('en-IN')}</td>
              <td className="py-4 px-2 text-right text-emerald-600 font-medium">₹ {taxData.inward.igst.toLocaleString('en-IN')}</td>
              <td className="py-4 px-2 text-right font-bold text-zinc-900">₹ {netPayable.igst.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}