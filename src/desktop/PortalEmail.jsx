import React, { useState } from 'react';

export default function PortalEmail({ companySettings }) {
  const [activeTab, setActiveTab] = useState('COMPOSE'); // COMPOSE, SENT, TEMPLATES
  const [submitting, setSubmitting] = useState(false);
  
  // Email Form State
  const [emailForm, setEmailForm] = useState({
    to: '',
    cc: '',
    subject: '',
    message: '',
    attachment: null,
    template: 'Blank'
  });

  // Mock Sent History (Replace with DB later)
  const [sentEmails, setSentEmails] = useState([
    { id: 1, to: 'client@example.com', subject: 'Invoice #INV-001 - Jyanipur Interiors', date: new Date().toISOString().split('T')[0], status: 'Delivered' },
    { id: 2, to: 'vendor@plywood.com', subject: 'Purchase Order #PO-102', date: new Date().toISOString().split('T')[0], status: 'Opened' }
  ]);

  const handleTemplateChange = (e) => {
    const template = e.target.value;
    let subject = '';
    let message = '';

    if (template === 'Invoice') {
      subject = `New Tax Invoice from ${companySettings?.companyName || 'Jyanipur'}`;
      message = `Dear Client,\n\nPlease find attached the latest tax invoice for your ongoing project.\n\nKindly process the payment at your earliest convenience.\n\nRegards,\nAccounts Team\n${companySettings?.companyName || 'Jyanipur'}`;
    } else if (template === 'Purchase Order') {
      subject = `Purchase Order - ${companySettings?.companyName || 'Jyanipur'}`;
      message = `Dear Vendor,\n\nPlease find attached our official Purchase Order. Kindly confirm the receipt and expected delivery timeline.\n\nRegards,\nProcurement Team\n${companySettings?.companyName || 'Jyanipur'}`;
    }

    setEmailForm({ ...emailForm, template, subject, message });
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // In production, this would call your backend API (e.g., Resend, SendGrid, or AWS SES)
    setTimeout(() => {
      setSentEmails([{ 
        id: Date.now(), 
        to: emailForm.to, 
        subject: emailForm.subject, 
        date: new Date().toISOString().split('T')[0], 
        status: 'Sent' 
      }, ...sentEmails]);
      
      setSubmitting(false);
      setEmailForm({ to: '', cc: '', subject: '', message: '', attachment: null, template: 'Blank' });
      alert("Email queued for sending successfully!");
      setActiveTab('SENT');
    }, 1000);
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col bg-zinc-50" style={{ fontFamily: 'Poppins, sans-serif' }}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Email & Communications</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Send official documents and track communication history.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200">
          {[
            { id: 'COMPOSE', label: 'Compose Mail' },
            { id: 'SENT', label: 'Sent History' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${activeTab === tab.id ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
        
        {/* COMPOSE MAIL TAB */}
        {activeTab === 'COMPOSE' && (
          <div className="max-w-4xl bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-widest">New Message</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Load Template:</span>
                <select value={emailForm.template} onChange={handleTemplateChange} className="text-xs font-bold bg-white border border-zinc-200 rounded-lg px-2 py-1 outline-none text-[#B45309] cursor-pointer shadow-sm">
                  <option value="Blank">Blank Email</option>
                  <option value="Invoice">Tax Invoice</option>
                  <option value="Purchase Order">Purchase Order</option>
                </select>
              </div>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelClass}>To <span className="text-red-500">*</span></label><input type="email" required value={emailForm.to} onChange={e => setEmailForm({...emailForm, to: e.target.value})} className={inputClass} placeholder="client@domain.com" /></div>
                <div><label className={labelClass}>CC</label><input type="email" value={emailForm.cc} onChange={e => setEmailForm({...emailForm, cc: e.target.value})} className={inputClass} placeholder="team@domain.com" /></div>
              </div>
              
              <div><label className={labelClass}>Subject <span className="text-red-500">*</span></label><input type="text" required value={emailForm.subject} onChange={e => setEmailForm({...emailForm, subject: e.target.value})} className={inputClass} placeholder="Email Subject" /></div>
              
              <div>
                <label className={labelClass}>Message Body <span className="text-red-500">*</span></label>
                <textarea required rows="8" value={emailForm.message} onChange={e => setEmailForm({...emailForm, message: e.target.value})} className={`${inputClass} resize-y`} placeholder="Type your message here..." />
              </div>

              <div>
                <label className={labelClass}>Attachment (PDF/Image)</label>
                <input type="file" className="w-full text-sm text-zinc-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer border border-dashed border-zinc-300 p-2 rounded-xl" />
              </div>

              <div className="pt-6 mt-6 border-t border-zinc-100 flex justify-between items-center">
                <p className="text-xs text-zinc-400 font-medium">Sending securely via Jyanipur Portal</p>
                <button type="submit" disabled={submitting} className="bg-[#B45309] hover:bg-[#92400E] text-white px-8 py-3 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  {submitting ? 'Sending...' : 'Send Email'}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* SENT HISTORY TAB */}
        {activeTab === 'SENT' && (
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-200">
                  <th className="py-4 px-6 font-bold">Date Sent</th>
                  <th className="py-4 px-6 font-bold">Recipient (To)</th>
                  <th className="py-4 px-6 font-bold">Subject</th>
                  <th className="py-4 px-6 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50 text-sm">
                {sentEmails.map(mail => (
                  <tr key={mail.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-zinc-600">{mail.date}</td>
                    <td className="py-4 px-6 font-bold text-zinc-900">{mail.to}</td>
                    <td className="py-4 px-6 text-zinc-600 truncate max-w-xs">{mail.subject}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        mail.status === 'Sent' ? 'bg-blue-50 text-blue-700' : 
                        mail.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {mail.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}