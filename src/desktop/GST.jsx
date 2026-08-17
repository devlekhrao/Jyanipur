import React, { useState } from 'react';

export default function GST() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [activeTab, setActiveTab] = useState('GSTR-3B');
  const [syncing, setSyncing] = useState(false);

  // Simulated live calculation data
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
    <div className="w-full h-full flex flex-col" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">GST & Compliance</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Automated GSTR-1, GSTR-2B, and GSTR-3B summaries. Ready for GSP API integration.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-xl px-3 shadow-sm">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))} 
              className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer px-1"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'long' })}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))} 
              className="bg-transparent border-none text-xs font-bold text-zinc-800 outline-none cursor-pointer pr-1"
            >
              <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
              <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
              <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
            </select>
          </div>
          <button className="h-10 bg-[#B45309] hover:bg-[#92400E] text-white px-5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            Export JSON
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex gap-2 mb-6 shrink-0">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200">
          {['GSTR-3B', 'GSTR-1 (Sales)', 'GSTR-2B (Purchases)'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Outward Tax Liability (GSTR-1)</span>
          <p className="text-xl font-bold text-zinc-900">₹ {taxData.outward.total.toLocaleString('en-IN')}</p>
          <span className="text-xs font-medium text-zinc-500 mt-1 block">Total Tax Collected on Sales</span>
        </div>
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Input Tax Credit (GSTR-2B)</span>
          <p className="text-xl font-bold text-emerald-700">₹ {taxData.inward.total.toLocaleString('en-IN')}</p>
          <span className="text-xs font-medium text-emerald-600/80 mt-1 block">Total Eligible ITC on Purchases</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest block mb-1">Net Tax Payable (GSTR-3B)</span>
          <p className="text-xl font-bold text-[#B45309]">₹ {netPayable.total.toLocaleString('en-IN')}</p>
          <span className="text-xs font-medium text-zinc-500 mt-1 block">Payable to Government via Cash Ledger</span>
        </div>
      </div>

      {/* TAB CONTENT TABLE */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">{activeTab} RETURN BREAKDOWN</h3>
          
          {/* Dynamic Action Buttons based on Tab */}
          {activeTab === 'GSTR-1 (Sales)' && (
            <button onClick={() => handlePushToGSTN('GSTR-1')} disabled={syncing} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer">
              {syncing ? 'Pushing...' : 'Push GSTR-1 to Portal'}
            </button>
          )}
          {activeTab === 'GSTR-2B (Purchases)' && (
            <button onClick={handleFetch2B} disabled={syncing} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" /></svg>
              {syncing ? 'Fetching...' : 'Fetch Live 2B Data'}
            </button>
          )}
          {activeTab === 'GSTR-3B' && (
            <button onClick={() => handlePushToGSTN('GSTR-3B')} disabled={syncing} className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer">
              {syncing ? 'Filing...' : 'File GSTR-3B via GSP'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-50/80 text-zinc-500 text-[11px] uppercase tracking-wider border-b border-zinc-200">
                <th className="py-3.5 px-4 font-semibold">Tax Head</th>
                <th className="py-3.5 px-4 font-semibold text-right">Output Tax (Sales)</th>
                <th className="py-3.5 px-4 font-semibold text-right">Input Tax Credit (Purchases)</th>
                <th className="py-3.5 px-4 font-semibold text-right">Net Tax Payable</th>
              </tr>
            </thead>
            <tbody className="text-sm text-zinc-800 divide-y divide-zinc-100">
              <tr className="hover:bg-zinc-50 transition-colors">
                <td className="py-4 px-4 font-semibold text-zinc-900">CGST (Central Tax)</td>
                <td className="py-4 px-4 text-right font-medium text-zinc-700">₹ {taxData.outward.cgst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right text-emerald-600 font-bold">₹ {taxData.inward.cgst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right font-bold text-zinc-900">₹ {netPayable.cgst.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-zinc-50 transition-colors">
                <td className="py-4 px-4 font-semibold text-zinc-900">SGST (State Tax)</td>
                <td className="py-4 px-4 text-right font-medium text-zinc-700">₹ {taxData.outward.sgst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right text-emerald-600 font-bold">₹ {taxData.inward.sgst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right font-bold text-zinc-900">₹ {netPayable.sgst.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="hover:bg-zinc-50 transition-colors">
                <td className="py-4 px-4 font-semibold text-zinc-900">IGST (Integrated Tax)</td>
                <td className="py-4 px-4 text-right font-medium text-zinc-700">₹ {taxData.outward.igst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right text-emerald-600 font-bold">₹ {taxData.inward.igst.toLocaleString('en-IN')}</td>
                <td className="py-4 px-4 text-right font-bold text-zinc-900">₹ {netPayable.igst.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}