import React, { useState } from 'react';

export default function MobileGST() {
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
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">GST & Filing</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Tax Compliance</p>
          </div>

          {/* PERIOD SELECTOR */}
          <div className="flex gap-1.5 bg-white border border-zinc-200 rounded-xl p-1 shadow-sm">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))} 
              className="bg-transparent text-[11px] font-extrabold text-zinc-800 outline-none"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))} 
              className="bg-transparent text-[11px] font-extrabold text-zinc-800 outline-none"
            >
              <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
              <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
              <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
            </select>
          </div>
        </div>

        {/* TAB SEGMENTED CONTROL */}
        <div className="flex bg-zinc-200/80 p-1 rounded-2xl gap-1">
          {['GSTR-3B', 'GSTR-1 (Sales)', 'GSTR-2B (Purchases)'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition-all truncate ${
                activeTab === tab ? 'bg-white text-[#1E3A8A] shadow-sm' : 'text-zinc-500'
              }`}
            >
              {tab.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI SUMMARY CARDS STREAM */}
      <div className="space-y-2 mb-3 shrink-0">
        <div className="bg-zinc-900 text-white p-4 rounded-2xl shadow-md flex justify-between items-center">
          <div>
            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest block">Net Tax Payable (3B)</span>
            <p className="text-xl font-black mt-0.5">₹ {netPayable.total.toLocaleString('en-IN')}</p>
          </div>
          <span className="text-xs font-bold bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg">Cash Ledger</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Outward Tax (1)</span>
            <p className="text-base font-black text-zinc-900 mt-0.5">₹ {taxData.outward.total.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 shadow-sm">
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest block">ITC Credit (2B)</span>
            <p className="text-base font-black text-emerald-700 mt-0.5">₹ {taxData.inward.total.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* DYNAMIC ACTION BUTTON */}
      <div className="mb-3 shrink-0">
        {activeTab === 'GSTR-1 (Sales)' && (
          <button 
            onClick={() => handlePushToGSTN('GSTR-1')} 
            disabled={syncing} 
            className="w-full py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
          >
            {syncing ? 'Pushing Payload...' : 'Push GSTR-1 to Portal'}
          </button>
        )}
        {activeTab === 'GSTR-2B (Purchases)' && (
          <button 
            onClick={handleFetch2B} 
            disabled={syncing} 
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
          >
            {syncing ? 'Fetching...' : 'Fetch Live 2B Data'}
          </button>
        )}
        {activeTab === 'GSTR-3B' && (
          <button 
            onClick={() => handlePushToGSTN('GSTR-3B')} 
            disabled={syncing} 
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-zinc-900 font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
          >
            {syncing ? 'Filing Return...' : 'File GSTR-3B via GSP'}
          </button>
        )}
      </div>

      {/* TAX BREAKDOWN HEAD CARDS */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {[
          { title: 'CGST (Central Tax)', outward: taxData.outward.cgst, inward: taxData.inward.cgst, net: netPayable.cgst },
          { title: 'SGST (State Tax)', outward: taxData.outward.sgst, inward: taxData.inward.sgst, net: netPayable.sgst },
          { title: 'IGST (Integrated Tax)', outward: taxData.outward.igst, inward: taxData.inward.igst, net: netPayable.igst }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
            <h4 className="font-extrabold text-zinc-900 text-sm border-b border-zinc-100 pb-2">{item.title}</h4>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-zinc-50 p-2 rounded-xl">
                <span className="text-[8px] font-black text-zinc-400 uppercase block">Sales Tax</span>
                <p className="text-xs font-black text-zinc-800 mt-0.5">₹ {item.outward.toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-emerald-50 p-2 rounded-xl">
                <span className="text-[8px] font-black text-emerald-600 uppercase block">ITC Credit</span>
                <p className="text-xs font-black text-emerald-700 mt-0.5">₹ {item.inward.toLocaleString('en-IN')}</p>
              </div>

              <div className="bg-blue-50 p-2 rounded-xl">
                <span className="text-[8px] font-black text-[#1E3A8A] uppercase block">Net Due</span>
                <p className="text-xs font-black text-[#1E3A8A] mt-0.5">₹ {item.net.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}