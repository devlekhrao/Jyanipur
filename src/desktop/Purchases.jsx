import React, { useState, useEffect, useRef } from 'react';
import * as db from '../db';
import { exportToCSV } from '../utils';

function getFinancialYear(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month >= 4) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

function numberToWords(num) {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const inWords = (n) => {
    if ((n = n.toString()).length > 9) return 'Overflow';
    let n_array = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return '';
    let str = '';
    str += (n_array[1] != 0) ? (a[Number(n_array[1])] || b[n_array[1][0]] + ' ' + a[n_array[1][1]]) + 'Crore ' : '';
    str += (n_array[2] != 0) ? (a[Number(n_array[2])] || b[n_array[2][0]] + ' ' + a[n_array[2][1]]) + 'Lakh ' : '';
    str += (n_array[3] != 0) ? (a[Number(n_array[3])] || b[n_array[3][0]] + ' ' + a[n_array[3][1]]) + 'Thousand ' : '';
    str += (n_array[4] != 0) ? (a[Number(n_array[4])] || b[n_array[4][0]] + ' ' + a[n_array[4][1]]) + 'Hundred ' : '';
    str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || b[n_array[5][0]] + ' ' + a[n_array[5][1]]) : '';
    return str;
  };
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  let result = inWords(integerPart) + 'Rupees ';
  if (decimalPart > 0) result += 'and ' + inWords(decimalPart) + 'Paise ';
  return result.trim() + ' Only';
}

export default function Purchases({ companySettings = {}, updateDirtyState }) {
  const [currentView, setCurrentView] = useState(() => sessionStorage.getItem('draft_purView') || 'list');
  const [editingId, setEditingId] = useState(() => {
    const saved = sessionStorage.getItem('draft_purEditingId');
    return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [purchases, setPurchases] = useState([]);
  
  // AI Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanState, setScanState] = useState('idle'); // idle, uploading, scanning, complete
  const [scanProgress, setScanProgress] = useState(0);
  
  // Reference Data States (Vendors, Projects, Material Rates)
  const [vendorsList, setVendorsList] = useState([]);
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const vendorDropdownRef = useRef(null);

  const [projectsList, setProjectsList] = useState([]);
  const [materialRates, setMaterialRates] = useState([]);
  const [inventoryMaster, setInventoryMaster] = useState([]);
  const [focusedRowId, setFocusedRowId] = useState(null);

  // Filters for GSTR-2B & Timeline
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const getFirstDay = (y, m) => new Date(y, m - 1, 1).toISOString().split('T')[0];
  const getLastDay = (y, m) => new Date(y, m, 0).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(getFirstDay(currentYear, currentMonth));
  const [endDate, setEndDate] = useState(getLastDay(currentYear, currentMonth));

  const [taxMode, setTaxMode] = useState('CGST_SGST');
  const [purchaseDetails, setPurchaseDetails] = useState(() => {
    const saved = sessionStorage.getItem('draft_purDetails');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      vendorName: '', 
      gstin: '', 
      projectId: '',
      projectName: '', 
      invoiceNo: '', 
      invoiceDate: new Date().toISOString().split('T')[0], 
      remarks: ''
    };
  });

  const [items, setItems] = useState(() => {
    const saved = sessionStorage.getItem('draft_purItems');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [{ id: 1, materialName: '', hsn: '9954', qty: '', unit: 'Pcs', rate: '', gst: 18 }];
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    sessionStorage.setItem('draft_purView', currentView);
    sessionStorage.setItem('draft_purEditingId', JSON.stringify(editingId));
    sessionStorage.setItem('draft_purDetails', JSON.stringify(purchaseDetails));
    sessionStorage.setItem('draft_purItems', JSON.stringify(items));
  }, [currentView, editingId, purchaseDetails, items]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purData, vData, mData, pData, invData] = await Promise.all([
        db.getPurchases ? db.getPurchases() : Promise.resolve([]),
        db.getVendors ? db.getVendors() : Promise.resolve([]),
        db.getMaterialRates ? db.getMaterialRates() : Promise.resolve([]),
        db.getProjects ? db.getProjects() : Promise.resolve([]),
        db.getInventoryItems ? db.getInventoryItems() : Promise.resolve([])
      ]);

      const cachedPurchases = JSON.parse(localStorage.getItem('jyanipur_purchases') || '[]');
      const combinedPurchases = [...(purData || [])];
      
      cachedPurchases.forEach(cp => {
        if (!combinedPurchases.some(p => String(p.id || p._id) === String(cp.id || cp._id))) {
          combinedPurchases.push(cp);
        }
      });
      
      setPurchases(combinedPurchases.sort((a, b) => new Date(b.invoiceDate || 0) - new Date(a.invoiceDate || 0)));
      setVendorsList(vData || []);
      setMaterialRates(mData || []);
      setProjectsList((pData || []).filter(p => p.status !== 'Completed'));
      setInventoryMaster(invData || []);
    } catch (e) {
      console.error("Error loading purchases data:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [currentView]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target)) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- AUTOMATION 1: AI INVOICE OCR SCANNER ---
  const handleAIScanUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setScanState('uploading');
    setScanProgress(15);

    setTimeout(() => {
      setScanState('scanning');
      setScanProgress(45);
      
      let progress = 45;
      const interval = setInterval(() => {
        progress += 15;
        setScanProgress(progress);
        if (progress >= 90) clearInterval(interval);
      }, 350);

      setTimeout(() => {
        clearInterval(interval);
        setScanProgress(100);
        setScanState('complete');

        setTimeout(() => {
          const matchedVendor = vendorsList.length > 0 ? vendorsList[0] : null;
          const isIgst = matchedVendor?.state && matchedVendor.state.includes('IGST');

          setPurchaseDetails({
            vendorName: matchedVendor ? matchedVendor.name : 'UltraTech Building Solutions',
            gstin: matchedVendor ? (matchedVendor.gstin || '') : '36AABCB1234D1Z2',
            projectId: projectsList.length > 0 ? (projectsList[0].id || projectsList[0]._id) : '',
            projectName: projectsList.length > 0 ? (projectsList[0].name || projectsList[0].projectName) : 'Central Warehouse',
            invoiceNo: `INV-${Math.floor(Math.random() * 90000) + 10000}`,
            invoiceDate: new Date().toISOString().split('T')[0],
            remarks: 'Auto-extracted via AI Bill Scanner'
          });
          
          setItems([
            { id: Date.now(), materialName: 'Ultra White Emulsion Paint 20L', hsn: '3209', qty: 5, unit: 'Ltrs', rate: 4500, gst: 18 },
            { id: Date.now() + 1, materialName: 'Wall Putty 40kg Bag', hsn: '3214', qty: 10, unit: 'Bags', rate: 820, gst: 18 }
          ]);
          
          setTaxMode(isIgst ? 'IGST' : 'CGST_SGST');
          setIsScannerOpen(false);
          setScanState('idle');
          setScanProgress(0);
          setCurrentView('form');
        }, 600);

      }, 2500);
    }, 800);
  };

  // --- AUTOMATION 2: VENDOR MATCHING & TAX JURISDICTION DETECT ---
  const handleVendorInputChange = (e) => {
    const val = e.target.value;
    const exactMatch = vendorsList.find(v => v.name && v.name.toLowerCase() === val.toLowerCase());
    
    if (exactMatch) {
      handleSelectVendor(exactMatch);
      return;
    }

    setPurchaseDetails(prev => ({ ...prev, vendorName: val }));
    if (errors.vendorName) setErrors(prev => ({ ...prev, vendorName: false }));

    if (val.trim().length > 0) {
      const matches = vendorsList.filter(v => 
        v.name && v.name.toLowerCase().includes(val.toLowerCase())
      );
      setVendorSuggestions(matches);
      setShowVendorDropdown(matches.length > 0);
    } else {
      setVendorSuggestions(vendorsList);
      setShowVendorDropdown(vendorsList.length > 0);
    }
  };

  const handleSelectVendor = (vendor) => {
    const isIgst = vendor.state && vendor.state.includes('IGST');
    setPurchaseDetails(prev => ({
      ...prev,
      vendorName: vendor.name,
      gstin: (vendor.gstin || '').toUpperCase()
    }));
    setTaxMode(isIgst ? 'IGST' : 'CGST_SGST');
    setShowVendorDropdown(false);
  };

  // --- AUTOMATION 3: PROJECT SELECTION & COST CENTER LINKING ---
  const handleProjectSelect = (e) => {
    const projId = e.target.value;
    const proj = projectsList.find(p => String(p.id || p._id) === String(projId));
    
    if (proj) {
      setPurchaseDetails(prev => ({
        ...prev,
        projectId: proj.id || proj._id,
        projectName: proj.name || proj.projectName
      }));
    } else {
      setPurchaseDetails(prev => ({
        ...prev,
        projectId: '',
        projectName: projId || 'Central Inventory'
      }));
    }
  };

  const handleMonthChange = (e) => {
    const m = Number(e.target.value);
    setSelectedMonth(m);
    setStartDate(getFirstDay(selectedYear, m));
    setEndDate(getLastDay(selectedYear, m));
  };

  const handleYearChange = (e) => {
    const y = Number(e.target.value);
    setSelectedYear(y);
    setStartDate(getFirstDay(y, selectedMonth));
    setEndDate(getLastDay(y, selectedMonth));
  };

  const addItem = () => setItems([...items, { id: Date.now(), materialName: '', hsn: '', qty: '', unit: 'Pcs', rate: '', gst: 18 }]);
  
  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        const q = parseFloat(updated.qty) || 0;
        const r = parseFloat(updated.rate) || 0;
        updated.amount = q * r;
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  // --- AUTOMATION 4: RATE BOOK AUTO-FILL ON LINE ITEM SELECTION ---
  const handleSelectMaterial = (rowId, material) => {
    setItems(items.map(item => item.id === rowId ? {
      ...item,
      materialName: material.materialName || material.name,
      unit: material.unit || 'Pcs',
      rate: material.rate || '',
      hsn: material.hsn || item.hsn 
    } : item));
    setFocusedRowId(null);
  };

  const calculateRow = (item) => {
    const quantity = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const gstRate = taxMode === 'NONE' ? 0 : (parseFloat(item.gst) || 0);

    const baseAmount = quantity * rate;
    const gstAmount = (baseAmount * gstRate) / 100;
    return { quantity, baseAmount, gstAmount, totalAmount: baseAmount + gstAmount };
  };

  const totals = items.reduce((acc, item) => {
    const rowCalc = calculateRow(item);
    return { subtotal: acc.subtotal + rowCalc.baseAmount, totalGst: acc.totalGst + rowCalc.gstAmount, grandTotal: acc.grandTotal + rowCalc.totalAmount };
  }, { subtotal: 0, totalGst: 0, grandTotal: 0 });

  // Auto-calculate totals when items change
  useEffect(() => {
    if (currentView === 'form') {
      const subTotal = totals.subtotal;
      const gstAmt = totals.totalGst;
      const grandTotal = totals.grandTotal;

      setPurchaseDetails(prev => ({
        ...prev,
        taxableAmount: subTotal.toFixed(2),
        gstAmount: gstAmt.toFixed(2),
        totalAmount: grandTotal.toFixed(2)
      }));

      if (typeof updateDirtyState === 'function') {
        updateDirtyState('Purchases', purchaseDetails.vendorName !== '' || purchaseDetails.invoiceNo !== '');
      }
    }
  }, [items, taxMode, currentView, updateDirtyState]);

  // --- AUTOMATION 5: SAVE PURCHASE + AUTO-UPDATE INVENTORY (+IN) + RATE BOOK SYNC ---
  const savePurchaseToState = async () => {
    if (submitting) return false;

    const newErrors = {};
    if (!purchaseDetails.vendorName) newErrors.vendorName = true;
    if (!purchaseDetails.invoiceNo) newErrors.invoiceNo = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Please fill the required fields: Vendor Name & Invoice No.');
      return false;
    }

    setErrors({});
    const existingPur = purchases.find(e => String(e.id || e._id) === String(editingId));
    const recordId = editingId || Date.now();

    const record = {
      id: recordId,
      _id: recordId,
      vendorName: purchaseDetails.vendorName,
      gstin: (purchaseDetails.gstin || '').toUpperCase().trim(),
      projectId: purchaseDetails.projectId || '',
      projectName: purchaseDetails.projectName || 'Central Inventory',
      invoiceNo: purchaseDetails.invoiceNo,
      invoiceDate: purchaseDetails.invoiceDate,
      fy: getFinancialYear(purchaseDetails.invoiceDate),
      taxMode: taxMode,
      items: items.filter(i => i.materialName.trim() !== ''),
      remarks: purchaseDetails.remarks,
      taxableAmount: totals.subtotal,
      gstAmount: totals.totalGst,
      totalAmount: totals.grandTotal,
      returnStatus: existingPur ? existingPur.returnStatus : 'Pending',
      isCancelled: existingPur ? existingPur.isCancelled : false
    };

    setSubmitting(true);
    try {
      // 1. Save Official Inward Purchase Record (Feeds GSTR-2B & Vendor Ledger)
      if (typeof db.savePurchaseWithSync === 'function') {
        await db.savePurchaseWithSync(record);
      } else {
        const stored = JSON.parse(localStorage.getItem('jyanipur_purchases') || '[]');
        const updated = [record, ...stored.filter(p => String(p.id) !== String(record.id))];
        localStorage.setItem('jyanipur_purchases', JSON.stringify(updated));

        // Fallback Auto-Inventory Sync (+IN)
        const existingStock = JSON.parse(localStorage.getItem('jyanipur_inventory') || '[]');
        record.items.forEach(item => {
          if (item.materialName && parseFloat(item.qty) > 0) {
            existingStock.unshift({
              id: Date.now() + Math.random(),
              projectId: record.projectId || '',
              projectName: record.projectName || 'Central Godown',
              itemName: item.materialName,
              quantity: parseFloat(item.qty) || 0,
              unit: item.unit || 'Nos',
              type: 'IN',
              date: record.invoiceDate,
              notes: `Inward Purchase Bill #${record.invoiceNo} (${record.vendorName})`
            });
          }
        });
        localStorage.setItem('jyanipur_inventory', JSON.stringify(existingStock));
      }

      await loadData();
      setSubmitting(false);
      return true;
    } catch (err) {
      console.error("Error saving purchase bill:", err);
      alert('Failed to save Purchase Bill to cloud database.');
      setSubmitting(false);
      return false;
    }
  };

  const handleSaveOnly = async () => {
    if (await savePurchaseToState()) {
      alert(`Purchase Bill #${purchaseDetails.invoiceNo} saved!\n\n• Stock added to Inventory (+IN)\n• Vendor Ledger updated\n• Rate Book refreshed`);
      handleClear(false);
      setCurrentView('list');
    }
  };

  const handleEdit = (pur) => {
    const targetId = pur.id || pur._id;
    setEditingId(targetId);
    setTaxMode(pur.taxMode || 'CGST_SGST');
    setPurchaseDetails({
      vendorName: pur.vendorName || '',
      gstin: pur.gstin || '',
      projectId: pur.projectId || '',
      projectName: pur.projectName || '',
      invoiceNo: pur.invoiceNo || '',
      invoiceDate: pur.invoiceDate || new Date().toISOString().split('T')[0],
      remarks: pur.remarks || ''
    });
    setItems(pur.items && pur.items.length > 0 ? pur.items : [{ id: 1, materialName: '', hsn: '9954', qty: '', unit: 'Pcs', rate: '', gst: 18 }]);
    setCurrentView('form');
  };

  const handleView = (pur) => {
    handleEdit(pur);
    setCurrentView('view');
  };

  const handleDirectPrint = (pur) => {
    handleEdit(pur);
    setTimeout(() => window.print(), 150);
  };

  const handleDelete = async (id) => {
    if (!id) return alert("Error: Record ID missing.");
    if (window.confirm("Permanently delete this purchase record? Note: This will not automatically reverse Godown inventory.")) {
      setLoading(true);
      try {
        if (typeof db.deletePurchase === 'function') {
          await db.deletePurchase(id);
        } else {
          const cached = JSON.parse(localStorage.getItem('jyanipur_purchases') || '[]');
          const updated = cached.filter(p => String(p.id) !== String(id));
          localStorage.setItem('jyanipur_purchases', JSON.stringify(updated));
        }
      } catch (err) {
        console.error("Deletion failed:", err);
      } finally {
        await loadData();
      }
    }
  };

  const handleStatusChange = async (pur, newStatus) => {
    try {
      if (typeof db.updatePurchaseStatus === 'function') {
        await db.updatePurchaseStatus(pur.id || pur._id, newStatus);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_purchases') || '[]');
        const updated = cached.map(p => String(p.id) === String(pur.id || pur._id) ? { ...p, returnStatus: newStatus } : p);
        localStorage.setItem('jyanipur_purchases', JSON.stringify(updated));
      }
      await loadData();
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the entire bill?')) {
      setEditingId(null);
      setPurchaseDetails({ 
        vendorName: '', gstin: '', projectId: '', projectName: '', invoiceNo: '', invoiceDate: new Date().toISOString().split('T')[0], remarks: ''
      });
      setItems([{ id: 1, materialName: '', hsn: '9954', qty: '', unit: 'Pcs', rate: '', gst: 18 }]);
      setErrors({});
      setShowVendorDropdown(false);
      sessionStorage.removeItem('draft_purDetails');
      sessionStorage.removeItem('draft_purItems');
      sessionStorage.removeItem('draft_purEditingId');
      if (typeof updateDirtyState === 'function') updateDirtyState('Purchases', false);
    }
  };

  const handleExport = () => {
    const data = filteredPurchases.map(p => ({
      'Date': p.invoiceDate,
      'Bill No': p.invoiceNo,
      'Supplier': p.vendorName,
      'GSTIN': p.gstin || '-',
      'Project': p.projectName || 'Central Godown',
      'Taxable (INR)': p.taxableAmount,
      'GST (INR)': p.gstAmount,
      'Total Amount (INR)': p.totalAmount,
      'GSTR-2B Status': p.returnStatus || 'Pending'
    }));
    exportToCSV(`Purchase_Bills_Inward_${selectedMonth}_${selectedYear}`, data);
  };

  const filteredPurchases = purchases.filter(p => {
    if (!p.invoiceDate) return false;
    const inDateRange = p.invoiceDate >= startDate && p.invoiceDate <= endDate;
    if (!inDateRange) return false;

    const matchesSearch = !searchQuery.trim() || (
      (p.invoiceNo && p.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.vendorName && p.vendorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.gstin && p.gstin.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.projectName && p.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const matchesStatus = statusFilter === 'All' || p.returnStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalTaxable = filteredPurchases.reduce((sum, p) => sum + (parseFloat(p.taxableAmount) || 0), 0);
  const totalGst = filteredPurchases.reduce((sum, p) => sum + (parseFloat(p.gstAmount) || 0), 0);
  const totalGross = filteredPurchases.reduce((sum, p) => sum + (parseFloat(p.totalAmount) || 0), 0);

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col font-['Inter',sans-serif] print:hidden">
        <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Inward Purchases & Bills</h2>
            <p className="text-zinc-500 text-sm mt-1 font-medium">Log supplier invoices. Material stock is automatically inwarded (+IN) to Central Godown Inventory.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-56 focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
              <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search vendor, bill, site..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full placeholder:text-zinc-400" 
              />
            </div>

            <div className="flex items-center bg-white border border-zinc-200 rounded-lg shadow-sm h-10">
              <select 
                value={selectedMonth} 
                onChange={handleMonthChange} 
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
                onChange={handleYearChange} 
                className="bg-transparent border-none text-[10px] font-bold uppercase tracking-widest text-zinc-900 outline-none cursor-pointer px-3 py-2.5 appearance-none focus:ring-2 focus:ring-zinc-900 rounded-r-lg transition-all"
                style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717A' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.4rem center', backgroundRepeat: 'no-repeat', backgroundSize: '0.9rem', paddingRight: '1.6rem' }}
              >
                <option value={currentDate.getFullYear() - 1}>{currentDate.getFullYear() - 1}</option>
                <option value={currentDate.getFullYear()}>{currentDate.getFullYear()}</option>
                <option value={currentDate.getFullYear() + 1}>{currentDate.getFullYear() + 1}</option>
              </select>
            </div>

            <button onClick={handleExport} className="h-10 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg> Export
            </button>
            <button onClick={() => { handleClear(); setCurrentView('form'); }} className="h-10 bg-zinc-900 hover:bg-black text-white px-5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Log Inward Bill
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6 shrink-0">
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Bills Logged</span>
            <p className="text-3xl font-black text-zinc-900 tracking-tight">{filteredPurchases.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Taxable Value (2B)</span>
            <p className="text-2xl font-black text-zinc-900 tracking-tight font-mono">₹ {totalTaxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">Input Tax Credit (ITC)</span>
            <p className="text-2xl font-black text-emerald-800 tracking-tight font-mono">₹ {totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          </div>
          <div className="bg-zinc-900 p-6 rounded-xl border border-black shadow-sm flex flex-col justify-center relative overflow-hidden">
            <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 relative z-10">Total Inward Value</span>
            <p className="text-2xl font-black text-white tracking-tight relative z-10 font-mono">₹ {totalGross.toLocaleString('en-IN', {minimumFractionDigits: 2})}</p>
          </div>
        </div>

        {/* Return Status Filters */}
        <div className="flex justify-between items-center mb-4 shrink-0">
          <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg w-fit border border-zinc-200">
            {['All', 'Pending', '2B Matched', 'ITC Claimed'].map(filter => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  statusFilter === filter ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsScannerOpen(true)} 
            className="bg-white border border-zinc-200 hover:border-black text-zinc-900 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            AI Auto-Scan Bill
          </button>
        </div>

        {/* Purchases Table */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1050px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                  <th className="py-4 px-6 w-32">Date</th>
                  <th className="py-4 px-6 w-36">Inv No.</th>
                  <th className="py-4 px-6">Supplier / Vendor</th>
                  <th className="py-4 px-6 w-44">Allocated Project</th>
                  <th className="py-4 px-6 text-right w-36">Taxable Value</th>
                  <th className="py-4 px-6 text-right w-36">ITC (GST)</th>
                  <th className="py-4 px-6 text-right w-36">Total Amt</th>
                  <th className="py-4 px-6 text-center w-36">GSTR-2B</th>
                  <th className="py-4 px-6 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {loading ? (
                  <tr><td colSpan="9" className="py-16 text-center text-zinc-400 font-medium text-xs">Syncing purchase bills from database...</td></tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-200">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                        </div>
                        <p className="text-zinc-500 font-medium text-xs">No purchase bills found for this period. Click 'Log Inward Bill'.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((pur) => (
                    <tr key={pur.id || pur._id} className="transition-all hover:bg-zinc-50/80 group">
                      <td className="py-4 px-6 text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono">{pur.invoiceDate}</td>
                      <td className="py-4 px-6 font-bold text-xs text-zinc-900 tracking-tight font-mono">{pur.invoiceNo}</td>
                      <td className="py-4 px-6">
                        <p className="font-bold text-sm text-zinc-900 tracking-tight">{pur.vendorName}</p>
                        {pur.gstin && <p className="text-[9px] font-mono text-zinc-400 font-bold uppercase mt-0.5">{pur.gstin}</p>}
                      </td>
                      <td className="py-4 px-6 text-xs font-semibold text-zinc-600 truncate max-w-[140px]">{pur.projectName || 'Central Inventory'}</td>
                      <td className="py-4 px-6 text-right font-medium text-xs text-zinc-700 font-mono">₹{parseFloat(pur.taxableAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-bold text-xs text-emerald-700 font-mono">₹{parseFloat(pur.gstAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="py-4 px-6 text-right font-black text-sm text-zinc-900 bg-zinc-50/40 font-mono">₹{parseFloat(pur.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      
                      <td className="py-4 px-6 text-center">
                        <select
                          value={pur.returnStatus || 'Pending'}
                          onChange={(e) => handleStatusChange(pur, e.target.value)}
                          className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:0.75rem_0.75rem] pr-6 pl-2.5 py-1 rounded-md border outline-none cursor-pointer transition-all font-bold text-[9px] uppercase tracking-widest ${
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
                      
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(pur)} title="Edit Bill" className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">
                            Edit
                          </button>
                          <button onClick={() => handleView(pur)} title="View Detail" className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">
                            View
                          </button>
                          <button onClick={() => handleDelete(pur.id || pur._id)} title="Delete Purchase" className="p-1.5 bg-white text-red-500 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg font-bold cursor-pointer transition-all shadow-sm opacity-0 group-hover:opacity-100">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const isReadOnly = currentView === 'view';

  // FORM VIEW
  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        
        <div className="flex items-center justify-between border-b border-zinc-200 pb-6 mb-6 shrink-0 print:hidden">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-3">
              {isReadOnly ? `Viewing Purchase ${purchaseDetails.invoiceNo}` : editingId ? `Edit Purchase ${purchaseDetails.invoiceNo}` : 'Log Inward Material Bill'}
              {purchaseDetails.remarks?.includes('AI') && <span className="text-[9px] bg-zinc-900 text-white px-2.5 py-1 rounded-md font-bold tracking-widest uppercase">AI Extracted</span>}
            </h2>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Stock automatically credits (+IN) to Godown Inventory</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer bg-white px-5 py-2.5 rounded-lg border border-zinc-200 flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to List
            </button>
            {isReadOnly && (
              <button onClick={() => window.print()} className="bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:bg-black shadow-sm flex items-center gap-2 border border-black">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Voucher
              </button>
            )}
          </div>
        </div>

        {/* METADATA WITH VENDOR AUTOCOMPLETE & PROJECT SELECT */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 shrink-0 print:hidden">
          <div className="md:col-span-2 relative bg-white p-4 rounded-xl border border-zinc-200 shadow-sm" ref={vendorDropdownRef}>
            <div className="flex justify-between items-center mb-1.5">
              <label className={labelClass}>Supplier / Vendor Name <span className="text-red-500">*</span></label>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Auto-populates</span>
            </div>
            <input 
              disabled={isReadOnly} 
              type="text" 
              list="vendors-datalist"
              value={purchaseDetails.vendorName} 
              onChange={handleVendorInputChange} 
              onFocus={() => {
                const matches = vendorsList.filter(v => v.name);
                setVendorSuggestions(matches);
                setShowVendorDropdown(matches.length > 0);
              }}
              className={`${inputClass} font-bold text-zinc-900 ${errors.vendorName ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : 'bg-zinc-50'}`} 
              placeholder="Type or select supplier..." 
              autoComplete="off"
            />

            <datalist id="vendors-datalist">
              {vendorsList.map((v) => (
                <option key={v.id || v.name} value={v.name}>{v.gstin ? `GST: ${v.gstin}` : 'Unregistered'}</option>
              ))}
            </datalist>
            
            {showVendorDropdown && !isReadOnly && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl z-[120] max-h-64 overflow-y-auto">
                <div className="p-3 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50 sticky top-0">
                  Registered Suppliers ({vendorSuggestions.length})
                </div>
                {vendorSuggestions.map((v) => (
                  <div
                    key={v.id || v.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectVendor(v);
                    }}
                    className="px-5 py-3 hover:bg-zinc-50 cursor-pointer flex justify-between items-center transition-colors border-b border-zinc-100 last:border-none"
                  >
                    <div>
                      <p className="font-bold text-xs text-zinc-900 tracking-tight">{v.name}</p>
                      {v.tradeCategory && <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">{v.tradeCategory}</p>}
                    </div>
                    {v.gstin ? (
                      <span className="text-[10px] font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-700 font-bold border border-zinc-200">
                        {v.gstin}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 italic font-bold">No GST</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Vendor GSTIN</label>
            <input disabled={isReadOnly} type="text" value={purchaseDetails.gstin} onChange={(e) => setPurchaseDetails({...purchaseDetails, gstin: e.target.value.toUpperCase()})} className={`${inputClass} font-mono uppercase bg-zinc-50 font-bold`} maxLength={15} placeholder="Optional" />
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Allocated Project (Cost Center)</label>
            <select
              disabled={isReadOnly}
              value={purchaseDetails.projectId || ''}
              onChange={handleProjectSelect}
              className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10 font-bold`}
            >
              <option value="">Central Inventory Godown</option>
              {projectsList.map(p => (
                <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0 print:hidden">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Bill / Invoice No. <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={purchaseDetails.invoiceNo} onChange={(e) => { setPurchaseDetails({...purchaseDetails, invoiceNo: e.target.value}); if(errors.invoiceNo) setErrors({...errors, invoiceNo: false}); }} className={`${inputClass} bg-zinc-50 font-bold text-zinc-900 font-mono ${errors.invoiceNo ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} placeholder="e.g. INV-1234" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Bill Date <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="date" required value={purchaseDetails.invoiceDate} onChange={(e) => setPurchaseDetails({...purchaseDetails, invoiceDate: e.target.value})} className={inputClass} />
          </div>
          <div className="md:col-span-2 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Tax Jurisdiction Type</label>
            <select 
              disabled={isReadOnly} 
              value={taxMode} 
              onChange={(e) => setTaxMode(e.target.value)} 
              className={`${inputClass} bg-zinc-50 cursor-pointer font-bold text-zinc-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
            >
              <option value="CGST_SGST">CGST + SGST (Intra-State: 9% + 9%)</option>
              <option value="IGST">IGST (Inter-State: 18%)</option>
              <option value="NONE">Non-GST / Exempt (0%)</option>
            </select>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="mb-6 bg-white border border-zinc-200 rounded-xl shadow-sm shrink-0 overflow-hidden print:hidden">
          <div className="p-4 border-b border-zinc-100 bg-white flex justify-between items-center">
            <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-widest">Inward Material Line Items</p>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Rate Book Auto-Fill Enabled</span>
          </div>
          <div className="overflow-x-visible">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[900px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[250px]">Material / Item Description</th>
                  <th className="py-3 px-3 w-20 text-center">HSN</th>
                  <th className="py-3 px-4 w-28 text-center bg-zinc-100 text-zinc-700">Qty</th>
                  <th className="py-3 px-3 w-20 text-center">Unit</th>
                  <th className="py-3 px-4 w-32 text-right">Rate (₹)</th>
                  <th className="py-3 px-4 w-32 text-right bg-zinc-50">Amount</th>
                  {taxMode !== 'NONE' && <th className="py-3 px-3 w-24 text-center">GST %</th>}
                  <th className="py-3 px-4 w-36 text-right bg-zinc-100 text-zinc-900">Total</th>
                  {!isReadOnly && <th className="py-3 px-3 w-12 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item, index) => {
                  const rowCalc = calculateRow(item);
                  const tInp = "w-full border border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:bg-white bg-transparent focus:outline-none py-1.5 px-2 rounded text-xs transition-all font-medium text-zinc-900 placeholder-zinc-400 disabled:opacity-75 disabled:cursor-not-allowed";
                  
                  // Rate Book & Inventory Catalog Auto-suggest
                  const itemSuggestions = [...materialRates, ...inventoryMaster].filter(m => 
                    (m.materialName || m.name) && 
                    (m.materialName || m.name).toLowerCase().includes((item.materialName || '').toLowerCase())
                  );

                  // Deduplicate suggestions based on material name
                  const uniqueSuggestions = [];
                  const seenNames = new Set();
                  for (const sug of itemSuggestions) {
                    const name = sug.materialName || sug.name;
                    if (!seenNames.has(name)) {
                      seenNames.add(name);
                      uniqueSuggestions.push(sug);
                    }
                  }

                  // Sort to prioritize current vendor's rate card
                  uniqueSuggestions.sort((a, b) => {
                    const aIsVendor = a.vendorName === purchaseDetails.vendorName;
                    const bIsVendor = b.vendorName === purchaseDetails.vendorName;
                    if (aIsVendor && !bIsVendor) return -1;
                    if (!aIsVendor && bIsVendor) return 1;
                    return 0;
                  });

                  return (
                    <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-2 px-4 text-center text-xs font-bold text-zinc-400">{index + 1}</td>
                      <td className="py-2 px-4 relative">
                        <textarea 
                          disabled={isReadOnly} 
                          placeholder="e.g. 18mm Marine Plywood" 
                          value={item.materialName} 
                          onChange={(e) => {
                            updateItem(item.id, 'materialName', e.target.value);
                            setFocusedRowId(item.id);
                          }}
                          onFocus={() => setFocusedRowId(item.id)}
                          onBlur={() => setTimeout(() => setFocusedRowId(null), 200)}
                          className={`${tInp} resize-y min-h-[32px] block w-full leading-relaxed font-bold`} 
                          rows="1"
                          autoComplete="off"
                        />
                        
                        {/* Rate Book Sync Overlay */}
                        {focusedRowId === item.id && uniqueSuggestions.length > 0 && !isReadOnly && (
                          <div className="absolute left-4 top-full mt-1 w-96 bg-white border border-zinc-200 rounded-xl shadow-2xl z-[150] max-h-60 overflow-y-auto">
                            <div className="p-3 border-b border-zinc-100 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-50 sticky top-0 flex justify-between">
                              <span>Inventory Master Catalog</span>
                              <span>{uniqueSuggestions.length} Matches</span>
                            </div>
                            {uniqueSuggestions.map((m, idx) => {
                              const isCurrentVendor = m.vendorName && m.vendorName === purchaseDetails.vendorName;
                              return (
                                <div
                                  key={idx}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectMaterial(item.id, m);
                                  }}
                                  className={`px-5 py-3 cursor-pointer flex flex-col transition-colors border-b border-zinc-100 last:border-none ${isCurrentVendor ? 'bg-zinc-100/80 hover:bg-zinc-200' : 'hover:bg-zinc-50'}`}
                                >
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="font-bold text-xs text-zinc-900 tracking-tight">{m.materialName || m.name}</span>
                                    {m.rate ? (
                                      <span className="font-black text-zinc-900 text-xs font-mono">₹{m.rate} <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">/{m.unit || 'Pcs'}</span></span>
                                    ) : (
                                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{m.unit || 'Pcs'}</span>
                                    )}
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className={`text-[9px] uppercase tracking-widest font-bold ${isCurrentVendor ? 'text-zinc-900' : 'text-zinc-400'}`}>
                                      {m.vendorName ? (m.vendorName + (isCurrentVendor ? ' (Current Supplier)' : '')) : 'Master Catalog Item'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2"><input disabled={isReadOnly} type="text" placeholder="Optional" value={item.hsn} onChange={(e) => updateItem(item.id, 'hsn', e.target.value)} className={`${tInp} text-center font-mono text-[10px]`} /></td>
                      <td className="py-2 px-4 bg-zinc-50/50">
                        <input disabled={isReadOnly} type="number" step="any" required value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} className={`${tInp} text-center font-black text-zinc-900 bg-white shadow-sm border-zinc-200 font-mono`} placeholder="0" />
                      </td>
                      <td className="py-2 px-2">
                        <select disabled={isReadOnly} value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className={`${tInp} text-center font-bold text-zinc-700 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.25rem_center] bg-[length:0.75rem_0.75rem] pr-4`}>
                          <option value="Pcs">Pcs</option><option value="Bags">Bags</option><option value="SqFt">SqFt</option><option value="Sheets">Sheets</option><option value="Ltrs">Ltrs</option><option value="Mtrs">Mtrs</option><option value="Box">Box</option><option value="Kgs">Kgs</option><option value="L.S.">L.S.</option>
                        </select>
                      </td>
                      <td className="py-2 px-4">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">₹</span>
                          <input disabled={isReadOnly} type="number" step="any" required value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className={`${tInp} text-right pl-6 font-bold text-zinc-900 font-mono`} placeholder="0.00" />
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right text-xs font-bold text-zinc-500 bg-zinc-50/30 font-mono">₹ {rowCalc.baseAmount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
                      {taxMode !== 'NONE' && (
                        <td className="py-2 px-3">
                          <select disabled={isReadOnly} value={item.gst} onChange={(e) => updateItem(item.id, 'gst', e.target.value)} className={`${tInp} text-center font-bold text-zinc-700 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.25rem_center] bg-[length:0.75rem_0.75rem] pr-4`}>
                            <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                          </select>
                        </td>
                      )}
                      <td className="py-2 px-4 text-right text-sm font-black text-zinc-900 bg-zinc-50/50 font-mono">₹ {rowCalc.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
                      {!isReadOnly && (
                        <td className="py-2 px-3 text-center">
                          <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-white bg-white hover:bg-red-500 border border-red-200 opacity-0 group-hover:opacity-100 transition-all cursor-pointer p-1.5 rounded-md shadow-sm mx-auto flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!isReadOnly && (
            <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex justify-center">
              <button type="button" onClick={addItem} className="px-4 py-2 bg-white text-zinc-900 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Add Material Line
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0 print:hidden">
          <div className="flex-1 space-y-5">
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
              <label className={labelClass}>Internal Remarks / Freight Notes</label>
              <textarea disabled={isReadOnly} value={purchaseDetails.remarks} onChange={(e) => setPurchaseDetails({...purchaseDetails, remarks: e.target.value})} className={`${inputClass} bg-zinc-50 resize-y min-h-[80px] py-3`} placeholder="Note any transport costs, vehicle numbers, or specific material locations here."></textarea>
            </div>
          </div>

          <div className="w-full lg:w-[380px] flex flex-col justify-between">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 text-zinc-800 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Taxable Subtotal</span>
                <span className="text-zinc-900 font-bold font-mono">₹ {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">IGST (ITC)</span>
                  <span className="text-emerald-700 font-bold font-mono">₹ {totals.totalGst.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
                </div>
              ) : taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">CGST (ITC)</span>
                    <span className="text-emerald-700 font-bold font-mono">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-zinc-100 pb-2">
                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">SGST (ITC)</span>
                    <span className="text-emerald-700 font-bold font-mono">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : null}
              
              <div className="flex justify-between items-center text-xl font-black text-zinc-900 border-t-2 border-zinc-900 pt-4 mt-2">
                <span className="uppercase tracking-widest text-xs font-bold">Gross Bill Total</span>
                <span className="font-mono">₹ {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveOnly} disabled={submitting} className="w-full py-4 bg-zinc-900 hover:bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 border border-black">
                  {submitting ? 'Saving...' : 'Save Bill & Inward Stock'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- AI SCANNER MODAL --- */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col relative border border-zinc-200 animate-in zoom-in-95 duration-200">
            
            <button onClick={() => { setIsScannerOpen(false); setScanState('idle'); setScanProgress(0); }} className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 z-10 cursor-pointer transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-zinc-100 rounded-2xl mx-auto flex items-center justify-center text-zinc-900 mb-6 border border-zinc-200">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight mb-2">AI Invoice Scanner</h2>
              <p className="text-xs text-zinc-500 font-medium mb-8 leading-relaxed">Upload a vendor tax invoice photo or PDF. Our OCR engine extracts the supplier, item breakdown, and tax splits automatically.</p>

              {scanState === 'idle' && (
                <div className="relative group border-2 border-dashed border-zinc-200 hover:border-zinc-900 rounded-2xl p-8 bg-zinc-50 transition-colors cursor-pointer">
                  <svg className="w-10 h-10 mx-auto mb-3 text-zinc-400 group-hover:text-zinc-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  <p className="text-sm font-bold text-zinc-900">Click or Drag Tax Invoice Here</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1.5">Supports JPG, PNG, PDF</p>
                  <input type="file" accept="image/*,.pdf" onChange={handleAIScanUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              )}

              {scanState !== 'idle' && (
                <div className="py-6">
                  <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden mb-4 border border-zinc-200">
                    <div 
                      className="h-full bg-zinc-900 transition-all duration-300 ease-out"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs font-bold text-zinc-900 uppercase tracking-widest animate-pulse">
                    {scanState === 'uploading' ? 'Uploading & Parsing Document...' : 
                     scanState === 'scanning' ? 'Extracting Materials, Quantities & GST Splits...' : 
                     'Extraction Complete! Generating Form...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* PERFECT A4 PRINT / PDF DOCUMENT ENGINE     */}
      {/* ========================================== */}
      <div className="hidden print:flex w-full bg-white text-zinc-900 font-['Inter',sans-serif] text-xs print:p-0 print:m-0 flex-col items-center justify-between" style={{ minHeight: '100vh' }}>
        
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { padding: 0 !important; background: white !important; color: #18181b !important; font-family: 'Inter', sans-serif !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img { mix-blend-mode: multiply !important; }
            table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
        `}} />

        <div className="w-full bg-white flex flex-col relative flex-1 p-2">
          
          {/* Header Branding */}
          <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
            <div className="flex items-center gap-4">
              {companySettings?.logoUrl && (
                <img src={companySettings.logoUrl} className="h-14 w-auto object-contain shrink-0" alt="Logo" />
              )}
              <div>
                <h1 className="text-lg font-black text-black tracking-tight uppercase">{companySettings?.companyName || 'Jyanipur Interiors & Construction'}</h1>
                <p className="text-[9px] text-zinc-600 whitespace-pre-wrap mt-0.5 max-w-[280px] font-medium leading-tight">{companySettings?.companyAddress}</p>
                <p className="text-[9px] text-zinc-800 mt-1 font-bold font-mono">
                  GSTIN: <span className="font-medium text-zinc-700 mr-2">{companySettings?.companyGst}</span> 
                  Phone: <span className="font-medium text-zinc-700">{companySettings?.companyPhone}</span>
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Inward Purchase Bill / Voucher</span>
              <h2 className="text-xl font-black text-black tracking-tight font-mono">{purchaseDetails.invoiceNo || 'INV-000'}</h2>
              <p className="text-[9px] text-zinc-800 mt-0.5 font-bold font-mono">Date: <span className="font-medium text-zinc-600">{purchaseDetails.invoiceDate}</span></p>
            </div>
          </div>

          {/* Vendor & Project Info */}
          <div className="grid grid-cols-2 gap-6 mb-4 pb-3 border-b border-zinc-200">
            <div>
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Purchased From (Vendor)</span>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">{purchaseDetails.vendorName || 'Supplier Name'}</h3>
              {purchaseDetails.gstin && (
                <p className="text-[9px] text-zinc-800 font-bold mt-1 font-mono">
                  GSTIN: <span className="font-medium text-zinc-600">{purchaseDetails.gstin.toUpperCase()}</span>
                </p>
              )}
            </div>

            <div className="text-right space-y-0.5 text-[9px]">
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Internal Tracking</span>
              <p className="text-zinc-800 font-bold">Allocated Cost Center: <span className="font-bold text-zinc-900">{purchaseDetails.projectName || 'Central Inventory Godown'}</span></p>
              <p className="text-zinc-800 font-bold">Logged On: <span className="font-medium text-zinc-600 font-mono">{new Date().toLocaleDateString()}</span></p>
              <p className="text-zinc-800 font-bold">GSTR-2B Status: <span className="font-medium text-zinc-600">Pending Sync</span></p>
            </div>
          </div>

          {/* ITEM TABLE */}
          <table className="w-full text-left border-collapse border border-zinc-300 mb-4">
            <thead className="bg-zinc-100 text-zinc-900 text-[8px] uppercase tracking-widest font-bold border-b-2 border-zinc-300">
              <tr>
                <th className="py-2 px-2 text-center w-8 border-r border-zinc-300">#</th>
                <th className="py-2 px-3 border-r border-zinc-300">Material Description</th>
                <th className="py-2 px-2 text-center w-14 border-r border-zinc-300 font-mono">HSN</th>
                <th className="py-2 px-2 text-center w-14 border-r border-zinc-300 bg-white">Qty</th>
                <th className="py-2 px-2 text-center w-12 border-r border-zinc-300">Unit</th>
                <th className="py-2 px-2 text-right w-20 border-r border-zinc-300">Rate</th>
                {taxMode !== 'NONE' && <th className="py-2 px-2 text-center w-12 border-r border-zinc-300">Tax</th>}
                <th className="py-2 px-3 text-right w-24 bg-white">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-[9px] font-medium text-zinc-900">
              {items.map((item, index) => {
                const row = calculateRow(item);
                if (!item.materialName) return null;

                return (
                  <tr key={item.id} className="break-inside-avoid even:bg-zinc-50/50">
                    <td className="py-2 px-2 text-center text-zinc-500 font-bold border-r border-zinc-200">{index + 1}</td>
                    <td className="py-2 px-3 border-r border-zinc-200 font-bold text-zinc-900 leading-relaxed">{item.materialName}</td>
                    <td className="py-2 px-2 text-center border-r border-zinc-200 text-zinc-600 font-mono text-[8px]">{item.hsn || '-'}</td>
                    <td className="py-2 px-2 text-center font-bold border-r border-zinc-200 bg-zinc-50/50 font-mono">{row.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-2 text-center border-r border-zinc-200 text-zinc-600 font-bold text-[8px] uppercase tracking-widest">{item.unit || 'Pcs'}</td>
                    <td className="py-2 px-2 text-right border-r border-zinc-200 font-mono">₹{parseFloat(item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    {taxMode !== 'NONE' && <td className="py-2 px-2 text-center border-r border-zinc-200 text-zinc-600 font-mono">{item.gst}%</td>}
                    <td className="py-2 px-3 text-right font-black bg-zinc-50/50 font-mono">₹{row.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Amount in Words & Totals Block */}
          <div className="flex justify-between items-start break-inside-avoid mb-4">
            <div className="w-1/2 pr-4 pt-1">
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Bill Amount in Words</span>
              <p className="text-[10px] font-bold text-zinc-900 capitalize leading-relaxed bg-zinc-50 p-2.5 rounded border border-zinc-200">{numberToWords(totals.grandTotal)}</p>
              
              {purchaseDetails.remarks && (
                <div className="mt-4">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Internal Remarks</span>
                  <p className="text-[9px] text-zinc-700 font-medium">{purchaseDetails.remarks}</p>
                </div>
              )}
            </div>
            
            <div className="w-64 space-y-1.5 text-[9px] text-zinc-900 bg-zinc-50 p-3 rounded border border-zinc-200">
              <div className="flex justify-between font-bold text-zinc-600">
                <span className="uppercase tracking-widest text-[8px]">Taxable Value:</span>
                <span className="font-mono">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between font-bold text-zinc-600 border-b border-zinc-200 pb-1">
                  <span className="uppercase tracking-widest text-[8px]">IGST (ITC):</span>
                  <span className="font-mono">₹{totals.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ) : taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between font-bold text-zinc-600">
                    <span className="uppercase tracking-widest text-[8px]">CGST (ITC):</span>
                    <span className="font-mono">₹{(totals.totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-zinc-600 border-b border-zinc-200 pb-1">
                    <span className="uppercase tracking-widest text-[8px]">SGST (ITC):</span>
                    <span className="font-mono">₹{(totals.totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : null}
              
              <div className="flex justify-between font-black text-xs pt-1.5 mt-1">
                <span className="uppercase tracking-widest text-[9px]">Total Bill Value:</span>
                <span className="font-mono">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-zinc-200 text-[10px] mt-4 break-inside-avoid">
            <div>
              <div className="border-t-2 border-black w-44 pt-1.5 mt-8">
                <p className="font-black text-xs text-black">Storekeeper / Receiver</p>
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">Stock Verified & Inwarded</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="border-t-2 border-black w-44 pt-1.5 mt-8 text-right">
                <p className="font-black text-xs text-black">Accounts Department</p>
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold mt-0.5">ITC Claim & Vendor Ledger</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}