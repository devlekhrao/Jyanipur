import React, { useState, useEffect, useRef } from 'react';
import * as db from '../db';
import { sendWhatsAppMessage } from '../WhatsAppHelper';
import { exportToCSV } from '../utils';

// Helper function to convert number to Indian Currency Words
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

  const integerPart = Math.floor(Math.abs(Number(num)));
  const decimalPart = Math.round((Math.abs(Number(num)) - integerPart) * 100);

  let result = inWords(integerPart) + 'Rupees ';
  if (decimalPart > 0) {
    result += 'and ' + inWords(decimalPart) + 'Paise ';
  }
  return result.trim() + ' Only';
}

const gstStateCodes = {
  '01': 'Jammu & Kashmir (01)', '02': 'Himachal Pradesh (02)', '03': 'Punjab (03)',
  '04': 'Chandigarh (04)', '05': 'Uttarakhand (05)', '06': 'Haryana (06)',
  '07': 'Delhi (07)', '08': 'Rajasthan (08)', '09': 'Uttar Pradesh (09)',
  '10': 'Bihar (10)', '11': 'Sikkim (11)', '12': 'Arunachal Pradesh (12)',
  '13': 'Nagaland (13)', '14': 'Manipur (14)', '15': 'Mizoram (15)',
  '16': 'Tripura (16)', '17': 'Meghalaya (17)', '18': 'Assam (18)',
  '19': 'West Bengal (19)', '20': 'Jharkhand (20)', '21': 'Odisha (21)',
  '22': 'Chhattisgarh (22)', '23': 'Madhya Pradesh (23)', '24': 'Gujarat (24)',
  '25': 'Daman & Diu (25)', '26': 'Dadra & Nagar Haveli (26)', '27': 'Maharashtra (27)',
  '28': 'Andhra Pradesh (Old) (28)', '29': 'Karnataka (29)', '30': 'Goa (30)',
  '31': 'Lakshadweep (31)', '32': 'Kerala (32)', '33': 'Tamil Nadu (33)',
  '34': 'Puducherry (34)', '35': 'Andaman & Nicobar Islands (35)', '36': 'Telangana (36)',
  '37': 'Andhra Pradesh (37)', '38': 'Ladakh (38)'
};

export default function TaxInvoice({ companySettings = {}, updateDirtyState }) {
  const [currentView, setCurrentView] = useState(() => sessionStorage.getItem('draft_invoiceView') || 'list');
  const [editingId, setEditingId] = useState(() => {
    const saved = sessionStorage.getItem('draft_editingId');
    return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceList, setInvoiceList] = useState([]);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Interlinked System States
  const [projects, setProjects] = useState([]);
  const [clientWorkOrders, setClientWorkOrders] = useState([]);
  const [measurementSheets, setMeasurementSheets] = useState([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importSourceTab, setImportSourceTab] = useState('WORK_ORDERS'); // 'WORK_ORDERS' | 'JMR'
  
  const [taxMode, setTaxMode] = useState(() => localStorage.getItem('draft_taxMode') || 'CGST_SGST');

  const [invoiceDetails, setInvoiceDetails] = useState(() => {
    const saved = localStorage.getItem('draft_invoiceDetails');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      projectId: '',
      projectName: '',
      partyName: '', 
      partyAddress: '', 
      gstNo: '', 
      placeOfSupply: 'Telangana (36)',
      date: new Date().toISOString().split('T')[0], 
      invoiceNo: companySettings.invoicePrefix || '', 
      poNumber: '', 
      poDate: '', 
      rcmApplicable: 'No',
      description: '', 
      terms: companySettings.defaultInvoiceTerms || '', 
      bankName: companySettings.bankName || 'HDFC Bank', 
      accountName: companySettings.accountName || companySettings.companyName || 'Jyanipur Interiors & Construction', 
      accountNo: companySettings.accountNo || '', 
      ifscCode: companySettings.ifscCode || '', 
      upiId: companySettings.upiId || 'jyanipur@hdfcbank',
      advanceReceived: '', 
      discount: ''
    };
  });

  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem('draft_items');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [{ id: 1, description: '', hsn: companySettings.defaultHsnSac || '9954', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: companySettings.defaultGstRate || 18 }];
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    sessionStorage.setItem('draft_invoiceView', currentView);
    sessionStorage.setItem('draft_editingId', JSON.stringify(editingId));
  }, [currentView, editingId]);

  useEffect(() => {
    if (currentView === 'form' && !editingId) {
      setSaveStatus('saving');
      
      const timer = setTimeout(() => {
        localStorage.setItem('draft_taxMode', taxMode);
        localStorage.setItem('draft_invoiceDetails', JSON.stringify(invoiceDetails));
        localStorage.setItem('draft_items', JSON.stringify(items));
        setSaveStatus('saved');
        
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [invoiceDetails, items, taxMode, currentView, editingId]);

  useEffect(() => {
    if (updateDirtyState) {
      if (currentView === 'form') {
        const isDirty = invoiceDetails.partyName !== '' || 
                        (invoiceDetails.invoiceNo !== '' && invoiceDetails.invoiceNo !== companySettings.invoicePrefix) || 
                        items.length > 1 || 
                        items[0].description !== '';
        updateDirtyState('TaxInvoice', isDirty);
      } else {
        updateDirtyState('TaxInvoice', false);
      }
    }
  }, [currentView, invoiceDetails, items, updateDirtyState, companySettings.invoicePrefix]);

  const loadAllSystemData = async () => {
    setLoading(true);
    try {
      const [invData, projData, woData, jmrData] = await Promise.all([
        db.getInvoices ? db.getInvoices() : Promise.resolve([]),
        db.getProjects ? db.getProjects() : Promise.resolve([]),
        db.getClientWorkOrders ? db.getClientWorkOrders() : Promise.resolve([]),
        db.getMeasurementSheets ? db.getMeasurementSheets() : Promise.resolve([])
      ]);

      const cachedWos = JSON.parse(localStorage.getItem('jyanipur_client_work_orders') || '[]');
      const cachedJmrs = JSON.parse(localStorage.getItem('jyanipur_measurements') || '[]');

      const allWos = [...(woData || [])];
      cachedWos.forEach(cw => {
        if (!allWos.some(w => String(w.id || w._id) === String(cw.id || cw._id))) {
          allWos.push(cw);
        }
      });

      const allJmrs = [...(jmrData || [])];
      cachedJmrs.forEach(cj => {
        if (!allJmrs.some(j => String(j.id || j._id) === String(cj.id || cj._id))) {
          allJmrs.push(cj);
        }
      });

      setInvoiceList((invData || []).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
      setProjects((projData || []).filter(p => p.status !== 'Completed'));
      setClientWorkOrders(allWos);
      setMeasurementSheets(allJmrs);
    } catch (e) {
      console.error("Error loading invoices & projects:", e);
      setInvoiceList([]);
      setProjects([]);
      setClientWorkOrders([]);
      setMeasurementSheets([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadAllSystemData(); }, []);

  const generateNextInvoiceNo = () => {
    const currentYear = new Date().getFullYear();
    const prefix = companySettings.invoicePrefix || `INV/FY${currentYear.toString().slice(-2)}-${(currentYear + 1).toString().slice(-2)}/`;
    let maxNum = 0;
    
    invoiceList.forEach(inv => {
      if (inv.invoiceNo && inv.invoiceNo.startsWith(prefix)) {
        const numStr = inv.invoiceNo.replace(prefix, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  useEffect(() => {
    if (!editingId && currentView === 'form') {
      setInvoiceDetails(prev => ({
        ...prev,
        bankName: companySettings.bankName || prev.bankName,
        accountName: companySettings.accountName || prev.accountName,
        accountNo: companySettings.accountNo || prev.accountNo,
        ifscCode: companySettings.ifscCode || prev.ifscCode,
        upiId: companySettings.upiId || prev.upiId,
        invoiceNo: prev.invoiceNo === '' ? generateNextInvoiceNo() : prev.invoiceNo,
        terms: prev.terms === '' ? (companySettings.defaultInvoiceTerms || '') : prev.terms
      }));
    }
  }, [companySettings, editingId, currentView, invoiceList]);

  // --- AUTOMATION 1: GST INTELLIGENCE & STATE CODE DETECTION ---
  useEffect(() => {
    const clientStateCode = (invoiceDetails.gstNo || '').trim().substring(0, 2);
    if (clientStateCode.length === 2 && !isNaN(clientStateCode)) {
      const detectedState = gstStateCodes[clientStateCode] || `State (${clientStateCode})`;
      
      // Telangana code is 36
      const companyState = (companySettings.companyGst || '36').substring(0, 2);
      if (clientStateCode === companyState) {
        setTaxMode('CGST_SGST');
      } else {
        setTaxMode('IGST');
      }

      setInvoiceDetails(prev => {
        if (prev.placeOfSupply !== detectedState) {
          return { ...prev, placeOfSupply: detectedState };
        }
        return prev;
      });
    }
  }, [invoiceDetails.gstNo, companySettings.companyGst]);

  // --- AUTOMATION 2: 1-CLICK PROJECT AUTO-POPULATION ---
  const handleProjectSelect = (projId) => {
    const proj = projects.find(p => String(p.id || p._id) === String(projId));
    if (!proj) {
      setInvoiceDetails(prev => ({
        ...prev,
        projectId: '',
        projectName: ''
      }));
      return;
    }

    setInvoiceDetails(prev => ({
      ...prev,
      projectId: proj.id || proj._id,
      projectName: proj.name || proj.projectName,
      partyName: proj.clientName || prev.partyName,
      partyAddress: proj.clientAddress || proj.address || prev.partyAddress,
      gstNo: (proj.clientGstin || proj.gstin || prev.gstNo || '').toUpperCase(),
      poNumber: proj.poNumber || prev.poNumber || `PO-${(proj.name || 'PRJ').substring(0, 4).toUpperCase()}`
    }));
  };

  // --- AUTOMATION 3A: IMPORT FROM WORK ORDER ---
  const handleImportWorkOrderScope = (wo) => {
    if (!wo || !wo.items || wo.items.length === 0) {
      alert("No scope items found in this contract.");
      return;
    }

    const importedItems = wo.items.map((item, idx) => ({
      id: Date.now() + idx,
      description: item.room ? `[${item.room}] ${item.description}` : item.description,
      hsn: companySettings.defaultHsnSac || '9954',
      sizeL: '',
      sizeB: '',
      no: '',
      qty: item.qty || 1,
      rate: item.rate || 0,
      gst: companySettings.defaultGstRate || 18
    }));

    setItems(importedItems);
    setInvoiceDetails(prev => ({
      ...prev,
      partyName: wo.clientName || prev.partyName,
      partyAddress: wo.clientAddress || prev.partyAddress,
      projectName: wo.projectName || prev.projectName,
      poNumber: wo.woNo || prev.poNumber,
      description: `Tax Invoice raised against Contract #${wo.woNo}`
    }));
    setIsImportModalOpen(false);
  };

  // --- AUTOMATION 3B: IMPORT FROM JOINT MEASUREMENT SHEET (JMR) ---
  const handleImportJMR = (sheet) => {
    if (!sheet || !sheet.data || sheet.data.length === 0) {
      alert("No measurements found in this JMR sheet.");
      return;
    }

    const validRows = sheet.data.filter(r => !r.isSubtotal && (r.description || r.totalQty > 0));
    const importedItems = validRows.map((r, idx) => ({
      id: Date.now() + idx,
      description: r.location ? `[${r.location}] ${r.description}` : r.description,
      hsn: companySettings.defaultHsnSac || '9954',
      sizeL: r.l || '',
      sizeB: r.w || '',
      no: r.nos || '',
      qty: r.totalQty || r.qty || 1,
      rate: r.rate || 0,
      gst: companySettings.defaultGstRate || 18
    }));

    setItems(importedItems);
    setInvoiceDetails(prev => ({
      ...prev,
      projectId: sheet.projectId || prev.projectId,
      projectName: sheet.projectName || prev.projectName,
      description: `Billed per verified Joint Measurement Record (JMR): ${sheet.title}`
    }));
    setIsImportModalOpen(false);
  };

  const addItem = () => setItems([...items, { 
    id: Date.now(), 
    description: '', 
    hsn: companySettings.defaultHsnSac || '9954', 
    sizeL: '', sizeB: '', no: '', qty: '', rate: '', 
    gst: companySettings.defaultGstRate || 18 
  }]);
  
  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };

      if (['sizeL', 'sizeB', 'no'].includes(field)) {
        const l = parseFloat(updated.sizeL);
        const b = parseFloat(updated.sizeB);
        const n = parseFloat(updated.no);

        if (!isNaN(l) || !isNaN(b) || !isNaN(n)) {
          const effL = !isNaN(l) ? l : 1;
          const effB = !isNaN(b) ? b : 1;
          const effN = !isNaN(n) ? n : 1;
          updated.qty = parseFloat((effL * effB * effN).toFixed(2)).toString();
        } else {
          updated.qty = ''; 
        }
      }

      return updated;
    }));
  };

  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const calculateRow = (item) => {
    let quantity = 0;
    if (item.qty !== undefined && item.qty !== '') {
      quantity = parseFloat(item.qty) || 0;
    } else {
      const l = parseFloat(item.sizeL);
      const b = parseFloat(item.sizeB);
      const n = parseFloat(item.no);
      if (!isNaN(l) || !isNaN(b) || !isNaN(n)) {
        const effL = !isNaN(l) ? l : 1;
        const effB = !isNaN(b) ? b : 1;
        const effN = !isNaN(n) ? n : 1;
        quantity = effL * effB * effN;
      }
    }

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

  const netPayable = totals.grandTotal - (parseFloat(invoiceDetails.discount) || 0) - (parseFloat(invoiceDetails.advanceReceived) || 0);

  // --- AUTOMATION 4: SAVE INVOICE & AUTO-SYNC REVENUE TO PROJECT P&L ---
  const saveInvoiceToState = async (forcedStatus = null) => {
    const newErrors = {};
    if (!invoiceDetails.partyName) newErrors.partyName = true;
    if (!invoiceDetails.invoiceNo) newErrors.invoiceNo = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Please fill the required fields: Billed Party Name & Invoice Number.');
      return false;
    }

    setErrors({});
    const existingInv = invoiceList.find(e => String(e.id || e._id) === String(editingId));
    const currentStatus = forcedStatus || (existingInv ? existingInv.status : 'Pending');

    const record = {
      id: editingId || Date.now(),
      projectId: invoiceDetails.projectId || '',
      projectName: invoiceDetails.projectName || '',
      client: invoiceDetails.partyName,
      partyName: invoiceDetails.partyName,
      invoiceNo: invoiceDetails.invoiceNo,
      date: invoiceDetails.date,
      partyAddress: invoiceDetails.partyAddress,
      gstNo: invoiceDetails.gstNo,
      placeOfSupply: invoiceDetails.placeOfSupply,
      poNumber: invoiceDetails.poNumber,
      poDate: invoiceDetails.poDate,
      rcmApplicable: invoiceDetails.rcmApplicable || 'No',
      taxMode: taxMode,
      items: items.filter(i => i.description.trim() !== ''),
      bankName: invoiceDetails.bankName,
      accountName: invoiceDetails.accountName,
      accountNo: invoiceDetails.accountNo,
      ifscCode: invoiceDetails.ifscCode,
      upiId: invoiceDetails.upiId,
      terms: invoiceDetails.terms,
      description: invoiceDetails.description,
      discount: invoiceDetails.discount,
      advanceReceived: invoiceDetails.advanceReceived,
      taxableAmount: totals.subtotal,
      totalGst: totals.totalGst,
      totalAmount: totals.grandTotal,
      netPayable: netPayable > 0 ? netPayable : 0,
      amount: '₹ ' + (netPayable > 0 ? netPayable : totals.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      status: currentStatus,
      isCancelled: existingInv ? existingInv.isCancelled : false
    };

    setSubmitting(true);
    try {
      if (typeof db.saveInvoice === 'function') {
        await db.saveInvoice(record);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_invoices') || '[]');
        const updated = [record, ...cached.filter(i => String(i.id || i._id) !== String(record.id))];
        localStorage.setItem('jyanipur_invoices', JSON.stringify(updated));
      }

      // If marked Paid, auto-record into Income & P&L
      if (currentStatus === 'Paid' && (!existingInv || existingInv.status !== 'Paid')) {
        const paidAmount = netPayable > 0 ? netPayable : totals.grandTotal;
        const incomeRecord = {
          id: Date.now(),
          projectId: record.projectId,
          projectName: record.projectName || record.partyName,
          amount: paidAmount,
          date: record.date,
          paymentMode: 'Bank Transfer',
          referenceNo: `INV-${record.invoiceNo}`,
          notes: `Official Tax Invoice Settlement #${record.invoiceNo}`
        };

        if (typeof db.saveIncomeRecord === 'function') {
          await db.saveIncomeRecord(incomeRecord);
        } else {
          const incCache = JSON.parse(localStorage.getItem('jyanipur_incomes') || '[]');
          incCache.unshift(incomeRecord);
          localStorage.setItem('jyanipur_incomes', JSON.stringify(incCache));
        }
      }

      await loadAllSystemData();
      
      localStorage.removeItem('draft_invoiceDetails');
      localStorage.removeItem('draft_items');
      localStorage.removeItem('draft_taxMode');
      
      setSubmitting(false);
      return true;
    } catch (err) {
      console.error("Error saving invoice:", err);
      alert('Failed to save invoice to database.');
      setSubmitting(false);
      return false;
    }
  };

  const handleSaveOnly = async () => {
    if (await saveInvoiceToState()) {
      alert(`Tax Invoice ${invoiceDetails.invoiceNo} saved!`);
      handleClear(false);
      setCurrentView('list');
    }
  };

  const handleSaveAndPrint = async () => {
    if (await saveInvoiceToState()) {
      setTimeout(() => window.print(), 100);
    }
  };

  // Status Change with Auto-Income Sync
  const handleStatusChange = async (inv, newStatus) => {
    try {
      if (newStatus === 'Paid' && inv.status !== 'Paid') {
        const rawAmount = parseFloat((inv.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
        
        if (rawAmount > 0) {
          const incomeRecord = {
            id: Date.now(),
            projectId: inv.projectId || '',
            projectName: inv.projectName || inv.client || inv.partyName,
            amount: rawAmount,
            date: new Date().toISOString().split('T')[0],
            paymentMode: 'Bank Transfer',
            referenceNo: `INV-${inv.invoiceNo}`,
            notes: `Auto-logged settlement receipt for Tax Invoice #${inv.invoiceNo}`
          };

          if (typeof db.saveIncomeRecord === 'function') {
            await db.saveIncomeRecord(incomeRecord);
          } else {
            const incCache = JSON.parse(localStorage.getItem('jyanipur_incomes') || '[]');
            incCache.unshift(incomeRecord);
            localStorage.setItem('jyanipur_incomes', JSON.stringify(incCache));
          }
        }
      }

      const record = { ...inv, status: newStatus };
      if (typeof db.saveInvoice === 'function') {
        await db.saveInvoice(record);
      }
      await loadAllSystemData();
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const handleEdit = (inv) => {
    setEditingId(inv.id || inv._id);
    setTaxMode(inv.taxMode || 'CGST_SGST');
    setInvoiceDetails({
      projectId: inv.projectId || '',
      projectName: inv.projectName || '',
      partyName: inv.client || inv.partyName || '',
      partyAddress: inv.partyAddress || '',
      gstNo: inv.gstNo || '',
      placeOfSupply: inv.placeOfSupply || 'Telangana (36)',
      date: inv.date || new Date().toISOString().split('T')[0],
      invoiceNo: inv.invoiceNo || '',
      poNumber: inv.poNumber || '',
      poDate: inv.poDate || '',
      rcmApplicable: inv.rcmApplicable || 'No',
      description: inv.description || '',
      terms: inv.terms || '',
      bankName: inv.bankName || companySettings.bankName || 'HDFC Bank',
      accountName: inv.accountName || companySettings.accountName || 'Jyanipur Interiors',
      accountNo: inv.accountNo || companySettings.accountNo || '',
      ifscCode: inv.ifscCode || companySettings.ifscCode || '',
      upiId: inv.upiId || companySettings.upiId || 'jyanipur@hdfcbank',
      advanceReceived: inv.advanceReceived || '',
      discount: inv.discount || ''
    });
    setItems(inv.items && inv.items.length > 0 ? inv.items : [{ id: 1, description: '', hsn: companySettings.defaultHsnSac || '9954', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: 18 }]);
    setCurrentView('form');
  };

  const handleView = (inv) => {
    handleEdit(inv);
    setCurrentView('view');
  };

  const handleDirectPrint = (inv) => {
    handleEdit(inv);
    setTimeout(() => window.print(), 150);
  };

  const handleDuplicate = (inv) => {
    setEditingId(null);
    setTaxMode(inv.taxMode || 'CGST_SGST');
    setInvoiceDetails({
      projectId: inv.projectId || '',
      projectName: inv.projectName || '',
      partyName: inv.client || inv.partyName || '',
      partyAddress: inv.partyAddress || '',
      gstNo: inv.gstNo || '',
      placeOfSupply: inv.placeOfSupply || 'Telangana (36)',
      date: new Date().toISOString().split('T')[0],
      invoiceNo: generateNextInvoiceNo(), 
      poNumber: inv.poNumber || '',
      poDate: inv.poDate || '',
      rcmApplicable: 'No',
      description: inv.description || '',
      terms: inv.terms || '',
      bankName: inv.bankName || companySettings.bankName || '',
      accountName: inv.accountName || companySettings.accountName || '',
      accountNo: inv.accountNo || companySettings.accountNo || '',
      ifscCode: inv.ifscCode || companySettings.ifscCode || '',
      upiId: inv.upiId || companySettings.upiId || '',
      advanceReceived: '',
      discount: ''
    });
    setItems(inv.items && inv.items.length > 0 ? inv.items : [{ id: 1, description: '', hsn: companySettings.defaultHsnSac || '9954', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: 18 }]);
    setCurrentView('form');
    alert('Invoice duplicated. Make changes and click "Save Draft".');
  };

  const handleSendWhatsApp = (inv) => {
    const rawAmt = (inv.amount || '').replace(/[^0-9.-]+/g, '');
    const phone = prompt("Enter Client WhatsApp phone number (+91):");
    if (!phone) return;

    const finalMessage = `*OFFICIAL TAX INVOICE - ${companySettings.companyName || 'Jyanipur Interiors & Construction'}*\n\n` +
                         `*Invoice Number:* ${inv.invoiceNo}\n` +
                         `*Billed Party:* ${inv.client || inv.partyName}\n` +
                         `*Project Site:* ${inv.projectName || 'Site Execution'}\n` +
                         `*Gross Amount:* ₹${parseFloat(rawAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
                         `*Bank Details:* ${companySettings.bankName || 'HDFC Bank'} | A/C: ${companySettings.accountNo || '-'} | IFSC: ${companySettings.ifscCode || '-'}\n\n` +
                         `Please find your official tax invoice copy generated per GSTN compliance.`;
    
    sendWhatsAppMessage(phone, finalMessage);
  };

  const handleToggleCancel = async (inv) => {
    setLoading(true);
    try {
      if (typeof db.toggleCancelInvoice === 'function') {
        await db.toggleCancelInvoice(inv.id, inv.isCancelled);
      }
      await loadAllSystemData();
    } catch (e) {
      console.error("Failed to cancel invoice:", e);
    }
    setLoading(false);
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the current invoice editor?')) {
      setEditingId(null);
      setInvoiceDetails({ 
        projectId: '',
        projectName: '',
        partyName: '', 
        partyAddress: '', 
        gstNo: '', 
        placeOfSupply: 'Telangana (36)', 
        date: new Date().toISOString().split('T')[0], 
        invoiceNo: generateNextInvoiceNo(), 
        poNumber: '', 
        poDate: '', 
        rcmApplicable: 'No',
        description: '', 
        terms: companySettings.defaultInvoiceTerms || '', 
        bankName: companySettings.bankName || 'HDFC Bank', 
        accountName: companySettings.accountName || companySettings.companyName || 'Jyanipur Interiors', 
        accountNo: companySettings.accountNo || '', 
        ifscCode: companySettings.ifscCode || '', 
        upiId: companySettings.upiId || 'jyanipur@hdfcbank',
        advanceReceived: '', 
        discount: '' 
      });
      setItems([{ id: 1, description: '', hsn: companySettings.defaultHsnSac || '9954', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: companySettings.defaultGstRate || 18 }]);
      setErrors({});
      
      sessionStorage.removeItem('draft_editingId');
      if (updateDirtyState) updateDirtyState('TaxInvoice', false);
    }
  };

  const handleExportInvoicesCSV = () => {
    const data = filteredInvoices.map(i => ({
      'Invoice No': i.invoiceNo,
      'Date': i.date,
      'Client Name': i.client || i.partyName,
      'Client GSTIN': i.gstNo || 'Unregistered',
      'Place of Supply': i.placeOfSupply || 'Telangana (36)',
      'Tax Mode': i.taxMode,
      'Project Site': i.projectName || '-',
      'Status': i.status || 'Pending',
      'Invoice Amount (INR)': i.amount
    }));
    exportToCSV('Jyanipur_Tax_Invoices_Register', data);
  };

  const filteredInvoices = invoiceList.filter(inv => {
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      (inv.invoiceNo && inv.invoiceNo.toLowerCase().includes(q)) ||
      (inv.client && inv.client.toLowerCase().includes(q)) ||
      (inv.partyName && inv.partyName.toLowerCase().includes(q)) ||
      (inv.projectName && inv.projectName.toLowerCase().includes(q)) ||
      (inv.gstNo && inv.gstNo.toLowerCase().includes(q))
    );
    return matchesStatus && matchesSearch;
  });

  const isB2B = Boolean(invoiceDetails.gstNo && invoiceDetails.gstNo.trim().length === 15);
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=upi://pay?pa=${encodeURIComponent(invoiceDetails.upiId || 'jyanipur@hdfcbank')}&pn=${encodeURIComponent(companySettings.companyName || 'Jyanipur Interiors')}&am=${encodeURIComponent((netPayable > 0 ? netPayable : totals.grandTotal).toFixed(2))}&cu=INR`;

  const inputClass = "w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";
  const isReadOnly = currentView === 'view';

  // ==========================================
  // VIEW 1: INVOICES MASTER LIST
  // ==========================================
  if (currentView === 'list') {
    return (
      <div className="w-full h-full font-['Inter',sans-serif] flex flex-col print:hidden">
        
        {/* Header */}
        <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Client Tax Invoices</h2>
            <p className="text-zinc-500 text-sm mt-1 font-medium">Auto-generate client billings, import Work Order & JMR scopes, and sync cash receipts to Project P&L.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-56 focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
              <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search invoice, client, GSTIN..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full placeholder:text-zinc-400" 
              />
            </div>

            <button 
              onClick={handleExportInvoicesCSV}
              className="h-10 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>

            <button 
              onClick={() => { handleClear(false); setCurrentView('form'); }}
              className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-2 border border-black h-10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create Tax Invoice
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 mb-4 p-1 bg-zinc-100 rounded-lg w-fit shrink-0 border border-zinc-200">
          {['All', 'Pending', 'Paid', 'Overdue'].map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                statusFilter === tab ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Table Container */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                  <th className="py-4 px-6 w-36">Date</th>
                  <th className="py-4 px-6 w-44">Inv No.</th>
                  <th className="py-4 px-6">Client / Billed Party</th>
                  <th className="py-4 px-6 w-48">Project Site</th>
                  <th className="py-4 px-6 w-36">Status</th>
                  <th className="py-4 px-6 text-right w-44">Total Amount</th>
                  <th className="py-4 px-6 text-right w-64">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {loading ? (
                  <tr><td colSpan="7" className="py-16 text-center text-zinc-400 font-medium text-xs">Syncing invoices from cloud database...</td></tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">
                      No tax invoices matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id || inv._id} className={`transition-all ${inv.isCancelled ? 'bg-red-50/20 opacity-60' : 'hover:bg-zinc-50/60 group'}`}>
                      <td className={`py-4 px-6 text-xs font-bold uppercase tracking-widest font-mono ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-500'}`}>{inv.date}</td>
                      <td className={`py-4 px-6 font-bold text-xs font-mono ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900 tracking-tight'}`}>
                        {inv.invoiceNo}
                        {inv.isCancelled && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-widest inline-block no-underline">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className={`py-4 px-6 text-sm font-bold ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                        {inv.client || inv.partyName}
                        {inv.gstNo && <span className="block text-[9px] font-mono text-zinc-400 font-medium mt-0.5">{inv.gstNo}</span>}
                      </td>
                      <td className="py-4 px-6 text-xs font-semibold text-zinc-600">{inv.projectName || '-'}</td>
                      
                      <td className="py-4 px-6">
                        <select
                          value={inv.status || 'Pending'}
                          onChange={(e) => handleStatusChange(inv, e.target.value)}
                          disabled={inv.isCancelled}
                          className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:0.75rem_0.75rem] pr-6 pl-2.5 py-1 rounded-md border outline-none cursor-pointer transition-all text-[9px] font-bold uppercase tracking-widest ${
                            inv.isCancelled ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed' :
                            inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            inv.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-zinc-100 text-zinc-700 border-zinc-300'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </td>

                      <td className={`py-4 px-6 text-right font-black text-sm font-mono ${inv.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{inv.amount}</td>
                      
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!inv.isCancelled ? (
                            <>
                              <button onClick={() => handleEdit(inv)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">
                                Edit
                              </button>
                              
                              <button onClick={() => handleView(inv)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">
                                View
                              </button>
                              
                              <button onClick={() => handleDirectPrint(inv)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">
                                Print
                              </button>
                              
                              <button onClick={() => handleDuplicate(inv)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">
                                Copy
                              </button>

                              <button onClick={() => handleSendWhatsApp(inv)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5" title="WhatsApp Invoice">
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                WA
                              </button>
                              
                              <button onClick={() => handleToggleCancel(inv)} className="p-1.5 bg-white text-red-500 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg font-bold cursor-pointer transition-all shadow-sm opacity-0 group-hover:opacity-100" title="Cancel Invoice">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleView(inv)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">
                                View
                              </button>
                              <button onClick={() => handleToggleCancel(inv)} className="px-3 py-1.5 bg-zinc-900 text-white hover:bg-black border border-black rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">
                                Restore
                              </button>
                            </>
                          )}
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

  // ==========================================
  // VIEW 2: FORM & A4 DOCUMENT VIEW
  // ==========================================
  return (
    <div className="w-full h-full font-['Inter',sans-serif] flex flex-col">
      
      {/* SCREEN FORM VIEW (HIDDEN ON PRINT) */}
      <div className="print:hidden flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-6 mb-6 shrink-0">
          
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {isReadOnly ? `Viewing Invoice ${invoiceDetails.invoiceNo}` : editingId ? `Edit Invoice ${invoiceDetails.invoiceNo}` : 'New Tax Invoice'}
            </h2>
            
            {!isReadOnly && currentView === 'form' && !editingId && (
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ml-4 bg-zinc-100 px-3 py-1 rounded-md border border-zinc-200 shadow-sm">
                {saveStatus === 'saving' && <span className="text-zinc-600 flex items-center gap-1.5"><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Saving Draft...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-700 flex items-center gap-1.5"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Draft Saved Locally</span>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <button 
                type="button" 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-white border border-zinc-300 hover:border-black text-zinc-900 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm cursor-pointer flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Import Scope (WO / JMR)
              </button>
            )}

            <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer bg-white px-5 py-2.5 rounded-lg border border-zinc-200 flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to List
            </button>
            
            {isReadOnly && (
              <button onClick={() => window.print()} className="bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:bg-black shadow-sm flex items-center gap-2 border border-black">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print PDF
              </button>
            )}
          </div>
        </div>

        {/* Project Selector & Auto-populate Header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 shrink-0">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm md:col-span-1">
            <div className="flex justify-between items-center mb-1.5">
              <label className={labelClass}>Link Project Site</label>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Auto-populates</span>
            </div>
            <select
              disabled={isReadOnly}
              value={invoiceDetails.projectId || ''}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className={`${inputClass} font-bold`}
            >
              <option value="">Manual / General Customer</option>
              {projects.map(p => (
                <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>
              ))}
            </select>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm md:col-span-1">
            <label className={labelClass}>Billed Party Name <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.partyName} onChange={(e) => { setInvoiceDetails({...invoiceDetails, partyName: e.target.value}); if(errors.partyName) setErrors({...errors, partyName: false}); }} className={`${inputClass} font-bold ${errors.partyName ? 'border-red-400 bg-red-50/20' : ''}`} placeholder="e.g. Ramesh Reddy" />
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm md:col-span-1">
            <label className={labelClass}>Client GSTIN ({isB2B ? 'B2B Regular' : 'B2C Small'})</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.gstNo} onChange={(e) => setInvoiceDetails({...invoiceDetails, gstNo: e.target.value.toUpperCase()})} className={`${inputClass} font-mono uppercase font-bold`} maxLength={15} placeholder="36AABC..." />
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm md:col-span-1">
            <label className={labelClass}>Party Operating Address</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.partyAddress} onChange={(e) => setInvoiceDetails({...invoiceDetails, partyAddress: e.target.value})} className={inputClass} placeholder="Official Site / Billing Address" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 shrink-0">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Invoice No. <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.invoiceNo} onChange={(e) => { setInvoiceDetails({...invoiceDetails, invoiceNo: e.target.value}); if(errors.invoiceNo) setErrors({...errors, invoiceNo: false}); }} className={`${inputClass} font-bold text-zinc-900 font-mono`} />
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Invoice Date</label>
            <input disabled={isReadOnly} type="date" value={invoiceDetails.date} onChange={(e) => setInvoiceDetails({...invoiceDetails, date: e.target.value})} className={inputClass} />
          </div>
          <div className="md:col-span-2 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Tax Jurisdiction Model</label>
            <select 
              disabled={isReadOnly} 
              value={taxMode} 
              onChange={(e) => setTaxMode(e.target.value)} 
              className={`${inputClass} font-bold text-zinc-900`}
            >
              <option value="CGST_SGST">CGST + SGST (Intra-State: 9% + 9%)</option>
              <option value="IGST">IGST (Inter-State: 18%)</option>
              <option value="NONE">Non-GST / Exempt (0%)</option>
            </select>
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Place of Supply</label>
            <input disabled={isReadOnly} type="text" value={invoiceDetails.placeOfSupply} onChange={(e) => setInvoiceDetails({...invoiceDetails, placeOfSupply: e.target.value})} className={`${inputClass} font-medium`} />
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Reverse Charge (RCM)</label>
            <select disabled={isReadOnly} value={invoiceDetails.rcmApplicable} onChange={(e) => setInvoiceDetails({...invoiceDetails, rcmApplicable: e.target.value})} className={`${inputClass} font-bold`}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="mb-6 bg-white border border-zinc-200 rounded-xl shadow-sm shrink-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-white flex justify-between items-center">
            <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-widest">Bill of Quantities & Scope Breakdown</p>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest font-mono">SAC: {companySettings.defaultHsnSac || '9954'} (Interior Construction)</span>
          </div>
          <div className="overflow-x-visible">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[850px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[260px]">Scope of Work / Description</th>
                  <th className="py-3 px-2 w-20 text-center">HSN/SAC</th>
                  <th className="py-3 px-2 w-16 text-center">L</th>
                  <th className="py-3 px-2 w-16 text-center">B</th>
                  <th className="py-3 px-2 w-16 text-center">NO</th>
                  <th className="py-3 px-4 w-28 text-center bg-zinc-100 text-zinc-700">Qty</th>
                  <th className="py-3 px-4 w-32 text-right">Rate</th>
                  <th className="py-3 px-4 w-32 text-right bg-zinc-50">Base Amt</th>
                  {taxMode !== 'NONE' && <th className="py-3 px-2 w-20 text-center">GST %</th>}
                  <th className="py-3 px-4 w-36 text-right bg-zinc-100 text-zinc-900">Total</th>
                  {!isReadOnly && <th className="py-3 px-2 w-10 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item, index) => {
                  const rowCalc = calculateRow(item);
                  const tInp = "w-full border border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:bg-white bg-transparent focus:outline-none py-1.5 px-2 rounded text-xs transition-all font-medium text-zinc-900 placeholder-zinc-400 disabled:opacity-75 disabled:cursor-not-allowed";
                  
                  return (
                    <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-2 px-4 text-center text-xs font-bold text-zinc-400">{index + 1}</td>
                      <td className="py-2 px-4">
                        <textarea 
                          disabled={isReadOnly} 
                          placeholder="Scope description..." 
                          value={item.description} 
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)} 
                          className={`${tInp} resize-y min-h-[32px] block w-full leading-relaxed font-bold`} 
                          rows="1" 
                        />
                      </td>
                      <td className="py-2 px-2"><input disabled={isReadOnly} type="text" value={item.hsn} onChange={(e) => updateItem(item.id, 'hsn', e.target.value)} className={`${tInp} text-center font-mono`} placeholder="9954" /></td>
                      <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.sizeL} onChange={(e) => updateItem(item.id, 'sizeL', e.target.value)} className={`${tInp} text-center font-mono`} placeholder="-" /></td>
                      <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.sizeB} onChange={(e) => updateItem(item.id, 'sizeB', e.target.value)} className={`${tInp} text-center font-mono`} placeholder="-" /></td>
                      <td className="py-2 px-2"><input disabled={isReadOnly} type="number" step="any" value={item.no} onChange={(e) => updateItem(item.id, 'no', e.target.value)} className={`${tInp} text-center font-mono`} placeholder="-" /></td>
                      
                      <td className="py-2 px-4 bg-zinc-50/50">
                        <input 
                          disabled={isReadOnly} 
                          type="number" 
                          step="any" 
                          value={item.qty !== undefined ? item.qty : rowCalc.quantity} 
                          onChange={(e) => updateItem(item.id, 'qty', e.target.value)} 
                          className={`${tInp} text-center font-black text-zinc-900 bg-white shadow-sm border-zinc-200`} 
                          placeholder="0" 
                        />
                      </td>
                      
                      <td className="py-2 px-4">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">₹</span>
                          <input disabled={isReadOnly} type="number" step="any" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className={`${tInp} text-right pl-6 font-bold text-zinc-900`} placeholder="0.00" />
                        </div>
                      </td>
                      
                      <td className="py-2 px-4 text-right text-xs font-bold text-zinc-500 bg-zinc-50/30 font-mono">
                        ₹ {rowCalc.baseAmount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                      </td>
                      
                      {taxMode !== 'NONE' && (
                        <td className="py-2 px-2">
                          <select disabled={isReadOnly} value={item.gst} onChange={(e) => updateItem(item.id, 'gst', e.target.value)} className={`${tInp} text-center font-bold text-zinc-700`}>
                            <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                          </select>
                        </td>
                      )}
                      
                      <td className="py-2 px-4 text-right text-sm font-black text-zinc-900 bg-zinc-50/50 font-mono">
                        ₹ {rowCalc.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                      </td>
                      
                      {!isReadOnly && (
                        <td className="py-2 px-2 text-center">
                          <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-white bg-white hover:bg-red-500 border border-red-200 opacity-0 group-hover:opacity-100 transition-all cursor-pointer p-1.5 rounded-md shadow-sm mx-auto flex items-center justify-center">
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
              <button onClick={addItem} className="px-4 py-2 bg-white text-zinc-900 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add Line Item
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0">
          <div className="flex-1 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
              <label className={labelClass}>Scope Remarks / Site Notes</label>
              <textarea disabled={isReadOnly} value={invoiceDetails.description} onChange={(e) => setInvoiceDetails({...invoiceDetails, description: e.target.value})} className={`${inputClass} resize-y min-h-[50px] py-2`} rows="2" placeholder="Notes on milestones, completion stages, or site clearance..."></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
                <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-3 border-b border-zinc-100 pb-2">Remittance Bank & UPI Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center border-b border-zinc-100 pb-1.5"><span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">Bank:</span><input disabled={isReadOnly} type="text" value={invoiceDetails.bankName} onChange={(e) => setInvoiceDetails({...invoiceDetails, bankName: e.target.value})} className="w-full bg-transparent focus:outline-none font-bold text-zinc-900" /></div>
                  <div className="flex items-center border-b border-zinc-100 pb-1.5"><span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">Name:</span><input disabled={isReadOnly} type="text" value={invoiceDetails.accountName} onChange={(e) => setInvoiceDetails({...invoiceDetails, accountName: e.target.value})} className="w-full bg-transparent focus:outline-none font-bold text-zinc-900" /></div>
                  <div className="flex items-center border-b border-zinc-100 pb-1.5"><span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">A/C No:</span><input disabled={isReadOnly} type="text" value={invoiceDetails.accountNo} onChange={(e) => setInvoiceDetails({...invoiceDetails, accountNo: e.target.value})} className="w-full bg-transparent focus:outline-none font-bold font-mono text-zinc-900" /></div>
                  <div className="flex items-center border-b border-zinc-100 pb-1.5"><span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">IFSC:</span><input disabled={isReadOnly} type="text" value={invoiceDetails.ifscCode} onChange={(e) => setInvoiceDetails({...invoiceDetails, ifscCode: e.target.value})} className="w-full bg-transparent focus:outline-none font-bold font-mono text-zinc-900" /></div>
                  <div className="flex items-center"><span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">UPI ID:</span><input disabled={isReadOnly} type="text" value={invoiceDetails.upiId} onChange={(e) => setInvoiceDetails({...invoiceDetails, upiId: e.target.value})} className="w-full bg-transparent focus:outline-none font-bold font-mono text-emerald-800" /></div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
                <label className={labelClass}>Invoice Payment Terms</label>
                <textarea disabled={isReadOnly} value={invoiceDetails.terms} onChange={(e) => setInvoiceDetails({...invoiceDetails, terms: e.target.value})} className={`${inputClass} resize-none h-[120px] text-xs leading-relaxed`} placeholder="1. Payment due within 15 days..."></textarea>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[380px] flex flex-col justify-between">
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm text-zinc-800 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Taxable Basic Value</span>
                <span className="text-zinc-900 font-bold font-mono">₹ {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">IGST (18%)</span>
                  <span className="text-zinc-900 font-bold font-mono">₹ {totals.totalGst.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
                </div>
              ) : taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">CGST (9%)</span>
                    <span className="text-zinc-900 font-bold font-mono">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">SGST (9%)</span>
                    <span className="text-zinc-900 font-bold font-mono">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : null}
              
              <div className="flex justify-between items-center text-base font-bold text-zinc-900 border-t border-zinc-100 pt-3">
                <span className="uppercase tracking-widest text-[10px]">Gross Invoice Total</span>
                <span className="font-mono">₹ {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
              </div>

              <div className="border-t border-zinc-100 pt-3 space-y-2.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Discount (-)</span>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">₹</span>
                    <input disabled={isReadOnly} type="number" value={invoiceDetails.discount} onChange={(e) => setInvoiceDetails({...invoiceDetails, discount: e.target.value})} placeholder="0.00" className="w-full bg-zinc-50 text-red-600 font-bold rounded-lg pl-6 pr-2.5 py-1 text-right outline-none border border-zinc-200 text-xs" />
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Advance Paid (-)</span>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">₹</span>
                    <input disabled={isReadOnly} type="number" value={invoiceDetails.advanceReceived} onChange={(e) => setInvoiceDetails({...invoiceDetails, advanceReceived: e.target.value})} placeholder="0.00" className="w-full bg-zinc-50 text-emerald-700 font-bold rounded-lg pl-6 pr-2.5 py-1 text-right outline-none border border-zinc-200 text-xs" />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xl font-black text-zinc-900 border-t-2 border-zinc-900 pt-3 mt-1">
                <span className="uppercase tracking-widest text-xs font-bold">Balance Due</span>
                <span className="font-mono">₹ {netPayable > 0 ? netPayable.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : '0.00'}</span>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex gap-3 mt-5">
                <button onClick={handleSaveOnly} disabled={submitting} className="flex-1 py-3.5 bg-white border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 text-zinc-900 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button onClick={handleSaveAndPrint} disabled={submitting} className="flex-[1.5] py-3.5 bg-zinc-900 hover:bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 border border-black">
                  {submitting ? 'Saving...' : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      Save & Print A4
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: IMPORT SCOPE FROM WORK ORDER OR JOINT MEASUREMENT SHEET */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] border border-zinc-200">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-base font-bold text-zinc-900 tracking-tight">Import Scope & Line Items</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Select approved Work Order or certified Joint Measurement Record</p>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Source Tab Toggle */}
            <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setImportSourceTab('WORK_ORDERS')}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer border ${
                  importSourceTab === 'WORK_ORDERS' ? 'bg-zinc-900 text-white border-black shadow-sm' : 'bg-white text-zinc-600 border-zinc-200'
                }`}
              >
                Client Work Orders ({clientWorkOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setImportSourceTab('JMR')}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer border ${
                  importSourceTab === 'JMR' ? 'bg-zinc-900 text-white border-black shadow-sm' : 'bg-white text-zinc-600 border-zinc-200'
                }`}
              >
                Joint Measurement Sheets ({measurementSheets.length})
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 bg-[#F4F4F5] flex-1">
              {importSourceTab === 'WORK_ORDERS' ? (
                clientWorkOrders.length === 0 ? (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-10 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    No Client Work Orders found.
                  </div>
                ) : (
                  clientWorkOrders.map((wo) => (
                    <div 
                      key={wo.id || wo._id}
                      onClick={() => handleImportWorkOrderScope(wo)}
                      className="p-4 bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl cursor-pointer transition-all shadow-sm group"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {wo.woNo}
                        </span>
                        <span className="text-sm font-black text-zinc-900 font-mono">
                          ₹ {(parseFloat(wo.totalAmount) || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-zinc-900 tracking-tight">{wo.clientName}</h4>
                      <p className="text-xs text-zinc-500 font-medium">{wo.projectName || 'General Site'} • {(wo.items || []).length} scope items</p>
                      <div className="mt-2.5 pt-2 border-t border-zinc-100 flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                        <span>Date: {wo.date}</span>
                        <span className="text-zinc-900 group-hover:underline">Import Contract Items &rarr;</span>
                      </div>
                    </div>
                  ))
                )
              ) : (
                measurementSheets.length === 0 ? (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-10 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    No Joint Measurement Records (JMR) found.
                  </div>
                ) : (
                  measurementSheets.map((jmr) => {
                    const rowCount = (jmr.data || []).filter(r => !r.isSubtotal).length;
                    const val = (jmr.data || []).reduce((sum, r) => sum + (r.isSubtotal ? 0 : (parseFloat(r.totalAmount) || 0)), 0);
                    return (
                      <div 
                        key={jmr.id || jmr._id}
                        onClick={() => handleImportJMR(jmr)}
                        className="p-4 bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl cursor-pointer transition-all shadow-sm group"
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            JMR • {jmr.date}
                          </span>
                          <span className="text-sm font-black text-zinc-900 font-mono">
                            ₹ {val.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-zinc-900 tracking-tight">{jmr.title}</h4>
                        <p className="text-xs text-zinc-500 font-medium">{jmr.projectName || 'Site'} • {rowCount} verified measurements</p>
                        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex justify-between items-center text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                          <span>Agency: {jmr.subcontractorName || 'General'}</span>
                          <span className="text-zinc-900 group-hover:underline">Import JMR Measurements &rarr;</span>
                        </div>
                      </div>
                    );
                  })
                )
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
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
          
          @media print {
            @page { margin: 8mm; size: A4 portrait; }
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
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Tax Invoice</span>
              <h2 className="text-xl font-black text-black tracking-tight font-mono">{invoiceDetails.invoiceNo || 'INV-000'}</h2>
              <p className="text-[9px] text-zinc-800 mt-0.5 font-bold font-mono">Date: <span className="font-medium text-zinc-600">{invoiceDetails.date}</span></p>
            </div>
          </div>

          {/* Client & Reference Info */}
          <div className="grid grid-cols-2 gap-6 mb-4 pb-3 border-b border-zinc-200">
            <div>
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Billed To (Client Particulars)</span>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">{invoiceDetails.partyName || 'Client Name'}</h3>
              <p className="text-[9px] text-zinc-600 whitespace-pre-wrap mt-0.5 leading-relaxed font-medium max-w-[280px]">{invoiceDetails.partyAddress}</p>
              {invoiceDetails.gstNo && (
                <p className="text-[9px] text-zinc-800 font-bold mt-1 font-mono">
                  GSTIN: <span className="font-medium text-zinc-600">{invoiceDetails.gstNo.toUpperCase()}</span>
                </p>
              )}
            </div>

            <div className="text-right space-y-0.5 text-[9px]">
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Statutory Particulars</span>
              {invoiceDetails.projectName && <p className="text-zinc-800 font-bold">Project Site: <span className="font-bold text-zinc-900">{invoiceDetails.projectName}</span></p>}
              {invoiceDetails.poNumber && <p className="text-zinc-800 font-bold">Contract / PO Ref: <span className="font-medium text-zinc-600 font-mono">{invoiceDetails.poNumber}</span></p>}
              <p className="text-zinc-800 font-bold">Place of Supply: <span className="font-medium text-zinc-600">{invoiceDetails.placeOfSupply}</span></p>
              <p className="text-zinc-800 font-bold">Reverse Charge (RCM): <span className="font-medium text-zinc-600">{invoiceDetails.rcmApplicable || 'No'}</span></p>
            </div>
          </div>

          {/* ITEM TABLE */}
          <table className="w-full text-left border-collapse border border-zinc-300 mb-4">
            <thead className="bg-zinc-100 text-zinc-900 text-[8px] uppercase tracking-widest font-bold border-b-2 border-zinc-300">
              <tr>
                <th className="py-2 px-2 text-center w-8 border-r border-zinc-300">#</th>
                <th className="py-2 px-3 border-r border-zinc-300">Description of Service & Scope</th>
                <th className="py-2 px-2 text-center w-14 border-r border-zinc-300 font-mono">SAC</th>
                <th className="py-2 px-2 text-center w-14 border-r border-zinc-300">L x B</th>
                <th className="py-2 px-2 text-center w-10 border-r border-zinc-300">No</th>
                <th className="py-2 px-2 text-center w-14 border-r border-zinc-300 bg-white">Qty</th>
                <th className="py-2 px-2 text-right w-20 border-r border-zinc-300">Rate</th>
                {taxMode !== 'NONE' && <th className="py-2 px-2 text-center w-12 border-r border-zinc-300">Tax</th>}
                <th className="py-2 px-3 text-right w-24 bg-white">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-[9px] font-medium text-zinc-900">
              {items.map((item, index) => {
                const row = calculateRow(item);
                if (!item.description) return null;
                const measurement = (item.sizeL || item.sizeB) ? `${item.sizeL || '-'} x ${item.sizeB || '-'}` : '-';

                return (
                  <tr key={item.id} className="break-inside-avoid even:bg-zinc-50/50">
                    <td className="py-2 px-2 text-center text-zinc-500 font-bold border-r border-zinc-200">{index + 1}</td>
                    <td className="py-2 px-3 border-r border-zinc-200 font-bold text-zinc-900 leading-relaxed whitespace-pre-wrap">{item.description}</td>
                    <td className="py-2 px-2 text-center border-r border-zinc-200 text-zinc-600 font-mono text-[8px]">{item.hsn || '9954'}</td>
                    <td className="py-2 px-2 text-center border-r border-zinc-200 text-zinc-600 font-mono text-[8px]">{measurement}</td>
                    <td className="py-2 px-2 text-center border-r border-zinc-200 text-zinc-600 font-mono text-[8px]">{item.no || '-'}</td>
                    <td className="py-2 px-2 text-center font-bold border-r border-zinc-200 bg-zinc-50/50 font-mono">{row.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
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
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Amount in Words</span>
              <p className="text-[10px] font-bold text-zinc-900 capitalize leading-relaxed bg-zinc-50 p-2.5 rounded border border-zinc-200">{numberToWords(netPayable > 0 ? netPayable : totals.grandTotal)}</p>
            </div>
            
            <div className="w-64 space-y-1.5 text-[9px] text-zinc-900 bg-zinc-50 p-3 rounded border border-zinc-200">
              <div className="flex justify-between font-bold text-zinc-600">
                <span className="uppercase tracking-widest text-[8px]">Taxable Value:</span>
                <span className="font-mono">₹{totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between font-bold text-zinc-600 border-b border-zinc-200 pb-1">
                  <span className="uppercase tracking-widest text-[8px]">IGST (18%):</span>
                  <span className="font-mono">₹{totals.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              ) : taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between font-bold text-zinc-600">
                    <span className="uppercase tracking-widest text-[8px]">CGST (9%):</span>
                    <span className="font-mono">₹{(totals.totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-zinc-600 border-b border-zinc-200 pb-1">
                    <span className="uppercase tracking-widest text-[8px]">SGST (9%):</span>
                    <span className="font-mono">₹{(totals.totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : null}
              
              <div className="flex justify-between font-black pt-0.5">
                <span className="uppercase tracking-widest text-[8px]">Gross Invoice Total:</span>
                <span className="font-mono">₹{totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {(invoiceDetails.discount > 0) && (
                <div className="flex justify-between font-bold text-red-600">
                  <span className="uppercase tracking-widest text-[8px]">Discount:</span>
                  <span className="font-mono">- ₹{parseFloat(invoiceDetails.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {(invoiceDetails.advanceReceived > 0) && (
                <div className="flex justify-between font-bold text-emerald-700">
                  <span className="uppercase tracking-widest text-[8px]">Advance Received:</span>
                  <span className="font-mono">- ₹{parseFloat(invoiceDetails.advanceReceived).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-xs border-t-2 border-black pt-1.5 mt-1">
                <span className="uppercase tracking-widest text-[9px]">Balance Due:</span>
                <span className="font-mono">₹{netPayable > 0 ? netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Terms, Bank Details, UPI QR Code and Signatures */}
          <div className="grid grid-cols-2 gap-6 text-[9px] break-inside-avoid">
            <div className="space-y-3">
              {/* Bank & UPI QR Code Block */}
              <div className="bg-zinc-50 p-2.5 rounded border border-zinc-200 flex justify-between items-center gap-2">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Remittance Bank Details</span>
                  <p><strong className="text-zinc-600">Bank:</strong> {invoiceDetails.bankName}</p>
                  <p><strong className="text-zinc-600">A/C:</strong> <span className="font-mono font-bold">{invoiceDetails.accountNo}</span></p>
                  <p><strong className="text-zinc-600">IFSC:</strong> <span className="font-mono font-bold">{invoiceDetails.ifscCode}</span></p>
                  <p><strong className="text-zinc-600">UPI:</strong> <span className="font-mono font-bold text-emerald-800">{invoiceDetails.upiId}</span></p>
                </div>
                <div className="text-center p-1 bg-white border border-zinc-200 rounded shrink-0">
                  <img src={upiQrUrl} alt="UPI QR Code" className="w-16 h-16 object-contain" />
                  <span className="text-[7px] font-black uppercase text-zinc-600 tracking-wider block mt-0.5">Scan to Pay UPI</span>
                </div>
              </div>
              
              {invoiceDetails.terms && (
                <div>
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-0.5">Terms & Conditions</span>
                  <p className="whitespace-pre-wrap text-zinc-700 leading-relaxed font-medium">{invoiceDetails.terms}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col items-end justify-end text-right">
              <div className="relative mb-2 flex items-center justify-end">
                {companySettings?.showStampImage && companySettings?.stampUrl && (
                  <img src={companySettings.stampUrl} alt="Stamp" className="h-16 w-auto object-contain mix-blend-multiply opacity-80" />
                )}
                {companySettings?.showSignatureImage && companySettings?.signatureUrl ? (
                  <img src={companySettings.signatureUrl} alt="Signature" className="h-16 w-auto object-contain mix-blend-multiply -ml-6" />
                ) : <div className="h-14"></div>}
              </div>
              <div className="border-t-2 border-black pt-1.5 w-52">
                <p className="font-black text-black">For {companySettings?.companyName || 'Jyanipur Interiors'}</p>
                <p className="text-[8px] text-zinc-500 mt-0.5 uppercase tracking-widest font-bold">Authorized Signatory</p>
              </div>
            </div>
          </div>

        </div>

        {/* Anchored Footer Disclaimer */}
        <div className="mt-6 pt-2 border-t border-zinc-200 text-center w-full">
          <p className="text-[8px] text-zinc-400 font-medium uppercase tracking-widest">
            {companySettings?.pdfFooterDisclaimer || 'This is a computer generated commercial tax invoice issued in accordance with GST Rule 46.'}
          </p>
        </div>

      </div>

    </div>
  );
}