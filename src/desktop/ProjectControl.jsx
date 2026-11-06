import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { exportToCSV } from '../utils';

// Standard Construction & Interior QA/QC SOP Templates
const qaTemplates = {
  WATERPROOFING: {
    title: 'Bathroom Waterproofing SOP',
    trade: 'Civil / Waterproofing',
    items: [
      'Surface cleaned, leveled, and free of dust, oil, and loose debris',
      'Plumbing pressure test completed and zero line drop confirmed',
      'First coat of waterproofing polymer applied uniformly with fiber fillet at corners',
      'Glass fibre mesh (145 GSM) laid out uniformly without bubbles or wrinkles',
      'Second coat applied perpendicular to the first coat after drying',
      '48-Hour water pond test completed with zero dampness or leakage visible below'
    ]
  },
  FALSE_CEILING: {
    title: 'Gypsum False Ceiling SOP',
    trade: 'False Ceiling',
    items: [
      'True ceiling perimeter level marked clearly using 360-degree laser level',
      'GI framing grid spacing is accurate (main channels 4ft, perimeter 2ft x 2ft)',
      'Soffit cleats and rawl plugs securely fastened to RCC true ceiling slab',
      'Electrical conduits, magnetic track light channels, and AC copper ducts verified above ceiling',
      'Gypsum boards (12.5mm) screwed with countersunk drywall screws (spacing ≤ 8 inches)',
      'Fiber jointing mesh tape applied and jointing compound dressed flush with zero waves'
    ]
  },
  ELECTRICAL: {
    title: 'Concealed Electrical & DB Dressing SOP',
    trade: 'Electrician',
    items: [
      'Wall chasing depth is adequate (minimum 25mm concrete cover over conduit)',
      'FRLS PVC conduits laid securely with non-corrosive metal saddles at 60cm intervals',
      'GI switchboard modular boxes fixed perfectly plumb and flush with plaster finish',
      'Cables pulled strictly matching phase/neutral/earth standard color codes',
      'Insulation resistance (Megger test) and loop impedance verified before energizing'
    ]
  },
  CARPENTRY_JOINERY: {
    title: 'Modular Woodwork & Carcase Joinery SOP',
    trade: 'Carpenter',
    items: [
      'Base plinth framework verified perfectly level using spirit level across all axes',
      'Marine ply (IS:710) carcases edge-banded with 2mm PVC tape using hot-melt PUR adhesive',
      'Soft-close hinges and tandem box runners aligned with uniform 2mm shadow gaps',
      'Concealed wire grommets provided for internal wardrobe sensor LED strips',
      'Backing panels fastened securely with screws and anti-fungal silicone bead around rear perimeter'
    ]
  },
  PAINT_FINISH: {
    title: 'Luxury Emulsion Paint & Putty SOP',
    trade: 'Painter',
    items: [
      'Base plaster surface rubbed with emery stone and dampness reading < 12%',
      'First coat of water-resistant acrylic primer applied uniformly',
      'Two coats of polymer wall putty applied with minimum 6 hours inter-coat curing',
      'Surface dry-sanded with 220/320 grit paper using LED inspection floodlights',
      'Two coats of luxury emulsion applied with zero roller marks or patchy overlap edges'
    ]
  }
};

export default function ProjectControl({ companySettings = {} }) {
  const [activeTab, setActiveTab] = useState('RA Bills'); // 'RA Bills' | 'Milestones' | 'Change Orders' | 'Schedule' | 'QA/QC'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [projects, setProjects] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [snagsList, setSnagsList] = useState([]);

  // Financial Ledger States
  const [raBills, setRaBills] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [changeOrders, setChangeOrders] = useState([]);

  // Operational Scheduling & QA/QC States
  const [tasks, setTasks] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState('');
  const [currentInspection, setCurrentInspection] = useState(null);

  // Modals
  const [isRaModalOpen, setIsRaModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [isCoModalOpen, setIsCoModalOpen] = useState(false);

  // Forms
  const [raForm, setRaForm] = useState({ 
    projectId: '', 
    subcontractorId: '', 
    billNo: '', 
    billDate: new Date().toISOString().split('T')[0], 
    grossAmount: '', 
    retentionPercent: 5, 
    previousPaid: '', 
    notes: '', 
    fileUrl: '', 
    fileName: '' 
  });
  
  const [milestoneForm, setMilestoneForm] = useState({ 
    projectId: '', 
    stageName: '', 
    percentage: '', 
    amount: '', 
    dueDate: '', 
    status: 'Pending', 
    notes: '', 
    isHandoverMilestone: false,
    fileUrl: '', 
    fileName: '' 
  });
  
  const [coForm, setCoForm] = useState({ 
    projectId: '', 
    title: '', 
    description: '', 
    additionalCost: '', 
    extraDays: 0, 
    date: new Date().toISOString().split('T')[0], 
    fileUrl: '', 
    fileName: '' 
  });
  
  const [newTask, setNewTask] = useState({ 
    title: '', 
    startDate: new Date().toISOString().split('T')[0], 
    endDate: '', 
    status: 'Pending', 
    assignee: '' 
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [projs, subs, bills, ms, cos, snags] = await Promise.all([
        db.getProjects ? db.getProjects() : Promise.resolve([]), 
        db.getSubcontractors ? db.getSubcontractors() : Promise.resolve([]), 
        db.getRaBills ? db.getRaBills(selectedProjectId) : Promise.resolve([]),
        db.getMilestones ? db.getMilestones(selectedProjectId) : Promise.resolve([]), 
        db.getChangeOrders ? db.getChangeOrders(selectedProjectId) : Promise.resolve([]),
        db.getSnags ? db.getSnags() : Promise.resolve([])
      ]);

      // Cache Fallbacks for complete offline resilience
      const cachedBills = JSON.parse(localStorage.getItem('jyanipur_ra_bills') || '[]');
      const cachedMs = JSON.parse(localStorage.getItem('jyanipur_milestones') || '[]');
      const cachedCos = JSON.parse(localStorage.getItem('jyanipur_change_orders') || '[]');
      const cachedSnags = JSON.parse(localStorage.getItem('jyanipur_snags') || '[]');
      const cachedTasks = JSON.parse(localStorage.getItem(`jyanipur_tasks_${selectedProjectId}`) || '[]');
      const cachedInspections = JSON.parse(localStorage.getItem(`jyanipur_qa_${selectedProjectId}`) || '[]');

      // Merge RA Bills
      const allBills = [...(bills || [])];
      cachedBills.forEach(cb => {
        if (!allBills.some(b => String(b.id || b._id) === String(cb.id || cb._id))) {
          allBills.push(cb);
        }
      });

      // Merge Milestones
      const allMs = [...(ms || [])];
      cachedMs.forEach(cm => {
        if (!allMs.some(m => String(m.id || m._id) === String(cm.id || cm._id))) {
          allMs.push(cm);
        }
      });

      // Merge Change Orders
      const allCos = [...(cos || [])];
      cachedCos.forEach(co => {
        if (!allCos.some(c => String(c.id || c._id) === String(co.id || co._id))) {
          allCos.push(co);
        }
      });

      // Filter by selected project if specified
      const filteredBills = selectedProjectId ? allBills.filter(b => String(b.projectId) === String(selectedProjectId)) : allBills;
      const filteredMs = selectedProjectId ? allMs.filter(m => String(m.projectId) === String(selectedProjectId)) : allMs;
      const filteredCos = selectedProjectId ? allCos.filter(c => String(c.projectId) === String(selectedProjectId)) : allCos;

      setProjects((projs || []).filter(p => p.status !== 'Completed'));
      setSubcontractors(subs || []);
      setRaBills(filteredBills);
      setMilestones(filteredMs);
      setChangeOrders(filteredCos);
      setSnagsList([...(snags || []), ...cachedSnags]);

      if (selectedProjectId) {
        if (cachedTasks.length > 0) {
          setTasks(cachedTasks);
        } else {
          const today = new Date();
          const d1 = new Date(today); d1.setDate(d1.getDate() - 3);
          const d2 = new Date(today); d2.setDate(d2.getDate() + 4);
          const d3 = new Date(today); d3.setDate(d3.getDate() + 5);
          const d4 = new Date(today); d4.setDate(d4.getDate() + 14);
          const d5 = new Date(today); d5.setDate(d5.getDate() + 15);
          const d6 = new Date(today); d6.setDate(d6.getDate() + 28);
          
          const defaultTasks = [
            { id: 1, title: 'Demolition, Dismantling & Laser Survey', startDate: d1.toISOString().split('T')[0], endDate: d2.toISOString().split('T')[0], status: 'Completed', assignee: 'Civil Gang' },
            { id: 2, title: 'Concealed Conduit Chasing & Plumbing Rough-in', startDate: d2.toISOString().split('T')[0], endDate: d3.toISOString().split('T')[0], status: 'In Progress', assignee: 'MEP Agency' },
            { id: 3, title: 'Bathroom Waterproofing 48-Hour Pond Test', startDate: d3.toISOString().split('T')[0], endDate: d4.toISOString().split('T')[0], status: 'Pending', assignee: 'Civil Team' },
            { id: 4, title: 'Modular Carcase Installation & Veneer Paneling', startDate: d4.toISOString().split('T')[0], endDate: d5.toISOString().split('T')[0], status: 'Pending', assignee: 'Carpentry Gang' },
            { id: 5, title: 'Final Coat Painting, Deep Cleaning & Snag Clearance', startDate: d5.toISOString().split('T')[0], endDate: d6.toISOString().split('T')[0], status: 'Pending', assignee: 'Finishing Team' }
          ];
          setTasks(defaultTasks);
          localStorage.setItem(`jyanipur_tasks_${selectedProjectId}`, JSON.stringify(defaultTasks));
        }

        setInspections(cachedInspections);
      } else {
        setTasks([]);
        setInspections([]);
      }

    } catch (e) {
      console.error("Error fetching project control records:", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedProjectId]);

  const handleFileUpload = (e, formSetter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { 
        formSetter(prev => ({ 
          ...prev, 
          fileUrl: reader.result, 
          fileName: file.name
        })); 
      };
      reader.readAsDataURL(file);
    }
  };

  const syncDocumentToVault = async (projectId, docName, category, fileUrl, notes) => {
    if (!fileUrl) return;
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(projectId));
      const vaultRecord = {
        id: Date.now(),
        projectId: projectId ? (Number(projectId) || projectId) : '',
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'General Project',
        documentName: docName, 
        category: category, 
        fileUrl: fileUrl,
        notes: notes || 'Auto-synced from Project Financial Control',
        uploadedAt: new Date().toISOString().split('T')[0]
      };

      if (typeof db.saveVaultDocument === 'function') {
        await db.saveVaultDocument(vaultRecord);
      } else {
        const cachedVault = JSON.parse(localStorage.getItem('jyanipur_vault_documents') || '[]');
        cachedVault.unshift(vaultRecord);
        localStorage.setItem('jyanipur_vault_documents', JSON.stringify(cachedVault));
      }
    } catch (err) { 
      console.warn("Vault sync warning:", err); 
    }
  };

  // --- COMMERCIAL GATEKEEPER: VERIFY UNRESOLVED CRITICAL SNAGS BEFORE HANDOVER ---
  const checkHandoverEligibility = (milestone) => {
    const isHandover = milestone.isHandoverMilestone || 
      (milestone.stageName && (
        milestone.stageName.toLowerCase().includes('handover') || 
        milestone.stageName.toLowerCase().includes('final') ||
        parseFloat(milestone.percentage) === 100
      ));

    if (isHandover) {
      const projId = String(milestone.projectId || selectedProjectId);
      const openCriticalSnags = snagsList.filter(s => 
        String(s.projectId) === projId && 
        s.status !== 'Resolved' && 
        (s.priority === 'High' || s.priority === 'Critical')
      );

      if (openCriticalSnags.length > 0) {
        alert(
          `HANDOVER GATED!\n\n` +
          `Cannot bill or certify this Final Handover milestone!\n` +
          `There are ${openCriticalSnags.length} unresolved high-priority snags recorded on site.\n\n` +
          `Please navigate to "Site Snags", clear all critical defects with photo proof, and re-attempt.`
        );
        return false;
      }
    }
    return true;
  };

  // --- AUTOMATION 1: 1-CLICK TAX INVOICE GENERATION FROM MILESTONE ---
  const handleAutoGenerateInvoice = async (milestone) => {
    if (!checkHandoverEligibility(milestone)) return;

    const proj = projects.find(p => String(p.id || p._id) === String(milestone.projectId || selectedProjectId));
    if (!proj) {
      alert("Please select or link this milestone to an active project site first.");
      return;
    }

    setSubmitting(true);
    try {
      const invPrefix = companySettings.invoicePrefix || `INV/FY${new Date().getFullYear().toString().slice(-2)}-${(new Date().getFullYear() + 1).toString().slice(-2)}/`;
      const generatedInvNo = `${invPrefix}${Date.now().toString().slice(-4)}`;
      const baseAmount = parseFloat(milestone.amount) || 0;
      const gstRate = parseFloat(companySettings.defaultGstRate) || 18;
      const gstAmount = (baseAmount * gstRate) / 100;
      const totalAmount = baseAmount + gstAmount;

      const newInvoice = {
        id: Date.now(),
        projectId: proj.id || proj._id,
        projectName: proj.name || proj.projectName,
        client: proj.clientName,
        partyName: proj.clientName,
        partyAddress: proj.clientAddress || proj.address || '',
        gstNo: (proj.clientGstin || proj.gstin || '').toUpperCase(),
        placeOfSupply: 'Telangana (36)',
        invoiceNo: generatedInvNo,
        date: new Date().toISOString().split('T')[0],
        poNumber: proj.poNumber || `PO-${(proj.name || 'PRJ').substring(0, 4).toUpperCase()}`,
        poDate: proj.poDate || '',
        taxMode: 'CGST_SGST',
        items: [
          {
            id: Date.now(),
            description: `Payment Milestone: ${milestone.stageName} (${milestone.percentage}% Completion Stage)`,
            hsn: companySettings.defaultHsnSac || '9954',
            qty: 1,
            rate: baseAmount,
            gst: gstRate
          }
        ],
        terms: companySettings.defaultInvoiceTerms || '',
        description: `Auto-billed upon milestone certification: ${milestone.stageName}`,
        amount: '₹ ' + totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        status: 'Pending',
        isCancelled: false
      };

      if (typeof db.saveInvoice === 'function') {
        await db.saveInvoice(newInvoice);
      } else {
        const cachedInv = JSON.parse(localStorage.getItem('jyanipur_invoices') || '[]');
        cachedInv.unshift(newInvoice);
        localStorage.setItem('jyanipur_invoices', JSON.stringify(cachedInv));
      }

      if (typeof db.updateMilestoneStatus === 'function') {
        await db.updateMilestoneStatus(milestone.id, 'Invoiced');
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_milestones') || '[]');
        const updated = cached.map(m => String(m.id) === String(milestone.id) ? { ...m, status: 'Invoiced' } : m);
        localStorage.setItem('jyanipur_milestones', JSON.stringify(updated));
      }

      await loadData();
      alert(`Tax Invoice ${generatedInvNo} successfully generated!\n\n• Line item created with ${gstRate}% GST\n• Milestone status updated to 'Invoiced'\n• Revenue reflected in Project P&L`);
    } catch (err) {
      console.error("Failed to auto-generate invoice:", err);
      alert("Error generating invoice from milestone.");
    }
    setSubmitting(false);
  };

  // --- AUTOMATION 2: MARK RECEIVED -> AUTO-CREDIT PROJECT REVENUE & P&L ---
  const handleMarkMilestoneReceived = async (milestone) => {
    if (!checkHandoverEligibility(milestone)) return;

    const proj = projects.find(p => String(p.id || p._id) === String(milestone.projectId || selectedProjectId));
    const rawAmt = parseFloat(milestone.amount) || 0;

    setSubmitting(true);
    try {
      if (typeof db.updateMilestoneStatus === 'function') {
        await db.updateMilestoneStatus(milestone.id, 'Received');
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_milestones') || '[]');
        const updated = cached.map(m => String(m.id) === String(milestone.id) ? { ...m, status: 'Received' } : m);
        localStorage.setItem('jyanipur_milestones', JSON.stringify(updated));
      }

      // Auto-record in Income Module to immediately update cash flow & Project P&L
      if (rawAmt > 0) {
        const incomePayload = {
          id: Date.now(),
          projectId: milestone.projectId || selectedProjectId,
          projectName: proj ? (proj.name || proj.projectName) : 'Project Site',
          amount: rawAmt,
          date: new Date().toISOString().split('T')[0],
          paymentMode: 'Bank Transfer',
          referenceNo: `MS-${Date.now().toString().slice(-5)}`,
          notes: `Auto-settlement for Certified Milestone: ${milestone.stageName}`
        };

        if (typeof db.saveIncomeRecord === 'function') {
          await db.saveIncomeRecord(incomePayload);
        } else {
          const cachedInc = JSON.parse(localStorage.getItem('jyanipur_incomes') || '[]');
          cachedInc.unshift(incomePayload);
          localStorage.setItem('jyanipur_incomes', JSON.stringify(cachedInc));
        }
      }

      await loadData();
      alert(`Milestone Marked Received!\n\n• ₹${rawAmt.toLocaleString('en-IN')} credited to Project Revenue\n• P&L & Cash Flow records synchronized`);
    } catch (err) {
      console.error("Failed to mark milestone received:", err);
    }
    setSubmitting(false);
  };

  // --- AUTOMATION 3: CHANGE ORDER -> AUTO-EXPAND PROJECT BUDGET ---
  const handleSaveCo = async (e) => {
    e.preventDefault();
    const additionalCost = parseFloat(coForm.additionalCost) || 0;
    const targetProjId = coForm.projectId || selectedProjectId;

    if (!targetProjId || !coForm.title.trim()) {
      return alert("Select Project Site and enter a Variation Title.");
    }

    setSubmitting(true);
    try {
      const targetProj = projects.find(p => String(p.id || p._id) === String(targetProjId));
      const payload = { 
        ...coForm,
        id: Date.now(),
        projectId: Number(targetProjId) || targetProjId, 
        projectName: targetProj ? (targetProj.name || targetProj.projectName) : '',
        additionalCost: additionalCost, 
        extraDays: parseInt(coForm.extraDays) || 0 
      };

      if (typeof db.saveChangeOrder === 'function') {
        await db.saveChangeOrder(payload);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_change_orders') || '[]');
        cached.unshift(payload);
        localStorage.setItem('jyanipur_change_orders', JSON.stringify(cached));
      }

      // Auto-expand Project Contract Budget in Projects Master Database
      if (targetProj && additionalCost > 0) {
        const currentBudget = parseFloat(targetProj.budget) || 0;
        const updatedProject = {
          ...targetProj,
          budget: currentBudget + additionalCost
        };
        if (typeof db.saveProject === 'function') {
          await db.saveProject(updatedProject);
        }
      }

      if (coForm.fileUrl) {
        await syncDocumentToVault(
          targetProjId, 
          `Change Order - ${coForm.title}`, 
          'Client Approvals', 
          coForm.fileUrl, 
          coForm.description
        );
      }

      setIsCoModalOpen(false);
      setCoForm({ projectId: '', title: '', description: '', additionalCost: '', extraDays: 0, date: new Date().toISOString().split('T')[0], fileUrl: '', fileName: '' });
      await loadData();
      alert(`Scope Variation Saved!\n\n• Project Budget increased by ₹${additionalCost.toLocaleString('en-IN')}\n• Audit copy stored in Document Vault`);
    } catch (err) { 
      alert("Failed to save Change Order."); 
    }
    setSubmitting(false);
  };

  // --- AUTOMATION 4: QA/QC INSPECTION FAILURES -> AUTO-LOG DEFECT SNAGS ---
  const handleSaveInspection = async () => {
    if (!currentInspection) return;
    const allChecked = Object.values(currentInspection.checks).every(val => val !== 'PENDING');
    if (!allChecked) return alert("Please mark Pass, Fail, or N/A for all checklist items before submitting.");
    
    const hasFails = Object.values(currentInspection.checks).includes('FAIL');
    const finalStatus = hasFails ? 'FAILED' : 'PASSED';
    const selectedProj = projects.find(p => String(p.id || p._id) === String(selectedProjectId));

    setSubmitting(true);
    try {
      if (hasFails) {
        const templateObj = qaTemplates[currentInspection.templateKey];
        const templateItems = templateObj.items;
        
        for (const [idxStr, statusVal] of Object.entries(currentInspection.checks)) {
          if (statusVal === 'FAIL') {
            const itemText = templateItems[parseInt(idxStr)];
            const snagRecord = {
              id: Date.now() + Math.random(),
              projectId: selectedProjectId,
              projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'Site Inspection',
              title: `[QA FAILURE] ${currentInspection.title} (#${parseInt(idxStr) + 1})`,
              roomLocation: currentInspection.title,
              description: `Audit failure detected during "${currentInspection.title}" SOP.\nFailed standard: ${itemText}.\nAudited by: ${currentInspection.inspector}`,
              subcontractor: templateObj.trade || 'Quality Team',
              priority: 'High',
              status: 'Open',
              date: new Date().toISOString().split('T')[0]
            };

            if (typeof db.saveSnag === 'function') {
              await db.saveSnag(snagRecord);
            } else {
              const cachedSnags = JSON.parse(localStorage.getItem('jyanipur_snags') || '[]');
              cachedSnags.unshift(snagRecord);
              localStorage.setItem('jyanipur_snags', JSON.stringify(cachedSnags));
            }
          }
        }
      }

      const updatedInspectionRecord = { ...currentInspection, status: finalStatus };
      const updatedList = [updatedInspectionRecord, ...inspections];
      setInspections(updatedList);
      localStorage.setItem(`jyanipur_qa_${selectedProjectId}`, JSON.stringify(updatedList));

      setCurrentInspection(null);
      setActiveTemplate('');
      await loadData();

      if (hasFails) {
        alert("Inspection Failed! Defect tickets automatically created in Site Snags with HIGH priority to gate final handover.");
      } else {
        alert("Inspection Passed! Quality checklist certified.");
      }
    } catch (err) {
      console.error("Error signing off inspection:", err);
      alert("Failed to save inspection.");
    }
    setSubmitting(false);
  };

  // Save RA Bill
  const handleSaveRa = async (e) => {
    e.preventDefault();
    const gross = parseFloat(raForm.grossAmount) || 0;
    const retPct = parseFloat(raForm.retentionPercent) || 0;
    const retAmt = (gross * retPct) / 100;
    const prev = parseFloat(raForm.previousPaid) || 0;
    const net = gross - retAmt - prev;

    if (!raForm.projectId || !raForm.subcontractorId || !raForm.billNo || gross <= 0) {
      return alert("Select Project, Subcontractor, enter Bill No, and valid Gross Amount.");
    }

    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(raForm.projectId));
      const selectedSub = subcontractors.find(s => String(s.id || s._id) === String(raForm.subcontractorId));

      const payload = { 
        ...raForm, 
        id: Date.now(),
        projectId: Number(raForm.projectId) || raForm.projectId, 
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : '',
        subcontractorId: Number(raForm.subcontractorId) || raForm.subcontractorId, 
        subName: selectedSub ? selectedSub.name : '',
        trade: selectedSub ? selectedSub.trade : '',
        grossAmount: gross, 
        retentionAmount: retAmt, 
        previousPaid: prev, 
        netPayable: net > 0 ? net : 0, 
        workDoneDetails: { note: raForm.notes } 
      };

      if (typeof db.saveRaBill === 'function') {
        await db.saveRaBill(payload);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_ra_bills') || '[]');
        cached.unshift(payload);
        localStorage.setItem('jyanipur_ra_bills', JSON.stringify(cached));
      }

      if (raForm.fileUrl) {
        await syncDocumentToVault(
          raForm.projectId, 
          `RA Bill ${raForm.billNo}`, 
          'Contracts & Legal', 
          raForm.fileUrl, 
          `Contractor RA Bill - ${raForm.notes}`
        );
      }

      setIsRaModalOpen(false);
      setRaForm({ projectId: '', subcontractorId: '', billNo: '', billDate: new Date().toISOString().split('T')[0], grossAmount: '', retentionPercent: 5, previousPaid: '', notes: '', fileUrl: '', fileName: '' });
      await loadData();
      alert(`RA Bill #${payload.billNo} Saved! Retention of ₹${retAmt.toLocaleString('en-IN')} held in escrow.`);
    } catch (err) { 
      alert("Failed to save RA Bill."); 
    }
    setSubmitting(false);
  };

  // Save Milestone Form
  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    const amt = parseFloat(milestoneForm.amount) || 0;
    if (!milestoneForm.projectId || !milestoneForm.stageName || amt <= 0) {
      return alert("Select Project, Stage Name, and valid Milestone Amount.");
    }

    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(milestoneForm.projectId));
      const payload = { 
        ...milestoneForm, 
        id: Date.now(),
        projectId: Number(milestoneForm.projectId) || milestoneForm.projectId, 
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : '',
        percentage: parseFloat(milestoneForm.percentage) || 0, 
        amount: amt 
      };

      if (typeof db.saveMilestone === 'function') {
        await db.saveMilestone(payload);
      } else {
        const cached = JSON.parse(localStorage.getItem('jyanipur_milestones') || '[]');
        cached.unshift(payload);
        localStorage.setItem('jyanipur_milestones', JSON.stringify(cached));
      }

      if (milestoneForm.fileUrl) {
        await syncDocumentToVault(
          milestoneForm.projectId, 
          `Milestone Sign-off - ${milestoneForm.stageName}`, 
          'Client Approvals', 
          milestoneForm.fileUrl, 
          milestoneForm.notes
        );
      }

      setIsMilestoneModalOpen(false);
      setMilestoneForm({ projectId: '', stageName: '', percentage: '', amount: '', dueDate: '', status: 'Pending', notes: '', isHandoverMilestone: false, fileUrl: '', fileName: '' });
      await loadData();
      alert("Payment milestone saved!");
    } catch (err) { 
      alert("Failed to save Milestone."); 
    }
    setSubmitting(false);
  };

  // Task & Inspection Helpers
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.startDate || !newTask.endDate) return alert("Please fill all required task fields.");
    if (new Date(newTask.startDate) > new Date(newTask.endDate)) return alert("End date cannot be before Start date.");
    
    const updated = [...tasks, { ...newTask, id: Date.now() }];
    setTasks(updated);
    if (selectedProjectId) {
      localStorage.setItem(`jyanipur_tasks_${selectedProjectId}`, JSON.stringify(updated));
    }
    setNewTask({ title: '', startDate: new Date().toISOString().split('T')[0], endDate: '', status: 'Pending', assignee: '' });
  };

  const handleUpdateTaskStatus = (taskId, newStatus) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updated);
    if (selectedProjectId) {
      localStorage.setItem(`jyanipur_tasks_${selectedProjectId}`, JSON.stringify(updated));
    }
  };

  const handleStartInspection = () => {
    if (!activeTemplate) return;
    const template = qaTemplates[activeTemplate];
    const initialChecks = {};
    template.items.forEach((item, idx) => { initialChecks[idx] = 'PENDING'; });
    
    setCurrentInspection({
      id: Date.now(), 
      templateKey: activeTemplate, 
      title: template.title,
      date: new Date().toISOString().split('T')[0], 
      inspector: 'Site Quality Engineer',
      status: 'In Progress', 
      checks: initialChecks
    });
  };

  const handleCheck = (idx, value) => { 
    setCurrentInspection(prev => ({ 
      ...prev, 
      checks: { ...prev.checks, [idx]: value } 
    })); 
  };

  // Gantt Math
  const getGanttExtremes = () => {
    if (tasks.length === 0) return { start: new Date(), end: new Date(), totalDays: 1 };
    let minStart = new Date(tasks[0].startDate);
    let maxEnd = new Date(tasks[0].endDate);
    tasks.forEach(t => {
      const s = new Date(t.startDate);
      const e = new Date(t.endDate);
      if (s < minStart) minStart = s;
      if (e > maxEnd) maxEnd = e;
    });
    const totalDays = Math.max(1, Math.ceil((maxEnd - minStart) / (1000 * 60 * 60 * 24)));
    return { start: minStart, end: maxEnd, totalDays };
  };
  const { start: projectStart, totalDays } = getGanttExtremes();

  const handleExportTab = () => {
    if (activeTab === 'RA Bills') {
      const data = raBills.map(b => ({
        'Bill No': b.billNo,
        'Date': b.billDate,
        'Subcontractor': b.subName,
        'Trade': b.trade || '-',
        'Project Site': b.projectName,
        'Gross Amount': b.grossAmount,
        'Retention (5%)': b.retentionAmount,
        'Previous Paid': b.previousPaid,
        'Net Payable': b.netPayable
      }));
      exportToCSV('Subcontractor_RA_Bills_Ledger', data);
    } else if (activeTab === 'Milestones') {
      const data = milestones.map(m => ({
        'Stage Name': m.stageName,
        'Project Site': m.projectName,
        'Percentage': `${m.percentage}%`,
        'Amount (INR)': m.amount,
        'Due Date': m.dueDate || 'TBD',
        'Status': m.status
      }));
      exportToCSV('Project_Payment_Milestones', data);
    } else if (activeTab === 'Change Orders') {
      const data = changeOrders.map(c => ({
        'Variation Title': c.title,
        'Project Site': c.projectName,
        'Additional Cost (INR)': c.additionalCost,
        'Extra Days': c.extraDays,
        'Date Approved': c.date,
        'Description': c.description
      }));
      exportToCSV('Project_Change_Orders_Variations', data);
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-xs font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* Header */}
      <div className="flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center pb-6 mb-4 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Project Control & Handover Center</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Running Account (RA) certifications, client milestone gating, scope variations, and quality SOP audit sign-offs.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={selectedProjectId} 
            onChange={e => setSelectedProjectId(e.target.value)}
            className="h-10 bg-white border border-zinc-200 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-800 px-3.5 py-2 outline-none cursor-pointer shadow-sm"
          >
            <option value="">All Projects Overview</option>
            {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
          </select>

          {['RA Bills', 'Milestones', 'Change Orders'].includes(activeTab) && (
            <button
              onClick={handleExportTab}
              className="h-10 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>
          )}

          {activeTab === 'RA Bills' && (
            <button onClick={() => setIsRaModalOpen(true)} className="h-10 bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Generate RA Bill
            </button>
          )}
          {activeTab === 'Milestones' && (
            <button onClick={() => setIsMilestoneModalOpen(true)} className="h-10 bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Add Milestone
            </button>
          )}
          {activeTab === 'Change Orders' && (
            <button onClick={() => setIsCoModalOpen(true)} className="h-10 bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> New Scope Variation
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 w-fit mb-4 shrink-0 overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden">
        {['RA Bills', 'Milestones', 'Change Orders', 'Schedule', 'QA/QC'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {tab === 'Schedule' ? 'Gantt Schedule' : tab === 'QA/QC' ? 'QA/QC Audits' : tab}
          </button>
        ))}
      </div>

      {/* Content Rendering */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-10">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p>Syncing project control ledgers...</p>
          </div>
        ) : activeTab === 'RA Bills' ? (
          
          /* RA BILLS TABLE */
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
            <div className="p-5 border-b border-zinc-200 bg-white flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Running Account (RA) Certification</h3>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">Certified contractor bills with automated 5% retention deductions.</p>
              </div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded border border-zinc-200">
                {raBills.length} Inward Bills
              </span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[950px]">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border-b border-zinc-200">
                    <th className="py-3.5 px-6 w-36">Bill No</th>
                    <th className="py-3.5 px-6">Trade Contractor Agency</th>
                    <th className="py-3.5 px-6 w-48">Project Site</th>
                    <th className="py-3.5 px-6 text-right w-36">Gross Total</th>
                    <th className="py-3.5 px-6 text-right w-40">5% Retention Held</th>
                    <th className="py-3.5 px-6 text-right w-40">Net Payable</th>
                    <th className="py-3.5 px-6 text-center w-36">Vault Doc</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-zinc-100">
                  {raBills.length === 0 ? (
                    <tr><td colSpan="7" className="py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">No Running Account Bills generated.</td></tr>
                  ) : (
                    raBills.map(b => (
                      <tr key={b.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-4 px-6 font-bold text-zinc-900 tracking-tight font-mono">{b.billNo}</td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-sm text-zinc-900 tracking-tight">{b.subName || 'Subcontractor'}</p>
                          {b.trade && <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mt-0.5">{b.trade}</span>}
                        </td>
                        <td className="py-4 px-6 text-xs text-zinc-600 font-semibold">{b.projectName || 'General Site'}</td>
                        <td className="py-4 px-6 text-right font-medium text-xs text-zinc-700 font-mono">₹{(b.grossAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6 text-right text-xs text-red-600 font-bold font-mono">-₹{(b.retentionAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6 text-right font-black text-sm text-zinc-900 bg-zinc-50/50 font-mono">₹{(b.netPayable || 0).toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6 text-center">
                          {b.fileUrl ? (
                            <a href={b.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-700 bg-white border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-900 hover:text-white transition-all shadow-sm">
                              View Doc
                            </a>
                          ) : (
                            <span className="text-zinc-300 text-xs font-bold">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        ) : activeTab === 'Milestones' ? (
          
          /* MILESTONES GRID (WITH AUTOMATED INVOICE GENERATION & HANDOVER GATING) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {milestones.length === 0 ? (
              <div className="col-span-full py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest bg-white border border-dashed border-zinc-300 rounded-xl">
                No client payment milestones created. Click "+ Add Milestone" above.
              </div>
            ) : (
              milestones.map(m => {
                const isInvoiced = m.status === 'Invoiced';
                const isReceived = m.status === 'Received';
                const isHandover = m.isHandoverMilestone || (m.stageName && m.stageName.toLowerCase().includes('handover'));

                return (
                  <div key={m.id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:border-zinc-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded truncate max-w-[170px]">
                          {m.projectName || 'General Site'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isHandover && (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              Handover Gate
                            </span>
                          )}
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                            isReceived 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : isInvoiced 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-zinc-50 text-zinc-600 border-zinc-200'
                          }`}>
                            {m.status}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-bold text-zinc-900 text-base mb-1 tracking-tight">{m.stageName}</h4>
                      <p className="text-2xl font-black text-zinc-900 mb-3 tracking-tight font-mono">
                        ₹{(m.amount || 0).toLocaleString('en-IN')} 
                        <span className="text-xs font-bold text-zinc-400 align-middle ml-2 font-sans">({m.percentage}%)</span>
                      </p>
                      {m.notes && <p className="text-xs text-zinc-500 mb-4 font-medium leading-relaxed">{m.notes}</p>}
                    </div>

                    <div className="pt-3 border-t border-zinc-100 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        <span>Target Due: {m.dueDate || 'N/A'}</span>
                        {m.fileUrl && (
                          <a href={m.fileUrl} target="_blank" rel="noreferrer" className="text-zinc-700 hover:underline">
                            Attachment ↗
                          </a>
                        )}
                      </div>

                      {/* AUTOMATION BUTTONS */}
                      <div className="flex gap-2 pt-1">
                        {!isInvoiced && !isReceived && (
                          <button 
                            onClick={() => handleAutoGenerateInvoice(m)} 
                            disabled={submitting}
                            className="flex-1 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm transition-all border border-black cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            Generate Invoice
                          </button>
                        )}

                        {m.status !== 'Received' && (
                          <button 
                            onClick={() => handleMarkMilestoneReceived(m)} 
                            disabled={submitting}
                            className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-800"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Mark Received
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        ) : activeTab === 'Change Orders' ? (
          
          /* CHANGE ORDERS GRID (AUTO-EXPANDS PROJECT BUDGET) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {changeOrders.length === 0 ? (
              <div className="col-span-full py-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest bg-white border border-dashed border-zinc-300 rounded-xl">
                No scope variations logged. Click "+ New Scope Variation" above.
              </div>
            ) : (
              changeOrders.map(co => (
                <div key={co.id} className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm hover:border-zinc-400 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md">{co.projectName || 'General Site'}</span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono">{co.date}</span>
                    </div>
                    <h4 className="font-bold text-zinc-900 text-sm mb-1.5 tracking-tight">{co.title}</h4>
                    <p className="text-xs text-zinc-500 mb-6 leading-relaxed font-medium">{co.description}</p>
                  </div>
                  <div className="pt-4 border-t border-zinc-100 flex justify-between items-center mt-2">
                    <span className="font-black text-lg text-zinc-900 font-mono">+₹{(co.additionalCost || 0).toLocaleString('en-IN')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md">+{co.extraDays} Days</span>
                      {co.fileUrl && (
                        <a href={co.fileUrl} target="_blank" rel="noreferrer" className="p-2 text-zinc-600 bg-zinc-100 border border-zinc-200 rounded-lg hover:bg-zinc-900 hover:text-white transition-all shadow-sm" title="View Client Approval">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        ) : activeTab === 'Schedule' ? (
          
          /* GANTT SCHEDULING TIMELINE */
          <div className="space-y-6">
            {!selectedProjectId ? (
              <div className="p-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest bg-white border border-dashed border-zinc-300 rounded-xl">
                Please select a Project Site above to open its execution Gantt schedule.
              </div>
            ) : (
              <>
                <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-3">Add Construction Phase / Milestone Activity</h3>
                  <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full"><label className={labelClass}>Activity / Phase Name</label><input type="text" required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="e.g. Wardrobe Veneer Paneling & Polish" className={inputClass} /></div>
                    <div className="w-full md:w-44"><label className={labelClass}>Start Date</label><input type="date" required value={newTask.startDate} onChange={e => setNewTask({...newTask, startDate: e.target.value})} className={inputClass} /></div>
                    <div className="w-full md:w-44"><label className={labelClass}>End Date</label><input type="date" required value={newTask.endDate} onChange={e => setNewTask({...newTask, endDate: e.target.value})} className={inputClass} /></div>
                    <div className="w-full md:w-48"><label className={labelClass}>Agency Assignee</label><input type="text" value={newTask.assignee} onChange={e => setNewTask({...newTask, assignee: e.target.value})} placeholder="e.g. Carpenter Gang" className={inputClass} /></div>
                    <button type="submit" className="bg-zinc-900 hover:bg-black text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-sm transition-all shrink-0 uppercase tracking-widest border border-black cursor-pointer">
                      Add Task
                    </button>
                  </form>
                </div>

                <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-zinc-200 bg-white flex justify-between items-center">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest">Site Schedule Execution Timeline ({totalDays} Days Span)</h3>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-100 px-3 py-1 rounded border border-zinc-200">{tasks.length} Milestone Phases</span>
                  </div>
                  {tasks.length === 0 ? (
                    <div className="p-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest">No activities scheduled yet.</div>
                  ) : (
                    <div className="overflow-x-auto bg-zinc-50/50">
                      <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                          <tr className="bg-white text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-200">
                            <th className="p-4 w-80 border-r border-zinc-200">Activity Particulars</th>
                            <th className="p-4 relative">
                              Gantt Visualization ({projectStart.toISOString().split('T')[0]} onwards)
                              <div className="absolute inset-0 flex justify-between px-4 pointer-events-none opacity-20">
                                {[25, 50, 75, 100].map(pct => (
                                  <div key={pct} className="h-full border-l border-dashed border-zinc-900" style={{ left: `${pct}%`, position: 'absolute' }}></div>
                                ))}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-sm">
                          {tasks.sort((a,b) => new Date(a.startDate) - new Date(b.startDate)).map(task => {
                            const tStart = new Date(task.startDate);
                            const tEnd = new Date(task.endDate || task.startDate);
                            const leftPct = Math.max(0, Math.min(100, (((tStart - projectStart) / (1000 * 60 * 60 * 24)) / totalDays) * 100));
                            const widthPct = Math.max(2, Math.min(100 - leftPct, (((tEnd - tStart) / (1000 * 60 * 60 * 24)) / totalDays) * 100));
                            
                            return (
                              <tr key={task.id} className="hover:bg-zinc-100/50 transition-colors">
                                <td className="p-4 border-r border-zinc-200 bg-white">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <p className="font-bold text-zinc-900 tracking-tight text-xs">{task.title}</p>
                                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{task.startDate} &rarr; {task.endDate} • {task.assignee || 'Unassigned'}</p>
                                    </div>
                                    <select
                                      value={task.status}
                                      onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                                      className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border outline-none cursor-pointer ${
                                        task.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                        task.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        task.status === 'Delayed' ? 'bg-red-50 text-red-700 border-red-200' :
                                        'bg-zinc-100 text-zinc-600 border-zinc-200'
                                      }`}
                                    >
                                      <option value="Pending">Pending</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Completed">Completed</option>
                                      <option value="Delayed">Delayed</option>
                                    </select>
                                  </div>
                                </td>
                                <td className="p-4 relative">
                                  <div className="relative w-full h-7 bg-zinc-100 rounded overflow-hidden border border-zinc-200">
                                    <div 
                                      className={`absolute top-0 bottom-0 rounded shadow-sm flex items-center px-2 cursor-pointer transition-all ${
                                        task.status === 'Completed' ? 'bg-emerald-600 text-white' :
                                        task.status === 'Delayed' ? 'bg-red-600 text-white' :
                                        task.status === 'In Progress' ? 'bg-blue-600 text-white' :
                                        'bg-zinc-900 text-white'
                                      }`}
                                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                      title={`${task.title}: ${task.startDate} to ${task.endDate}`}
                                    >
                                      {widthPct > 8 && <span className="text-[8px] font-bold uppercase tracking-widest truncate">{task.status}</span>}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        ) : activeTab === 'QA/QC' ? (

          /* QA/QC CHECKLIST AUDITS (FAILURES AUTO-CREATE SNAG TICKETS) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            {!selectedProjectId ? (
              <div className="lg:col-span-12 p-16 text-center text-zinc-400 font-bold text-xs uppercase tracking-widest bg-white border border-dashed border-zinc-300 rounded-xl">
                Please select a Project Site above to conduct quality audits.
              </div>
            ) : (
              <>
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6">
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-1.5">Initiate Quality Audit</h3>
                    <p className="text-xs text-zinc-500 font-medium mb-4 leading-relaxed">Failed checklist items automatically create high-priority defect tickets in Site Snags.</p>
                    <div className="space-y-4">
                      <select 
                        value={activeTemplate} 
                        onChange={e => setActiveTemplate(e.target.value)} 
                        className={inputClass} 
                        disabled={currentInspection?.id}
                      >
                        <option value="" disabled>Select QA/QC SOP Checklist...</option>
                        {Object.keys(qaTemplates).map(key => <option key={key} value={key}>{qaTemplates[key].title}</option>)}
                      </select>
                      <button 
                        onClick={handleStartInspection} 
                        disabled={!activeTemplate || currentInspection?.id} 
                        className="w-full py-3 bg-zinc-900 hover:bg-black text-white font-bold rounded-lg text-xs uppercase tracking-widest shadow-sm disabled:opacity-50 transition-all border border-black cursor-pointer"
                      >
                        Start Audit Checklist
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 border-b border-zinc-200 bg-white flex justify-between items-center">
                      <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest">Inspection History</h3>
                      <span className="text-[9px] font-mono font-bold text-zinc-400">{inspections.length} Audits</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 [&::-webkit-scrollbar]:hidden bg-zinc-50/50">
                      {inspections.map(insp => (
                        <div key={insp.id} className="p-4 border border-zinc-200 rounded-xl bg-white hover:border-zinc-300 transition-colors shadow-sm">
                          <div className="flex justify-between items-start mb-1.5">
                            <h4 className="text-xs font-bold text-zinc-900 tracking-tight">{insp.title}</h4>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${
                              insp.status === 'PASSED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {insp.status}
                            </span>
                          </div>
                          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Audit: {insp.date} • {insp.inspector}</p>
                        </div>
                      ))}
                      {inspections.length === 0 && <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest text-center py-10">No audits recorded yet.</p>}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8">
                  {!currentInspection ? (
                    <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-16 text-center h-full flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center mb-3 border border-zinc-200">
                        <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-bold text-zinc-900 tracking-tight uppercase">No Active Inspection</h3>
                      <p className="text-xs text-zinc-500 font-medium mt-1">Select an SOP template on the left to initiate quality verification.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
                      <div className="p-5 border-b border-zinc-200 bg-zinc-900 text-white flex justify-between items-center">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest">SOP: {currentInspection.title}</h3>
                          <p className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-widest">Failed items auto-route to the Site Snags Punch List to gate final handover.</p>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 space-y-3.5 bg-[#F4F4F5]">
                        {qaTemplates[currentInspection.templateKey].items.map((item, idx) => {
                          const status = currentInspection.checks[idx];
                          return (
                            <div key={idx} className={`p-4 border rounded-xl flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center transition-colors shadow-sm ${
                              status === 'PASS' ? 'bg-emerald-50/70 border-emerald-300' : 
                              status === 'FAIL' ? 'bg-red-50/70 border-red-300' : 
                              'bg-white border-zinc-200'
                            }`}>
                              <div className="flex-1 pr-4">
                                <p className="text-xs font-bold text-zinc-900 leading-snug tracking-tight">
                                  <span className="text-zinc-400 mr-2 font-mono">{idx + 1}.</span> {item}
                                </p>
                              </div>
                              <div className="flex gap-1.5 shrink-0 bg-white p-1 rounded-lg border border-zinc-200 shadow-sm">
                                <button onClick={() => handleCheck(idx, 'PASS')} className={`px-4 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer ${status === 'PASS' ? 'bg-emerald-600 text-white shadow-inner' : 'text-zinc-500 hover:bg-zinc-100'}`}>Pass</button>
                                <button onClick={() => handleCheck(idx, 'FAIL')} className={`px-4 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer ${status === 'FAIL' ? 'bg-red-600 text-white shadow-inner' : 'text-zinc-500 hover:bg-zinc-100'}`}>Fail</button>
                                <button onClick={() => handleCheck(idx, 'NA')} className={`px-4 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer ${status === 'NA' ? 'bg-zinc-900 text-white shadow-inner' : 'text-zinc-500 hover:bg-zinc-100'}`}>N/A</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-4 border-t border-zinc-200 bg-white flex justify-between items-center">
                        <button onClick={() => setCurrentInspection(null)} className="px-5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-sm cursor-pointer">Cancel</button>
                        <button onClick={handleSaveInspection} disabled={submitting} className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white font-bold rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-sm border border-black cursor-pointer">Sign-off Audit</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* RA BILL MODAL */}
      {isRaModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Generate Contractor RA Bill</h2>
              <button onClick={() => setIsRaModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer">✕</button>
            </div>
            <div className="p-8 overflow-y-auto bg-[#F4F4F5]">
              <form id="raForm" onSubmit={handleSaveRa} className="space-y-4 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <select required value={raForm.projectId} onChange={e => setRaForm({...raForm, projectId: e.target.value})} className={`${inputClass} font-bold`}>
                    <option value="">Select Project Site...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Subcontractor Agency <span className="text-red-500">*</span></label>
                  <select required value={raForm.subcontractorId} onChange={e => setRaForm({...raForm, subcontractorId: e.target.value})} className={`${inputClass} font-bold`}>
                    <option value="">Select Agency...</option>
                    {subcontractors.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name} ({s.trade})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Bill No <span className="text-red-500">*</span></label><input type="text" required placeholder="RA-001" value={raForm.billNo} onChange={e => setRaForm({...raForm, billNo: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Gross Total (₹) <span className="text-red-500">*</span></label><input type="number" step="any" required placeholder="0.00" value={raForm.grossAmount} onChange={e => setRaForm({...raForm, grossAmount: e.target.value})} className={`${inputClass} font-bold`} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Retention %</label><input type="number" step="any" value={raForm.retentionPercent} onChange={e => setRaForm({...raForm, retentionPercent: e.target.value})} className={`${inputClass} font-bold text-center`} /></div>
                  <div><label className={labelClass}>Previous Paid (₹)</label><input type="number" step="any" placeholder="0.00" value={raForm.previousPaid} onChange={e => setRaForm({...raForm, previousPaid: e.target.value})} className={inputClass} /></div>
                </div>
                <div>
                  <label className={labelClass}>Attach Invoice / JMR Document</label>
                  <input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setRaForm)} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-zinc-200 file:text-zinc-900 cursor-pointer border border-zinc-200 rounded-lg bg-zinc-50" />
                </div>
              </form>
            </div>
            <div className="px-8 py-4 border-t border-zinc-200 flex justify-end gap-2 bg-white shrink-0">
              <button type="button" onClick={() => setIsRaModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
              <button type="submit" form="raForm" disabled={submitting} className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm border border-black cursor-pointer">Save RA Bill</button>
            </div>
          </div>
        </div>
      )}

      {/* MILESTONE MODAL */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Add Payment Milestone</h2>
              <button onClick={() => setIsMilestoneModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer">✕</button>
            </div>
            <div className="p-8 overflow-y-auto bg-[#F4F4F5]">
              <form id="milestoneForm" onSubmit={handleSaveMilestone} className="space-y-4 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <select required value={milestoneForm.projectId} onChange={e => setMilestoneForm({...milestoneForm, projectId: e.target.value})} className={`${inputClass} font-bold`}>
                    <option value="">Select Project Site...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Stage Name <span className="text-red-500">*</span></label><input type="text" required placeholder="e.g. 50% False Ceiling & MEP Sign-off" value={milestoneForm.stageName} onChange={e => setMilestoneForm({...milestoneForm, stageName: e.target.value})} className={inputClass} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Percentage (%)</label><input type="number" step="any" value={milestoneForm.percentage} onChange={e => setMilestoneForm({...milestoneForm, percentage: e.target.value})} className={`${inputClass} font-bold text-center`} placeholder="25" /></div>
                  <div><label className={labelClass}>Amount (₹) <span className="text-red-500">*</span></label><input type="number" step="any" required value={milestoneForm.amount} onChange={e => setMilestoneForm({...milestoneForm, amount: e.target.value})} className={`${inputClass} font-bold`} placeholder="0.00" /></div>
                </div>
                <div><label className={labelClass}>Target Due Date</label><input type="date" value={milestoneForm.dueDate} onChange={e => setMilestoneForm({...milestoneForm, dueDate: e.target.value})} className={inputClass} /></div>
                
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isHandoverGate" 
                    checked={milestoneForm.isHandoverMilestone} 
                    onChange={e => setMilestoneForm({...milestoneForm, isHandoverMilestone: e.target.checked})} 
                    className="w-4 h-4 accent-amber-600 rounded cursor-pointer" 
                  />
                  <label htmlFor="isHandoverGate" className="text-xs font-bold text-amber-900 cursor-pointer">
                    Gate this milestone against unresolved Site Snags (Quality Handover Gate)
                  </label>
                </div>

                <div><label className={labelClass}>Attach Approval Document</label><input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setMilestoneForm)} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-zinc-200 file:text-zinc-900 cursor-pointer border border-zinc-200 rounded-lg bg-zinc-50" /></div>
              </form>
            </div>
            <div className="px-8 py-4 border-t border-zinc-200 flex justify-end gap-2 bg-white shrink-0">
              <button type="button" onClick={() => setIsMilestoneModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
              <button type="submit" form="milestoneForm" disabled={submitting} className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm border border-black cursor-pointer">Save Milestone</button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE ORDER MODAL */}
      {isCoModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Scope Variation (Change Order)</h2>
              <button onClick={() => setIsCoModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 flex items-center justify-center cursor-pointer">✕</button>
            </div>
            <div className="p-8 overflow-y-auto bg-[#F4F4F5]">
              <form id="coForm" onSubmit={handleSaveCo} className="space-y-4 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Project Site <span className="text-red-500">*</span></label>
                  <select required value={coForm.projectId} onChange={e => setCoForm({...coForm, projectId: e.target.value})} className={`${inputClass} font-bold`}>
                    <option value="">Select Project Site...</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>Variation Title <span className="text-red-500">*</span></label><input type="text" required value={coForm.title} onChange={e => setCoForm({...coForm, title: e.target.value})} className={inputClass} placeholder="e.g. Additional Italian Marble Paneling" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Additional Cost (₹) <span className="text-red-500">*</span></label><input type="number" step="any" required value={coForm.additionalCost} onChange={e => setCoForm({...coForm, additionalCost: e.target.value})} className={`${inputClass} font-bold`} placeholder="0.00" /></div>
                  <div><label className={labelClass}>Extra Days Needed</label><input type="number" value={coForm.extraDays} onChange={e => setCoForm({...coForm, extraDays: e.target.value})} className={`${inputClass} text-center font-bold`} placeholder="0" /></div>
                </div>
                <div><label className={labelClass}>Description & Technical Variations</label><textarea value={coForm.description} onChange={e => setCoForm({...coForm, description: e.target.value})} className={`${inputClass} resize-y min-h-[70px]`} placeholder="Specify client approval and changed material specs..."></textarea></div>
                <div><label className={labelClass}>Attach Approval Document</label><input type="file" accept="image/*,.pdf" onChange={e => handleFileUpload(e, setCoForm)} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-zinc-200 file:text-zinc-900 cursor-pointer border border-zinc-200 rounded-lg bg-zinc-50" /></div>
              </form>
            </div>
            <div className="px-8 py-4 border-t border-zinc-200 flex justify-end gap-2 bg-white shrink-0">
              <button type="button" onClick={() => setIsCoModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
              <button type="submit" form="coForm" disabled={submitting} className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm border border-black cursor-pointer">Save & Expand Budget</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}