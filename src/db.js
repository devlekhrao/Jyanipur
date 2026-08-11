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
      returnStatus: p.return_status
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
        taxable_amount, gst_percent, gst_type, gst_amount, total_amount, return_status
      ) VALUES (
        ${p.fy}, ${p.invoiceDate}, ${p.invoiceNo}, ${p.vendorName}, ${p.gstin}, ${p.hsn},
        ${p.taxableAmount}, ${p.gstPercent}, ${p.gstType}, ${p.gstAmount}, ${p.totalAmount}, ${p.returnStatus}
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
        SET name = ${project.name}, client_name = ${project.clientName}, budget = ${project.budget}, status = ${project.status}
        WHERE id = ${project.id}
        RETURNING *;
      `;
      return result[0];
    } else {
      // Create new project
      const result = await sql`
        INSERT INTO projects (name, client_name, budget, status)
        VALUES (${project.name}, ${project.clientName}, ${project.budget}, ${project.status})
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