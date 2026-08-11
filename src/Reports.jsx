import React, { useState, useEffect } from 'react';
import { getInvoices, getExpenses } from './db';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [activeReportTab, setActiveReportTab] = useState('gstr3b'); // 'gstr3b', 'gstr1', 'gstr2', 'pnl'

  useEffect(() => {
    async function loadReportData() {
      setLoading(true);
      const invs = await getInvoices();
      const exps = await getExpenses();
      setInvoices(invs.filter(i => !i.isCancelled));
      setExpenses(exps);
      setLoading(false);
    }
    loadReportData();
  }, []);

  // Filter data by selected Month and Year
  const filteredInvoices = invoices.filter(inv => {
    if (!inv.date) return false;
    const d = new Date(inv.date);
    return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
  });

  const filteredExpenses = expenses.filter(ex => {
    if (!ex.date) return false;
    const d = new Date(ex.date);
    return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
  });

  // --- GSTR-1 Calculations (Outward / Sales Tax) ---
  const gstr1Taxable = filteredInvoices.reduce((sum, inv) => {
    const basic = inv.items?.reduce((acc, it) => acc + ((parseFloat(it.no)||1) * (parseFloat(it.rate)||0)), 0) || 0;
    return sum + basic;
  }, 0);

  const gstr1Gst = filteredInvoices.reduce((sum, inv) => {
    const gstVal = inv.items?.reduce((acc, it) => {
      const b = ((parseFloat(it.no)||1) * (parseFloat(it.rate)||0));
      return acc + (b * (parseFloat(it.gst)||0)) / 100;
    }, 0) || 0;
    return sum + gstVal;
  }, 0);

  // --- GSTR-2 Calculations (Inward / Purchase Tax Credit) ---
  const gstr2Taxable = filteredExpenses.reduce((sum, ex) => sum + ex.taxableAmount, 0);
  const gstr2Gst = filteredExpenses.reduce((sum, ex) => sum + ex.gstAmount, 0);

  // --- GSTR-3B Calculations (Net Tax Payable) ---
  const netCgstSgstPayable = Math.max(0, (gstr1Gst / 2) - (gstr2Gst / 2));
  const netIgstPayable = Math.max(0, gstr1Gst - gstr2Gst);

  // --- Profit & Loss ---
  const totalRevenue = filteredInvoices.reduce((sum, inv) => {
    const rawAmt = inv.amount ? parseFloat(inv.amount.replace(/[^0-9.]/g, '')) : 0;
    return sum + rawAmt;
  }, 0);
  const totalExpenseAmount = filteredExpenses.reduce((sum, ex) => sum + ex.totalAmount, 0);
  const netProfit = totalRevenue - totalExpenseAmount;

  return (
    <div className="w-full font-['Poppins'] pb-12">
      
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Business & Tax Reports</h2>
          <p className="text-zinc-600 text-xs mt-1 font-medium">Automated GSTR-1, GSTR-2, GSTR-3B summaries and financial statements.</p>
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))} 
            className="bg-white/60 border border-white/60 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-800 outline-none shadow-sm cursor-pointer"
          >
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))} 
            className="bg-white/60 border border-white/60 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-800 outline-none shadow-sm cursor-pointer"
          >
            <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
            <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
            <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
          </select>
          <button 
            onClick={() => window.print()}
            className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-lg cursor-pointer ml-2 print:hidden"
          >
            Print Report
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 mb-8 print:hidden overflow-x-auto pb-1">
        {[
          { id: 'gstr3b', label: 'GSTR-3B Summary' },
          { id: 'gstr1', label: 'GSTR-1 (Sales / Outward)' },
          { id: 'gstr2', label: 'GSTR-2 (Purchases / Input)' },
          { id: 'pnl', label: 'Profit & Loss Statement' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeReportTab === tab.id
                ? 'bg-zinc-900 text-white shadow-md'
                : 'bg-white/40 hover:bg-white text-zinc-700 border border-white/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-500 text-xs">Loading financial data from Neon DB...</div>
      ) : (
        <>
          {/* ================= GSTR-3B SUMMARY ================= */}
          {activeReportTab === 'gstr3b' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Outward Tax Liability (GSTR-1)</span>
                  <p className="text-2xl font-black text-zinc-900">₹ {gstr1Gst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  <p className="text-[10px] text-zinc-500 mt-2">Total Tax Collected on Sales</p>
                </div>
                <div className="bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-xl">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Input Tax Credit (GSTR-2)</span>
                  <p className="text-2xl font-black text-emerald-600">₹ {gstr2Gst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  <p className="text-[10px] text-zinc-500 mt-2">Total Eligible ITC on Purchases</p>
                </div>
                <div className="bg-zinc-900 text-white p-6 rounded-3xl shadow-2xl">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">Net Tax Payable (GSTR-3B)</span>
                  <p className="text-2xl font-black">₹ {(gstr1Gst - gstr2Gst > 0 ? gstr1Gst - gstr2Gst : 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
                  <p className="text-[10px] text-zinc-400 mt-2">Payable to Government</p>
                </div>
              </div>

              <div className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl">
                <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider mb-4">GSTR-3B Return Breakdown</h3>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-zinc-400 text-[10px] uppercase tracking-widest border-b border-zinc-200">
                      <th className="py-3 font-semibold">Tax Head</th>
                      <th className="py-3 text-right font-semibold">Output Tax (Sales)</th>
                      <th className="py-3 text-right font-semibold">Input Tax Credit (Purchases)</th>
                      <th className="py-3 text-right font-semibold">Net Tax Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/50">
                    <tr>
                      <td className="py-4 font-bold text-zinc-800">CGST (Central Tax)</td>
                      <td className="py-4 text-right">₹ {(gstr1Gst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 text-right text-emerald-600">₹ {(gstr2Gst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 text-right font-bold">₹ {netCgstSgstPayable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr>
                      <td className="py-4 font-bold text-zinc-800">SGST (State Tax)</td>
                      <td className="py-4 text-right">₹ {(gstr1Gst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 text-right text-emerald-600">₹ {(gstr2Gst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 text-right font-bold">₹ {netCgstSgstPayable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                    <tr>
                      <td className="py-4 font-bold text-zinc-800">IGST (Integrated Tax)</td>
                      <td className="py-4 text-right">₹ {gstr1Gst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 text-right text-emerald-600">₹ {gstr2Gst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 text-right font-bold">₹ {netIgstPayable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= GSTR-1 REPORT ================= */}
          {activeReportTab === 'gstr1' && (
            <div className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider">GSTR-1: Outward Supplies (Sales)</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">All B2B and B2C sales invoices issued during the selected month.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total Taxable Value</span>
                  <span className="text-base font-black text-zinc-900">₹ {gstr1Taxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-zinc-400 text-[10px] uppercase tracking-widest border-b border-zinc-200">
                      <th className="py-3 font-semibold">Date</th>
                      <th className="py-3 font-semibold">Inv No.</th>
                      <th className="py-3 font-semibold">Client Name</th>
                      <th className="py-3 font-semibold">GSTIN</th>
                      <th className="py-3 text-right font-semibold">Taxable Value</th>
                      <th className="py-3 text-right font-semibold">GST Amount</th>
                      <th className="py-3 text-right font-semibold">Total Invoice Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/50">
                    {filteredInvoices.length === 0 ? (
                      <tr><td colSpan="7" className="py-8 text-center text-zinc-500">No outward invoices found for this period.</td></tr>
                    ) : (
                      filteredInvoices.map(inv => {
                        const basic = inv.items?.reduce((acc, it) => acc + ((parseFloat(it.no)||1) * (parseFloat(it.rate)||0)), 0) || 0;
                        const gst = inv.items?.reduce((acc, it) => {
                          const b = ((parseFloat(it.no)||1) * (parseFloat(it.rate)||0));
                          return acc + (b * (parseFloat(it.gst)||0)) / 100;
                        }, 0) || 0;
                        const total = basic + gst;

                        return (
                          <tr key={inv.id} className="hover:bg-white/40">
                            <td className="py-4 text-zinc-600">{inv.date}</td>
                            <td className="py-4 font-bold text-zinc-900">{inv.invoiceNo}</td>
                            <td className="py-4 font-semibold text-zinc-800">{inv.client}</td>
                            <td className="py-4 text-zinc-500 font-mono">{inv.gstNo || 'UNREGISTERED'}</td>
                            <td className="py-4 text-right">₹ {basic.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td className="py-4 text-right text-amber-600">₹ {gst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                            <td className="py-4 text-right font-bold">₹ {total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= GSTR-2 REPORT ================= */}
          {activeReportTab === 'gstr2' && (
            <div className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider">GSTR-2: Inward Supplies (Purchases & Expenses)</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Eligible Input Tax Credit (ITC) from vendor bills and expenses.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Total ITC Claimable</span>
                  <span className="text-base font-black text-emerald-600">₹ {gstr2Gst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="text-zinc-400 text-[10px] uppercase tracking-widest border-b border-zinc-200">
                      <th className="py-3 font-semibold">Date</th>
                      <th className="py-3 font-semibold">Category</th>
                      <th className="py-3 font-semibold">Vendor Name</th>
                      <th className="py-3 font-semibold">Vendor GSTIN</th>
                      <th className="py-3 text-right font-semibold">Taxable Amount</th>
                      <th className="py-3 text-right font-semibold">GST Claimable (ITC)</th>
                      <th className="py-3 text-right font-semibold">Total Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/50">
                    {filteredExpenses.length === 0 ? (
                      <tr><td colSpan="7" className="py-8 text-center text-zinc-500">No purchase expenses recorded for this period.</td></tr>
                    ) : (
                      filteredExpenses.map(ex => (
                        <tr key={ex.id} className="hover:bg-white/40">
                          <td className="py-4 text-zinc-600">{ex.date}</td>
                          <td className="py-4 font-bold text-zinc-800">{ex.category}</td>
                          <td className="py-4 font-semibold text-zinc-800">{ex.vendor}</td>
                          <td className="py-4 text-zinc-500 font-mono">{ex.gstin || 'N/A'}</td>
                          <td className="py-4 text-right">₹ {ex.taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          <td className="py-4 text-right text-emerald-600 font-bold">₹ {ex.gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          <td className="py-4 text-right font-bold">₹ {ex.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= PROFIT & LOSS ================= */}
          {activeReportTab === 'pnl' && (
            <div className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/60 shadow-xl max-w-3xl mx-auto">
              <h3 className="text-base font-extrabold text-zinc-900 uppercase tracking-wider text-center mb-2">Profit & Loss Statement</h3>
              <p className="text-center text-zinc-500 text-xs mb-8">For the month of {new Date(selectedYear, selectedMonth - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>

              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <span className="font-bold text-emerald-800 uppercase tracking-wider">Total Invoiced Revenue (Sales)</span>
                  <span className="text-sm font-black text-emerald-700">₹ {totalRevenue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>

                <div className="flex justify-between items-center p-4 bg-red-50/50 rounded-2xl border border-red-100">
                  <span className="font-bold text-red-800 uppercase tracking-wider">Total Business Expenses & Purchases</span>
                  <span className="text-sm font-black text-red-700">- ₹ {totalExpenseAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>

                <div className="flex justify-between items-center p-6 bg-zinc-900 text-white rounded-2xl shadow-xl mt-6">
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">Net Business Profit / Loss</span>
                    <span className="text-xs text-zinc-400">Revenue minus Expenses</span>
                  </div>
                  <span className={`text-xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    ₹ {netProfit.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}