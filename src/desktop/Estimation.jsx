import React, { useState, useEffect, useRef } from 'react';
import { 
  getEstimations, 
  saveEstimation, 
  deleteEstimation,
  getProjects,
  saveProject,
  getLeads,
  saveClientWorkOrder,
  saveMilestone,
  savePurchaseOrder,
  getMaterialRates
} from '../db';
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

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = inWords(integerPart) + 'Rupees ';
  if (decimalPart > 0) {
    result += 'and ' + inWords(decimalPart) + 'Paise ';
  }
  return result.trim() + ' Only';
}

export default function Estimation({ companySettings = {}, updateDirtyState }) {
  const [currentView, setCurrentView] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [estimationsList, setEstimationsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Automated Cross-Module Reference Data
  const [crmLeads, setCrmLeads] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [materialRates, setMaterialRates] = useState([]);
  const [focusedRowId, setFocusedRowId] = useState(null);

  // Client Autocomplete State
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const clientDropdownRef = useRef(null);

  const [taxMode, setTaxMode] = useState('CGST_SGST');

  const [estimateDetails, setEstimateDetails] = useState({
    partyName: '', 
    partyAddress: '', 
    partyPhone: '',
    partyEmail: '',
    projectName: '', 
    estimateNo: '', 
    date: new Date().toISOString().split('T')[0], 
    validUntil: '', 
    description: '', 
    terms: companySettings.defaultEstimateTerms || '1. 50% Mobilization advance upon contract booking.\n2. 40% against material delivery at site.\n3. 10% upon final joint inspection and hand-over.', 
    bankName: companySettings.bankName || '', 
    accountName: companySettings.accountName || '', 
    accountNo: companySettings.accountNo || '', 
    ifscCode: companySettings.ifscCode || '', 
    discount: ''
  });

  const [items, setItems] = useState([
    { id: 1, description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: companySettings.defaultGstRate || 18 },
  ]);

  const [errors, setErrors] = useState({});

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [estData, leadsData, projsData, ratesData] = await Promise.all([
        getEstimations(),
        getLeads ? getLeads() : Promise.resolve([]),
        getProjects ? getProjects() : Promise.resolve([]),
        getMaterialRates ? getMaterialRates() : Promise.resolve([])
      ]);
      setEstimationsList(estData || []);
      setCrmLeads(leadsData || []);
      setProjectsList((projsData || []).filter(p => p.status !== 'Completed'));
      setMaterialRates(ratesData || []);
    } catch (e) {
      console.error("Error loading estimations data:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Sync Company Settings
  useEffect(() => {
    if (!editingId && currentView === 'form') {
      setEstimateDetails(prev => ({
        ...prev,
        bankName: companySettings.bankName || prev.bankName,
        accountName: companySettings.accountName || prev.accountName,
        accountNo: companySettings.accountNo || prev.accountNo,
        ifscCode: companySettings.ifscCode || prev.ifscCode,
        terms: prev.terms || companySettings.defaultEstimateTerms || ''
      }));
    }
  }, [companySettings, editingId, currentView]);

  // Click Outside Client Autocomplete Dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Offline Draft Auto-Save
  useEffect(() => {
    if (currentView === 'form' && !editingId) {
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        const draftData = { estimateDetails, items, taxMode };
        localStorage.setItem('jyanipur_desktop_estimate_draft', JSON.stringify(draftData));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [estimateDetails, items, taxMode, currentView, editingId]);

  const generateNextEstimateNo = () => {
    const prefix = companySettings.estimatePrefix || 'EST/FY26-27/';
    let maxNum = 0;
    estimationsList.forEach(est => {
      if (est.estimateNo && est.estimateNo.startsWith(prefix)) {
        const numStr = est.estimateNo.replace(prefix, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  };

  // --- AUTOMATION 1: CRM & PROJECT AUTO-FILL ON TYPING CLIENT ---
  const handleClientInputChange = (e) => {
    const val = e.target.value;
    setEstimateDetails(prev => ({ ...prev, partyName: val }));
    if (errors.partyName) setErrors(prev => ({ ...prev, partyName: false }));

    if (val.trim().length > 0) {
      // Search leads and existing project clients
      const leadMatches = crmLeads.filter(l => (l.clientName || l.name || '').toLowerCase().includes(val.toLowerCase()));
      const projMatches = projectsList.filter(p => (p.clientName || '').toLowerCase().includes(val.toLowerCase()));
      
      const combined = [
        ...leadMatches.map(l => ({ name: l.clientName || l.name, address: l.address || l.siteAddress || '', phone: l.phone || '', email: l.email || '', project: l.projectType || '' })),
        ...projMatches.map(p => ({ name: p.clientName, address: p.clientAddress || '', phone: p.clientPhone || '', email: p.clientEmail || '', project: p.name || p.projectName }))
      ];

      // Remove duplicates by name
      const unique = Array.from(new Map(combined.map(item => [item.name.toLowerCase(), item])).values());
      setClientSuggestions(unique);
      setShowClientDropdown(unique.length > 0);
    } else {
      setShowClientDropdown(false);
    }
  };

  const handleSelectClient = (c) => {
    setEstimateDetails(prev => ({
      ...prev,
      partyName: c.name,
      partyAddress: c.address || prev.partyAddress,
      partyPhone: c.phone || prev.partyPhone,
      partyEmail: c.email || prev.partyEmail,
      projectName: c.project || prev.projectName || `${c.name} Project`
    }));
    setShowClientDropdown(false);
  };

  // --- AUTOMATION 2: RATE BOOK LIVE BENCHMARK FILL ---
  const handleSelectMaterialRate = (rowId, mat) => {
    setItems(items.map(item => item.id === rowId ? {
      ...item,
      description: mat.materialName,
      unit: mat.unit || item.unit,
      rate: mat.rate || ''
    } : item));
    setFocusedRowId(null);
  };

  const addItem = () => setItems([...items, { id: Date.now(), description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: 18 }]);
  
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

  const finalAmount = totals.grandTotal - (parseFloat(estimateDetails.discount) || 0);

  const saveEstimationToState = async () => {
    const newErrors = {};
    if (!estimateDetails.partyName) newErrors.partyName = true;
    if (!estimateDetails.estimateNo) newErrors.estimateNo = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Please fill required fields: Client Name & Estimate No.');
      return false;
    }
    setErrors({});
    const existingEst = estimationsList.find(e => e.id === editingId);
    const record = {
      id: editingId || undefined,
      date: estimateDetails.date,
      estimateNo: estimateDetails.estimateNo,
      clientName: estimateDetails.partyName,
      client: estimateDetails.partyName,
      clientPhone: estimateDetails.partyPhone,
      clientEmail: estimateDetails.partyEmail,
      projectName: estimateDetails.projectName,
      partyAddress: estimateDetails.partyAddress,
      validUntil: estimateDetails.validUntil,
      taxMode: taxMode,
      items: items,
      bankName: estimateDetails.bankName,
      accountName: estimateDetails.accountName,
      accountNo: estimateDetails.accountNo,
      ifscCode: estimateDetails.ifscCode,
      terms: estimateDetails.terms,
      description: estimateDetails.description,
      discount: estimateDetails.discount,
      totalAmount: finalAmount > 0 ? finalAmount : 0,
      amount: '₹ ' + (finalAmount > 0 ? finalAmount : 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      status: existingEst ? existingEst.status : 'Pending',
      isCancelled: false
    };

    setSubmitting(true);
    try {
      await saveEstimation(record);
      await loadAllData();
      localStorage.removeItem('jyanipur_desktop_estimate_draft');
      setSubmitting(false);
      return true;
    } catch (err) {
      console.error("Error saving estimation to cloud:", err);
      alert("Error saving estimation. Please check database connection.");
      setSubmitting(false);
      return false;
    }
  };

  const handleSaveOnly = async () => {
    if (await saveEstimationToState()) {
      alert(`Estimation ${estimateDetails.estimateNo} saved!`);
      setCurrentView('list');
      setEditingId(null);
    }
  };

  const handleSaveAndPrint = async () => {
    if (await saveEstimationToState()) {
      setTimeout(() => window.print(), 100);
    }
  };

  // --- AUTOMATION 3: 1-CLICK CONVERT ESTIMATE TO ACTIVE PROJECT + CLIENT WORK ORDER + MILESTONES ---
  const handleAutoConvertFullPipeline = async (est) => {
    if (!window.confirm(`Convert Estimation ${est.estimateNo} into an Active Project, Client Contract, and Payment Milestones?`)) return;

    setSubmitting(true);
    try {
      const contractValue = parseFloat(est.totalAmount || est.amount?.replace(/[^0-9.-]+/g, '')) || 0;
      const projectName = est.projectName || `${est.client || est.clientName} Turnkey Project`;

      // 1. Auto-create Active Project entity
      let projectRecord = projectsList.find(p => (p.name || '').toLowerCase() === projectName.toLowerCase());
      if (!projectRecord && saveProject) {
        projectRecord = await saveProject({
          name: projectName,
          clientName: est.client || est.clientName,
          clientAddress: est.partyAddress || '',
          clientPhone: est.clientPhone || '',
          clientEmail: est.clientEmail || '',
          budget: contractValue,
          status: 'Active',
          poDate: new Date().toISOString().split('T')[0]
        });
      }

      const linkedProjectId = projectRecord ? (projectRecord.id || projectRecord._id) : Date.now();

      // 2. Auto-generate Official Client Work Order with line-item scope
      if (saveClientWorkOrder) {
        await saveClientWorkOrder({
          woType: 'Client',
          woNo: `WO/${est.estimateNo ? est.estimateNo.replace(/[^0-9A-Z]/gi, '') : Date.now().toString().slice(-4)}`,
          date: new Date().toISOString().split('T')[0],
          projectId: linkedProjectId,
          projectName: projectName,
          clientName: est.client || est.clientName,
          clientAddress: est.partyAddress || '',
          clientPhone: est.clientPhone || '',
          targetCompletion: est.validUntil || '',
          scopeOfWork: `Turnkey architectural execution as per approved Estimation #${est.estimateNo}.\n${est.description || ''}`,
          items: (est.items || []).map((item, idx) => ({
            id: Date.now() + idx,
            room: item.unit ? `${item.unit} Scope` : 'General Scope',
            description: item.description,
            qty: parseFloat(item.qty) || 1,
            rate: parseFloat(item.rate) || 0,
            amount: (parseFloat(item.qty) || 1) * (parseFloat(item.rate) || 0)
          })),
          totalAmount: contractValue,
          terms: est.terms || companySettings.defaultEstimateTerms || ''
        });
      }

      // 3. Auto-generate 3-Stage Payment Milestones in Project Control
      if (saveMilestone && contractValue > 0) {
        const today = new Date();
        const d1 = new Date(today); d1.setDate(d1.getDate() + 7);
        const d2 = new Date(today); d2.setDate(d2.getDate() + 30);
        const d3 = new Date(today); d3.setDate(d3.getDate() + 60);

        await saveMilestone({
          projectId: linkedProjectId,
          projectName: projectName,
          stageName: '1. Booking & Mobilization Advance',
          percentage: 50,
          amount: contractValue * 0.5,
          dueDate: d1.toISOString().split('T')[0],
          status: 'Pending',
          notes: '50% advance for raw material mobilization and site survey'
        });

        await saveMilestone({
          projectId: linkedProjectId,
          projectName: projectName,
          stageName: '2. Material Delivery & Structural Framework',
          percentage: 40,
          amount: contractValue * 0.4,
          dueDate: d2.toISOString().split('T')[0],
          status: 'Pending',
          notes: '40% milestone upon plywood, electrical, and hardware arrival'
        });

        await saveMilestone({
          projectId: linkedProjectId,
          projectName: projectName,
          stageName: '3. Final Snag Clearance & Handover',
          percentage: 10,
          amount: contractValue * 0.1,
          dueDate: d3.toISOString().split('T')[0],
          status: 'Pending',
          notes: '10% final retention released upon joint client walkthrough'
        });
      }

      // 4. Update Estimate Status to "Accepted"
      await saveEstimation({
        ...est,
        status: 'Accepted'
      });

      await loadAllData();
      alert(`Automated Pipeline Execution Complete!\n\n1. Project Activated: "${projectName}"\n2. Client Work Order Contract Drafted\n3. 3-Stage Milestone Billing Schedule Created (50% / 40% / 10%)\n4. Estimate marked "Accepted"`);
    } catch (err) {
      console.error("Pipeline conversion error:", err);
      alert("Failed to convert estimation. Please check database configuration.");
    }
    setSubmitting(false);
  };

  // --- AUTOMATION 4: 1-CLICK DRAFT PROCUREMENT PURCHASE ORDERS ---
  const handleAutoDraftProcurementPO = async (est) => {
    if (!est.items || est.items.length === 0) {
      alert("No line items found in this estimation to order.");
      return;
    }

    if (!window.confirm(`Generate a Draft Procurement Purchase Order from the materials listed in Estimation ${est.estimateNo}?`)) return;

    setSubmitting(true);
    try {
      const poPrefix = companySettings.poPrefix || 'PO/2026/';
      const generatedPoNo = `${poPrefix}${Date.now().toString().slice(-4)}`;

      if (savePurchaseOrder) {
        await savePurchaseOrder({
          vendorName: 'Supplier To Be Assigned',
          vendorAddress: '',
          vendorGst: '',
          poNo: generatedPoNo,
          date: new Date().toISOString().split('T')[0],
          expectedDelivery: '',
          projectName: est.projectName || `${est.client || est.clientName} Site`,
          shippingAddress: est.partyAddress || companySettings.companyAddress || 'Site Delivery',
          items: est.items.map((item, idx) => ({
            id: Date.now() + idx,
            description: item.description,
            uom: item.unit || 'Nos',
            qty: parseFloat(item.qty) || 1,
            rate: parseFloat(item.rate) || 0,
            tax: 18
          })),
          terms: companySettings.defaultPOTerms || '',
          description: `Auto-drafted procurement requisition from BOQ #${est.estimateNo}`,
          amount: '₹ ' + (totals.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          status: 'Pending'
        });
      }

      alert(`Procurement Draft Created!\n\nPurchase Order #${generatedPoNo} initialized in Purchase Orders with ${est.items.length} bill of material items.`);
    } catch (err) {
      console.error("Error creating procurement PO:", err);
      alert("Failed to draft Purchase Order.");
    }
    setSubmitting(false);
  };

  const handleConvertToInvoice = (est) => {
    const invoiceDraft = {
      partyName: est.client || est.clientName || '',
      partyAddress: est.partyAddress || '',
      projectName: est.projectName || '',
      date: new Date().toISOString().split('T')[0],
      poRef: est.estimateNo || '', 
      description: `Billed as per approved quotation #${est.estimateNo}.\n${est.description || ''}`,
      bankName: est.bankName || '',
      accountName: est.accountName || '',
      accountNo: est.accountNo || '',
      ifscCode: est.ifscCode || '',
      discount: est.discount || '',
      terms: est.terms || ''
    };
    localStorage.setItem('draft_invoiceDetails', JSON.stringify(invoiceDraft));
    localStorage.setItem('draft_items', JSON.stringify(est.items || []));
    localStorage.setItem('draft_taxMode', est.taxMode || 'CGST_SGST');
    alert('Estimate transferred! Opening Tax Invoice creator...');
    // If routing isn't automatic, this notifies user of clipboard/storage bridge
  };

  const handleSendWhatsApp = (est) => {
    const template = companySettings.waInvoiceTemplate || 'Hello, please find our official quotation attached.';
    const finalMessage = `${template}\n\n*Estimation Ref:* ${est.estimateNo || 'EST'}\n*Client:* ${est.client || est.clientName}\n*Amount:* ${est.amount || '0'}\n*Company:* ${companySettings.companyName || 'Jyanipur Interiors'}`;
    sendWhatsAppMessage(est.clientPhone || '', finalMessage);
  };

  const handleEdit = (est) => {
    setEditingId(est.id);
    setTaxMode(est.taxMode || 'CGST_SGST');
    setEstimateDetails({
      partyName: est.client || est.clientName || '',
      partyPhone: est.clientPhone || '',
      partyEmail: est.clientEmail || '',
      projectName: est.projectName || '',
      partyAddress: est.partyAddress || '',
      date: est.date || new Date().toISOString().split('T')[0],
      estimateNo: est.estimateNo || '',
      validUntil: est.validUntil || '',
      description: est.description || '',
      terms: est.terms || '',
      bankName: est.bankName || companySettings.bankName || '',
      accountName: est.accountName || companySettings.accountName || '',
      accountNo: est.accountNo || companySettings.accountNo || '',
      ifscCode: est.ifscCode || companySettings.ifscCode || '',
      discount: est.discount || ''
    });
    setItems(est.items && est.items.length > 0 ? est.items : [{ id: 1, description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: 18 }]);
    setCurrentView('form');
  };

  const handleView = (est) => {
    handleEdit(est);
    setCurrentView('view');
  };

  const handleDirectPrint = (est) => {
    handleEdit(est);
    setTimeout(() => window.print(), 150);
  };

  const handleDuplicate = async (est) => {
    const newEst = { 
      ...est, 
      id: undefined, 
      estimateNo: generateNextEstimateNo(), 
      date: new Date().toISOString().split('T')[0],
      status: 'Pending', 
      isCancelled: false
    };
    setLoading(true);
    try {
      await saveEstimation(newEst);
      await loadAllData();
      alert(`Estimate duplicated as ${newEst.estimateNo}!`);
    } catch (e) {
      alert("Failed to duplicate estimate.");
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const est = estimationsList.find(e => e.id === id);
    if (!est) return;
    const updated = { ...est, status: newStatus };
    await saveEstimation(updated);
    await loadAllData();
  };

  const handleClear = (askConfirm = true) => {
    if (!askConfirm || window.confirm('Clear the entire estimation form?')) {
      if (!askConfirm) {
        const savedDraft = localStorage.getItem('jyanipur_desktop_estimate_draft');
        if (savedDraft) {
          if (window.confirm('You have an unsaved draft estimate. Do you want to restore it?')) {
            try {
              const parsed = JSON.parse(savedDraft);
              setEstimateDetails(parsed.estimateDetails);
              setItems(parsed.items);
              setTaxMode(parsed.taxMode || 'CGST_SGST');
              setEditingId(null);
              setErrors({});
              return;
            } catch (e) {
              console.error("Failed to restore draft:", e);
            }
          } else {
            localStorage.removeItem('jyanipur_desktop_estimate_draft');
          }
        }
      }
      setEditingId(null);
      setEstimateDetails({ 
        partyName: '', 
        partyAddress: '', 
        partyPhone: '',
        partyEmail: '',
        projectName: '', 
        date: new Date().toISOString().split('T')[0], 
        estimateNo: generateNextEstimateNo(),
        validUntil: '', 
        description: '', 
        terms: companySettings.defaultEstimateTerms || '1. 50% Mobilization advance upon contract booking.\n2. 40% against material delivery at site.\n3. 10% upon final hand-over.', 
        bankName: companySettings.bankName || '', 
        accountName: companySettings.accountName || '', 
        accountNo: companySettings.accountNo || '', 
        ifscCode: companySettings.ifscCode || '', 
        discount: '' 
      });
      setItems([{ id: 1, description: '', unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', qty: '', rate: '', gst: 18 }]);
      setErrors({});
    }
  };

  const handleExport = () => {
    const exportData = estimationsList.map(e => ({
      'Estimate No': e.estimateNo,
      'Date': e.date,
      'Client': e.client || e.clientName,
      'Project': e.projectName,
      'Total Amount': e.totalAmount || e.amount,
      'Status': e.status || 'Pending'
    }));
    exportToCSV('Jyanipur_Estimations', exportData);
  };

  const filteredEstimations = estimationsList.filter(est => {
    const matchesSearch = !searchQuery.trim() || 
      (est.client || est.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (est.estimateNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (est.projectName || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || est.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPipelineValue = estimationsList.reduce((sum, e) => sum + (parseFloat(e.totalAmount) || 0), 0);
  const convertedValue = estimationsList
    .filter(e => e.status === 'Accepted')
    .reduce((sum, e) => sum + (parseFloat(e.totalAmount) || 0), 0);

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all disabled:opacity-75 disabled:cursor-not-allowed shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  if (currentView === 'list') {
    return (
      <div className="w-full h-full font-['Inter',sans-serif] flex flex-col print:hidden">
        
        {/* Header Controls */}
        <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Estimations & BOQs</h2>
            <p className="text-zinc-500 text-sm mt-1 font-medium">Draft detailed scope of work, lookup rate book prices, and auto-convert won bids into Projects and Contracts.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center h-10 bg-white border border-zinc-200 rounded-lg px-3.5 shadow-sm w-full md:w-auto focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
              <svg className="w-4 h-4 text-zinc-400 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search estimate, client, project..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="bg-transparent border-none text-xs font-medium text-zinc-900 outline-none w-full md:w-56 placeholder:text-zinc-400" 
              />
            </div>

            <button 
              onClick={handleExport}
              className="h-10 bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>

            <button 
              onClick={() => { handleClear(false); setCurrentView('form'); }}
              className="h-10 bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center gap-2 border border-black"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Estimate
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-6 shrink-0">
          <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Estimations</span>
            <p className="text-3xl font-black text-zinc-900 tracking-tight">{estimationsList.length}</p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Total Pipeline Value</span>
            <p className="text-2xl font-black text-zinc-900 tracking-tight">₹ {totalPipelineValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl shadow-sm flex flex-col justify-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-2">Won / Converted</span>
            <p className="text-2xl font-black text-emerald-800 tracking-tight">₹ {convertedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-zinc-900 border border-black p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden">
            <svg className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2 relative z-10">Active Win Rate</span>
            <p className="text-3xl font-black text-white tracking-tight relative z-10">
              {estimationsList.length === 0 ? '0%' : `${Math.round((estimationsList.filter(e => e.status === 'Accepted').length / estimationsList.length) * 100)}%`}
            </p>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 mb-4 p-1 bg-zinc-100 rounded-lg w-fit shrink-0 border border-zinc-200">
          {['All', 'Pending', 'Accepted', 'Rejected'].map(filter => (
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

        {/* Estimates Table */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-200 sticky top-0 z-10">
                  <th className="py-4 px-6 w-36">Date</th>
                  <th className="py-4 px-6 w-44">Estimate No.</th>
                  <th className="py-4 px-6">Client & Project</th>
                  <th className="py-4 px-6 w-40 text-center">Status</th>
                  <th className="py-4 px-6 text-right w-44">Total Quotation</th>
                  <th className="py-4 px-6 text-right w-80">Actions & Automation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-zinc-400 font-medium text-xs">
                      Syncing estimations from cloud database...
                    </td>
                  </tr>
                ) : filteredEstimations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 border border-zinc-200">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-zinc-500 font-medium text-xs">No estimations found matching this filter.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredEstimations.map((est) => (
                    <tr 
                      key={est.id || est.estimateNo} 
                      className={`transition-all ${est.isCancelled ? 'bg-red-50/20 opacity-60' : 'hover:bg-zinc-50/50 group'}`}
                    >
                      <td className={`py-4 px-6 text-xs font-bold uppercase tracking-widest ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-500'}`}>
                        {est.date}
                      </td>
                      <td className={`py-4 px-6 font-bold text-xs tracking-tight ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                        {est.estimateNo}
                      </td>
                      <td className="py-4 px-6">
                        <p className={`font-bold text-sm tracking-tight ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                          {est.client || est.clientName}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest mt-0.5">
                          {est.projectName || 'General Site'}
                        </p>
                      </td>
                      
                      <td className="py-4 px-6 text-center">
                        <select
                          value={est.status || 'Pending'}
                          onChange={(e) => handleStatusChange(est.id, e.target.value)}
                          disabled={est.isCancelled}
                          className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.5rem_center] bg-[length:0.75rem_0.75rem] pr-6 pl-2.5 py-1 rounded-md border outline-none cursor-pointer transition-all font-bold text-[9px] uppercase tracking-widest ${
                            est.isCancelled ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed' :
                            est.status === 'Accepted' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            est.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-zinc-100 text-zinc-700 border-zinc-300'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>

                      <td className={`py-4 px-6 font-black text-sm text-right ${est.isCancelled ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
                        {est.amount || `₹ ${(Number(est.totalAmount) || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}`}
                      </td>
                      
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!est.isCancelled ? (
                            <>
                              {/* 1-CLICK PIPELINE CONVERSION AUTOMATION */}
                              {est.status !== 'Accepted' && (
                                <button 
                                  onClick={() => handleAutoConvertFullPipeline(est)}
                                  disabled={submitting}
                                  title="1-Click: Creates Active Project, Client Contract & 3-Stage Milestone Schedule"
                                  className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5 border border-black"
                                >
                                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Convert
                                </button>
                              )}

                              <button 
                                onClick={() => handleAutoDraftProcurementPO(est)}
                                disabled={submitting}
                                title="Drafts a Purchase Order from these BOQ items in Purchase Orders"
                                className="px-2.5 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm"
                              >
                                Draft PO
                              </button>

                              <button onClick={() => handleEdit(est)} title="Edit Estimate" className="px-2.5 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm">
                                Edit
                              </button>
                              
                              <button onClick={() => handleView(est)} title="View Detail" className="px-2.5 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm">
                                View
                              </button>

                              <button onClick={() => handleDirectPrint(est)} title="Print or Save PDF" className="px-2.5 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm">
                                Print
                              </button>

                              <button onClick={() => handleSendWhatsApp(est)} title="Share via WhatsApp" className="px-2.5 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm flex items-center gap-1">
                                WA
                              </button>

                              <button onClick={() => handleConvertToInvoice(est)} title="Transfer directly to Tax Invoice editor" className="px-2.5 py-1.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm">
                                Invoice
                              </button>

                              <button onClick={() => handleDuplicate(est)} title="Duplicate Estimate" className="px-2.5 py-1.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white border border-zinc-200 rounded-lg font-bold cursor-pointer text-[9px] uppercase tracking-widest transition-all shadow-sm">
                                Copy
                              </button>
                            </>
                          ) : (
                            <button onClick={() => handleStatusChange(est.id, 'Pending')} className="px-3 py-1.5 bg-zinc-900 text-white hover:bg-black border border-black rounded-lg font-bold cursor-pointer text-[10px] uppercase tracking-widest transition-all shadow-sm">
                              Restore
                            </button>
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

  const isReadOnly = currentView === 'view';

  return (
    <div className="w-full h-full font-['Inter',sans-serif] flex flex-col print:block print:h-auto print:overflow-visible">
      
      {/* SCREEN FORM VIEW (HIDDEN ON PRINT) */}
      <div className="print:hidden flex-1 flex flex-col min-h-0 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-6 mb-6 shrink-0">
          
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">
              {isReadOnly ? `Viewing Estimate ${estimateDetails.estimateNo}` : editingId ? `Edit Estimate ${estimateDetails.estimateNo}` : 'New Estimation / BOQ'}
            </h2>
            
            {/* AUTO SAVE INDICATOR */}
            {!isReadOnly && currentView === 'form' && !editingId && (
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest ml-4 bg-zinc-100 px-3 py-1 rounded-md border border-zinc-200 shadow-sm">
                {saveStatus === 'saving' && <span className="text-zinc-600 flex items-center gap-1.5"><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Saving Draft...</span>}
                {saveStatus === 'saved' && <span className="text-emerald-700 flex items-center gap-1.5"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg> Draft Saved Locally</span>}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={() => { setCurrentView('list'); handleClear(false); }} className="text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer bg-white px-5 py-2.5 rounded-lg border border-zinc-200 shadow-sm">
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

        {/* TOP METADATA INPUTS (WITH CRM & PROJECT AUTO-FILL) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm relative" ref={clientDropdownRef}>
            <div className="flex justify-between items-center mb-1.5">
              <label className={labelClass}>Client Name <span className="text-red-500">*</span></label>
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">CRM Match</span>
            </div>
            <input 
              disabled={isReadOnly} 
              type="text" 
              value={estimateDetails.partyName} 
              onChange={handleClientInputChange} 
              className={`${inputClass} bg-zinc-50 font-bold ${errors.partyName ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} 
              placeholder="Type client or lead name..." 
              autoComplete="off"
            />

            {showClientDropdown && !isReadOnly && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl z-[120] max-h-56 overflow-y-auto">
                <div className="p-3 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50">Saved Contacts & Projects</div>
                {clientSuggestions.map((c, idx) => (
                  <div 
                    key={idx} 
                    onMouseDown={(e) => { e.preventDefault(); handleSelectClient(c); }} 
                    className="px-5 py-3 hover:bg-zinc-50 cursor-pointer border-b border-zinc-100 last:border-none"
                  >
                    <p className="font-bold text-xs text-zinc-900 tracking-tight">{c.name}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{c.project || c.address || c.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Project / Site Name</label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.projectName} onChange={(e) => setEstimateDetails({...estimateDetails, projectName: e.target.value})} className={`${inputClass} bg-zinc-50 font-medium`} placeholder="e.g. Kondapur 3BHK Residence" />
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Site Delivery / Execution Address</label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.partyAddress} onChange={(e) => setEstimateDetails({...estimateDetails, partyAddress: e.target.value})} className={`${inputClass} bg-zinc-50`} placeholder="Street, City, Pincode" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Estimate No. <span className="text-red-500">*</span></label>
            <input disabled={isReadOnly} type="text" value={estimateDetails.estimateNo} onChange={(e) => { setEstimateDetails({...estimateDetails, estimateNo: e.target.value}); if(errors.estimateNo) setErrors({...errors, estimateNo: false}); }} className={`${inputClass} bg-zinc-50 font-bold text-zinc-900 ${errors.estimateNo ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/20' : ''}`} placeholder="e.g. EST-001" />
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Estimate Issue Date</label>
            <input disabled={isReadOnly} type="date" value={estimateDetails.date} onChange={(e) => setEstimateDetails({...estimateDetails, date: e.target.value})} className={`${inputClass} bg-zinc-50`} />
          </div>
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Proposal Valid Until</label>
            <input disabled={isReadOnly} type="date" value={estimateDetails.validUntil} onChange={(e) => setEstimateDetails({...estimateDetails, validUntil: e.target.value})} className={`${inputClass} bg-zinc-50`} />
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <label className={labelClass}>Tax Computation</label>
            <select 
              disabled={isReadOnly}
              value={taxMode} 
              onChange={(e) => setTaxMode(e.target.value)}
              className={`${inputClass} bg-zinc-50 cursor-pointer font-bold text-zinc-900 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
            >
              <option value="CGST_SGST">CGST + SGST (Intra-State: 9% + 9%)</option>
              <option value="IGST">IGST (Inter-State: 18%)</option>
              <option value="NONE">No Tax (Pure BOQ Quotation)</option>
            </select>
          </div>
        </div>

        {/* BOQ ITEMS TABLE (WITH RATE BOOK SUGGESTIONS OVERLAY) */}
        <div className="mb-6 bg-white border border-zinc-200 rounded-xl shadow-sm shrink-0 overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-white flex justify-between items-center">
            <p className="text-[10px] text-zinc-900 font-bold uppercase tracking-widest">Bill of Quantities & Material Specifications</p>
            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Auto-fill unit rates from Rate Book</span>
          </div>
          <div className="overflow-x-visible">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[850px]">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-200">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[260px]">Scope of Work / Material Description</th>
                  <th className="py-3 px-3 w-24 text-center">Unit</th>
                  <th className="py-3 px-3 w-20 text-center">L</th>
                  <th className="py-3 px-3 w-20 text-center">B</th>
                  <th className="py-3 px-3 w-20 text-center">NO</th>
                  <th className="py-3 px-4 w-28 text-center bg-zinc-100 text-zinc-700">Qty</th>
                  <th className="py-3 px-4 w-32 text-right">Rate (₹)</th>
                  <th className="py-3 px-4 w-36 text-right bg-zinc-50">Amount</th>
                  {taxMode !== 'NONE' && <th className="py-3 px-3 w-24 text-center">GST %</th>}
                  <th className="py-3 px-4 w-36 text-right bg-zinc-100 text-zinc-900">Total</th>
                  {!isReadOnly && <th className="py-3 px-3 w-12 text-center"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item, index) => {
                  const rowCalc = calculateRow(item);
                  const tInp = "w-full border border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:bg-white bg-transparent focus:outline-none py-1.5 px-2 rounded text-xs transition-all font-medium text-zinc-900 placeholder-zinc-400 disabled:opacity-75 disabled:cursor-not-allowed";
                  
                  const itemSuggestions = materialRates.filter(m => item.description && m.materialName && m.materialName.toLowerCase().includes(item.description.toLowerCase()));

                  return (
                    <tr key={item.id} className="group hover:bg-zinc-50/50 transition-colors">
                      <td className="py-2 px-4 text-center text-xs font-bold text-zinc-400">{index + 1}</td>
                      <td className="py-2 px-4 relative">
                        <textarea 
                          disabled={isReadOnly} 
                          placeholder="e.g. 18mm Plywood with 1mm Laminate wardrobe execution" 
                          value={item.description} 
                          onChange={(e) => {
                            updateItem(item.id, 'description', e.target.value);
                            setFocusedRowId(item.id);
                          }}
                          onFocus={() => setFocusedRowId(item.id)}
                          onBlur={() => setTimeout(() => setFocusedRowId(null), 200)}
                          className={`${tInp} resize-y min-h-[32px] block w-full leading-relaxed font-bold`} 
                          rows="1" 
                        />

                        {/* Rate Book Suggestion Overlay */}
                        {focusedRowId === item.id && itemSuggestions.length > 0 && !isReadOnly && (
                          <div className="absolute left-4 top-full mt-1 w-96 bg-white border border-zinc-200 rounded-xl shadow-2xl z-[150] max-h-56 overflow-y-auto">
                            <div className="p-3 border-b border-zinc-100 text-[9px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50 sticky top-0">
                              Rate Book Benchmarks
                            </div>
                            {itemSuggestions.map((m, idx) => (
                              <div
                                key={idx}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSelectMaterialRate(item.id, m);
                                }}
                                className="px-5 py-3 cursor-pointer hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-none flex justify-between items-center"
                              >
                                <div>
                                  <p className="font-bold text-xs text-zinc-900">{m.materialName}</p>
                                  <p className="text-[9px] text-zinc-400 uppercase tracking-widest mt-0.5">{m.vendorName || 'Supplier'}</p>
                                </div>
                                <span className="font-black text-xs text-zinc-900">
                                  ₹{m.rate} <span className="text-[9px] text-zinc-400 font-bold">/{m.unit}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      
                      <td className="py-2 px-3">
                        <select disabled={isReadOnly} value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.25rem_center] bg-[length:0.75rem_0.75rem] pr-6 font-bold`}>
                          <option value="Sq.Ft.">Sq.Ft.</option><option value="Rft.">Rft.</option><option value="Nos">Nos</option><option value="L.S.">L.S.</option><option value="Kgs">Kgs</option><option value="Cu.Ft.">Cu.Ft.</option>
                        </select>
                      </td>

                      <td className="py-2 px-3"><input disabled={isReadOnly} type="number" step="any" value={item.sizeL} onChange={(e) => updateItem(item.id, 'sizeL', e.target.value)} className={`${tInp} text-center font-mono`} placeholder="-" /></td>
                      <td className="py-2 px-3"><input disabled={isReadOnly} type="number" step="any" value={item.sizeB} onChange={(e) => updateItem(item.id, 'sizeB', e.target.value)} className={`${tInp} text-center font-mono`} placeholder="-" /></td>
                      <td className="py-2 px-3"><input disabled={isReadOnly} type="number" step="any" value={item.no} onChange={(e) => updateItem(item.id, 'no', e.target.value)} className={`${tInp} text-center font-mono`} placeholder="-" /></td>
                      
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
                      <td className="py-2 px-4 text-right text-xs font-bold text-zinc-500 bg-zinc-50/30">₹ {rowCalc.baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      
                      {taxMode !== 'NONE' && (
                        <td className="py-2 px-3">
                          <select disabled={isReadOnly} value={item.gst} onChange={(e) => updateItem(item.id, 'gst', e.target.value)} className={`${tInp} text-center appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.25rem_center] bg-[length:0.75rem_0.75rem] pr-6 font-bold`}>
                            <option value="0">0%</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option>
                          </select>
                        </td>
                      )}
                      
                      <td className="py-2 px-4 text-right text-sm font-black text-zinc-900 bg-zinc-50/50">₹ {rowCalc.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      
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
                Add Line Item
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM SECTION */}
        <div className="flex flex-col lg:flex-row justify-between gap-6 pb-8 shrink-0">
          <div className="flex-1 space-y-5">
            <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
              <label className={labelClass}>Scope Remarks / Execution Summary</label>
              <textarea disabled={isReadOnly} value={estimateDetails.description} onChange={(e) => setEstimateDetails({...estimateDetails, description: e.target.value})} className={`${inputClass} bg-zinc-50 resize-y min-h-[60px] py-3`} rows="2" placeholder="Specify turnkey scope, inclusions, and client architectural guidelines..."></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
                <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest mb-4 border-b border-zinc-100 pb-3">Remittance Bank Details</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center">
                    <span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">Bank:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Bank Name" value={estimateDetails.bankName} onChange={(e) => setEstimateDetails({...estimateDetails, bankName: e.target.value})} className="w-full bg-transparent focus:outline-none font-bold text-zinc-900 border-b border-dashed border-zinc-200 focus:border-zinc-900 pb-1 px-1" />
                  </div>
                  <div className="flex items-center">
                    <span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">Name:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Account Holder" value={estimateDetails.accountName} onChange={(e) => setEstimateDetails({...estimateDetails, accountName: e.target.value})} className="w-full bg-transparent focus:outline-none font-bold text-zinc-900 border-b border-dashed border-zinc-200 focus:border-zinc-900 pb-1 px-1" />
                  </div>
                  <div className="flex items-center">
                    <span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">A/C No:</span>
                    <input disabled={isReadOnly} type="text" placeholder="Account Number" value={estimateDetails.accountNo} onChange={(e) => setEstimateDetails({...estimateDetails, accountNo: e.target.value})} className="w-full bg-transparent focus:outline-none font-bold text-zinc-900 border-b border-dashed border-zinc-200 focus:border-zinc-900 pb-1 px-1 font-mono" />
                  </div>
                  <div className="flex items-center">
                    <span className="text-[10px] font-bold text-zinc-400 w-16 uppercase shrink-0">IFSC:</span>
                    <input disabled={isReadOnly} type="text" placeholder="IFSC Code" value={estimateDetails.ifscCode} onChange={(e) => setEstimateDetails({...estimateDetails, ifscCode: e.target.value})} className="w-full bg-transparent focus:outline-none font-bold text-zinc-900 border-b border-dashed border-zinc-200 focus:border-zinc-900 pb-1 px-1 font-mono" />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-zinc-200 shadow-sm">
                <label className={labelClass}>Contract Payment Terms & Milestone Schedule</label>
                <textarea disabled={isReadOnly} value={estimateDetails.terms} onChange={(e) => setEstimateDetails({...estimateDetails, terms: e.target.value})} className={`${inputClass} bg-zinc-50 resize-none h-[130px] text-xs leading-relaxed`} placeholder="1. 50% Mobilization advance..."></textarea>
              </div>
            </div>
          </div>

          {/* TOTALS SUMMARY DECK */}
          <div className="w-full lg:w-[380px] flex flex-col justify-between">
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm text-zinc-700 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Taxable BOQ Total</span>
                <span className="text-zinc-900 font-bold">₹ {totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {taxMode === 'IGST' ? (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">IGST</span>
                  <span className="text-zinc-900 font-bold">₹ {totals.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ) : taxMode === 'CGST_SGST' ? (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">CGST</span>
                    <span className="text-zinc-900 font-bold">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">SGST</span>
                    <span className="text-zinc-900 font-bold">₹ {(totals.totalGst / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : null}

              <div className="flex justify-between items-center text-base font-bold text-zinc-900 border-t border-zinc-100 pt-4">
                <span className="uppercase tracking-widest text-[11px]">Grand Total</span>
                <span>₹ {totals.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Discount (-)</span>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-bold">₹</span>
                    <input disabled={isReadOnly} type="number" value={estimateDetails.discount} onChange={(e) => setEstimateDetails({...estimateDetails, discount: e.target.value})} placeholder="0.00" className="w-full bg-zinc-50 text-red-600 font-bold rounded-lg pl-7 pr-3 py-2 text-right outline-none border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-inset focus:ring-zinc-900 transition-all text-xs" />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xl font-black text-zinc-900 border-t-2 border-zinc-900 pt-4 mt-2">
                <span className="uppercase tracking-widest text-xs font-bold">Final Estimate</span>
                <span>₹ {finalAmount > 0 ? finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</span>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex gap-3 mt-6">
                <button onClick={handleSaveOnly} disabled={submitting} className="flex-1 py-3.5 bg-white border border-zinc-200 hover:border-zinc-900 hover:bg-zinc-50 text-zinc-900 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button onClick={handleSaveAndPrint} disabled={submitting} className="flex-[1.5] py-3.5 bg-zinc-900 hover:bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 border border-black">
                  {submitting ? 'Saving...' : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      Save & Print PDF
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* PERFECT A4 MULTI-PAGE PDF ENGINE           */}
      {/* ========================================== */}
      <div className="hidden print:block w-full bg-white text-zinc-900 font-['Inter',sans-serif] text-xs">
        
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
          
          @media print {
            @page { margin: 15mm; size: A4 portrait; }
            
            html, body, #root, #__next, .app-container { 
              height: auto !important; 
              min-height: auto !important;
              overflow: visible !important; 
              position: static !important;
            }
            
            body { 
              padding: 0 !important; 
              background: white !important; 
              color: #18181b !important; 
              font-family: 'Inter', sans-serif !important; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
            }
            img { mix-blend-mode: multiply !important; }
            
            table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            
            .totals-section { page-break-inside: avoid; }
            .signatures-section { page-break-inside: avoid; }
          }
        `}} />

        <table className="w-full">
          
          {/* HEADER: Prints ONCE at the top of Page 1 */}
          <thead>
            <tr>
              <td>
                <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-5">
                  <div className="flex items-center gap-4">
                    {companySettings?.logoUrl && (
                      <img src={companySettings.logoUrl} className="h-14 w-auto object-contain shrink-0" alt="Logo" />
                    )}
                    <div>
                      <h1 className="text-xl font-black text-black tracking-tight">{companySettings?.companyName || 'Company Name'}</h1>
                      <p className="text-[10px] text-zinc-600 whitespace-pre-wrap mt-0.5 max-w-[250px] leading-tight font-medium">{companySettings?.companyAddress}</p>
                      <p className="text-[10px] text-black mt-1 font-bold">
                        GSTIN: <span className="font-medium text-zinc-700">{companySettings?.companyGst}</span> <span className="mx-2 text-zinc-300">|</span> 
                        Ph: <span className="font-medium text-zinc-700">{companySettings?.companyPhone}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">Estimation / BOQ</span>
                    <h2 className="text-xl font-black text-black tracking-tight">{estimateDetails.estimateNo || 'EST-000'}</h2>
                    <p className="text-[10px] text-black mt-1 font-bold">Date: <span className="font-medium text-zinc-700">{estimateDetails.date}</span></p>
                  </div>
                </div>

                <div className="flex justify-between mb-6 pb-4 border-b border-zinc-200">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Billed To</span>
                    <h3 className="text-sm font-black text-black tracking-tight uppercase">{estimateDetails.partyName || 'Client Name'}</h3>
                    <p className="text-[10px] text-zinc-700 whitespace-pre-wrap mt-1 leading-relaxed max-w-[250px] font-medium">{estimateDetails.partyAddress}</p>
                  </div>
                  <div className="text-right space-y-1.5 text-[10px]">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Project Details</span>
                    <p className="text-black font-bold">Project: <span className="font-medium text-zinc-700">{estimateDetails.projectName || 'Interior Estimation'}</span></p>
                    {estimateDetails.validUntil && <p className="text-black font-bold">Valid Until: <span className="font-medium text-zinc-700">{estimateDetails.validUntil}</span></p>}
                  </div>
                </div>
              </td>
            </tr>
          </thead>

          {/* BODY: Contains the actual Line Items */}
          <tbody>
            <tr>
              <td>
                <table className="w-full text-left border-collapse mb-8 border border-zinc-300">
                  <thead className="bg-zinc-100 border-b-2 border-zinc-300">
                    <tr className="text-zinc-900 text-[9px] uppercase tracking-widest font-bold">
                      <th className="py-2.5 px-3 text-center w-8 border-r border-zinc-300">#</th>
                      <th className="py-2.5 px-4 border-r border-zinc-300">Scope of Work / Material Details</th>
                      <th className="py-2.5 px-2 text-center w-12 border-r border-zinc-300">Unit</th>
                      <th className="py-2.5 px-2 text-center w-16 border-r border-zinc-300">L x B</th>
                      <th className="py-2.5 px-2 text-center w-10 border-r border-zinc-300">No</th>
                      <th className="py-2.5 px-3 text-center w-14 border-r border-zinc-300 bg-white">Qty</th>
                      <th className="py-2.5 px-3 text-right w-20 border-r border-zinc-300">Rate</th>
                      {taxMode !== 'NONE' && <th className="py-2.5 px-2 text-center w-12 border-r border-zinc-300">Tax</th>}
                      <th className="py-2.5 px-4 text-right w-28 bg-white">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 text-[10px] text-zinc-900 font-medium">
                    {items.map((item, index) => {
                      const row = calculateRow(item);
                      if (!item.description) return null;
                      const measurement = (item.sizeL || item.sizeB) ? `${item.sizeL || '-'} x ${item.sizeB || '-'}` : '-';

                      return (
                        <tr key={item.id} className="even:bg-zinc-50/50">
                          <td className="py-2.5 px-3 text-center text-zinc-500 font-bold border-r border-zinc-200">{index + 1}</td>
                          <td className="py-2.5 px-4 border-r border-zinc-200 leading-relaxed max-w-[200px] whitespace-pre-wrap font-bold">{item.description}</td>
                          <td className="py-2.5 px-2 text-center border-r border-zinc-200 text-zinc-600">{item.unit}</td>
                          <td className="py-2.5 px-2 text-center border-r border-zinc-200 text-zinc-600 font-mono text-[9px]">{measurement}</td>
                          <td className="py-2.5 px-2 text-center border-r border-zinc-200 text-zinc-600 font-mono text-[9px]">{item.no || '-'}</td>
                          <td className="py-2.5 px-3 text-center font-bold border-r border-zinc-200 bg-zinc-50/50">{row.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-3 text-right border-r border-zinc-200">₹{parseFloat(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                          {taxMode !== 'NONE' && <td className="py-2.5 px-2 text-center border-r border-zinc-200 text-zinc-600">{item.gst}%</td>}
                          <td className="py-2.5 px-4 text-right font-black bg-zinc-50/50">₹{row.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Amount in Words & Totals Block */}
                <div className="totals-section flex justify-between items-start mb-10">
                  <div className="w-1/2 pr-6 pt-2">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Estimated Amount in Words</span>
                    <p className="text-[11px] font-bold text-zinc-900 capitalize leading-relaxed bg-zinc-50 p-3 rounded border border-zinc-200">{numberToWords(finalAmount > 0 ? finalAmount : totals.grandTotal)}</p>
                  </div>
                  
                  <div className="w-72 space-y-2 text-[11px] text-zinc-900 bg-zinc-50 p-4 rounded border border-zinc-200">
                    <div className="flex justify-between font-bold text-zinc-600">
                      <span className="uppercase tracking-widest text-[9px]">Taxable BOQ Total:</span>
                      <span>₹{totals.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>
                    
                    {taxMode === 'IGST' ? (
                      <div className="flex justify-between font-bold text-zinc-600">
                        <span className="uppercase tracking-widest text-[9px]">IGST:</span>
                        <span>₹{totals.totalGst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                      </div>
                    ) : taxMode === 'CGST_SGST' ? (
                      <>
                        <div className="flex justify-between font-bold text-zinc-600">
                          <span className="uppercase tracking-widest text-[9px]">CGST:</span><span>₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                        </div>
                        <div className="flex justify-between font-bold text-zinc-600 border-b border-zinc-300 pb-2">
                          <span className="uppercase tracking-widest text-[9px]">SGST:</span><span>₹{(totals.totalGst / 2).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                        </div>
                      </>
                    ) : null}
                    
                    <div className="flex justify-between font-black pt-1">
                      <span className="uppercase tracking-widest text-[9px]">Grand Total:</span><span>₹{totals.grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                    </div>

                    {(estimateDetails.discount > 0) && (
                      <div className="flex justify-between font-bold text-red-600">
                        <span className="uppercase tracking-widest text-[9px]">Discount:</span><span>- ₹{parseFloat(estimateDetails.discount).toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-black text-sm border-t-2 border-black pt-3 mt-3">
                      <span className="uppercase tracking-widest text-[10px]">Final Estimate:</span><span>₹{finalAmount > 0 ? finalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2}) : 0}</span>
                    </div>
                  </div>
                </div>

                {/* Terms, Remarks, and Signatures */}
                <div className="signatures-section grid grid-cols-2 gap-10 text-[10px]">
                  <div className="space-y-6">
                    {companySettings?.showBankDetailsOnPdf !== false && (
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Remittance Bank Details</span>
                        <div className="grid grid-cols-[60px_1fr] gap-y-1 text-black font-medium bg-zinc-50 p-3 rounded border border-zinc-200">
                          <span className="font-bold text-zinc-500 uppercase tracking-widest text-[8px]">Bank:</span><span>{estimateDetails.bankName}</span>
                          <span className="font-bold text-zinc-500 uppercase tracking-widest text-[8px]">Name:</span><span>{estimateDetails.accountName}</span>
                          <span className="font-bold text-zinc-500 uppercase tracking-widest text-[8px]">A/C No:</span><span className="font-mono text-[11px] font-bold">{estimateDetails.accountNo}</span>
                          <span className="font-bold text-zinc-500 uppercase tracking-widest text-[8px]">IFSC:</span><span className="font-mono text-[11px] font-bold">{estimateDetails.ifscCode}</span>
                        </div>
                      </div>
                    )}
                    
                    {companySettings?.showTermsOnPdf !== false && estimateDetails.terms && (
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Payment Terms & Schedule</span>
                        <p className="whitespace-pre-wrap text-zinc-700 leading-relaxed font-medium">{estimateDetails.terms}</p>
                      </div>
                    )}

                    {companySettings?.showRemarksOnPdf !== false && estimateDetails.description && (
                      <div>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Scope Remarks</span>
                        <p className="text-zinc-900 font-medium leading-relaxed bg-zinc-50 p-3 rounded border border-zinc-200">{estimateDetails.description}</p>
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

              </td>
            </tr>
          </tbody>

          {/* FOOTER */}
          {companySettings?.pdfFooterDisclaimer && (
            <tfoot>
              <tr>
                <td>
                  <div className="mt-8 pt-3 border-t border-zinc-300 text-center w-full">
                    <p className="text-[9px] text-zinc-400 font-medium uppercase tracking-widest">
                      {companySettings.pdfFooterDisclaimer}
                    </p>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}