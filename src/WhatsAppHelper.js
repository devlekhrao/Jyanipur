export function sendWhatsAppMessage(phone, message) {
  if (!phone) {
    alert("Phone number missing for this contact.");
    return;
  }
  // Clean phone number (strip spaces, dashes, plus sign)
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const encodedMsg = encodeURIComponent(message);
  
  window.open(`https://wa.me/${formattedPhone}?text=${encodedMsg}`, '_blank');
}

export function buildInvoiceWhatsAppMsg(clientName, invoiceNo, amount, companyName) {
  return `Hi ${clientName},\n\n` +
         `Greeting from *${companyName}*! 🏡\n\n` +
         `Tax Invoice *${invoiceNo}* for the total amount of *₹${amount}* has been generated for your project.\n\n` +
         `Please let us know if you have any questions regarding the billing statement.\n\n` +
         `Best regards,\n` +
         `*${companyName} Accounts Team*`;
}

export function buildSnagWhatsAppMsg(subcontractor, siteName, title, priority) {
  return `*ATTENTION REQUIRED - ${companyName || 'Jyanipur Interiors'}*\n\n` +
         `Hi ${subcontractor},\n` +
         `A site quality snag has been assigned to you at *${siteName}*.\n\n` +
         `📌 *Defect:* ${title}\n` +
         `⚠️ *Priority:* ${priority}\n\n` +
         `Please review and resolve this before the final handover inspection.`;
}