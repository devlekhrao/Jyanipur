import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_DATABASE_URL);

// ==========================================
// INVOICE MODULE
// ==========================================
export async function getInvoices() {
  try {
    const data = await sql`SELECT * FROM invoices ORDER BY id DESC`;
    return data.map(inv => ({
      id: inv.id,
      date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : '',
      invoiceNo: inv.invoice_no,
      client: inv.client,
      partyAddress: inv.party_address,
      gstNo: inv.gst_no,
      placeOfSupply: inv.place_of_supply,
      poNumber: inv.po_number,
      poDate: inv.po_date ? new Date(inv.po_date).toISOString().split('T')[0] : '',
      taxMode: inv.tax_mode,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items,
      bankName: inv.bank_name,
      accountName: inv.account_name,
      accountNo: inv.account_no,
      ifscCode: inv.ifsc_code,
      terms: inv.terms,
      description: inv.description,
      discount: Number(inv.discount),
      advanceReceived: Number(inv.advance_received),
      amount: inv.amount,
      isCancelled: inv.is_cancelled
    }));
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return [];
  }
}

export async function saveInvoice(inv) {
  try {
    const result = await sql`
      INSERT INTO invoices (
        invoice_no, date, client, party_address, gst_no, place_of_supply, 
        po_number, po_date, tax_mode, items, bank_name, account_name, 
        account_no, ifsc_code, terms, description, discount, advance_received, amount, is_cancelled
      ) VALUES (
        ${inv.invoiceNo}, ${inv.date}, ${inv.partyName}, ${inv.partyAddress}, ${inv.gstNo}, ${inv.placeOfSupply},
        ${inv.poNumber}, ${inv.poDate || null}, ${inv.taxMode}, ${JSON.stringify(inv.items)}, ${inv.bankName}, ${inv.accountName},
        ${inv.accountNo}, ${inv.ifscCode}, ${inv.terms}, ${inv.description}, ${parseFloat(inv.discount) || 0}, ${parseFloat(inv.advanceReceived) || 0}, ${inv.amount}, false
      )
      ON CONFLICT (invoice_no) DO UPDATE SET
        date = EXCLUDED.date, client = EXCLUDED.client, party_address = EXCLUDED.party_address, gst_no = EXCLUDED.gst_no,
        place_of_supply = EXCLUDED.place_of_supply, po_number = EXCLUDED.po_number, po_date = EXCLUDED.po_date,
        tax_mode = EXCLUDED.tax_mode, items = EXCLUDED.items, bank_name = EXCLUDED.bank_name, account_name = EXCLUDED.account_name,
        account_no = EXCLUDED.account_no, ifsc_code = EXCLUDED.ifsc_code, terms = EXCLUDED.terms, description = EXCLUDED.description,
        discount = EXCLUDED.discount, advance_received = EXCLUDED.advance_received, amount = EXCLUDED.amount
      RETURNING id;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving invoice:', err);
    throw err;
  }
}

export async function toggleCancelInvoice(id, currentStatus) {
  try {
    await sql`UPDATE invoices SET is_cancelled = ${!currentStatus} WHERE id = ${id}`;
  } catch (err) {
    console.error('Error cancelling invoice:', err);
  }
}

// ==========================================
// EMPLOYEE & ATTENDANCE MODULE
// ==========================================
export async function getEmployees() {
  try {
    const data = await sql`SELECT * FROM employees ORDER BY id ASC`;
    return data.map(emp => ({
      id: emp.id,
      empId: emp.emp_id,
      fullName: emp.full_name,
      role: emp.role,
      phone: emp.phone,
      payType: emp.pay_type,
      payRate: Number(emp.pay_rate),
      joiningDate: emp.joining_date ? new Date(emp.joining_date).toISOString().split('T')[0] : '',
      bankName: emp.bank_name,
      accountNo: emp.account_no,
      ifscCode: emp.ifsc_code,
      idNumber: emp.id_number,
      status: emp.status
    }));
  } catch (err) {
    console.error('Error fetching employees:', err);
    return [];
  }
}

export async function saveEmployee(emp) {
  try {
    const result = await sql`
      INSERT INTO employees (
        emp_id, full_name, role, phone, pay_type, pay_rate, joining_date, 
        bank_name, account_no, ifsc_code, id_number, status
      ) VALUES (
        ${emp.empId}, ${emp.fullName}, ${emp.role}, ${emp.phone}, ${emp.payType}, 
        ${emp.payRate}, ${emp.joiningDate}, ${emp.bankName}, ${emp.accountNo}, 
        ${emp.ifscCode}, ${emp.idNumber}, ${emp.status}
      )
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving employee:', err);
    throw err;
  }
}

export async function getTodayAttendance(dateStr) {
  try {
    const data = await sql`SELECT emp_id, status FROM attendance_logs WHERE date = ${dateStr}`;
    const map = {};
    data.forEach(row => { map[row.emp_id] = row.status; });
    return map;
  } catch (err) {
    console.error('Error fetching attendance:', err);
    return {};
  }
}

export async function saveAttendance(empId, dateStr, status) {
  try {
    await sql`
      INSERT INTO attendance_logs (emp_id, date, status)
      VALUES (${empId}, ${dateStr}, ${status})
      ON CONFLICT (emp_id, date) DO UPDATE SET status = EXCLUDED.status;
    `;
  } catch (err) {
    console.error('Error saving attendance:', err);
  }
}

export async function getMonthlyAttendance(year, month) {
  try {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; 

    const data = await sql`
      SELECT emp_id, date, status 
      FROM attendance_logs 
      WHERE date >= ${startDate} AND date <= ${endDate}
    `;

    const map = {};
    data.forEach(row => {
      if (!map[row.emp_id]) map[row.emp_id] = {};
      const dayStr = new Date(row.date).toISOString().split('T')[0];
      map[row.emp_id][dayStr] = row.status;
    });
    return map;
  } catch (err) {
    console.error('Error fetching monthly attendance:', err);
    return {};
  }
}

// ==========================================
// EXPENSES & REPORTS MODULE
// ==========================================
export async function getExpenses() {
  try {
    const data = await sql`SELECT * FROM expenses ORDER BY id DESC`;
    return data.map(ex => ({
      id: ex.id,
      date: ex.date ? new Date(ex.date).toISOString().split('T')[0] : '',
      category: ex.category,
      vendor: ex.vendor,
      gstin: ex.gstin,
      taxableAmount: Number(ex.taxable_amount || 0),
      gstAmount: Number(ex.gst_amount || 0),
      totalAmount: Number(ex.total_amount || 0)
    }));
  } catch (err) {
    console.error('Error fetching expenses:', err);
    return [];
  }
}

// ==========================================
// PURCHASES & INWARD SUPPLIES MODULE
// ==========================================
export async function getPurchases() {
  try {
    const data = await sql`SELECT * FROM purchases ORDER BY invoice_date DESC, id DESC`;
    return data.map(p => ({
      id: p.id,
      fy: p.fy,
      invoiceDate: p.invoice_date ? new Date(p.invoice_date).toISOString().split('T')[0] : '',
      invoiceNo: p.invoice_no,
      vendorName: p.vendor_name,
      gstin: p.gstin,
      hsn: p.hsn,
      taxableAmount: Number(p.taxable_amount),
      gstPercent: Number(p.gst_percent || 18),
      gstType: p.gst_type || 'CGST/SGST',
      gstAmount: Number(p.gst_amount),
      totalAmount: Number(p.total_amount),
      returnStatus: p.return_status,
      items: p.items ? JSON.parse(p.items) : [] // Added items to fetch logic
    }));
  } catch (err) {
    console.error('Error fetching purchases:', err);
    return [];
  }
}

export async function savePurchase(p) {
  try {
    const result = await sql`
      INSERT INTO purchases (
        fy, invoice_date, invoice_no, vendor_name, gstin, hsn, 
        taxable_amount, gst_percent, gst_type, gst_amount, total_amount, return_status, items
      ) VALUES (
        ${p.fy}, ${p.invoiceDate}, ${p.invoiceNo}, ${p.vendorName}, ${p.gstin}, ${p.hsn},
        ${p.taxableAmount}, ${p.gstPercent}, ${p.gstType}, ${p.gstAmount}, ${p.totalAmount}, ${p.returnStatus}, ${p.items || null}
      )
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving purchase:', err);
    throw err;
  }
}

export async function deletePurchase(id) {
  try {
    await sql`DELETE FROM purchases WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting purchase:', err);
  }
}

export async function updatePurchaseStatus(id, newStatus) {
  try {
    await sql`UPDATE purchases SET return_status = ${newStatus} WHERE id = ${id}`;
  } catch (err) {
    console.error('Error updating purchase status:', err);
    throw err;
  }
}

// ==========================================
// EMPLOYEE EXPENSES MODULE
// ==========================================
export async function getEmployeeExpenses() {
  try {
    const data = await sql`SELECT * FROM employee_expenses ORDER BY date DESC, id DESC`;
    return data.map(e => ({
      id: e.id,
      empId: e.emp_id,
      date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
      category: e.category,
      description: e.description,
      amount: Number(e.amount)
    }));
  } catch (err) {
    console.error('Error fetching employee expenses:', err);
    return [];
  }
}

export async function saveEmployeeExpense(exp) {
  try {
    const result = await sql`
      INSERT INTO employee_expenses (emp_id, date, category, description, amount) 
      VALUES (${exp.empId}, ${exp.date}, ${exp.category}, ${exp.description}, ${exp.amount})
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving employee expense:', err);
    throw err;
  }
}

export async function deleteEmployeeExpense(id) {
  try {
    await sql`DELETE FROM employee_expenses WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting employee expense:', err);
  }
}

// ==========================================
// SALARIES MODULE
// ==========================================
export async function getMonthlyPayouts(year, month) {
  try {
    const data = await sql`SELECT * FROM salary_payouts WHERE year = ${year} AND month = ${month}`;
    return data.reduce((acc, curr) => {
      acc[curr.emp_id] = curr;
      return acc;
    }, {});
  } catch (err) {
    console.error('Error fetching payouts:', err);
    return {};
  }
}

export async function initiatePayout(empId, month, year, amount) {
  try {
    const result = await sql`
      INSERT INTO salary_payouts (emp_id, month, year, amount, status)
      VALUES (${empId}, ${month}, ${year}, ${amount}, 'API_PENDING')
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error initiating payout:', err);
    throw err;
  }
}

// ==========================================
// PROJECTS & INCOME MODULE
// ==========================================
export async function getProjects() {
  try {
    const data = await sql`SELECT * FROM projects ORDER BY created_at DESC`;
    return data.map(p => ({
      id: p.id,
      name: p.name,
      clientName: p.client_name,
      clientGstin: p.client_gstin || '',
      clientPhone: p.client_phone || '',
      poDate: p.po_date ? new Date(p.po_date).toISOString().split('T')[0] : '',
      budget: Number(p.budget),
      status: p.status
    }));
  } catch (err) {
    console.error('Error fetching projects:', err);
    return [];
  }
}

export async function saveProject(project) {
  try {
    if (project.id) {
      // Update existing project
      const result = await sql`
        UPDATE projects 
        SET name = ${project.name}, client_name = ${project.clientName}, 
            client_gstin = ${project.clientGstin}, client_phone = ${project.clientPhone},
            po_date = ${project.poDate || null}, budget = ${project.budget}, status = ${project.status}
        WHERE id = ${project.id}
        RETURNING *;
      `;
      return result[0];
    } else {
      // Create new project
      const result = await sql`
        INSERT INTO projects (name, client_name, client_gstin, client_phone, po_date, budget, status)
        VALUES (${project.name}, ${project.clientName}, ${project.clientGstin}, ${project.clientPhone}, ${project.poDate || null}, ${project.budget}, ${project.status})
        RETURNING *;
      `;
      return result[0];
    }
  } catch (err) {
    console.error('Error saving project:', err);
    throw err;
  }
}

export async function deleteProject(id) {
  try {
    await sql`DELETE FROM projects WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting project:', err);
    throw err;
  }
}

export async function getIncomeRecords() {
  try {
    const data = await sql`
      SELECT i.*, p.name as project_name, p.client_name 
      FROM income_records i
      JOIN projects p ON i.project_id = p.id
      ORDER BY i.date DESC, i.id DESC
    `;
    return data.map(i => ({
      id: i.id,
      projectId: i.project_id,
      projectName: i.project_name,
      clientName: i.client_name,
      date: i.date ? new Date(i.date).toISOString().split('T')[0] : '',
      amount: Number(i.amount),
      paymentMode: i.payment_mode,
      referenceNo: i.reference_no,
      notes: i.notes
    }));
  } catch (err) {
    console.error('Error fetching income:', err);
    return [];
  }
}

export async function saveIncomeRecord(record) {
  try {
    const result = await sql`
      INSERT INTO income_records (project_id, date, amount, payment_mode, reference_no, notes)
      VALUES (${record.projectId}, ${record.date}, ${record.amount}, ${record.paymentMode}, ${record.referenceNo}, ${record.notes})
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving income:', err);
    throw err;
  }
}

export async function deleteIncomeRecord(id) {
  try {
    await sql`DELETE FROM income_records WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting income:', err);
    throw err;
  }
}

// ==========================================
// INVENTORY & GODOWN MODULE
// ==========================================
export async function getInventoryItems() {
  try {
    const data = await sql`SELECT * FROM inventory_items ORDER BY name ASC`;
    return data.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      unit: item.unit,
      totalStock: Number(item.total_stock)
    }));
  } catch (err) {
    console.error('Error fetching inventory items:', err);
    return [];
  }
}

export async function saveInventoryItem(item) {
  try {
    const result = await sql`
      INSERT INTO inventory_items (name, category, unit, total_stock)
      VALUES (${item.name}, ${item.category}, ${item.unit}, 0)
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving inventory item:', err);
    throw err;
  }
}

export async function getInventoryMovements() {
  try {
    const data = await sql`
      SELECT m.*, i.name as item_name, i.unit, p.name as project_name 
      FROM inventory_movements m
      JOIN inventory_items i ON m.item_id = i.id
      LEFT JOIN projects p ON m.project_id = p.id
      ORDER BY m.date DESC, m.id DESC
    `;
    return data.map(m => ({
      id: m.id,
      itemId: m.item_id,
      itemName: m.item_name,
      unit: m.unit,
      type: m.movement_type,
      quantity: Number(m.quantity),
      projectId: m.project_id,
      projectName: m.project_name,
      date: m.date ? new Date(m.date).toISOString().split('T')[0] : '',
      notes: m.notes
    }));
  } catch (err) {
    console.error('Error fetching inventory movements:', err);
    return [];
  }
}

export async function recordInventoryMovement(movement) {
  try {
    // 1. Log the movement
    await sql`
      INSERT INTO inventory_movements (item_id, movement_type, quantity, project_id, date, notes)
      VALUES (${movement.itemId}, ${movement.type}, ${movement.quantity}, ${movement.projectId || null}, ${movement.date}, ${movement.notes})
    `;

    // 2. Adjust the total stock in the master table
    const qtyChange = movement.type === 'IN' ? movement.quantity : -Math.abs(movement.quantity);
    await sql`
      UPDATE inventory_items 
      SET total_stock = total_stock + ${qtyChange}
      WHERE id = ${movement.itemId}
    `;
  } catch (err) {
    console.error('Error recording movement:', err);
    throw err;
  }
}

// ==========================================
// MATERIAL RATE BOOK (PROCUREMENT)
// ==========================================
export async function getMaterialRates() {
  try {
    const data = await sql`SELECT * FROM material_rates ORDER BY material_name ASC, rate ASC`;
    return data.map(r => ({
      id: r.id,
      materialName: r.material_name,
      vendorName: r.vendor_name,
      rate: Number(r.rate),
      unit: r.unit,
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      notes: r.notes
    }));
  } catch (err) {
    console.error('Error fetching material rates:', err);
    return [];
  }
}

export async function saveMaterialRate(rate) {
  try {
    const result = await sql`
      INSERT INTO material_rates (material_name, vendor_name, rate, unit, date, notes)
      VALUES (${rate.materialName}, ${rate.vendorName}, ${rate.rate}, ${rate.unit}, ${rate.date}, ${rate.notes})
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving material rate:', err);
    throw err;
  }
}

export async function deleteMaterialRate(id) {
  try {
    await sql`DELETE FROM material_rates WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting material rate:', err);
    throw err;
  }
}
// ==========================================
// SUBCONTRACTORS & WORK ORDERS MODULE
// ==========================================
export async function getSubcontractors() {
  try {
    const data = await sql`SELECT * FROM subcontractors ORDER BY name ASC`;
    return data.map(s => ({
      id: s.id,
      name: s.name,
      trade: s.trade,
      phone: s.phone
    }));
  } catch (err) {
    console.error('Error fetching subcontractors:', err);
    return [];
  }
}

export async function saveSubcontractor(sub) {
  try {
    const result = await sql`
      INSERT INTO subcontractors (name, trade, phone)
      VALUES (${sub.name}, ${sub.trade}, ${sub.phone})
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving subcontractor:', err);
    throw err;
  }
}

export async function getWorkOrders() {
  try {
    const data = await sql`
      SELECT 
        wo.id, wo.scope_of_work, wo.contract_value, wo.status,
        s.name as sub_name, s.trade,
        p.name as project_name,
        COALESCE(SUM(pay.amount), 0) as total_paid,
        (SELECT json_agg(json_build_object('id', pay2.id, 'date', pay2.date, 'amount', pay2.amount, 'mode', pay2.payment_mode, 'ref', pay2.reference_no, 'notes', pay2.notes))
         FROM wo_payments pay2 WHERE pay2.work_order_id = wo.id) as payments
      FROM work_orders wo
      JOIN subcontractors s ON wo.subcontractor_id = s.id
      JOIN projects p ON wo.project_id = p.id
      LEFT JOIN wo_payments pay ON pay.work_order_id = wo.id
      GROUP BY wo.id, s.name, s.trade, p.name
      ORDER BY wo.id DESC
    `;
    
    return data.map(wo => ({
      id: wo.id,
      subName: wo.sub_name,
      trade: wo.trade,
      projectName: wo.project_name,
      scope: wo.scope_of_work,
      contractValue: Number(wo.contract_value),
      totalPaid: Number(wo.total_paid),
      balance: Number(wo.contract_value) - Number(wo.total_paid),
      status: wo.status,
      payments: wo.payments ? wo.payments.sort((a, b) => new Date(b.date) - new Date(a.date)) : []
    }));
  } catch (err) {
    console.error('Error fetching work orders:', err);
    return [];
  }
}

export async function saveWorkOrder(wo) {
  try {
    const result = await sql`
      INSERT INTO work_orders (subcontractor_id, project_id, scope_of_work, contract_value, status)
      VALUES (${wo.subcontractorId}, ${wo.projectId}, ${wo.scope}, ${wo.contractValue}, 'Ongoing')
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving work order:', err);
    throw err;
  }
}

export async function updateWorkOrderStatus(id, newStatus) {
  try {
    await sql`UPDATE work_orders SET status = ${newStatus} WHERE id = ${id}`;
  } catch (err) {
    console.error('Error updating work order status:', err);
    throw err;
  }
}

export async function saveWoPayment(payment) {
  try {
    const result = await sql`
      INSERT INTO wo_payments (work_order_id, date, amount, payment_mode, reference_no, notes)
      VALUES (${payment.workOrderId}, ${payment.date}, ${payment.amount}, ${payment.mode}, ${payment.referenceNo}, ${payment.notes})
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving payment:', err);
    throw err;
  }
}
// ==========================================
// MEASUREMENT SHEETS (JMS) MODULE
// ==========================================
export async function getMeasurementSheets() {
  try {
    const data = await sql`
      SELECT m.*, p.name as project_name, p.client_name 
      FROM measurement_sheets m
      JOIN projects p ON m.project_id = p.id
      ORDER BY m.created_at DESC
    `;
    return data.map(m => ({
      id: m.id,
      projectId: m.project_id,
      projectName: m.project_name,
      clientName: m.client_name,
      title: m.title,
      date: m.date ? new Date(m.date).toISOString().split('T')[0] : '',
      data: m.data ? JSON.parse(m.data) : []
    }));
  } catch (err) {
    console.error('Error fetching measurement sheets:', err);
    return [];
  }
}

export async function saveMeasurementSheet(sheet) {
  try {
    if (sheet.id) {
      const result = await sql`
        UPDATE measurement_sheets 
        SET title = ${sheet.title}, date = ${sheet.date}, data = ${JSON.stringify(sheet.data)}
        WHERE id = ${sheet.id}
        RETURNING *;
      `;
      return result[0];
    } else {
      const result = await sql`
        INSERT INTO measurement_sheets (project_id, title, date, data)
        VALUES (${sheet.projectId}, ${sheet.title}, ${sheet.date}, ${JSON.stringify(sheet.data)})
        RETURNING *;
      `;
      return result[0];
    }
  } catch (err) {
    console.error('Error saving measurement sheet:', err);
    throw err;
  }
}

export async function deleteMeasurementSheet(id) {
  try {
    await sql`DELETE FROM measurement_sheets WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting measurement sheet:', err);
    throw err;
  }
}
// ==========================================
// CRM & LEADS MODULE
// ==========================================
export async function getLeads() {
  try {
    const data = await sql`SELECT * FROM leads ORDER BY created_at DESC`;
    return data.map(l => ({
      id: l.id,
      clientName: l.client_name,
      phone: l.phone,
      projectType: l.project_type,
      estimatedValue: Number(l.estimated_value),
      status: l.status,
      notes: l.notes
    }));
  } catch (err) {
    console.error('Error fetching leads:', err);
    return [];
  }
}

export async function saveLead(lead) {
  try {
    if (lead.id) {
      const result = await sql`
        UPDATE leads 
        SET client_name = ${lead.clientName}, phone = ${lead.phone}, project_type = ${lead.projectType}, 
            estimated_value = ${lead.estimatedValue}, status = ${lead.status}, notes = ${lead.notes}
        WHERE id = ${lead.id} RETURNING *;
      `;
      return result[0];
    } else {
      const result = await sql`
        INSERT INTO leads (client_name, phone, project_type, estimated_value, status, notes)
        VALUES (${lead.clientName}, ${lead.phone}, ${lead.projectType}, ${lead.estimatedValue}, ${lead.status}, ${lead.notes})
        RETURNING *;
      `;
      return result[0];
    }
  } catch (err) {
    console.error('Error saving lead:', err);
    throw err;
  }
}

export async function updateLeadStatus(id, newStatus) {
  try {
    await sql`UPDATE leads SET status = ${newStatus} WHERE id = ${id}`;
  } catch (err) {
    console.error('Error updating lead status:', err);
    throw err;
  }
}

export async function deleteLead(id) {
  try {
    await sql`DELETE FROM leads WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting lead:', err);
  }
}

// ==========================================
// TOOLS & ASSET MANAGEMENT MODULE
// ==========================================
export async function getTools() {
  try {
    const data = await sql`SELECT * FROM tools ORDER BY name ASC`;
    return data.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      serialNumber: t.serial_number,
      status: t.status,
      assignedTo: t.assigned_to,
      location: t.location,
      purchasePrice: Number(t.purchase_price),
      purchaseDate: t.purchase_date ? new Date(t.purchase_date).toISOString().split('T')[0] : ''
    }));
  } catch (err) {
    console.error('Error fetching tools:', err);
    return [];
  }
}

export async function saveTool(tool) {
  try {
    if (tool.id) {
      const result = await sql`
        UPDATE tools 
        SET name = ${tool.name}, category = ${tool.category}, serial_number = ${tool.serialNumber}, 
            purchase_price = ${tool.purchasePrice}, purchase_date = ${tool.purchaseDate}
        WHERE id = ${tool.id} RETURNING *;
      `;
      return result[0];
    } else {
      const result = await sql`
        INSERT INTO tools (name, category, serial_number, purchase_price, purchase_date, status)
        VALUES (${tool.name}, ${tool.category}, ${tool.serialNumber}, ${tool.purchasePrice}, ${tool.purchaseDate}, 'Available')
        RETURNING *;
      `;
      return result[0];
    }
  } catch (err) {
    console.error('Error saving tool:', err);
    throw err;
  }
}

export async function updateToolStatus(id, status, assignedTo, location) {
  try {
    await sql`
      UPDATE tools 
      SET status = ${status}, assigned_to = ${assignedTo}, location = ${location}
      WHERE id = ${id}
    `;
  } catch (err) {
    console.error('Error updating tool status:', err);
    throw err;
  }
}

export async function deleteTool(id) {
  try {
    await sql`DELETE FROM tools WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting tool:', err);
  }
}
// ==========================================
// VENDOR LEDGER MODULE
// ==========================================
export async function getVendorLedgers() {
  try {
    const purchases = await sql`SELECT vendor_name, SUM(total_amount) as total_billed FROM purchases GROUP BY vendor_name`;
    const payments = await sql`SELECT vendor_name, SUM(amount) as total_paid FROM vendor_payments GROUP BY vendor_name`;
    const paymentList = await sql`SELECT * FROM vendor_payments ORDER BY date DESC`;

    const ledgers = {};
    purchases.forEach(p => ledgers[p.vendor_name] = { vendorName: p.vendor_name, totalBilled: Number(p.total_billed), totalPaid: 0, payments: [] });
    payments.forEach(p => {
      if (!ledgers[p.vendor_name]) ledgers[p.vendor_name] = { vendorName: p.vendor_name, totalBilled: 0, totalPaid: 0, payments: [] };
      ledgers[p.vendor_name].totalPaid = Number(p.total_paid);
    });
    paymentList.forEach(p => {
      if (ledgers[p.vendor_name]) {
        ledgers[p.vendor_name].payments.push({
          id: p.id, date: p.date ? new Date(p.date).toISOString().split('T')[0] : '', amount: Number(p.amount), mode: p.payment_mode, ref: p.reference_no, notes: p.notes
        });
      }
    });

    return Object.values(ledgers).map(l => ({ ...l, balance: l.totalBilled - l.totalPaid })).sort((a, b) => b.balance - a.balance);
  } catch (err) {
    console.error('Error fetching vendor ledgers:', err);
    return [];
  }
}

export async function saveVendorPayment(payment) {
  try {
    const result = await sql`
      INSERT INTO vendor_payments (vendor_name, date, amount, payment_mode, reference_no, notes)
      VALUES (${payment.vendorName}, ${payment.date}, ${payment.amount}, ${payment.mode}, ${payment.referenceNo}, ${payment.notes})
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving vendor payment:', err);
    throw err;
  }
}

// ==========================================
// SITE MANAGER (DPR, VAULT, SNAGS)
// ==========================================
export async function getSiteOperations(projectId) {
  try {
    const dprs = await sql`SELECT * FROM dpr_logs WHERE project_id = ${projectId} ORDER BY date DESC`;
    const docs = await sql`SELECT * FROM documents WHERE project_id = ${projectId} ORDER BY uploaded_at DESC`;
    const snags = await sql`SELECT * FROM snag_list WHERE project_id = ${projectId} ORDER BY status DESC, id DESC`;

    return {
      dprs: dprs.map(d => ({ ...d, date: d.date ? new Date(d.date).toISOString().split('T')[0] : '' })),
      docs: docs.map(d => ({ ...d, uploaded_at: d.uploaded_at ? new Date(d.uploaded_at).toISOString().split('T')[0] : '' })),
      snags: snags.map(s => ({ ...s, logged_date: s.logged_date ? new Date(s.logged_date).toISOString().split('T')[0] : '' }))
    };
  } catch (err) {
    console.error('Error fetching site operations:', err);
    return { dprs: [], docs: [], snags: [] };
  }
}

export async function saveDPR(dpr) {
  await sql`INSERT INTO dpr_logs (project_id, date, summary, materials_needed, photo_link, logged_by) VALUES (${dpr.projectId}, ${dpr.date}, ${dpr.summary}, ${dpr.materials}, ${dpr.photoLink}, ${dpr.loggedBy})`;
}

export async function saveDocument(doc) {
  await sql`INSERT INTO documents (project_id, title, doc_type, file_link, uploaded_by) VALUES (${doc.projectId}, ${doc.title}, ${doc.docType}, ${doc.fileLink}, ${doc.uploadedBy})`;
}

export async function saveSnag(snag) {
  await sql`INSERT INTO snag_list (project_id, description, assigned_to, photo_link) VALUES (${snag.projectId}, ${snag.description}, ${snag.assignedTo}, ${snag.photoLink})`;
}

export async function updateSnagStatus(id, status) {
  await sql`UPDATE snag_list SET status = ${status} WHERE id = ${id}`;
}
// ==========================================
// PETTY CASH WALLET MODULE
// ==========================================
export async function getPettyCash() {
  try {
    const data = await sql`
      SELECT pc.*, p.name as project_name 
      FROM petty_cash pc
      LEFT JOIN projects p ON pc.project_id = p.id
      ORDER BY pc.date DESC, pc.id DESC
    `;
    return data.map(row => ({
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name || 'Office / Unassigned',
      date: row.date ? new Date(row.date).toISOString().split('T')[0] : '',
      type: row.type,
      amount: Number(row.amount),
      description: row.description,
      loggedBy: row.logged_by
    }));
  } catch (err) {
    console.error('Error fetching petty cash:', err);
    return [];
  }
}

export async function savePettyCash(txn) {
  try {
    const result = await sql`
      INSERT INTO petty_cash (project_id, date, type, amount, description, logged_by)
      VALUES (${txn.projectId || null}, ${txn.date}, ${txn.type}, ${txn.amount}, ${txn.description}, ${txn.loggedBy})
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving petty cash:', err);
    throw err;
  }
}

export async function deletePettyCash(id) {
  try {
    await sql`DELETE FROM petty_cash WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting petty cash:', err);
  }
}
// ==========================================
// PROJECT PROFIT & LOSS (P&L) MODULE
// ==========================================
export async function getProjectPnL(projectId) {
  try {
    // 1. Get Project Details
    const projData = await sql`SELECT name, budget, status FROM projects WHERE id = ${projectId}`;
    if (!projData || projData.length === 0) return null;
    const project = projData[0];

    // 2. Total Income Received
    const incomeData = await sql`SELECT COALESCE(SUM(amount), 0) as total FROM income_records WHERE project_id = ${projectId}`;
    const incomeReceived = Number(incomeData[0].total);

    // 3. Subcontractor Payments (Advances & Cleared Bills)
    const subData = await sql`
      SELECT COALESCE(SUM(p.amount), 0) as total 
      FROM wo_payments p 
      JOIN work_orders w ON p.work_order_id = w.id 
      WHERE w.project_id = ${projectId}
    `;
    const subCost = Number(subData[0].total);

    // 4. Petty Cash Spent
    const pettyData = await sql`SELECT COALESCE(SUM(amount), 0) as total FROM petty_cash WHERE project_id = ${projectId} AND type = 'Expense'`;
    const pettyCost = Number(pettyData[0].total);

    // Final Calculations
    const totalCost = subCost + pettyCost;
    const netProfit = incomeReceived - totalCost;
    const profitMargin = incomeReceived > 0 ? ((netProfit / incomeReceived) * 100).toFixed(1) : 0;

    return {
      name: project.name,
      status: project.status,
      budget: Number(project.budget),
      incomeReceived,
      subCost,
      pettyCost,
      totalCost,
      netProfit,
      profitMargin
    };
  } catch (err) {
    console.error('Error calculating P&L:', err);
    return null;
  }
}
// ==========================================
// PROJECT TASK BOARD MODULE
// ==========================================
export async function getTasks() {
  try {
    const data = await sql`
      SELECT t.*, p.name as project_name 
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      ORDER BY t.due_date ASC
    `;
    return data.map(t => ({
      id: t.id,
      projectId: t.project_id,
      projectName: t.project_name || 'General / Internal',
      title: t.title,
      description: t.description,
      status: t.status,
      dueDate: t.due_date ? new Date(t.due_date).toISOString().split('T')[0] : '',
      assignedTo: t.assigned_to
    }));
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return [];
  }
}

export async function saveTask(task) {
  try {
    const result = await sql`
      INSERT INTO tasks (project_id, title, description, status, due_date, assigned_to)
      VALUES (${task.projectId || null}, ${task.title}, ${task.description}, ${task.status}, ${task.dueDate}, ${task.assignedTo})
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving task:', err);
    throw err;
  }
}

export async function updateTaskStatus(id, newStatus) {
  try {
    await sql`UPDATE tasks SET status = ${newStatus} WHERE id = ${id}`;
  } catch (err) {
    console.error('Error updating task status:', err);
    throw err;
  }
}

export async function deleteTask(id) {
  try {
    await sql`DELETE FROM tasks WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting task:', err);
  }
}
// ==========================================
// DOCUMENT VAULT MODULE
// ==========================================
export async function getVaultDocuments() {
  try {
    const data = await sql`
      SELECT v.*, p.name as project_name 
      FROM document_vault v
      LEFT JOIN projects p ON v.project_id = p.id
      ORDER BY v.id DESC
    `;
    return data.map(d => ({
      id: d.id,
      projectId: d.project_id,
      projectName: d.project_name || 'General Company Doc',
      documentName: d.document_name,
      category: d.category,
      fileUrl: d.file_url,
      fileType: d.file_type,
      uploadedAt: d.uploaded_at ? new Date(d.uploaded_at).toISOString().split('T')[0] : '',
      notes: d.notes
    }));
  } catch (err) {
    console.error('Error fetching vault docs:', err);
    return [];
  }
}

export async function saveVaultDocument(doc) {
  try {
    const result = await sql`
      INSERT INTO document_vault (project_id, document_name, category, file_url, file_type, notes)
      VALUES (${doc.projectId || null}, ${doc.documentName}, ${doc.category}, ${doc.fileUrl}, ${doc.fileType}, ${doc.notes})
      RETURNING *;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving vault doc:', err);
    throw err;
  }
}

export async function deleteVaultDocument(id) {
  try {
    await sql`DELETE FROM document_vault WHERE id = ${id}`;
  } catch (err) {
    console.error('Error deleting vault doc:', err);
  }
}