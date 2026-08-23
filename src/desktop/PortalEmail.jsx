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
    if (filteredEmails.length > 0 && !selectedEmail) {
      // Don't auto-select if we already have one open, unless it's no longer in this list
      const stillExists = filteredEmails.find(m => m.id === selectedEmail?.id);
      if (!stillExists) setSelectedEmail(filteredEmails[0]);
    } else if (filteredEmails.length === 0) {
      setSelectedEmail(null);
    }
  }, [selectedAccount, selectedFolder, filteredEmails, selectedEmail]);

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
    // Outer cohesive application shell
    <div className="w-full h-full bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col font-['Poppins'] text-zinc-900 relative">
      
      {/* 1. TOP HEADER (GMAIL STYLE) */}
      <div className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-zinc-200 shrink-0 bg-white z-10 gap-6">
        
        {/* Logo/Brand Area */}
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#B45309] flex items-center justify-center font-black text-sm shadow-sm border border-amber-100">
            ✉️
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-800">Mailbox</span>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-2xl hidden md:flex">
          <div className="w-full flex items-center bg-zinc-100/80 hover:bg-zinc-100 border border-transparent hover:border-zinc-200 rounded-full px-4 py-2.5 transition-all">
            <svg className="w-4 h-4 text-zinc-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input 
              type="text" 
              placeholder="Search all conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none w-full text-zinc-800 placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* Domain Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <select 
            value={selectedAccount} 
            onChange={(e) => { setSelectedAccount(e.target.value); setSelectedFolder('inbox'); }}
            className="appearance-none bg-white text-zinc-700 font-semibold text-sm border border-zinc-200 px-4 py-2 pr-8 rounded-full outline-none cursor-pointer hover:bg-zinc-50 transition-colors bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2371717A%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.75rem_center] bg-[length:1rem_1rem]"
          >
            {DOMAIN_ACCOUNTS.map(acc => (
              <option key={acc.email} value={acc.email}>
                {acc.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. THREE-PANE WORKSPACE */}
      <div className="flex-1 flex overflow-hidden bg-white">
        
        {/* PANE 1: GMAIL-STYLE SIDEBAR */}
        <div className="w-64 flex flex-col justify-between shrink-0 py-4 border-r border-zinc-200/60">
          <div>
            <div className="px-4 mb-6">
              <button 
                onClick={() => setIsComposeOpen(true)}
                className="w-full bg-[#B45309] hover:bg-[#92400E] text-white px-5 py-3.5 rounded-2xl text-sm font-bold shadow-md shadow-[#B45309]/20 transition-all flex items-center gap-3 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Compose
              </button>
            </div>

            <div className="pr-4 space-y-0.5">
              {[
                { id: 'inbox', label: 'Inbox', icon: '📥', count: emails.filter(m => m.account === selectedAccount && m.folder === 'inbox' && m.unread).length },
                { id: 'starred', label: 'Starred', icon: '⭐', count: emails.filter(m => m.account === selectedAccount && m.starred).length },
                { id: 'sent', label: 'Sent', icon: '📤', count: 0 },
                { id: 'drafts', label: 'Drafts', icon: '📝', count: 0 },
                { id: 'trash', label: 'Trash', icon: '🗑️', count: 0 }
              ].map(f => {
                const isActive = selectedFolder === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFolder(f.id)}
                    className={`w-full flex items-center justify-between px-6 py-2.5 rounded-r-full text-sm font-medium transition-all cursor-pointer ${
                      isActive ? 'bg-amber-100/60 text-[#B45309] font-bold' : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    <span className="flex items-center gap-4">
                      <span className={`text-base ${isActive ? 'opacity-100' : 'opacity-70'}`}>{f.icon}</span>
                      {f.label}
                    </span>
                    {f.count > 0 && (
                      <span className={`text-[11px] font-bold ${isActive ? 'text-[#B45309]' : 'text-zinc-500'}`}>
                        {f.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* User Status / Storage Footer */}
          <div className="px-6">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-[10px] text-zinc-500 font-medium">
              <div className="flex justify-between mb-1.5">
                <span>Storage (Jyanipur)</span>
                <strong className="text-zinc-700">1.2 GB</strong>
              </div>
              <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                <div className="w-[12%] h-full bg-zinc-400"></div>
              </div>
            </div>
          </div>
        </div>

        {/* PANE 2: EMAIL THREAD LIST */}
        <div className="w-[360px] border-r border-zinc-200/60 flex flex-col shrink-0 bg-white">
          <div className="p-3 px-4 border-b border-zinc-200/60 flex justify-between items-center bg-white shrink-0 h-[52px]">
            <span className="text-sm font-bold text-zinc-800 capitalize">{selectedFolder}</span>
            <button className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 custom-scrollbar">
            {filteredEmails.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-sm font-medium">
                Nothing to see here.
              </div>
            ) : (
              filteredEmails.map(mail => {
                const isActive = selectedEmail?.id === mail.id;
                return (
                  <div
                    key={mail.id}
                    onClick={() => handleSelectEmail(mail)}
                    className={`p-4 cursor-pointer transition-all relative flex flex-col gap-1 border-l-4 ${
                      isActive ? 'bg-amber-50/40 border-l-[#B45309]' :
                      mail.unread ? 'bg-white border-l-transparent' : 'bg-zinc-50/40 border-l-transparent opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm truncate pr-2 ${mail.unread ? 'font-bold text-zinc-900' : 'font-semibold text-zinc-700'}`}>
                        {selectedFolder === 'sent' ? `To: ${mail.to}` : mail.fromName}
                      </span>
                      <span className={`text-[10px] shrink-0 ${mail.unread ? 'font-bold text-zinc-900' : 'font-semibold text-zinc-400'}`}>
                        {mail.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h4 className={`text-xs truncate flex-1 ${mail.unread ? 'font-bold text-zinc-800' : 'font-medium text-zinc-600'}`}>
                        {mail.subject}
                      </h4>
                      {mail.attachments?.length > 0 && (
                        <svg className="w-3 h-3 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      )}
                    </div>

                    <div className="flex items-start gap-2 mt-0.5">
                      <p className="text-xs text-zinc-500 font-medium line-clamp-2 leading-relaxed flex-1">
                        {mail.snippet}
                      </p>
                      <button onClick={(e) => toggleStar(e, mail.id)} className={`text-base leading-none shrink-0 ${mail.starred ? 'text-amber-400' : 'text-zinc-300 hover:text-zinc-400'}`}>
                        {mail.starred ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* PANE 3: FULL EMAIL READER VIEW */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden relative">
          {!selectedEmail ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-zinc-50/30">
              <div className="w-20 h-20 rounded-full bg-zinc-100 text-zinc-300 flex items-center justify-center text-4xl mb-6 shadow-inner">
                ✉️
              </div>
              <h3 className="text-lg font-bold text-zinc-800">Select an item to read</h3>
              <p className="text-sm text-zinc-500 font-medium mt-1">Nothing is selected</p>
            </div>
          ) : (
            <div className="h-full flex flex-col overflow-hidden">
              
              {/* Reader Action Header */}
              <div className="px-6 py-3 border-b border-zinc-200/60 bg-white flex items-center justify-between shrink-0 h-[52px]">
                <div className="flex items-center gap-1">
                  <button onClick={handleQuickReply} className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer" title="Reply">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  </button>
                  <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer" title="Forward">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                  </button>
                  <div className="w-px h-4 bg-zinc-200 mx-2"></div>
                  <button onClick={() => deleteEmail(selectedEmail.id)} className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Delete">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              {/* Reader Body */}
              <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                
                {/* Subject Header */}
                <div className="mb-8">
                  <h1 className="text-[22px] font-medium text-zinc-900 leading-snug">{selectedEmail.subject}</h1>
                </div>

                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-600 text-white font-bold text-lg flex items-center justify-center uppercase shadow-sm">
                      {selectedEmail.fromName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">
                        {selectedEmail.fromName} <span className="text-xs text-zinc-500 font-normal">&lt;{selectedEmail.fromEmail}&gt;</span>
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">To: {selectedEmail.to}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 font-medium">{new Date(selectedEmail.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>

                {/* Email HTML Body Render */}
                <div 
                  className="text-sm text-zinc-800 leading-relaxed font-normal whitespace-pre-wrap max-w-4xl"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                />

                {/* Attachments Section */}
                {selectedEmail.attachments?.length > 0 && (
                  <div className="mt-12 pt-6 border-t border-zinc-100">
                    <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-4">{selectedEmail.attachments.length} Attachments</h4>
                    <div className="flex flex-wrap gap-4">
                      {selectedEmail.attachments.map((att, idx) => (
                        <div key={idx} className="group relative w-48 border border-zinc-200 rounded-2xl overflow-hidden hover:border-[#B45309] transition-colors cursor-pointer bg-zinc-50 shadow-sm">
                          <div className="h-24 bg-zinc-100 flex items-center justify-center border-b border-zinc-200 text-3xl">
                            {att.name.endsWith('.pdf') ? '📄' : '🖼️'}
                          </div>
                          <div className="p-3 bg-white">
                            <p className="text-xs font-bold text-zinc-900 truncate" title={att.name}>{att.name}</p>
                            <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{att.size}</p>
                          </div>
                          {/* Hover Download Overlay */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </div>
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

      {/* 3. COMPOSE EMAIL MODAL */}
      {isComposeOpen && (
        <div className="absolute bottom-0 right-16 w-full max-w-xl bg-white rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] border border-zinc-200 flex flex-col z-50 animate-in slide-in-from-bottom-8 duration-200">
          
          {/* Modal Header */}
          <div className="px-5 py-3 bg-zinc-900 text-white rounded-t-2xl flex justify-between items-center cursor-pointer" onClick={() => setIsComposeOpen(false)}>
            <h3 className="text-sm font-bold tracking-wide">New Message</h3>
            <div className="flex items-center gap-2">
              <button className="text-zinc-400 hover:text-white p-1">─</button>
              <button className="text-zinc-400 hover:text-white p-1">✕</button>
            </div>
          </div>

          <form onSubmit={handleSendEmail} className="flex flex-col flex-1 max-h-[600px]">
            <div className="overflow-y-auto px-6 py-2 custom-scrollbar">
              
              <div className="flex items-center border-b border-zinc-100 py-2">
                <span className="text-xs text-zinc-500 w-16">From</span>
                <select 
                  value={composeData.from} 
                  onChange={e => setComposeForm({ ...composeData, from: e.target.value })}
                  className="flex-1 bg-transparent text-sm font-bold text-zinc-800 outline-none cursor-pointer"
                >
                  {DOMAIN_ACCOUNTS.map(acc => <option key={acc.email} value={acc.email}>{acc.email}</option>)}
                </select>
              </div>

              <div className="flex items-center border-b border-zinc-100 py-2 relative group">
                <span className="text-xs text-zinc-500 w-16">To</span>
                <input type="email" required value={composeData.to} onChange={e => setComposeForm({ ...composeData, to: e.target.value })} className="flex-1 bg-transparent text-sm font-medium outline-none" />
                <span className="text-[10px] text-zinc-400 font-bold uppercase cursor-pointer hover:text-zinc-600 absolute right-0">Cc Bcc</span>
              </div>

              <div className="flex items-center border-b border-zinc-100 py-2">
                <input type="text" placeholder="Subject" required value={composeData.subject} onChange={e => setComposeForm({ ...composeData, subject: e.target.value })} className="flex-1 bg-transparent text-sm font-bold text-zinc-900 outline-none placeholder:font-medium placeholder:text-zinc-400" />
              </div>

              <div className="py-4">
                <textarea required rows="10" value={composeData.body} onChange={e => setComposeForm({ ...composeData, body: e.target.value })} className="w-full bg-transparent text-sm text-zinc-800 outline-none resize-none" />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <button type="submit" disabled={sending} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-bold shadow-sm transition-all disabled:opacity-50">
                  {sending ? 'Sending...' : 'Send'}
                </button>
                <div className="relative group cursor-pointer p-2 rounded-full hover:bg-zinc-200 transition-colors">
                  <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="relative group cursor-pointer">
                  <select value={composeData.template} onChange={handleTemplateSelect} className="appearance-none bg-transparent text-xs font-bold text-zinc-500 hover:text-zinc-800 outline-none cursor-pointer">
                    <option value="Blank">Templates</option>
                    <option value="Invoice">Tax Invoice</option>
                    <option value="PO">Purchase Order</option>
                  </select>
                </div>
              </div>
              <button type="button" onClick={() => setIsComposeOpen(false)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}