import { neon } from '@neondatabase/serverless';

const sql = neon(import.meta.env.VITE_DATABASE_URL);

// Fetch all non-deleted invoices
export async function getInvoices() {
  try {
    const data = await sql`SELECT * FROM invoices ORDER BY id DESC`;
    return data.map(inv => ({
      id: inv.id,
      date: inv.date,
      invoiceNo: inv.invoice_no,
      client: inv.client,
      partyAddress: inv.party_address,
      gstNo: inv.gst_no,
      placeOfSupply: inv.place_of_supply,
      poNumber: inv.po_number,
      poDate: inv.po_date,
      taxMode: inv.tax_mode,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items,
      bankName: inv.bank_name,
      accountName: inv.account_name,
      accountNo: inv.account_no,
      ifscCode: inv.ifsc_code,
      terms: inv.terms,
      description: inv.description,
      discount: inv.discount,
      advanceReceived: inv.advance_received,
      amount: inv.amount,
      isCancelled: inv.is_cancelled
    }));
  } catch (err) {
    console.error('Error fetching invoices:', err);
    return [];
  }
}

// Save or update an invoice
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
        date = EXCLUDED.date,
        client = EXCLUDED.client,
        party_address = EXCLUDED.party_address,
        gst_no = EXCLUDED.gst_no,
        place_of_supply = EXCLUDED.place_of_supply,
        po_number = EXCLUDED.po_number,
        po_date = EXCLUDED.po_date,
        tax_mode = EXCLUDED.tax_mode,
        items = EXCLUDED.items,
        bank_name = EXCLUDED.bank_name,
        account_name = EXCLUDED.account_name,
        account_no = EXCLUDED.account_no,
        ifsc_code = EXCLUDED.ifsc_code,
        terms = EXCLUDED.terms,
        description = EXCLUDED.description,
        discount = EXCLUDED.discount,
        advance_received = EXCLUDED.advance_received,
        amount = EXCLUDED.amount
      RETURNING id;
    `;
    return result[0];
  } catch (err) {
    console.error('Error saving invoice:', err);
    throw err;
  }
}

// Toggle Cancel / Restore invoice
export async function toggleCancelInvoice(id, currentStatus) {
  try {
    await sql`UPDATE invoices SET is_cancelled = ${!currentStatus} WHERE id = ${id}`;
  } catch (err) {
    console.error('Error cancelling invoice:', err);
  }
}