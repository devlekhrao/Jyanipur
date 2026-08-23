import React, { useState, useEffect } from 'react';

// Domain Accounts for Jyanipur
const DOMAIN_ACCOUNTS = [
  { email: 'accounts@jyanipur.in', name: 'Accounts Portal', unread: 3 },
  { email: 'projects@jyanipur.in', name: 'Site Operations', unread: 1 },
  { email: 'sales@jyanipur.in', name: 'Sales & CRM', unread: 0 },
  { email: 'info@jyanipur.in', name: 'General Enquiries', unread: 0 }
];

// Initial Email Database Seed
const INITIAL_EMAILS = [
  {
    id: 101,
    account: 'accounts@jyanipur.in',
    folder: 'inbox',
    fromName: 'HDFC Bank Corporate',
    fromEmail: 'alerts@hdfcbank.net',
    to: 'accounts@jyanipur.in',
    subject: 'Credit Confirmation: ₹1,50,000 Received from Client',
    snippet: 'Dear Customer, Your account ending in 9800 has been credited with ₹1,50,000 towards Villa 42 milestone...',
    body: `<p>Dear Customer,</p><p>We are pleased to inform you that your HDFC Corporate account ending in <strong>9800</strong> has been credited with <strong>₹1,50,000.00</strong> on 23-Aug-2026 via NEFT/UPI.</p><p><strong>Transaction Ref:</strong> N23891004821<br/><strong>Payer:</strong> Rajesh Sharma (Client - Villa 42)</p><p>Regards,<br/>HDFC Bank Corporate Services</p>`,
    date: '10:45 AM',
    timestamp: '2026-08-23T10:45:00',
    unread: true,
    starred: true,
    attachments: [{ name: 'Bank_Credit_Advice.pdf', size: '142 KB' }]
  },
  {
    id: 102,
    account: 'accounts@jyanipur.in',
    folder: 'inbox',
    fromName: 'Asian Paints Dealer',
    fromEmail: 'orders@asianpaintsdealer.com',
    to: 'accounts@jyanipur.in',
    subject: 'Tax Invoice & Dispatch Details for Order #AP-8821',
    snippet: 'Attached is the official tax invoice for 40 Buckets Royale Emulsion delivered to Kondapur site...',
    body: `<p>Hi Accounts Team,</p><p>Please find attached the GST Tax Invoice for <strong>Order #AP-8821</strong> (40 Buckets Apex Ultima & Primer) delivered to your Kondapur site this morning.</p><p>Total Amount: <strong>₹68,400.00</strong> (Inclusive of 18% GST).</p><p>Please credit payment within 15 days as per negotiated credit terms.</p><p>Thanks,<br/>Sri Laxmi Enterprises (Asian Paints Authorized Dealer)</p>`,
    date: 'Yesterday',
    timestamp: '2026-08-22T16:20:00',
    unread: true,
    starred: false,
    attachments: [{ name: 'GST_Invoice_AP8821.pdf', size: '420 KB' }]
  },
  {
    id: 103,
    account: 'accounts@jyanipur.in',
    folder: 'sent',
    fromName: 'Jyanipur Accounts',
    fromEmail: 'accounts@jyanipur.in',
    to: 'client.sharma@gmail.com',
    subject: 'Tax Invoice #JIC-2026-042 - Villa 42 Execution',
    snippet: 'Dear Mr. Sharma, Please find attached the official tax invoice for Stage 2 plastering work...',
    body: `<p>Dear Mr. Sharma,</p><p>Hope you are doing well.</p><p>Please find attached the official Tax Invoice <strong>#JIC-2026-042</strong> for the completed plastering and electrical conduit stage at your Villa 42 site.</p><p>Amount Due: <strong>₹1,50,000.00</strong></p><p>You can also log in to your <strong>Client Portal</strong> to view photos and approve upcoming materials.</p><p>Best Regards,<br/><strong>Accounts Team</strong><br/>Jyanipur Interiors & Construction</p>`,
    date: 'Aug 21',
    timestamp: '2026-08-21T11:15:00',
    unread: false,
    starred: false,
    attachments: [{ name: 'Tax_Invoice_JIC-2026-042.pdf', size: '1.2 MB' }]
  },
  {
    id: 104,
    account: 'projects@jyanipur.in',
    folder: 'inbox',
    fromName: 'Ramesh Carpentry',
    fromEmail: 'ramesh.carpentry@gmail.com',
    to: 'projects@jyanipur.in',
    subject: 'RA Bill #03 Submission - Kondapur Site Woodwork',
    snippet: 'Sir, we have completed wardrobe framing. Sending RA bill copy for verification...',
    body: `<p>Respected Sir,</p><p>We have completed 100% of the plywood framing for master bedroom wardrobes at Kondapur site. Requesting certification of Running Account (RA) Bill #03 of ₹45,000.</p><p>Measurement sheet is attached.</p><p>Thanks,<br/>Ramesh (Head Carpenter)</p>`,
    date: 'Aug 20',
    timestamp: '2026-08-20T14:30:00',
    unread: true,
    starred: true,
    attachments: [{ name: 'RA_Bill_03_Ramesh.pdf', size: '310 KB' }]
  }
];

export default function PortalEmail({ companySettings }) {
  // Navigation & Filtering States
  const [selectedAccount, setSelectedAccount] = useState('accounts@jyanipur.in');
  const [selectedFolder, setSelectedFolder] = useState('inbox'); // inbox, starred, sent, drafts, trash
  const [emails, setEmails] = useState(INITIAL_EMAILS);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Compose Drawer State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeData, setComposeForm] = useState({
    from: selectedAccount,
    to: '',
    cc: '',
    subject: '',
    body: '',
    template: 'Blank',
    attachments: []
  });
  const [sending, setSending] = useState(false);

  // Sync compose 'from' address when active account changes
  useEffect(() => {
    setComposeForm(prev => ({ ...prev, from: selectedAccount }));
  }, [selectedAccount]);

  // Filter Emails matching Account, Folder & Search Query
  const filteredEmails = emails.filter(m => {
    if (m.account !== selectedAccount) return false;
    if (selectedFolder === 'starred') return m.starred;
    if (m.folder !== selectedFolder) return false;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.subject.toLowerCase().includes(q) ||
        m.fromName.toLowerCase().includes(q) ||
        m.fromEmail.toLowerCase().includes(q) ||
        m.snippet.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Automatically select the first email when folder/account changes
  useEffect(() => {
    if (filteredEmails.length > 0) {
      setSelectedEmail(filteredEmails[0]);
    } else {
      setSelectedEmail(null);
    }
  }, [selectedAccount, selectedFolder]);

  // Actions
  const handleSelectEmail = (mail) => {
    setSelectedEmail(mail);
    // Mark as read
    setEmails(prev => prev.map(m => m.id === mail.id ? { ...m, unread: false } : m));
  };

  const toggleStar = (e, mailId) => {
    e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, starred: !m.starred } : m));
  };

  const deleteEmail = (mailId) => {
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, folder: 'trash' } : m));
    if (selectedEmail?.id === mailId) setSelectedEmail(null);
  };

  const handleTemplateSelect = (e) => {
    const template = e.target.value;
    let subject = '';
    let body = '';

    if (template === 'Invoice') {
      subject = `Tax Invoice from ${companySettings?.companyName || 'Jyanipur'}`;
      body = `Dear Client,\n\nPlease find attached the official Tax Invoice for your project.\n\nKindly process the payment as per agreed terms.\n\nBest Regards,\nAccounts Team\n${companySettings?.companyName || 'Jyanipur'}`;
    } else if (template === 'PO') {
      subject = `Purchase Order - ${companySettings?.companyName || 'Jyanipur'}`;
      body = `Dear Vendor,\n\nPlease find attached our Purchase Order. Confirm receipt and expected dispatch date.\n\nRegards,\nProcurement Team\n${companySettings?.companyName || 'Jyanipur'}`;
    }

    setComposeForm({ ...composeData, template, subject, body });
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    setSending(true);

    setTimeout(() => {
      const newMail = {
        id: Date.now(),
        account: composeData.from,
        folder: 'sent',
        fromName: companySettings?.companyName || 'Jyanipur Portal',
        fromEmail: composeData.from,
        to: composeData.to,
        subject: composeData.subject,
        snippet: composeData.body.slice(0, 80) + '...',
        body: `<p>${composeData.body.replace(/\n/g, '<br/>')}</p>`,
        date: 'Just now',
        timestamp: new Date().toISOString(),
        unread: false,
        starred: false,
        attachments: composeData.attachments
      };

      setEmails([newMail, ...emails]);
      setSending(false);
      setIsComposeOpen(false);
      setComposeForm({ from: selectedAccount, to: '', cc: '', subject: '', body: '', template: 'Blank', attachments: [] });
      
      alert(`Email sent successfully from ${composeData.from}!`);
      if (composeData.from === selectedAccount) {
        setSelectedFolder('sent');
        setSelectedEmail(newMail);
      }
    }, 800);
  };

  const handleQuickReply = () => {
    if (!selectedEmail) return;
    setComposeForm({
      from: selectedAccount,
      to: selectedEmail.fromEmail,
      cc: '',
      subject: `Re: ${selectedEmail.subject}`,
      body: `\n\n--- On ${selectedEmail.date}, ${selectedEmail.fromName} wrote:\n> ${selectedEmail.snippet}`,
      template: 'Blank',
      attachments: []
    });
    setIsComposeOpen(true);
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col bg-zinc-50 font-['Poppins'] text-zinc-900 overflow-hidden">
      
      {/* 1. TOP HEADER & DOMAIN ACCOUNT SWITCHER */}
      <div className="bg-white border-b border-zinc-200/80 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-[#B45309] text-white flex items-center justify-center font-black text-lg shadow-sm">
            ✉️
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight leading-none">Jyanipur Mail Studio</h2>
            <p className="text-[11px] text-zinc-500 font-medium mt-1">Official Webmail & Domain Inbox</p>
          </div>
        </div>

        {/* DOMAIN SELECTOR DROPDOWN */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest hidden sm:inline-block">Active Email:</span>
          <select 
            value={selectedAccount} 
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="bg-amber-50 text-[#B45309] font-bold text-xs border border-amber-200 px-4 py-2 rounded-xl outline-none cursor-pointer shadow-sm hover:bg-amber-100 transition-colors"
          >
            {DOMAIN_ACCOUNTS.map(acc => (
              <option key={acc.email} value={acc.email} className="text-zinc-900 font-medium">
                {acc.email} ({acc.name})
              </option>
            ))}
          </select>

          <button 
            onClick={() => setIsComposeOpen(true)}
            className="bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer h-9 shrink-0"
          >
            <span className="text-base leading-none">+</span> Compose
          </button>
        </div>
      </div>

      {/* 2. THREE-PANE WEBMAIL WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PANE 1: FOLDER SIDEBAR */}
        <div className="w-56 bg-white border-r border-zinc-200/80 p-3 flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            {[
              { id: 'inbox', label: 'Inbox', icon: '📥', count: emails.filter(m => m.account === selectedAccount && m.folder === 'inbox' && m.unread).length },
              { id: 'starred', label: 'Starred', icon: '⭐', count: emails.filter(m => m.account === selectedAccount && m.starred).length },
              { id: 'sent', label: 'Sent', icon: '📤', count: 0 },
              { id: 'drafts', label: 'Drafts', icon: '📝', count: 0 },
              { id: 'trash', label: 'Trash', icon: '🗑️', count: 0 }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFolder(f.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedFolder === f.id ? 'bg-[#B45309] text-white shadow-sm' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-sm">{f.icon}</span>
                  {f.label}
                </span>
                {f.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    selectedFolder === f.id ? 'bg-white text-[#B45309]' : 'bg-amber-100 text-[#B45309]'
                  }`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* STORAGE FOOTER */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-[10px] text-zinc-500 font-medium">
            <div className="flex justify-between mb-1">
              <span>Domain Storage</span>
              <strong className="text-zinc-700">1.2 GB / 10 GB</strong>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
              <div className="w-[12%] h-full bg-[#B45309]"></div>
            </div>
          </div>
        </div>

        {/* PANE 2: EMAIL THREAD LIST */}
        <div className="w-80 lg:w-96 bg-white border-r border-zinc-200/80 flex flex-col shrink-0">
          
          {/* Search Box */}
          <div className="p-3 border-b border-zinc-100 bg-zinc-50/50">
            <div className="flex items-center bg-white border border-zinc-200 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-xs text-zinc-400 mr-2">🔍</span>
              <input 
                type="text" 
                placeholder={`Search in ${selectedFolder}...`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs font-medium outline-none w-full text-zinc-800 placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Mail Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 custom-scrollbar">
            {filteredEmails.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-xs italic font-medium">
                No messages in {selectedFolder}.
              </div>
            ) : (
              filteredEmails.map(mail => (
                <div
                  key={mail.id}
                  onClick={() => handleSelectEmail(mail)}
                  className={`p-4 cursor-pointer transition-colors relative flex flex-col gap-1.5 ${
                    selectedEmail?.id === mail.id ? 'bg-amber-50/60 border-l-4 border-l-[#B45309]' :
                    mail.unread ? 'bg-zinc-50/80 font-bold' : 'bg-white hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className={`truncate font-bold ${mail.unread ? 'text-zinc-900' : 'text-zinc-700'}`}>
                      {selectedFolder === 'sent' ? `To: ${mail.to}` : mail.fromName}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold shrink-0 ml-2">{mail.date}</span>
                  </div>

                  <h4 className={`text-xs truncate ${mail.unread ? 'font-black text-zinc-900' : 'font-semibold text-zinc-700'}`}>
                    {mail.subject}
                  </h4>

                  <p className="text-[11px] text-zinc-500 font-medium line-clamp-1 leading-normal">
                    {mail.snippet}
                  </p>

                  <div className="flex items-center justify-between mt-1 pt-1">
                    <button onClick={(e) => toggleStar(e, mail.id)} className="text-xs text-zinc-300 hover:text-amber-500 transition-colors">
                      {mail.starred ? '⭐' : '☆'}
                    </button>
                    {mail.attachments?.length > 0 && (
                      <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 bg-zinc-100 px-1.5 py-0.5 rounded">
                        📎 {mail.attachments.length}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PANE 3: FULL EMAIL READER VIEW */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          {!selectedEmail ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-zinc-50/50">
              <div className="w-16 h-16 rounded-full bg-zinc-200/60 text-zinc-400 flex items-center justify-center text-3xl mb-4">
                📬
              </div>
              <h3 className="text-base font-bold text-zinc-800">Select an email to view</h3>
              <p className="text-xs text-zinc-400 font-medium max-w-xs mt-1">Choose a conversation from the list to read its content, view attachments, or send a reply.</p>
            </div>
          ) : (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* Reader Action Header */}
              <div className="p-4 border-b border-zinc-200/80 bg-zinc-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={handleQuickReply} className="px-3 py-1.5 bg-[#B45309] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#92400E] flex items-center gap-1 cursor-pointer">
                    ↩️ Reply
                  </button>
                  <button onClick={() => deleteEmail(selectedEmail.id)} className="px-3 py-1.5 bg-white border border-zinc-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 cursor-pointer">
                    🗑️ Delete
                  </button>
                </div>
                <span className="text-xs font-bold text-zinc-400">Account: {selectedEmail.account}</span>
              </div>

              {/* Reader Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* Subject Header */}
                <div>
                  <h1 className="text-xl font-black text-zinc-900 tracking-tight leading-snug">{selectedEmail.subject}</h1>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 text-white font-bold text-sm flex items-center justify-center uppercase">
                        {selectedEmail.fromName[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900">{selectedEmail.fromName} <span className="text-zinc-400 font-normal">&lt;{selectedEmail.fromEmail}&gt;</span></p>
                        <p className="text-[10px] text-zinc-500 font-medium">To: {selectedEmail.to}</p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400 font-semibold">{selectedEmail.date}</span>
                  </div>
                </div>

                {/* Email HTML Body Render */}
                <div 
                  className="text-sm text-zinc-800 leading-relaxed font-normal bg-zinc-50/30 p-6 rounded-2xl border border-zinc-100 prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                />

                {/* Attachments Section */}
                {selectedEmail.attachments?.length > 0 && (
                  <div className="border-t border-zinc-100 pt-4">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Attachments ({selectedEmail.attachments.length})</h4>
                    <div className="flex flex-wrap gap-3">
                      {selectedEmail.attachments.map((att, idx) => (
                        <div key={idx} className="bg-white border border-zinc-200 p-3 rounded-xl shadow-sm flex items-center gap-3 hover:border-[#B45309] transition-colors cursor-pointer">
                          <span className="text-xl">📄</span>
                          <div>
                            <p className="text-xs font-bold text-zinc-900">{att.name}</p>
                            <p className="text-[10px] text-zinc-400 font-medium">{att.size}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* 3. COMPOSE EMAIL MODAL / DRAWER */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-900 text-white flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold tracking-wider uppercase flex items-center gap-2">
                <span>✉️</span> New Message
              </h3>
              <button onClick={() => setIsComposeOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
              
              {/* From / Account Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Send From (Domain) <span className="text-red-500">*</span></label>
                  <select 
                    value={composeData.from} 
                    onChange={e => setComposeForm({ ...composeData, from: e.target.value })}
                    className={`${inputClass} font-bold text-[#B45309] cursor-pointer`}
                  >
                    {DOMAIN_ACCOUNTS.map(acc => (
                      <option key={acc.email} value={acc.email}>{acc.email}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Load Template</label>
                  <select value={composeData.template} onChange={handleTemplateSelect} className={`${inputClass} cursor-pointer`}>
                    <option value="Blank">Blank Message</option>
                    <option value="Invoice">Tax Invoice Template</option>
                    <option value="PO">Purchase Order Template</option>
                  </select>
                </div>
              </div>

              {/* To & CC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>To Email <span className="text-red-500">*</span></label>
                  <input type="email" required value={composeData.to} onChange={e => setComposeForm({ ...composeData, to: e.target.value })} placeholder="client@example.com" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>CC Email</label>
                  <input type="email" value={composeData.cc} onChange={e => setComposeForm({ ...composeData, cc: e.target.value })} placeholder="accounts@jyanipur.in" className={inputClass} />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className={labelClass}>Subject Line <span className="text-red-500">*</span></label>
                <input type="text" required value={composeData.subject} onChange={e => setComposeForm({ ...composeData, subject: e.target.value })} placeholder="Enter email subject..." className={inputClass} />
              </div>

              {/* Body */}
              <div>
                <label className={labelClass}>Email Message <span className="text-red-500">*</span></label>
                <textarea required rows="7" value={composeData.body} onChange={e => setComposeForm({ ...composeData, body: e.target.value })} placeholder="Write your message here..." className={`${inputClass} resize-y leading-relaxed font-sans`} />
              </div>

              {/* Attachments */}
              <div>
                <label className={labelClass}>Attach Files</label>
                <input type="file" multiple className="w-full text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-zinc-100 file:text-zinc-700 cursor-pointer border border-dashed border-zinc-200 p-2 rounded-xl" />
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-zinc-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsComposeOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={sending} className="px-7 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50">
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}