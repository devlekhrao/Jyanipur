import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { exportToCSV } from '../utils';

export default function GST({ companySettings = {} }) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [activeTab, setActiveTab] = useState('GSTR-3B'); // 'GSTR-3B', 'GSTR-1', 'GSTR-2B', 'HSN'
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [invoices, setInvoices] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const companyGstin = companySettings.companyGst || '36OEYPS9800J1Z9';
  const companyStateCode = companyGstin.substring(0, 2) || '36';

  const loadGstData = async () => {
    setLoading(true);
    try {
      const [invData, purData] = await Promise.all([
        db.getInvoices ? db.getInvoices() : Promise.resolve([]),
        db.getPurchases ? db.getPurchases() : Promise.resolve([])
      ]);
      setInvoices(invData || []);
      setPurchases(purData || []);
    } catch (e) {
      console.error("Error loading GST data from cloud DB:", e);
      setInvoices([]);
      setPurchases([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGstData();
  }, [selectedMonth, selectedYear]);

  const parseAmt = (val) => Number(val?.toString().replace(/[^0-9.-]+/g, "")) || 0;

  // Filter records for selected return period
  const monthlyInvoices = invoices.filter(inv => {
    if (!inv.date || inv.isCancelled) return false;
    const d = new Date(inv.date);
    return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
  });

  const monthlyPurchases = purchases.filter(p => {
    const pDate = p.invoiceDate || p.date;
    if (!pDate || p.isCancelled) return false;
    const d = new Date(pDate);
    return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === Number(selectedYear);
  });

  // Outward Supplies (GSTR-1) Computations
  let outwardTaxable = 0;
  let outwardCgst = 0;
  let outwardSgst = 0;
  let outwardIgst = 0;

  const b2bInvoices = [];
  const b2cInvoices = [];
  const hsnSummaryMap = {};

  monthlyInvoices.forEach(inv => {
    const isInterstate = inv.taxMode === 'IGST' || (inv.placeOfSupply && !inv.placeOfSupply.includes(companyStateCode));
    const isB2B = Boolean(inv.gstNo && inv.gstNo.trim().length === 15);
    
    let invTaxable = 0;
    let invCgst = 0;
    let invSgst = 0;
    let invIgst = 0;

    (inv.items || []).forEach((item) => {
      const qty = parseFloat(item.qty) || 0;
      const rate = parseFloat(item.rate) || 0;
      const baseAmt = qty * rate;
      const gstRate = inv.taxMode === 'NONE' ? 0 : (parseFloat(item.gst) || 18);
      const taxAmt = (baseAmt * gstRate) / 100;

      invTaxable += baseAmt;
      outwardTaxable += baseAmt;

      let itemCgst = 0;
      let itemSgst = 0;
      let itemIgst = 0;

      if (isInterstate) {
        invIgst += taxAmt;
        outwardIgst += taxAmt;
        itemIgst = taxAmt;
      } else if (inv.taxMode !== 'NONE') {
        const half = taxAmt / 2;
        invCgst += half;
        invSgst += half;
        outwardCgst += half;
        outwardSgst += half;
        itemCgst = half;
        itemSgst = half;
      }

      // HSN/SAC aggregation
      const hsnCode = item.hsn || companySettings.defaultHsnSac || '9954';
      if (!hsnSummaryMap[hsnCode]) {
        hsnSummaryMap[hsnCode] = {
          hsn: hsnCode,
          desc: item.description || 'Works Contract Services',
          uqc: item.unit || 'Nos',
          totalQty: 0,
          taxableValue: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
          rate: gstRate
        };
      }
      hsnSummaryMap[hsnCode].totalQty += qty;
      hsnSummaryMap[hsnCode].taxableValue += baseAmt;
      hsnSummaryMap[hsnCode].igst += itemIgst;
      hsnSummaryMap[hsnCode].cgst += itemCgst;
      hsnSummaryMap[hsnCode].sgst += itemSgst;
    });

    const parsedInv = {
      ...inv,
      computedTaxable: invTaxable,
      computedCgst: invCgst,
      computedSgst: invSgst,
      computedIgst: invIgst,
      computedTotal: invTaxable + invCgst + invSgst + invIgst
    };

    if (isB2B) {
      b2bInvoices.push(parsedInv);
    } else {
      b2cInvoices.push(parsedInv);
    }
  });

  const totalOutwardTax = outwardCgst + outwardSgst + outwardIgst;

  // Inward Purchases (GSTR-2B) Computations
  let inwardTaxable = 0;
  let inwardCgst = 0;
  let inwardSgst = 0;
  let inwardIgst = 0;

  const parsedPurchases = monthlyPurchases.map(p => {
    const isInterstate = p.taxMode === 'IGST' || (p.gstin && p.gstin.length === 15 && !p.gstin.startsWith(companyStateCode));
    const taxable = parseFloat(p.taxableAmount) || 0;
    const gstTotal = parseAmt(p.gstAmount);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterstate) {
      igst = gstTotal;
    } else {
      cgst = gstTotal / 2;
      sgst = gstTotal / 2;
    }

    inwardTaxable += taxable;
    inwardCgst += cgst;
    inwardSgst += sgst;
    inwardIgst += igst;

    return {
      ...p,
      computedTaxable: taxable,
      computedCgst: cgst,
      computedSgst: sgst,
      computedIgst: igst,
      totalGst: gstTotal
    };
  });

  const totalInwardTax = inwardCgst + inwardSgst + inwardIgst;

  // GSTR-3B Tax Set-Off Hierarchy
  let remIgstCredit = inwardIgst;
  let remCgstCredit = inwardCgst;
  let remSgstCredit = inwardSgst;

  const igstCoveredByIgst = Math.min(outwardIgst, remIgstCredit);
  const netIgstAfterIgst = outwardIgst - igstCoveredByIgst;
  remIgstCredit -= igstCoveredByIgst;

  const cgstCoveredByCgst = Math.min(outwardCgst, remCgstCredit);
  let netCgst = outwardCgst - cgstCoveredByCgst;
  remCgstCredit -= cgstCoveredByCgst;

  const cgstCoveredByRemIgst = Math.min(netCgst, remIgstCredit);
  netCgst -= cgstCoveredByRemIgst;
  remIgstCredit -= cgstCoveredByRemIgst;

  const sgstCoveredBySgst = Math.min(outwardSgst, remSgstCredit);
  let netSgst = outwardSgst - sgstCoveredBySgst;
  remSgstCredit -= sgstCoveredBySgst;

  const sgstCoveredByRemIgst = Math.min(netSgst, remIgstCredit);
  netSgst -= sgstCoveredByRemIgst;
  remIgstCredit -= sgstCoveredByRemIgst;

  const netPayableCash = {
    cgst: Math.max(0, netCgst),
    sgst: Math.max(0, netSgst),
    igst: Math.max(0, netIgstAfterIgst),
    total: Math.max(0, netCgst + netSgst + netIgstAfterIgst)
  };

  const closingItcBalance = {
    cgst: remCgstCredit,
    sgst: remSgstCredit,
    igst: remIgstCredit,
    total: remCgstCredit + remSgstCredit + remIgstCredit
  };

  // Exporters
  const handleExportGSTN_JSON = () => {
    const payload = {
      gstin: companyGstin,
      fp: `${String(selectedMonth).padStart(2, '0')}${selectedYear}`,
      cur_gt: outwardTaxable,
      filing_type: activeTab,
      sec_3_1_outward: {
        taxable_value: outwardTaxable,
        igst: outwardIgst,
        cgst: outwardCgst,
        sgst: outwardSgst
      },
      sec_4_eligible_itc: {
        taxable_value: inwardTaxable,
        igst: inwardIgst,
        cgst: inwardCgst,
        sgst: inwardSgst
      },
      sec_6_1_net_cash_paid: netPayableCash,
      closing_itc_balance: closingItcBalance,
      b2b: b2bInvoices.map(i => ({
        ctin: i.gstNo,
        inv: [
          {
            inum: i.invoiceNo,
            idt: i.date,
            val: i.computedTotal,
            pos: (i.placeOfSupply || companyStateCode).replace(/[^0-9]/g, '').slice(0, 2),
            itms: (i.items || []).map((it) => ({
              rt: it.gst || 18,
              txval: (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0)
            }))
          }
        ]
      })),
      b2cs: b2cInvoices.map(i => ({
        pos: (i.placeOfSupply || companyStateCode).replace(/[^0-9]/g, '').slice(0, 2),
        sply_ty: i.taxMode === 'IGST' ? 'INTER' : 'INTRA',
        txval: i.computedTaxable,
        rt: 18,
        iamt: i.computedIgst,
        camt: i.computedCgst,
        samt: i.computedSgst
      })),
      hsn: {
        data: Object.values(hsnSummaryMap)
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `GSTN_${activeTab}_${selectedMonth}_${selectedYear}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    if (activeTab === 'GSTR-1') {
      const exportData = monthlyInvoices.map(i => ({
        'Invoice Number': i.invoiceNo,
        'Invoice Date': i.date,
        'Customer Name': i.client || i.partyName,
        'Customer GSTIN': i.gstNo || 'Unregistered',
        'Place of Supply': i.placeOfSupply || 'Telangana (36)',
        'Tax Mode': i.taxMode,
        'Taxable Value': i.computedTaxable,
        'CGST (₹)': i.computedCgst,
        'SGST (₹)': i.computedSgst,
        'IGST (₹)': i.computedIgst,
        'Invoice Total (₹)': i.computedTotal
      }));
      exportToCSV(`GSTR1_Sales_Register_${selectedMonth}_${selectedYear}`, exportData);
    } else if (activeTab === 'GSTR-2B') {
      const exportData = parsedPurchases.map(p => ({
        'Bill Number': p.invoiceNo,
        'Bill Date': p.invoiceDate,
        'Supplier Name': p.vendorName,
        'Supplier GSTIN': p.gstin || 'Unregistered',
        'Project Site': p.projectName || 'Central Inventory',
        'Taxable Value': p.computedTaxable,
        'CGST Credit': p.computedCgst,
        'SGST Credit': p.computedSgst,
        'IGST Credit': p.computedIgst,
        'Total ITC': p.totalGst,
        '2B Status': p.returnStatus || 'Pending'
      }));
      exportToCSV(`GSTR2B_Purchase_ITC_${selectedMonth}_${selectedYear}`, exportData);
    } else {
      const exportData = [
        { 'Tax Head': 'CGST (Central Tax)', 'Output Liability': outwardCgst, 'Input Credit': inwardCgst, 'Net Cash Payable': netPayableCash.cgst },
        { 'Tax Head': 'SGST (State Tax)', 'Output Liability': outwardSgst, 'Input Credit': inwardSgst, 'Net Cash Payable': netPayableCash.sgst },
        { 'Tax Head': 'IGST (Integrated Tax)', 'Output Liability': outwardIgst, 'Input Credit': inwardIgst, 'Net Cash Payable': netPayableCash.igst },
        { 'Tax Head': 'TOTAL COMPLIANCE', 'Output Liability': totalOutwardTax, 'Input Credit': totalInwardTax, 'Net Cash Payable': netPayableCash.total }
      ];
      exportToCSV(`GSTR3B_Summary_${selectedMonth}_${selectedYear}`, exportData);
    }
  };

  const handleUpdate2BStatus = async (pur, newStatus) => {
    try {
      if (typeof db.updatePurchaseStatus === 'function') {
        await db.updatePurchaseStatus(pur.id || pur._id, newStatus);
      } else if (typeof db.savePurchase === 'function') {
        await db.savePurchase({ ...pur, returnStatus: newStatus });
      }
      await loadGstData();
    } catch (e) {
      console.error("Failed to update 2B reconciliation status:", e);
    }
  };

  const filteredInvoices = monthlyInvoices.filter(i => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (i.invoiceNo && i.invoiceNo.toLowerCase().includes(q)) ||
      (i.client && i.client.toLowerCase().includes(q)) ||
      (i.partyName && i.partyName.toLowerCase().includes(q)) ||
      (i.gstNo && i.gstNo.toLowerCase().includes(q))
    );
  });

  const filteredPurchasesList = parsedPurchases.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.invoiceNo && p.invoiceNo.toLowerCase().includes(q)) ||
      (p.vendorName && p.vendorName.toLowerCase().includes(q)) ||
      (p.gstin && p.gstin.toLowerCase().includes(q)) ||
      (p.projectName && p.projectName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER & PERIOD CONTROLS */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">GST & Tax Compliance Engine</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Automated reconciliation between Tax Invoices (GSTR-1) and Inward Supplies (GSTR-2B) for GSTR-3B tax offset.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(activeTab === 'GSTR-1' || activeTab === 'GSTR-2B') && (
            <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-auto focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
              <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search invoice, party, GSTIN..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full md:w-48 placeholder:text-zinc-400" 
              />
            </div>
          )}

          {/* Month & Year Selectors */}
          <div className="flex items-center bg-white border border-zinc-200 rounded-lg shadow-sm h-10">
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(Number(e.target.value))} 
              className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-zinc-900 outline-none cursor-pointer px-3 py-2.5 appearance-none focus:ring-2 focus:ring-zinc-900 rounded-l-lg transition-all"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717A' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.4rem center', backgroundRepeat: 'no-repeat', backgroundSize: '0.9rem', paddingRight: '1.6rem' }}
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('en-US', { month: 'short' })}</option>
              ))}
            </select>
            <div className="w-[1px] h-4 bg-zinc-200"></div>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))} 
              className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-zinc-900 outline-none cursor-pointer px-3 py-2.5 appearance-none focus:ring-2 focus:ring-zinc-900 rounded-r-lg transition-all"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717A' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.4rem center', backgroundRepeat: 'no-repeat', backgroundSize: '0.9rem', paddingRight: '1.6rem' }}
            >
              <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
              <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
              <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
            </select>
          </div>

          <button 
            onClick={handleExportCSV}
            className="h-10 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>

          <button 
            onClick={handleExportGSTN_JSON} 
            className="h-10 bg-zinc-900 hover:bg-black text-white px-5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            GSTN JSON Payload
          </button>
        </div>
      </div>

      {/* COMPLIANCE TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Outward Taxable Value</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">₹ {outwardTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5">{monthlyInvoices.length} Invoices Issued</span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Output Tax Liability (GSTR-1)</span>
          <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">₹ {totalOutwardTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1.5 font-mono">
            CGST: ₹{outwardCgst.toLocaleString('en-IN')} • SGST: ₹{outwardSgst.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-center">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">Available ITC Credit (GSTR-2B)</span>
          <p className="text-2xl font-black text-emerald-800 tracking-tight font-mono">₹ {totalInwardTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          <span className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-widest mt-1.5">{monthlyPurchases.length} Purchase Bills Logged</span>
        </div>

        <div className={`p-6 rounded-xl shadow-sm border flex flex-col justify-center relative overflow-hidden ${
          netPayableCash.total > 0 ? 'bg-zinc-900 border-black text-white' : 'bg-emerald-800 border-emerald-900 text-white'
        }`}>
          <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-widest block mb-2 relative z-10 opacity-80">Net Cash Payable (GSTR-3B)</span>
          <p className="text-2xl font-black tracking-tight relative z-10 font-mono">₹ {netPayableCash.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1.5 relative z-10">
            {netPayableCash.total > 0 ? 'To be paid via Challan' : 'Covered by ITC Balance'}
          </span>
        </div>
      </div>

      {/* COMPLIANCE TABS */}
      <div className="flex gap-2 mb-4 p-1 bg-zinc-100 rounded-lg w-fit shrink-0 border border-zinc-200 shadow-sm">
        {['GSTR-3B', 'GSTR-1', 'GSTR-2B', 'HSN'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === tab ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab === 'GSTR-3B' ? 'GSTR-3B (Tax Offset Matrix)' : 
             tab === 'GSTR-1' ? `GSTR-1 Sales (${monthlyInvoices.length})` : 
             tab === 'GSTR-2B' ? `GSTR-2B Purchases (${monthlyPurchases.length})` : 
             'HSN / SAC Summary'}
          </button>
        ))}
      </div>

      {/* TAB CONTENT TABLES */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs flex flex-col items-center justify-center space-y-3 flex-1">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Syncing sales, purchase bills, and tax credits...</p>
          </div>
        ) : activeTab === 'GSTR-3B' ? (
          
          /* GSTR-3B COMPREHENSIVE SET-OFF TAX COMPUTATION MATRIX */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:hidden">
            
            <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center">
                <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">
                  Table 3.1 & 4: Outward Supplies & Input Tax Credit Set-Off Matrix
                </h4>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                  Filing Period: {String(selectedMonth).padStart(2, '0')}/{selectedYear}
                </span>
              </div>

              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[850px]">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-600 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
                    <th className="py-3.5 px-6">Tax Head</th>
                    <th className="py-3.5 px-6 text-right w-44">Output Liability (GSTR-1)</th>
                    <th className="py-3.5 px-6 text-right w-44">Available ITC (GSTR-2B)</th>
                    <th className="py-3.5 px-6 text-right w-44">Net Cash Payable</th>
                    <th className="py-3.5 px-6 text-right w-44">Closing ITC Carryover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  <tr className="hover:bg-zinc-50/70">
                    <td className="py-4 px-6 font-bold text-zinc-900">
                      Central Tax (CGST)
                      <span className="text-[10px] text-zinc-400 block font-normal mt-0.5">Intra-State Supplies (9%)</span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-zinc-800 font-mono">
                      ₹ {outwardCgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-700 font-mono">
                      ₹ {inwardCgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-4 px-6 text-right font-black text-zinc-900 bg-zinc-50/50 font-mono">
                      ₹ {netPayableCash.cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-zinc-500 font-mono">
                      ₹ {closingItcBalance.cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                  </tr>

                  <tr className="hover:bg-zinc-50/70">
                    <td className="py-4 px-6 font-bold text-zinc-900">
                      State / UT Tax (SGST)
                      <span className="text-[10px] text-zinc-400 block font-normal mt-0.5">Intra-State Supplies (9%)</span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-zinc-800 font-mono">
                      ₹ {outwardSgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-700 font-mono">
                      ₹ {inwardSgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-4 px-6 text-right font-black text-zinc-900 bg-zinc-50/50 font-mono">
                      ₹ {netPayableCash.sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-zinc-500 font-mono">
                      ₹ {closingItcBalance.sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                  </tr>

                  <tr className="hover:bg-zinc-50/70">
                    <td className="py-4 px-6 font-bold text-zinc-900">
                      Integrated Tax (IGST)
                      <span className="text-[10px] text-zinc-400 block font-normal mt-0.5">Inter-State Outward Supplies (18%)</span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-zinc-800 font-mono">
                      ₹ {outwardIgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-emerald-700 font-mono">
                      ₹ {inwardIgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-4 px-6 text-right font-black text-zinc-900 bg-zinc-50/50 font-mono">
                      ₹ {netPayableCash.igst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-zinc-500 font-mono">
                      ₹ {closingItcBalance.igst.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                    </td>
                  </tr>

                  <tr className="bg-zinc-900 text-white font-black text-sm">
                    <td className="py-4 px-6 uppercase tracking-widest text-xs">Total Compliance Ledger</td>
                    <td className="py-4 px-6 text-right font-mono">₹ {totalOutwardTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td className="py-4 px-6 text-right text-emerald-400 font-mono">₹ {totalInwardTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td className="py-4 px-6 text-right text-white font-mono">₹ {netPayableCash.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td className="py-4 px-6 text-right text-zinc-400 font-bold text-xs font-mono">₹ {closingItcBalance.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Compliance Note */}
            <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-900">Statutory Tax Offset Verification</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 font-medium">
                  IGST credits have been prioritized against IGST outward liability, then allocated against CGST and SGST per GST Circular 98/17/2019.
                </p>
              </div>
              <button 
                onClick={handleExportGSTN_JSON}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-black text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-sm transition-all"
              >
                File GSTR-3B Payload
              </button>
            </div>

          </div>

        ) : activeTab === 'GSTR-1' ? (

          /* GSTR-1 OUTWARD SUPPLIES SALES REGISTER */
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1050px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-200 sticky top-0 z-10">
                  <th className="py-4 px-6 w-32">Date</th>
                  <th className="py-4 px-6 w-40">Invoice No.</th>
                  <th className="py-4 px-6">Customer / Billed Party</th>
                  <th className="py-4 px-6 w-40">Customer GSTIN</th>
                  <th className="py-4 px-6 w-40">Place of Supply</th>
                  <th className="py-4 px-6 text-right w-36">Taxable (₹)</th>
                  <th className="py-4 px-6 text-right w-32">CGST</th>
                  <th className="py-4 px-6 text-right w-32">SGST</th>
                  <th className="py-4 px-6 text-right w-32">IGST</th>
                  <th className="py-4 px-6 text-right w-36">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                      No sales tax invoices issued for this return period.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv, idx) => (
                    <tr key={inv.id || idx} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-4 px-6 text-xs font-bold text-zinc-500 font-mono">{inv.date}</td>
                      <td className="py-4 px-6 font-bold text-xs text-zinc-900 tracking-tight font-mono">{inv.invoiceNo}</td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-sm text-zinc-900">{inv.client || inv.partyName}</p>
                        <span className={`inline-block text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded mt-0.5 border ${
                          inv.gstNo && inv.gstNo.length === 15 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}>
                          {inv.gstNo && inv.gstNo.length === 15 ? 'B2B Regular' : 'B2C Small'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs font-bold text-zinc-700">
                        {inv.gstNo || <span className="text-zinc-400 font-normal">Unregistered</span>}
                      </td>
                      <td className="py-4 px-6 text-xs text-zinc-600 font-medium">{inv.placeOfSupply || 'Telangana (36)'}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-zinc-800 font-mono">₹ {(inv.computedTaxable || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-zinc-600 font-mono">₹ {(inv.computedCgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-zinc-600 font-mono">₹ {(inv.computedSgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-zinc-600 font-mono">₹ {(inv.computedIgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-black text-sm text-zinc-900 bg-zinc-50/40 font-mono">₹ {(inv.computedTotal || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        ) : activeTab === 'GSTR-2B' ? (

          /* GSTR-2B PURCHASE INWARD BILLS & ITC CLAIM REGISTER */
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1050px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-200 sticky top-0 z-10">
                  <th className="py-4 px-6 w-32">Date</th>
                  <th className="py-4 px-6 w-36">Supplier Bill No.</th>
                  <th className="py-4 px-6">Supplier Vendor</th>
                  <th className="py-4 px-6 w-40">Vendor GSTIN</th>
                  <th className="py-4 px-6 text-right w-36">Taxable (₹)</th>
                  <th className="py-4 px-6 text-right w-32">CGST</th>
                  <th className="py-4 px-6 text-right w-32">SGST</th>
                  <th className="py-4 px-6 text-right w-32">IGST</th>
                  <th className="py-4 px-6 text-right w-36">Total ITC</th>
                  <th className="py-4 px-6 text-center w-36">2B Reconciliation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredPurchasesList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                      No purchase bills logged for this return period.
                    </td>
                  </tr>
                ) : (
                  filteredPurchasesList.map((pur, idx) => (
                    <tr key={pur.id || pur._id || idx} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-4 px-6 text-xs font-bold text-zinc-500 font-mono">{pur.invoiceDate}</td>
                      <td className="py-4 px-6 font-bold text-xs text-zinc-900 tracking-tight font-mono">{pur.invoiceNo}</td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-sm text-zinc-900">{pur.vendorName}</p>
                        <span className="text-[10px] text-zinc-400 font-medium">{pur.projectName || 'Central Inventory'}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs font-bold text-zinc-700">
                        {pur.gstin || <span className="text-zinc-400 font-normal">Unregistered</span>}
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-zinc-800 font-mono">₹ {(pur.computedTaxable || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-emerald-700 font-mono">₹ {(pur.computedCgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-emerald-700 font-mono">₹ {(pur.computedSgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-emerald-700 font-mono">₹ {(pur.computedIgst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-black text-sm text-emerald-800 bg-emerald-50/20 font-mono">₹ {(pur.totalGst || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-center">
                        <select
                          value={pur.returnStatus || 'Pending'}
                          onChange={(e) => handleUpdate2BStatus(pur, e.target.value)}
                          className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.4rem_center] bg-[length:0.75rem_0.75rem] pr-6 pl-2.5 py-1 rounded-md border outline-none cursor-pointer transition-all font-bold text-[9px] uppercase tracking-widest ${
                            pur.returnStatus === '2B Matched' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            pur.returnStatus === 'ITC Claimed' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            'bg-zinc-100 text-zinc-700 border-zinc-300'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="2B Matched">2B Matched</option>
                          <option value="ITC Claimed">ITC Claimed</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        ) : (

          /* HSN / SAC AGGREGATE SUMMARY (OFFICIAL TABLE 12) */
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-200 sticky top-0 z-10">
                  <th className="py-4 px-6 w-32">HSN / SAC</th>
                  <th className="py-4 px-6">Description of Supplies</th>
                  <th className="py-4 px-6 w-28 text-center">UQC</th>
                  <th className="py-4 px-6 text-right w-36">Total Quantity</th>
                  <th className="py-4 px-6 text-right w-40">Total Taxable (₹)</th>
                  <th className="py-4 px-6 text-center w-28">Rate</th>
                  <th className="py-4 px-6 text-right w-36">Integrated Tax</th>
                  <th className="py-4 px-6 text-right w-36">Central Tax</th>
                  <th className="py-4 px-6 text-right w-36">State / UT Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {Object.keys(hsnSummaryMap).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                      No HSN items recorded in outward invoices.
                    </td>
                  </tr>
                ) : (
                  Object.values(hsnSummaryMap).map((hsnItem, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs font-bold text-zinc-900">{hsnItem.hsn}</td>
                      <td className="py-4 px-6 text-sm font-bold text-zinc-800">{hsnItem.desc}</td>
                      <td className="py-4 px-6 text-center text-xs font-bold text-zinc-500">{hsnItem.uqc}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-zinc-700 font-mono">{hsnItem.totalQty.toLocaleString('en-IN')}</td>
                      <td className="py-4 px-6 text-right font-bold text-xs text-zinc-900 font-mono">₹ {hsnItem.taxableValue.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-center">
                        <span className="bg-zinc-100 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-700 border border-zinc-200">
                          {hsnItem.rate}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-zinc-600 font-mono">₹ {hsnItem.igst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-zinc-600 font-mono">₹ {hsnItem.cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-zinc-600 font-mono">₹ {hsnItem.sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}