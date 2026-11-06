import React, { useState, useEffect, useRef } from 'react';
import { sendWhatsAppMessage } from '../WhatsAppHelper';
import * as db from '../db';

// Helper function to convert number to Words
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

export default function PurchaseOrders({ companySettings = {}, updateDirtyState }) {
  const [currentView, setCurrentView] = useState(() => sessionStorage.getItem('draft_poView') || 'list');
  const [editingId, setEditingId] = useState(() => {
    const saved = sessionStorage.getItem('draft_poEditingId');
    return saved && saved !== 'undefined' ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [poList, setPoList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Autocomplete & Reference Data States
  const [vendorsList, setVendorsList] = useState([]);
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const vendorDropdownRef = useRef(null);

  const [projectsList, setProjectsList] = useState([]);
  const [materialRates, setMaterialRates] = useState([]);
  const [focusedRowId, setFocusedRowId] = useState(null);

  const [poDetails, setPoDetails] = useState(() => {
    const saved = sessionStorage.getItem('draft_poDetails');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      vendorName: '', 
      vendorAddress: '', 
      vendorGst: '', 
      date: new Date().toISOString().split('T')[0], 
      expectedDelivery: '', 
      poNo: companySettings.poPrefix || 'PO/', 
      projectId: '',
      projectName: '', 
      shippingAddress: companySettings.companyAddress || 'Site Office', 
      terms: companySettings.defaultPOTerms || '', 
      description: '',
      status: 'Pending'
    };
  });

  const [items, setItems] = useState(() => {
    const saved = sessionStorage.getItem('draft_poItems');
    if (saved && saved !== 'undefined') {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [{ id: 1, description: '', uom: 'Nos', qty: '', rate: '', tax: companySettings.defaultGstRate || 18 }];
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    sessionStorage.setItem('draft_poView', currentView);
    sessionStorage.setItem('draft_poEditingId', JSON.stringify(editingId));
    sessionStorage.setItem('draft_poDetails', JSON.stringify(poDetails));
    sessionStorage.setItem('draft_poItems', JSON.stringify(items));
  }, [currentView, editingId, poDetails, items]);

  useEffect(() => {
    if (updateDirtyState) {
      if (currentView === 'form') {
        const isDirty = poDetails.vendorName !== '' || 
                        (poDetails.poNo !== '' && poDetails.poNo !== companySettings.poPrefix) || 
                        items.length > 1 || 
                        items[0].description !== '';
        updateDirtyState('Purchase Orders', isDirty);
      } else {
        updateDirtyState('Purchase Orders', false);
      }
    }
  }, [currentView, poDetails, items, updateDirtyState, companySettings.poPrefix]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [poData, vData, mData, pData] = await Promise.all([
        db.getPurchaseOrders ? db.getPurchaseOrders() : Promise.resolve([]),
        db.getVendors ? db.getVendors() : Promise.resolve([]),
        db.getMaterialRates ? db.getMaterialRates() : Promise.resolve([]),
        db.getProjects ? db.getProjects() : Promise.resolve([])
      ]);
      setPoList(poData || []);
      setVendorsList(vData || []);
      setMaterialRates(mData || []);
      setProjectsList((pData || []).filter(p => p.status !== 'Completed'));
    } catch (e) {
      console.error("Error loading POs:", e);
      setPoList([]);
      setVendorsList([]);
      setMaterialRates([]);
      setProjectsList([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [currentView]);

  // Click outside to close vendor dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target)) {
        setShowVendorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!editingId && currentView === 'form') {
      setPoDetails(prev => ({
        ...prev,
        poNo: prev.poNo === '' || prev.poNo === 'PO/' ? (companySettings.poPrefix || 'PO/') : prev.poNo,
        terms: prev.terms === '' ? (companySettings.defaultPOTerms || '') : prev.terms
      }));
    }
  }, [companySettings, editingId, currentView]);

  const handleVendorInputChange = (e) => {
    const val = e.target.value;
    const exactMatch = vendorsList.find(v => v.name && v.name.toLowerCase() === val.toLowerCase());
    
    if (exactMatch) {
      handleSelectVendor(exactMatch);
      return;
    }

    setPoDetails(prev => ({ ...prev, vendorName: val }));
    if (errors.vendorName) setErrors(prev => ({ ...prev, vendorName: false }));

    if (val.trim().length > 0) {
      const matches = vendorsList.filter(v => v.name && v.name.toLowerCase().includes(val.toLowerCase()));
      setVendorSuggestions(matches);
      setShowVendorDropdown(matches.length > 0);
    } else {
      setVendorSuggestions(vendorsList);
      setShowVendorDropdown(vendorsList.length > 0);
    }
  };

  const handleSelectVendor = (vendor) => {
    setPoDetails(prev => ({
      ...prev,
      vendorName: vendor.name,
      vendorGst: vendor.gstin || '',
      vendorAddress: vendor.address || ''
    }));
    setShowVendorDropdown(false);
  };

  const handleProjectSelect = (e) => {
    const selectedVal = e.target.value;
    const project = projectsList.find(p => String(p.id || p._id) === String(selectedVal));
    
    if (project) {
      setPoDetails(prev => ({
        ...prev,
        projectId: project.id || project._id,
        projectName: project.name || project.projectName,
        shippingAddress: project.clientAddress || project.address || `${project.name} Site Office`
      }));
    } else {
      setPoDetails(prev => ({
        ...prev,
        projectId: '',
        projectName: selectedVal,
        shippingAddress: companySettings.companyAddress || 'Site Office'
      }));
    }
  };

  const handleSelectMaterial = (rowId, material) => {
    setItems(items.map(item => item.id === rowId ? {
      ...item,
      description: material.materialName,
      uom: material.unit || 'Nos',
      rate: material.rate || ''
    } : item));
    setFocusedRowId(null);
  };

  const addItem = () => setItems([...items, { id: Date.now(), description: '', uom: 'Nos', qty: '', rate: '', tax: companySettings.defaultGstRate || 18 }]);
  const updateItem = (id, field, value) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  const removeItem = (id) => setItems(items.filter(item => item.id !== id));

  const calculateRow = (item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.rate) || 0;
    const taxRate = parseFloat(item.tax) || 0;
    const baseAmount = qty * rate;
    const taxAmount = (baseAmount * taxRate) / 100;
    return { baseAmount, taxAmount, totalAmount: baseAmount + taxAmount };
  };

  const totals = items.reduce((acc, item) => {
    const rowCalc = calculateRow(item);
    return { subtotal: acc.subtotal + rowCalc.baseAmount, totalTax: acc.totalTax + rowCalc.taxAmount, grandTotal: acc.grandTotal + rowCalc.totalAmount };
  }, { subtotal: 0, totalTax: 0, grandTotal: 0 });

  const savePOToState = async () => {
    const newErrors = {};
    if (!poDetails.vendorName) newErrors.vendorName = true;
    if (!poDetails.poNo) newErrors.poNo = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Please complete the required fields: Vendor Name and PO No.');
      return false;
    }
    setErrors({});
    
    const record = {
      id: editingId || undefined,
      vendorName: poDetails.vendorName,
      vendorAddress: poDetails.vendorAddress,
      vendorGst: poDetails.vendorGst,
      poNo: poDetails.poNo,
      date: poDetails.date,
      expectedDelivery: poDetails.expectedDelivery,
      projectId: poDetails.projectId,
      projectName: poDetails.projectName,
      shippingAddress: poDetails.shippingAddress,
      items: items,
      terms: poDetails.terms,
      description: poDetails.description,
      status: poDetails.status || 'Pending',
      amount: '₹ ' + totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };

    setSubmitting(true);
    try {
      if (typeof db.savePurchaseOrder === 'function') {
        await db.savePurchaseOrder(record);
      }
      await loadData();
      setSubmitting(false);
      return true;
    } catch (err) {
      console.error("Error saving PO:", err);
      alert('Failed to save PO to database.');
      setSubmitting(false);
      return false;
    }
  };

  const handleSaveOnly = async () => {
    if (await savePOToState()) {
      alert(`Purchase Order ${poDetails.poNo} saved!`);
      handleClear(false);
      setCurrentView('list');
    }
  };

  const handleSaveAndPrint = async () => {
    if (await savePOToState()) {
      setTimeout(() => window.print(), 100);
    }
  };

  // Safe Fulfillment with Fallbacks
  const handleReceiveGoods = async (po) => {
    const defaultBillNo = `BILL-${po.poNo ? po.poNo.replace(/[^0-9A-Z]/gi, '') : Date.now().toString().slice(-5)}`;
    const billInvoiceNo = prompt("Enter Supplier's Tax Invoice / Delivery Challan No:", defaultBillNo);
    if (!billInvoiceNo) return;

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // A. Inward Purchase Bill
      const purchaseRecord = {
        vendorName: po.vendorName,
        gstin: po.vendorGst || '',
        projectName: po.projectName || 'Central Inventory',
        invoiceNo: billInvoiceNo,
        invoiceDate: today,
        taxMode: po.vendorGst ? 'CGST_SGST' : 'NONE',
        items: (po.items || []).map(item => ({
          id: Date.now() + Math.random(),
          materialName: item.description,
          qty: parseFloat(item.qty) || 0,
          unit: item.uom || 'Nos',
          rate: parseFloat(item.rate) || 0,
          gst: parseFloat(item.tax) || 18
        })),
        taxableAmount: (po.items || []).reduce((sum, i) => sum + ((parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0)), 0),
        gstAmount: (po.items || []).reduce((sum, i) => {
          const base = (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0);
          return sum + (base * (parseFloat(i.tax) || 0) / 100);
        }, 0),
        totalAmount: (po.items || []).reduce((sum, i) => {
          const base = (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0);
          return sum + base + (base * (parseFloat(i.tax) || 0) / 100);
        }, 0),
        remarks: `Auto-fulfilled from Purchase Order #${po.poNo}`,
        returnStatus: 'Pending'
      };

      if (typeof db.savePurchase === 'function') {
        await db.savePurchase(purchaseRecord);
      } else {
        const stored = JSON.parse(localStorage.getItem('jyanipur_purchases') || '[]');
        stored.unshift({ id: Date.now(), ...purchaseRecord });
        localStorage.setItem('jyanipur_purchases', JSON.stringify(stored));
      }

      // B. Stock Intake Movement to Inventory (+IN)
      if (typeof db.saveInventoryMovement === 'function') {
        for (const item of (po.items || [])) {
          if (item.description && (parseFloat(item.qty) || 0) > 0) {
            await db.saveInventoryMovement({
              projectId: po.projectId || '',
              projectName: po.projectName || 'Central Godown',
              itemName: item.description,
              quantity: parseFloat(item.qty) || 0,
              unit: item.uom || 'Nos',
              type: 'IN',
              date: today,
              notes: `Stock arrived via PO #${po.poNo}`
            });
          }
        }
      } else {
        const existingStock = JSON.parse(localStorage.getItem('jyanipur_inventory') || '[]');
        (po.items || []).forEach(item => {
          if (item.description && (parseFloat(item.qty) || 0) > 0) {
            existingStock.unshift({
              id: Date.now() + Math.random(),
              projectId: po.projectId || '',
              projectName: po.projectName || 'Central Godown',
              itemName: item.description,
              quantity: parseFloat(item.qty) || 0,
              unit: item.uom || 'Nos',
              type: 'IN',
              date: today,
              notes: `Stock arrived via PO #${po.poNo}`
            });
          }
        });
        localStorage.setItem('jyanipur_inventory', JSON.stringify(existingStock));
      }

      // C. Rate Book Sync
      if (typeof db.saveMaterialRate === 'function') {
        for (const item of (po.items || [])) {
          if (item.description && parseFloat(item.rate) > 0) {
            await db.saveMaterialRate({
              materialName: item.description,
              vendorName: po.vendorName,
              rate: parseFloat(item.rate),
              unit: item.uom || 'Nos',
              date: today,
              notes: `Rate updated from PO #${po.poNo}`
            });
          }
        }
      }

      // D. Mark PO as Received
      if (typeof db.savePurchaseOrder === 'function') {
        await db.savePurchaseOrder({
          ...po,
          status: 'Received',
          receivedDate: today,
          receivedBillNo: billInvoiceNo
        });
      }

      await loadData();
      alert(`Automated Fulfillment Complete!\n\n1. Inward Bill Logged: ${billInvoiceNo}\n2. Stock Credited to Inventory (+IN)\n3. Vendor Ledger Liability Added`);
    } catch (err) {
      console.error("Error auto-fulfilling PO:", err);
      alert("Failed to fulfill Purchase Order.");
    }
    setSubmitting(false);
  };

  const handleEdit = (po) => {
    setEditingId(po.id);
    setPoDetails({
      vendorName: po.vendorName || '',
      vendorAddress: po.vendorAddress || '',
      vendorGst: po.vendorGst || '',
      date: po.date || new Date().toISOString().split('T')[0],
      expectedDelivery: po.expectedDelivery || '',
      poNo: po.poNo || '',
      projectId: po.projectId || '',
      projectName: po.projectName || '',
      shippingAddress: po.shippingAddress || '',
      terms: po.terms || '',
      description: po.description || '',
      status: po.status || 'Pending'
    });
    setItems(po.items && po.items.length > 0 ? po.items : [{ id: 1, description: '', uom: 'Nos', qty: '', rate: '', tax: companySettings.defaultGstRate || 18 }]);
    setCurrentView('form');
  };

  const handleView = (po) => {
    handleEdit(po);
    setCurrentView('view');
  };

  const handleDirectPrint = (po) => {
    handleEdit(po);
    setTimeout(() => window.print(), 150);
  };

  const handleSendWhatsApp = (po) => {
    const template = companySettings.waPoTemplate || 'Hello, please find our official Purchase Order attached.';
    const finalMessage = `${template}\n\n*PO No:* ${po.poNo || 'PO'}\n*Vendor:* ${po.vendorName}\n*Amount:* ${po.amount || '0'}\n*Company:* ${companySettings.companyName || 'Jyanipur Interiors'}`;
    sendWhatsAppMessage(po.phone || '', finalMessage);
  };

  const handleToggleCancel = async (po) => {
    setLoading(true);
    try {
      if (typeof db.toggleCancelPurchaseOrder === 'function') {
        await db.toggleCancelPurchaseOrder(po.id, po.isCancelled);
      }
      await loadData();
    } catch(e) {
      console.error("Error toggling PO cancellation status:", e);
      setLoading(false);
    }
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the entire PO?')) {
      setEditingId(null);
      setPoDetails({ 
        vendorName: '', vendorAddress: '', vendorGst: '', date: new Date().toISOString().split('T')[0], 
        expectedDelivery: '', poNo: companySettings.poPrefix || 'PO/', projectId: '', projectName: '', 
        shippingAddress: companySettings.companyAddress || 'Site Office', 
        terms: companySettings.defaultPOTerms || '', description: '', status: 'Pending'
      });
      setItems([{ id: 1, description: '', uom: 'Nos', qty: '', rate: '', tax: companySettings.defaultGstRate || 18 }]);
      setErrors({});
      setShowVendorDropdown(false);
      sessionStorage.removeItem('draft_poDetails');
      sessionStorage.removeItem('draft_poItems');
      sessionStorage.removeItem('draft_poEditingId');
      if (updateDirtyState) updateDirtyState('Purchase Orders', false);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  const isReadOnly = currentView === 'view';

  const filteredPOList = poList.filter(po => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Received') return po.status === 'Received';
    if (statusFilter === 'Pending') return !po.status || po.status === 'Pending' || po.status === 'Sent';
    if (statusFilter === 'Cancelled') return po.isCancelled;
    return true;
  });

  if (currentView === 'list') {
    return (
      <div className="w-full h-full flex flex-col print:hidden font-['Inter',sans-serif]">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Purchase Orders</h2>
            <p className="text-zinc-500 text-sm mt-1 font-medium">Auto-fill supplier rates, manage requisitions, and fulfill stock directly into Inventory & Ledgers.</p>
          </div>
          <button 
            onClick={() => { handleClear(false); setCurrentView('form'); }} 
            className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-2 tracking-wide uppercase"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create PO
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 mb-4 p-1 bg-zinc-100 rounded-lg w-fit shrink-0 border border-zinc-200">
          {['All', 'Pending', 'Received', 'Cancelled'].map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* PO Table */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200 sticky top-0 z-10">
                  <th className="py-4 px-6 w-36">Date</th>
                  <th className="py-4 px-6 w-40">PO No.</th>
                  <th className="py-4 px-6">Vendor / Supplier</th>
                  <th className="py-4 px-6 w-44">Destination Site</th>
                  <th className="py-4 px-6 text-center w-36">Fulfillment</th>
                  <th className="py-4 px-6 text-right w-36">Total Amount</th>
                  <th className="py-4 px-6 text-right w-72">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {loading ? (
                  <tr><td colSpan="7" className="py-16 text-center text-zinc-400 font-medium text-xs">Syncing Purchase Orders from database...</td></tr>
                ) : filteredPOList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-200">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-zinc-500 font-medium text-xs">No purchase orders found matching this filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPOList.map((po) => {
                    const isReceived = po.status === 'Received';

                    return (
                      <tr key={po.id} className={`transition-all ${po.isCancelled ? 'bg-red-50/20 opacity-60' : 'hover:bg-zinc-50/50 group'}`}>
                        <td className={`py-4 px-6 text-xs font-bold uppercase tracking-widest ${po.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-500'}`}>{po.date}</td>
                        <td className={`py-4 px-6 font-bold text-xs tracking-tight ${po.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{po.poNo}</td>
                        <td className={`py-4 px-6 text-sm font-bold ${po.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>{po.vendorName}</td>
                        <td className="py-4 px-6 text-xs font-semibold text-zinc-600">{po.projectName || 'Central Warehouse'}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                            po.isCancelled ? 'bg-zinc-100 text-zinc-400 border-zinc-200' :
                            isReceived ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 
                            'bg-zinc-100 text-zinc-700 border-zinc-300'
                          }`}>
                            {po.isCancelled ? 'Cancelled' : isReceived ? 'Fulfilled (In Stock)' : 'Pending Receipt'}
                          </span>
                        </td>
                        <td className={`py-4 px-6 text-right font-black text-sm ${po.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>{po.amount}</td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!po.isCancelled ? (
                              <>
                                {!isReceived && (
                                  <button 
                                    onClick={() => handleReceiveGoods(po)}
                                    disabled={submitting}
                                    title="Auto-fulfill: Adds stock to Inventory, logs Purchase Bill & updates Rate Book"
                                    className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5 border border-black"
                                  >
                                    <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Receive
                                  </button>
                                )}
                                <button onClick={() => handleEdit(po)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">Edit</button>
                                <button onClick={() => handleView(po)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">View</button>
                                <button onClick={() => handleDirectPrint(po)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">Print</button>
                                <button onClick={() => handleSendWhatsApp(po)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-1">
                                  WA
                                </button>
                                <button onClick={() => handleToggleCancel(po)} className="p-1.5 bg-white text-red-500 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg font-bold cursor-pointer transition-all shadow-sm opacity-0 group-hover:opacity-100">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => handleView(po)} className="px-3 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">View</button>
                                <button onClick={() => handleToggleCancel(po)} className="px-3 py-1.5 bg-zinc-900 text-white hover:bg-black border border-black rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">Restore</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col print:hidden font-['Inter',sans-serif]">
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Form View Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-6 mb-6 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {isReadOnly ? `Viewing PO ${poDetails.poNo}` : editingId ? `Edit PO ${poDetails.poNo}` : 'Create Purchase Order'}
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Automatic item price checks against Rate Book and destination site delivery syncing.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer bg-white px-5 py-2.5 rounded-lg border border-zinc-200 flex items-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to List
            </button>
            {isReadOnly && (
              <button onClick={() => window.print()} className="bg-zinc-900 text-white px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer hover:bg-black shadow-sm flex items-center gap-2 border border-black">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" />
                </svg>
                Print PDF
              </button>
            )}
          </div>
        </div>

        {/* Vendor Metadata Header (Autofills from Directory) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
          <div className="md:col-span-1 relative bg-white p-4 rounded-xl border border-zinc-200 shadow-sm" ref={vendorDropdownRef}>
            <div className="flex justify-between items-center mb-1.5">
              <label className={labelClass}>Vendor / Supplier Name <span className="text-red-500">*</span></label>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Auto-populates</span>
            </div>
            <input 
              disabled={isReadOnly} 
              type="text" 
              list="po-vendors-datalist"
              value={poDetails.vendorName} 
              onChange={handleVendorInputChange} 
              onFocus={() => {
                const matches = vendorsList.filter(v => v.name);
                setVendorSuggestions(matches);
                setShowVendorDropdown(matches.length > 0);
              }}
              className={`${inputClass} bg-zinc-50 ${errors.vendorName ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} 
              placeholder="Type or select supplier..." 
              autoComplete="off"
            />

            <datalist id="po-vendors-datalist">
              {vendorsList.map((v) => (
                <option key={v.id || v.name} value={v.name}>{v.gstin ? `GST: ${v.gstin}` : 'Unregistered'}</option>
              ))}
            </datalist>

            {showVendorDropdown && !isReadOnly && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl z-[120] max-h-64 overflow-y-auto">
                <div className="p-3 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50 sticky top-0 flex justify-between items-center">
                  <span>Registered Suppliers ({vendorSuggestions.length})</span>
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
            <input disabled={isReadOnly} type="text" value={poDetails.vendorGst} onChange={(e) => setPoDetails({...poDetails, vendorGst: e.target.value.toUpperCase()})} className={`${inputClass} font-mono uppercase bg-zinc-50`} maxLength={15} placeholder="Auto-filled from vendor record" />
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Vendor Operating Address</label>
            <input disabled={isReadOnly} type="text" value={poDetails.vendorAddress} onChange={(e) => setPoDetails({...poDetails, vendorAddress: e.target.value})} className={`${inputClass} bg-zinc-50`} placeholder="Supplier Address" />
          </div>
        </div>

        {/* PO Dates & Destination Project Autofill */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>PO Number <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={poDetails.poNo} onChange={(e) => { setPoDetails({...poDetails, poNo: e.target.value}); if(errors.poNo) setErrors({...errors, poNo: false}); }} className={`${inputClass} bg-zinc-50 font-bold text-zinc-900 ${errors.poNo ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} />
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>PO Date</label>
            <input disabled={isReadOnly} type="date" value={poDetails.date} onChange={(e) => setPoDetails({...poDetails, date: e.target.value})} className={`${inputClass} bg-zinc-50`} />
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Expected Delivery Date</label>
            <input disabled={isReadOnly} type="date" value={poDetails.expectedDelivery} onChange={(e) => setPoDetails({...poDetails, expectedDelivery: e.target.value})} className={`${inputClass} bg-zinc-50`} />
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Destination Project (Syncs Site Address)</label>
            <select
              disabled={isReadOnly}
              value={poDetails.projectId || poDetails.projectName}
              onChange={handleProjectSelect}
              className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
            >
              <option value="">Central Godown / Inventory</option>
              {projectsList.map(p => (
                <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Item Rows Table with Rate Book Suggestion Overlay */}
        <div className="mb-6 bg-white border border-zinc-200 rounded-xl shadow-sm shrink-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-white flex justify-between items-center">
            <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-widest">Procurement Items & Auto-Matched Material Rates</p>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Typing description shows Rate Book quotes</span>
          </div>
          <div className="overflow-x-visible">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-200">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[250px]">Item Description (Material)</th>
                  <th className="py-3 px-3 w-24 text-center">UOM</th>
                  <th className="py-3 px-4 w-28 text-center bg-zinc-100 text-zinc-700">Qty</th>
                  <th className="py-3 px-4 w-32 text-right">Rate (₹)</th>
                  <th className="py-3 px-4 w-32 text-right bg-zinc-50">Base Amt</th>
                  <th className="py-3 px-3 w-24 text-center">Tax %</th>
                  <th className="py-3 px-4 w-36 text-right bg-zinc-100 text-zinc-900">Total Amt</th>
                  {!isReadOnly && <th className="py-3 px-3 w-12"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item, index) => {
                  const rowCalc = calculateRow(item);
                  const tInp = "w-full border border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:bg-white bg-transparent focus:outline-none py-1.5 px-2 rounded text-xs transition-all font-medium text-zinc-900 placeholder-zinc-400 disabled:opacity-75 disabled:cursor-not-allowed";
                  
                  const itemSuggestions = materialRates.filter(m => item.description && m.materialName && m.materialName.toLowerCase().includes(item.description.toLowerCase()));
                  itemSuggestions.sort((a, b) => {
                    const aIsVendor = a.vendorName === poDetails.vendorName;
                    const bIsVendor = b.vendorName === poDetails.vendorName;
                    if (aIsVendor && !bIsVendor) return -1;
                    if (!aIsVendor && bIsVendor) return 1;
                    return (parseFloat(a.rate) || 0) - (parseFloat(b.rate) || 0);
                  });

                  return (
                    <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-2 px-4 text-center text-xs font-bold text-zinc-400">{index + 1}</td>
                      <td className="py-2 px-4 relative">
                        <textarea 
                          disabled={isReadOnly} 
                          placeholder="e.g. 18mm Century Plywood" 
                          value={item.description} 
                          onChange={(e) => {
                            updateItem(item.id, 'description', e.target.value);
                            setFocusedRowId(item.id);
                          }}
                          onFocus={() => setFocusedRowId(item.id)}
                          onBlur={() => setTimeout(() => setFocusedRowId(null), 200)}
                          className={`${tInp} resize-y min-h-[32px] block w-full leading-relaxed font-bold`} 
                          rows="1"
                          autoComplete="off"
                        />

                        {focusedRowId === item.id && itemSuggestions.length > 0 && !isReadOnly && (
                          <div className="absolute left-4 top-full mt-1 w-96 bg-white border border-zinc-200 rounded-xl shadow-2xl z-[150] max-h-60 overflow-y-auto">
                            <div className="p-3 border-b border-zinc-100 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-50 sticky top-0 flex justify-between items-center">
                              <span>Rate Book Quotes</span>
                              <span className="text-zinc-400 text-[8px]">Click to auto-fill</span>
                            </div>
                            {itemSuggestions.map((m, idx) => {
                              const isCurrentVendor = m.vendorName === poDetails.vendorName;
                              return (
                                <div
                                  key={idx}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectMaterial(item.id, m);
                                  }}
                                  className={`px-5 py-3 cursor-pointer flex flex-col transition-colors border-b border-zinc-100 last:border-none ${isCurrentVendor ? 'bg-zinc-100/90 hover:bg-zinc-200' : 'hover:bg-zinc-50'}`}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-xs text-zinc-900 tracking-tight">{m.materialName}</span>
                                    <span className="font-black text-zinc-900 text-xs">₹{m.rate} <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">/{m.unit}</span></span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className={`text-[9px] uppercase tracking-widest font-bold ${isCurrentVendor ? 'text-zinc-900' : 'text-zinc-400'}`}>
                                      {m.vendorName || 'Unknown Vendor'} {isCurrentVendor && '(Current Supplier)'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <select disabled={isReadOnly} value={item.uom} onChange={(e) => updateItem(item.id, 'uom', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.25rem_center] bg-[length:0.75rem_0.75rem] pr-6 font-bold text-zinc-700`}>
                          <option value="Nos">Nos</option><option value="Bags">Bags</option><option value="SqFt">SqFt</option><option value="Rft">Rft</option><option value="Cum">Cum</option><option value="Kgs">Kgs</option><option value="Ltrs">Ltrs</option><option value="Box">Box</option><option value="Roll">Roll</option><option value="LumpSum">LumpSum</option><option value="Pcs">Pcs</option>
                        </select>
                      </td>
                      <td className="py-2 px-4 bg-zinc-50/50">
                        <input disabled={isReadOnly} type="number" step="any" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} className={`${tInp} text-center font-black text-zinc-900 bg-white shadow-sm border-zinc-200`} placeholder="0" />
                      </td>
                      <td className="py-2 px-4">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">₹</span>
                          <input disabled={isReadOnly} type="number" step="any" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', e.target.value)} className={`${tInp} text-right pl-6 font-bold text-zinc-900`} placeholder="0.00" />
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right text-xs font-bold text-zinc-500 bg-zinc-50/30">₹ {rowCalc.baseAmount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
                      <td className="py-2 px-3">
                        <select disabled={isReadOnly} value={item.tax} onChange={(e) => updateItem(item.id, 'tax', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.25rem_center] bg-[length:0.75rem_0.75rem] pr-6 font-bold text-zinc-700`}>
                          <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                        </select>
                      </td>
                      <td className="py-2 px-4 text-right text-sm font-black text-zinc-900 bg-zinc-50/50">₹ {rowCalc.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
                      {!isReadOnly && (
                        <td className="py-2 px-3 text-center">
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
                Add Material Row
              </button>
            </div>
          )}
        </div>

        {/* Bottom Terms & Totals Deck */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0">
          <div className="flex-1 space-y-5">
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
              <label className={labelClass}>Shipping / Site Delivery Address</label>
              <textarea disabled={isReadOnly} value={poDetails.shippingAddress} onChange={(e) => setPoDetails({...poDetails, shippingAddress: e.target.value})} className={`${inputClass} bg-zinc-50 resize-y min-h-[60px] py-3`} rows="2"></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <label className={labelClass}>Internal Remarks / Dispatch Notes</label>
                <textarea disabled={isReadOnly} value={poDetails.description} onChange={(e) => setPoDetails({...poDetails, description: e.target.value})} className={`${inputClass} bg-zinc-50 resize-y min-h-[40px] py-3`} rows="2"></textarea>
              </div>
              <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <label className={labelClass}>Purchase Order Terms & Conditions</label>
                <textarea disabled={isReadOnly} value={poDetails.terms} onChange={(e) => setPoDetails({...poDetails, terms: e.target.value})} className={`${inputClass} bg-zinc-50 resize-none h-[110px] text-xs leading-relaxed`}></textarea>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[380px] flex flex-col justify-between">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-zinc-200 text-zinc-800 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Base Subtotal</span>
                <span className="font-bold text-zinc-900">₹ {totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Estimated GST (Input)</span>
                <span className="font-bold text-emerald-600">₹ {totals.totalTax.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="flex justify-between items-center text-xl font-black border-t-2 border-zinc-900 pt-4 mt-2">
                <span className="uppercase tracking-widest text-xs font-bold text-zinc-900">PO Grand Total</span>
                <span className="text-zinc-900">₹ {totals.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveOnly} disabled={submitting} className="flex-1 py-3.5 bg-white border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 text-zinc-900 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 shadow-sm">
                  {submitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button onClick={handleSaveAndPrint} disabled={submitting} className="flex-[1.5] py-3.5 bg-zinc-900 hover:bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 border border-black">
                  {submitting ? 'Saving...' : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      Save & Print
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRINT VIEW (A4 FORMAT) */}
      <div className="hidden print:block w-full bg-white text-zinc-900 font-['Inter',sans-serif] text-[11px] leading-tight print:p-0 print:m-0">
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
          
          @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { padding: 0 !important; background: white !important; font-family: 'Inter', sans-serif !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            img { mix-blend-mode: multiply !important; }
          }
        `}} />

        <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white">
          
          <div className="flex justify-between items-start border-b-2 border-black pb-5 mb-6">
            <div className="flex items-center gap-4">
              {companySettings?.logoUrl && <img src={companySettings.logoUrl} className="h-14 w-auto object-contain shrink-0" alt="Logo" />}
              <div>
                <h1 className="text-xl font-black tracking-tight text-black">{companySettings?.companyName || 'Company Name'}</h1>
                <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-0.5 max-w-[250px] font-medium leading-tight">{companySettings?.companyAddress}</p>
                <p className="text-[10px] text-zinc-800 mt-1 font-bold">
                  GSTIN: <span className="font-medium text-zinc-600 mr-2">{companySettings?.companyGst}</span> 
                  Phone: <span className="font-medium text-zinc-600">{companySettings?.companyPhone}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Purchase Order</span>
              <h2 className="text-xl font-black text-black tracking-tight">{poDetails.poNo || 'PO-000'}</h2>
              <p className="text-[10px] font-bold text-zinc-800 mt-1">Date: <span className="font-medium text-zinc-600">{poDetails.date}</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 pb-4 border-b border-zinc-200">
            <div>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">To (Vendor / Supplier)</span>
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">{poDetails.vendorName || 'Vendor Name'}</h3>
              <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-1 leading-relaxed font-medium">{poDetails.vendorAddress}</p>
              {poDetails.vendorGst && <p className="text-[10px] text-zinc-800 font-bold mt-1.5">GSTIN: <span className="font-medium text-zinc-600">{poDetails.vendorGst.toUpperCase()}</span></p>}
            </div>
            <div className="text-right space-y-1">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Delivery Details</span>
              {poDetails.expectedDelivery && <p className="text-[10px] text-zinc-800 font-bold">Expected By: <span className="font-medium text-zinc-600">{poDetails.expectedDelivery}</span></p>}
              {poDetails.projectName && <p className="text-[10px] text-zinc-800 font-bold mt-2">Project Site: <span className="font-medium text-zinc-900">{poDetails.projectName}</span></p>}
              <p className="text-[10px] text-zinc-800 font-bold mt-2">Ship To:<br/><span className="font-medium text-zinc-600 whitespace-pre-wrap leading-tight block mt-0.5">{poDetails.shippingAddress}</span></p>
            </div>
          </div>

          <table className="w-full text-left border-collapse mb-8 border border-zinc-300">
            <thead>
              <tr className="bg-zinc-100 text-zinc-900 text-[9px] uppercase tracking-widest font-bold border-b-2 border-zinc-300">
                <th className="py-2.5 px-3 text-center w-8 border-r border-zinc-300">#</th>
                <th className="py-2.5 px-4 border-r border-zinc-300">Material / Description</th>
                <th className="py-2.5 px-3 text-center w-12 border-r border-zinc-300 bg-white">Qty</th>
                <th className="py-2.5 px-2 text-center w-12 border-r border-zinc-300">UOM</th>
                <th className="py-2.5 px-3 text-right w-20 border-r border-zinc-300">Unit Rate</th>
                <th className="py-2.5 px-2 text-center w-12 border-r border-zinc-300">Tax</th>
                <th className="py-2.5 px-4 text-right w-28 bg-white">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-[10px] font-medium text-zinc-900">
              {items.map((item, index) => {
                const row = calculateRow(item);
                if (!item.description) return null;
                
                return (
                  <tr key={item.id} className="break-inside-avoid even:bg-zinc-50/50">
                    <td className="py-3 px-3 text-center text-zinc-500 font-bold border-r border-zinc-200">{index + 1}</td>
                    <td className="py-3 px-4 font-bold border-r border-zinc-200">{item.description}</td>
                    <td className="py-3 px-3 text-center font-bold bg-zinc-50/50 border-r border-zinc-200">{parseFloat(item.qty || 0).toLocaleString()}</td>
                    <td className="py-3 px-2 text-center text-zinc-600 border-r border-zinc-200">{item.uom}</td>
                    <td className="py-3 px-3 text-right border-r border-zinc-200">₹{parseFloat(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    <td className="py-3 px-2 text-center text-zinc-500 border-r border-zinc-200">{item.tax}%</td>
                    <td className="py-3 px-4 text-right font-black bg-zinc-50/50">₹{row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between items-start mb-10">
            <div className="w-1/2 pr-6 pt-2">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Total in Words</span>
              <p className="text-[11px] font-bold text-zinc-900 capitalize leading-relaxed bg-zinc-50 p-3 rounded border border-zinc-200">{numberToWords(totals.grandTotal)}</p>
            </div>
            
            <div className="w-72 space-y-2 text-[11px] text-zinc-900 bg-zinc-50 p-4 rounded border border-zinc-200">
              <div className="flex justify-between font-bold text-zinc-600">
                <span className="uppercase tracking-widest text-[9px]">Base Total:</span>
                <span>₹{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex justify-between font-bold text-zinc-600 border-b border-zinc-300 pb-2">
                <span className="uppercase tracking-widest text-[9px]">Estimated Tax:</span>
                <span>₹{totals.totalTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
              
              <div className="flex justify-between font-black pt-1 text-sm">
                <span className="uppercase tracking-widest text-[10px]">Grand Total:</span>
                <span>₹{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 text-[10px] break-inside-avoid">
            <div className="space-y-6">
              {companySettings?.showTermsOnPdf !== false && poDetails.terms && (
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Terms & Conditions</span>
                  <p className="whitespace-pre-wrap text-zinc-700 leading-relaxed font-medium">{poDetails.terms}</p>
                </div>
              )}

              {companySettings?.showRemarksOnPdf !== false && poDetails.description && (
                <div>
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Remarks / Notes</span>
                  <p className="text-zinc-900 font-medium leading-relaxed bg-zinc-50 p-3 rounded border border-zinc-200">{poDetails.description}</p>
                </div>
              )}
            </div>

            {companySettings?.showSignatoryOnPdf !== false && (
              <div className="flex flex-col items-end justify-end text-right pt-4">
                {companySettings?.showSignatureImage && companySettings?.signatureUrl ? (
                  <img src={companySettings.signatureUrl} alt="Signature" className="h-20 w-auto object-contain mb-3 mix-blend-multiply" />
                ) : <div className="h-20"></div>}
                <div className="border-t-2 border-black pt-2 w-56">
                  <p className="font-black text-black">For {companySettings?.companyName}</p>
                  <p className="text-[9px] text-zinc-500 mt-1 uppercase tracking-widest font-bold">Authorized Signatory</p>
                </div>
              </div>
            )}
          </div>

          {companySettings?.pdfFooterDisclaimer && (
            <div className="mt-10 pt-3 border-t border-zinc-300 text-center w-full">
              <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-widest">
                {companySettings.pdfFooterDisclaimer}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}