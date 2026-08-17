import React, { useState } from 'react';

export default function Settings({ companySettings, setCompanySettings }) {
  const [activeTab, setActiveTab] = useState('profile');

  const handleSaveSettings = () => {
    localStorage.setItem('jyanipur_companySettings', JSON.stringify(companySettings));
    alert('Settings Saved Successfully!');
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanySettings(prev => ({ ...prev, signatureUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#B45309] focus:ring-1 focus:ring-inset focus:ring-[#B45309] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5";
  
  const cardClass = "bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-5";
  const cardHeaderClass = "text-sm font-bold text-[#B45309] uppercase tracking-wider border-b border-zinc-100 pb-3 mb-4";

  const tabs = [
    { id: 'profile', label: 'Profile & Bank', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /> },
    { id: 'accounting', label: 'Accounting', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /> },
    { id: 'printing', label: 'Print & PDF', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0v-2.25a2.25 2.25 0 012.25-2.25h6a2.25 2.25 0 012.25 2.25v2.25z" /> },
    { id: 'defaults', label: 'Defaults & Terms', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /> },
    { id: 'hr', label: 'HR & Labor', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /> },
    { id: 'integrations', label: 'Integrations', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.373 5.486-.084.29-.3.71-.52 1.14c-.28.552-.569 1.093-.825 1.488a.375.375 0 00.36.56c1.23-.207 2.35-.558 3.29-.982A9.68 9.68 0 0012 20.25z" /> }
  ];

  return (
    <div className="w-full h-full flex flex-col">
      
      {/* HEADER */}
      <div className="flex justify-between items-center pb-5 mb-6 border-b border-zinc-200 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">System Settings</h2>
          <p className="text-zinc-500 text-sm mt-0.5 font-medium">Configure company branding, taxation, and automation templates.</p>
        </div>
        <button onClick={handleSaveSettings} className="bg-[#B45309] hover:bg-[#92400E] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Save Preferences
        </button>
      </div>

      {/* MAIN LAYOUT: SIDEBAR + CONTENT */}
      <div className="flex flex-1 min-h-0 gap-8">
        
        {/* SETTINGS SIDEBAR */}
        <div className="w-64 shrink-0 flex flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
                activeTab === tab.id 
                  ? 'bg-amber-50 border-[#B45309]/20 text-[#B45309]' 
                  : 'bg-transparent border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {tab.icon}
              </svg>
              {tab.label}
            </button>
          ))}
        </div>

        {/* SETTINGS CONTENT AREA */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-10">
          <div className="max-w-3xl space-y-6">

            {/* TAB: PROFILE & BANK */}
            {activeTab === 'profile' && (
              <>
                <div className={cardClass}>
                  <h3 className={cardHeaderClass}>Company Profile</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><label className={labelClass}>Company Name</label><input type="text" value={companySettings.companyName || ''} onChange={e => setCompanySettings({...companySettings, companyName: e.target.value})} className={inputClass} placeholder="Registered Business Name" /></div>
                    <div><label className={labelClass}>Company GSTIN</label><input type="text" value={companySettings.companyGst || ''} onChange={e => setCompanySettings({...companySettings, companyGst: e.target.value.toUpperCase()})} className={`${inputClass} font-mono`} placeholder="29ABCDE1234F1Z5" /></div>
                    <div><label className={labelClass}>Logo URL</label><input type="text" value={companySettings.logoUrl || ''} onChange={e => setCompanySettings({...companySettings, logoUrl: e.target.value})} className={inputClass} placeholder="https://..." /></div>
                    <div><label className={labelClass}>Email Address</label><input type="email" value={companySettings.companyEmail || ''} onChange={e => setCompanySettings({...companySettings, companyEmail: e.target.value})} className={inputClass} placeholder="contact@company.com" /></div>
                    <div><label className={labelClass}>Phone Number</label><input type="text" value={companySettings.companyPhone || ''} onChange={e => setCompanySettings({...companySettings, companyPhone: e.target.value})} className={inputClass} placeholder="+91..." /></div>
                    <div className="md:col-span-2"><label className={labelClass}>Company Address</label><textarea value={companySettings.companyAddress || ''} onChange={e => setCompanySettings({...companySettings, companyAddress: e.target.value})} className={`${inputClass} h-20 resize-y`} placeholder="Full operating address"></textarea></div>
                  </div>
                </div>

                <div className={cardClass}>
                  <h3 className={cardHeaderClass}>Bank Details (Printed on Documents)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className={labelClass}>Bank Name</label><input type="text" value={companySettings.bankName || ''} onChange={e => setCompanySettings({...companySettings, bankName: e.target.value})} className={inputClass} placeholder="e.g. HDFC Bank" /></div>
                    <div><label className={labelClass}>Account Name</label><input type="text" value={companySettings.accountName || ''} onChange={e => setCompanySettings({...companySettings, accountName: e.target.value})} className={inputClass} placeholder="Beneficiary Name" /></div>
                    <div><label className={labelClass}>Account Number</label><input type="text" value={companySettings.accountNo || ''} onChange={e => setCompanySettings({...companySettings, accountNo: e.target.value})} className={inputClass} placeholder="A/C Number" /></div>
                    <div><label className={labelClass}>IFSC Code</label><input type="text" value={companySettings.ifscCode || ''} onChange={e => setCompanySettings({...companySettings, ifscCode: e.target.value.toUpperCase()})} className={`${inputClass} font-mono`} placeholder="HDFC0001234" /></div>
                  </div>
                </div>

                <div className={cardClass}>
                  <h3 className={cardHeaderClass}>Authorized Digital Signature</h3>
                  <div>
                    <label className={labelClass}>Upload Signature Image (PNG Recommended)</label>
                    <input type="file" accept="image/*" onChange={handleSignatureUpload} className="w-full text-sm text-zinc-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#B45309] file:text-white hover:file:bg-[#92400E] cursor-pointer transition-all" />
                  </div>
                  <div className="pt-2">
                    <label className={labelClass}>Or Paste Signature Image URL / Base64</label>
                    <input type="text" placeholder="https://example.com/signature.png" value={companySettings.signatureUrl || ''} onChange={e => setCompanySettings({...companySettings, signatureUrl: e.target.value})} className={inputClass} />
                  </div>
                  {companySettings.signatureUrl && (
                    <div className="mt-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200 inline-block w-full max-w-sm">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Signature Preview:</p>
                      <div className="bg-white p-4 rounded-lg border border-zinc-100 flex items-center justify-center">
                        <img src={companySettings.signatureUrl} alt="Signature Preview" className="h-16 w-auto object-contain mix-blend-multiply" />
                      </div>
                      <button onClick={() => setCompanySettings({...companySettings, signatureUrl: ''})} className="text-xs text-red-500 font-semibold hover:text-red-700 mt-3 flex items-center gap-1 cursor-pointer">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> Remove Signature
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB: ACCOUNTING */}
            {activeTab === 'accounting' && (
              <>
                <div className={cardClass}>
                  <h3 className={cardHeaderClass}>Document Numbering Prefixes</h3>
                  <p className="text-sm text-zinc-500 mb-4">Set the auto-generating prefixes for your official documents.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className={labelClass}>Tax Invoice</label><input type="text" placeholder="FY26-27/" value={companySettings.invoicePrefix || ''} onChange={e => setCompanySettings({...companySettings, invoicePrefix: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Estimation / BOQ</label><input type="text" placeholder="EST/" value={companySettings.estimatePrefix || ''} onChange={e => setCompanySettings({...companySettings, estimatePrefix: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Purchase Order</label><input type="text" placeholder="PO/" value={companySettings.poPrefix || ''} onChange={e => setCompanySettings({...companySettings, poPrefix: e.target.value})} className={inputClass} /></div>
                  </div>
                </div>

                <div className={cardClass}>
                  <h3 className={cardHeaderClass}>Taxation & Compliance Defaults</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className={labelClass}>Default GST (%)</label><input type="number" value={companySettings.defaultGstRate || ''} onChange={e => setCompanySettings({...companySettings, defaultGstRate: e.target.value})} className={inputClass} placeholder="18" /></div>
                    <div><label className={labelClass}>Default TDS (%)</label><input type="number" value={companySettings.defaultTdsRate || ''} onChange={e => setCompanySettings({...companySettings, defaultTdsRate: e.target.value})} className={inputClass} placeholder="1" /></div>
                    <div><label className={labelClass}>Default HSN/SAC</label><input type="text" value={companySettings.defaultHsnSac || ''} onChange={e => setCompanySettings({...companySettings, defaultHsnSac: e.target.value})} className={`${inputClass} font-mono`} placeholder="9954" /></div>
                  </div>
                </div>
              </>
            )}

            {/* TAB: PRINTING */}
            {activeTab === 'printing' && (
              <>
                <div className={cardClass}>
                  <h3 className={cardHeaderClass}>Print Layout Visibility</h3>
                  <p className="text-sm text-zinc-500 mb-4">Toggle which sections appear on generated PDF documents.</p>
                  <div className="space-y-4">
                    {[
                      { key: 'showBankDetailsOnPdf', label: 'Bank Details Box', desc: 'Include bank name, A/C number, and IFSC code.' },
                      { key: 'showTermsOnPdf', label: 'Terms & Conditions', desc: 'Display payment schedules and terms on the last page.' },
                      { key: 'showRemarksOnPdf', label: 'Scope Remarks Section', desc: 'Include project-specific notes and remarks.' },
                      { key: 'showSignatoryOnPdf', label: 'Authorized Signatory Block', desc: 'Show the signature block at the bottom right.' },
                      { key: 'showSignatureImage', label: 'Render Digital Signature Image', desc: 'Print the uploaded signature image automatically.' }
                    ].map(item => (
                      <label key={item.key} className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all">
                        <div className="mt-0.5">
                          <input type="checkbox" checked={companySettings[item.key] !== false} onChange={e => setCompanySettings({...companySettings, [item.key]: e.target.checked})} className="w-4 h-4 rounded text-[#B45309] border-zinc-300 focus:ring-[#B45309] cursor-pointer" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-zinc-900 block">{item.label}</span>
                          <span className="text-xs text-zinc-500">{item.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className={cardClass}>
                  <h3 className={cardHeaderClass}>PDF Footer Disclaimer</h3>
                  <div>
                    <label className={labelClass}>Global Footer Note</label>
                    <textarea value={companySettings.pdfFooterDisclaimer || ''} onChange={e => setCompanySettings({...companySettings, pdfFooterDisclaimer: e.target.value})} className={`${inputClass} h-20 resize-y text-sm`} placeholder="e.g. This is a computer-generated document and does not require a physical signature."></textarea>
                  </div>
                </div>
              </>
            )}

            {/* TAB: DEFAULTS */}
            {activeTab === 'defaults' && (
              <>
                <div className={cardClass}>
                  <h3 className={cardHeaderClass}>Default Terms & Conditions</h3>
                  <p className="text-sm text-zinc-500 mb-4">Set standard terms that pre-fill when creating new documents.</p>
                  <div className="space-y-4">
                    <div><label className={labelClass}>Tax Invoice Terms</label><textarea value={companySettings.defaultInvoiceTerms || ''} onChange={e => setCompanySettings({...companySettings, defaultInvoiceTerms: e.target.value})} className={`${inputClass} h-24 resize-y text-sm leading-relaxed`} placeholder="1. Payment due within 15 days..."></textarea></div>
                    <div><label className={labelClass}>Estimation / BOQ Terms</label><textarea value={companySettings.defaultEstimateTerms || ''} onChange={e => setCompanySettings({...companySettings, defaultEstimateTerms: e.target.value})} className={`${inputClass} h-24 resize-y text-sm leading-relaxed`} placeholder="1. 50% Mobilization advance..."></textarea></div>
                    <div><label className={labelClass}>Purchase Order Terms</label><textarea value={companySettings.defaultPOTerms || ''} onChange={e => setCompanySettings({...companySettings, defaultPOTerms: e.target.value})} className={`${inputClass} h-24 resize-y text-sm leading-relaxed`} placeholder="1. Material must match approved sample..."></textarea></div>
                  </div>
                </div>

                <div className={cardClass}>
                  <h3 className={cardHeaderClass}>Workflow Customization</h3>
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Project Execution Statuses (Comma Separated)</label>
                      <textarea value={companySettings.projectStatuses || ''} onChange={e => setCompanySettings({...companySettings, projectStatuses: e.target.value})} className={`${inputClass} h-20 resize-y text-sm`} placeholder="Planning, Civil Work, False Ceiling, Painting, Handover"></textarea>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB: HR */}
            {activeTab === 'hr' && (
              <div className={cardClass}>
                <h3 className={cardHeaderClass}>HR & Site Labor Rules</h3>
                <p className="text-sm text-zinc-500 mb-4">Set baseline rules for labor attendance and cost tracking.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className={labelClass}>Standard Start Time</label><input type="time" value={companySettings.defaultWorkStartTime || ''} onChange={e => setCompanySettings({...companySettings, defaultWorkStartTime: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Standard End Time</label><input type="time" value={companySettings.defaultWorkEndTime || ''} onChange={e => setCompanySettings({...companySettings, defaultWorkEndTime: e.target.value})} className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Overtime Multiplier (e.g., 1.5x)</label><input type="number" step="0.1" value={companySettings.overtimeMultiplier || ''} onChange={e => setCompanySettings({...companySettings, overtimeMultiplier: e.target.value})} className={inputClass} placeholder="1.5" /></div>
                  <div><label className={labelClass}>Skilled Labor Rate (₹/day)</label><input type="number" value={companySettings.skilledLaborRate || ''} onChange={e => setCompanySettings({...companySettings, skilledLaborRate: e.target.value})} className={inputClass} placeholder="e.g. 1200" /></div>
                  <div><label className={labelClass}>Unskilled Labor Rate (₹/day)</label><input type="number" value={companySettings.unskilledLaborRate || ''} onChange={e => setCompanySettings({...companySettings, unskilledLaborRate: e.target.value})} className={inputClass} placeholder="e.g. 800" /></div>
                </div>
              </div>
            )}

            {/* TAB: INTEGRATIONS */}
            {activeTab === 'integrations' && (
              <div className={cardClass}>
                <h3 className={cardHeaderClass}>WhatsApp Custom Templates</h3>
                <p className="text-sm text-zinc-500 mb-4">Pre-fill the message text when sharing documents via WhatsApp.</p>
                <div className="space-y-4">
                  <div><label className={labelClass}>Invoice Sent Message</label><textarea value={companySettings.waInvoiceTemplate || ''} onChange={e => setCompanySettings({...companySettings, waInvoiceTemplate: e.target.value})} className={`${inputClass} h-24 resize-y text-sm leading-relaxed`} placeholder="Hello! Attached is your latest tax invoice."></textarea></div>
                  <div><label className={labelClass}>Purchase Order Sent Message</label><textarea value={companySettings.waPoTemplate || ''} onChange={e => setCompanySettings({...companySettings, waPoTemplate: e.target.value})} className={`${inputClass} h-24 resize-y text-sm leading-relaxed`} placeholder="Dear Vendor, please find the attached Purchase Order."></textarea></div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}