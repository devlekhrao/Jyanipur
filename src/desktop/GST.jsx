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
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">GST & Compliance</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Automated GSTR-1, GSTR-2B, and GSTR-3B summaries. Ready for GSP API integration.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 h-10 bg-white border border-zinc-200 rounded-2xl px-3 shadow-sm">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer px-1">
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'long' })}</option>
              ))}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer pr-1">
              <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
              <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
              <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
            </select>
          </div>
          <button className="h-10 bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer">
            Export JSON
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0">
        {['GSTR-3B', 'GSTR-1 (Sales)', 'GSTR-2B (Purchases)'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab ? 'bg-[#1E3A8A] text-white shadow-md' : 'bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0">
        <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm">
          <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest block mb-1">Outward Tax Liability (GSTR-1)</span>
          <p className="text-2xl font-black text-zinc-900">₹ {taxData.outward.total.toLocaleString('en-IN')}</p>
          <span className="text-[9px] font-medium text-zinc-500 mt-1 block">Total Tax Collected on Sales</span>
        </div>
        <div className="bg-emerald-50/70 p-6 rounded-[2rem] border border-emerald-100 shadow-sm">
          <span className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest block mb-1">Input Tax Credit (GSTR-2B)</span>
          <p className="text-2xl font-black text-emerald-700">₹ {taxData.inward.total.toLocaleString('en-IN')}</p>
          <span className="text-[9px] font-medium text-emerald-600/80 mt-1 block">Total Eligible ITC on Purchases</span>
        </div>
        <div className="bg-zinc-900 text-white p-6 rounded-[2rem] shadow-lg">
          <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-widest block mb-1">Net Tax Payable (GSTR-3B)</span>
          <p className="text-2xl font-black">₹ {netPayable.total.toLocaleString('en-IN')}</p>
          <span className="text-[9px] font-medium text-zinc-400 mt-1 block">Payable to Government via Cash Ledger</span>
        </div>
      </div>

      {/* Tab Content Table */}
      <div className="bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-xs font-extrabold text-zinc-900 uppercase tracking-widest">{activeTab} RETURN BREAKDOWN</h3>
          
          {/* Dynamic Action Buttons based on Tab */}
          {activeTab === 'GSTR-1 (Sales)' && (
            <button onClick={() => handlePushToGSTN('GSTR-1')} disabled={syncing} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer">
              {syncing ? 'Pushing...' : 'Push GSTR-1 to Portal'}
            </button>
          )}
          {activeTab === 'GSTR-2B (Purchases)' && (
            <button onClick={handleFetch2B} disabled={syncing} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer">
              <span>⬇️</span> {syncing ? 'Fetching...' : 'Fetch Live 2B Data'}
            </button>
          )}
          {activeTab === 'GSTR-3B' && (
            <button onClick={() => handlePushToGSTN('GSTR-3B')} disabled={syncing} className="bg-amber-500 hover:bg-amber-400 text-zinc-900 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md cursor-pointer">
              {syncing ? 'Filing...' : 'File GSTR-3B via GSP'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-100 bg-zinc-50/50">
                <th className="py-3.5 px-4 font-bold">Tax Head</th>
                <th className="py-3.5 px-4 font-bold text-right">Output Tax (Sales)</th>
                <th className="py-3.5 px-4 font-bold text-right">Input Tax Credit (Purchases)</th>
                <th className="py-3.5 px-4 font-bold text-right">Net Tax Payable</th>
              </tr>
            </thead>
            <tbody className="text-xs text-zinc-800 divide-y divide-zinc-100">
              <tr className="hover:bg-zinc-50 transition-colors">
                <td className="py-4 px-4 font-extrabold text-zinc-900">CGST (Central Tax)</td>
                <td className="py-4 px-4 text-right font-medium">₹ {taxData.outward.cgst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right text-emerald-600 font-bold">₹ {taxData.inward.cgst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right font-black text-zinc-900">₹ {netPayable.cgst.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-zinc-50 transition-colors">
                <td className="py-4 px-4 font-extrabold text-zinc-900">SGST (State Tax)</td>
                <td className="py-4 px-4 text-right font-medium">₹ {taxData.outward.sgst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right text-emerald-600 font-bold">₹ {taxData.inward.sgst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right font-black text-zinc-900">₹ {netPayable.sgst.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-zinc-50 transition-colors">
                <td className="py-4 px-4 font-extrabold text-zinc-900">IGST (Integrated Tax)</td>
                <td className="py-4 px-4 text-right font-medium">₹ {taxData.outward.igst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right text-emerald-600 font-bold">₹ {taxData.inward.igst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right font-black text-zinc-900">₹ {netPayable.igst.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}