import { 
    saveProject, 
    saveClientWorkOrder, 
    saveInvoice, 
    saveIncomeRecord,
    savePurchase,
    saveVendorPayment,
    saveMaterialRate,
    saveInventoryMovement,
    saveVaultDocument,
    saveTask,
    saveRaBill,
    updateMilestoneStatus
  } from '../db';
  
  /**
   * 1. CRM -> PROJECT & CLIENT ONBOARDING
   * Trigger: When a CRM lead is marked "Won"
   */
  export async function autoConvertLeadToProject(lead) {
    const newProject = {
      name: lead.projectName || `${lead.clientName} Residence`,
      clientName: lead.clientName,
      clientPhone: lead.phone || '',
      clientEmail: lead.email || '',
      clientAddress: lead.siteAddress || lead.address || '',
      budget: parseFloat(lead.estimatedBudget) || 0,
      status: 'Planning',
      poDate: new Date().toISOString().split('T')[0]
    };
  
    const savedProj = await saveProject(newProject);
  
    // Auto-seed initial site setup task in TaskBoard
    await saveTask({
      projectId: savedProj.id || savedProj._id,
      projectName: savedProj.name,
      title: 'Site Mobilization & Laser Survey',
      description: 'Initial site handover, structural benchmark leveling, and protection sheet application.',
      status: 'To Do',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      assignedTo: 'Site Engineer'
    });
  
    return savedProj;
  }
  
  /**
   * 2. ESTIMATION -> CLIENT WORK ORDER & BILLING MILESTONES
   * Trigger: When a BOQ/Estimate is approved by client
   */
  export async function autoConvertEstimateToWorkOrder(estimate, project) {
    const workOrder = {
      woType: 'Client',
      woNo: `WO/EST-${estimate.id || Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      projectId: project.id || project._id,
      projectName: project.name,
      clientName: project.clientName,
      clientAddress: project.clientAddress || '',
      clientPhone: project.clientPhone || '',
      scopeOfWork: `Turnkey execution as per approved Estimation #${estimate.estimateNo || estimate.id}`,
      items: (estimate.items || []).map(item => ({
        id: Date.now() + Math.random(),
        room: item.category || 'General',
        description: item.description || item.itemName,
        qty: item.qty || 1,
        rate: item.rate || 0,
        amount: (parseFloat(item.qty) || 1) * (parseFloat(item.rate) || 0)
      })),
      totalAmount: parseFloat(estimate.grandTotal || estimate.totalAmount) || 0,
      terms: estimate.terms || 'Standard Company Execution Terms'
    };
  
    return await saveClientWorkOrder(workOrder);
  }
  
  /**
   * 3. PURCHASE ORDER -> PURCHASES BILL + INVENTORY + VENDOR LEDGER + RATE BOOK
   * Trigger: When materials arrive and PO is approved
   */
  export async function autoFulfillPurchaseOrder(po, billInvoiceNo) {
    const invoiceDate = new Date().toISOString().split('T')[0];
  
    // A. Log official Purchase Bill
    const purchaseBill = {
      vendorName: po.vendorName,
      gstin: po.vendorGst || '',
      projectName: po.projectName || 'Central Inventory',
      invoiceNo: billInvoiceNo || `BILL-${po.poNo.replace(/[^0-9]/g, '')}`,
      invoiceDate: invoiceDate,
      taxMode: po.vendorGst ? 'CGST_SGST' : 'NONE',
      items: (po.items || []).map(item => ({
        id: Date.now() + Math.random(),
        materialName: item.description,
        qty: item.qty,
        unit: item.uom || 'Nos',
        rate: item.rate,
        gst: item.tax || 18
      })),
      taxableAmount: po.items.reduce((sum, i) => sum + (parseFloat(i.qty) * parseFloat(i.rate)), 0),
      gstAmount: po.items.reduce((sum, i) => sum + ((parseFloat(i.qty) * parseFloat(i.rate) * (parseFloat(i.tax) || 0)) / 100), 0),
      totalAmount: parseFloat(po.amount?.replace(/[^0-9.-]+/g, '')) || 0,
      remarks: `Auto-fulfilled from PO #${po.poNo}`,
      returnStatus: 'Pending'
    };
    await savePurchase(purchaseBill);
  
    // B. Auto-update Inventory Stock (+IN)
    for (const item of po.items || []) {
      await saveInventoryMovement({
        projectId: po.projectId || '',
        projectName: po.projectName || 'Central Godown',
        itemName: item.description,
        quantity: parseFloat(item.qty) || 0,
        unit: item.uom || 'Nos',
        type: 'IN',
        date: invoiceDate,
        notes: `Received via PO #${po.poNo}`
      });
  
      // C. Auto-sync Rate Book (Ensures purchasing always has latest price)
      if (item.description && parseFloat(item.rate) > 0) {
        await saveMaterialRate({
          materialName: item.description,
          vendorName: po.vendorName,
          rate: parseFloat(item.rate),
          unit: item.uom || 'Nos',
          date: invoiceDate,
          notes: `PO Fulfill #${po.poNo}`
        });
      }
    }
  
    return true;
  }
  
  /**
   * 4. MILESTONE COMPLETED -> TAX INVOICE GENERATION
   * Trigger: When a construction stage is completed in Project Control
   */
  export async function autoGenerateInvoiceFromMilestone(milestone, project, companySettings) {
    const invoiceRecord = {
      client: project.clientName,
      partyName: project.clientName,
      partyAddress: project.clientAddress || '',
      gstNo: project.clientGstin || '',
      placeOfSupply: 'Telangana (36)',
      invoiceNo: `${companySettings.invoicePrefix || 'INV/2026/'}${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      poNumber: project.poNumber || `PO-${project.name.substring(0, 3).toUpperCase()}`,
      taxMode: 'CGST_SGST',
      items: [
        {
          id: Date.now(),
          description: `Project Milestone: ${milestone.stageName}`,
          hsn: companySettings.defaultHsnSac || '9954',
          qty: 1,
          rate: milestone.amount,
          gst: 18
        }
      ],
      terms: companySettings.defaultInvoiceTerms || '',
      amount: `₹ ${((parseFloat(milestone.amount) || 0) * 1.18).toLocaleString('en-IN')}`,
      status: 'Pending'
    };
  
    const savedInv = await saveInvoice(invoiceRecord);
    await updateMilestoneStatus(milestone.id, 'Invoiced');
    return savedInv;
  }
  
  /**
   * 5. CLIENT PAYMENT RECEIVED -> AUTO UPDATE INCOME & CLEAR INVOICE
   * Trigger: When bank transfer or check is logged
   */
  export async function autoRecordClientPayment(invoice, amountReceived, paymentMode, transactionRef) {
    const paymentDate = new Date().toISOString().split('T')[0];
  
    // A. Save directly to Income records (Feed for P&L)
    await saveIncomeRecord({
      projectId: invoice.projectId || '',
      projectName: invoice.projectName || invoice.client,
      amount: parseFloat(amountReceived),
      date: paymentDate,
      paymentMode: paymentMode || 'Bank Transfer',
      referenceNo: transactionRef || '',
      notes: `Settlement for Invoice #${invoice.invoiceNo}`
    });
  
    // B. Update Invoice Balance & Status
    const invoiceTotal = parseFloat(invoice.amount.replace(/[^0-9.-]+/g, '')) || 0;
    const currentAdvance = parseFloat(invoice.advanceReceived || 0) + parseFloat(amountReceived);
    const isFullySettled = currentAdvance >= invoiceTotal;
  
    await saveInvoice({
      ...invoice,
      advanceReceived: currentAdvance,
      status: isFullySettled ? 'Paid' : 'Pending'
    });
  
    return true;
  }