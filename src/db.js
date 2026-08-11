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

export async function getMonthlyAttendance(year, month) {
    try {
      // Format start and end dates (e.g., 2026-08-01 to 2026-08-31)
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]; 
  
      const data = await sql`
        SELECT emp_id, date, status 
        FROM attendance_logs 
        WHERE date >= ${startDate} AND date <= ${endDate}
      `;
  
      // Group by employee ID and then by Date
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