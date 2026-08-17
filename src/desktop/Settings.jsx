import React from 'react';

export default function Settings({ companySettings, setCompanySettings }) {
  
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

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";
  
  const cardClass = "bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-sm space-y-4";
  const cardHeaderClass = "text-xs font-bold text-zinc-900 uppercase tracking-wider border-b border-zinc-100 pb-3 mb-2";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-end pb-4 border-b border-zinc-200 mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Portal & System Settings</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Configure company branding, taxation defaults, and automation templates.</p>
        </div>
        <button onClick={handleSaveSettings} className="bg-[#1E3A8A] text-white px-8 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:bg-blue-900 hover:-translate-y-0.5 transition-all cursor-pointer">
          Save Preferences
        </button>
      </div>

      {/* Main Grid Content (Scrollable with hidden scrollbar) */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8">
          
          {/* ============================================================== */}
          {/* LEFT COLUMN */}
          {/* ============================================================== */}
          <div className="space-y-8">
            
            <div className={cardClass}>
              <h3 className={cardHeaderClass}>Company Profile</h3>
              <div><label className={labelClass}>Company Name</label><input type="text" value={companySettings.companyName || ''} onChange={e => setCompanySettings({...companySettings, companyName: e.target.value})} className={inputClass} /></div>
              <div><label className={labelClass}>Company GSTIN</label><input type="text" value={companySettings.companyGst || ''} onChange={e => setCompanySettings({...companySettings, companyGst: e.target.value})} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Email Address</label><input type="text" value={companySettings.companyEmail || ''} onChange={e => setCompanySettings({...companySettings, companyEmail: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Phone Number</label><input type="text" value={companySettings.companyPhone || ''} onChange={e => setCompanySettings({...companySettings, companyPhone: e.target.value})} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Company Address</label><textarea value={companySettings.companyAddress || ''} onChange={e => setCompanySettings({...companySettings, companyAddress: e.target.value})} className={`${inputClass} h-20 resize-none`}></textarea></div>
              <div><label className={labelClass}>Logo Path / URL</label><input type="text" value={companySettings.logoUrl || ''} onChange={e => setCompanySettings({...companySettings, logoUrl: e.target.value})} className={inputClass} /></div>
            </div>

            <div className={cardClass}>
              <h3 className={cardHeaderClass}>HR & Site Labor Rules</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Standard Start Time</label><input type="time" value={companySettings.defaultWorkStartTime || ''} onChange={e => setCompanySettings({...companySettings, defaultWorkStartTime: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Standard End Time</label><input type="time" value={companySettings.defaultWorkEndTime || ''} onChange={e => setCompanySettings({...companySettings, defaultWorkEndTime: e.target.value})} className={inputClass} /></div>
              </div>
              <div><label className={labelClass}>Overtime Multiplier (e.g., 1.5x)</label><input type="number" step="0.1" value={companySettings.overtimeMultiplier || ''} onChange={e => setCompanySettings({...companySettings, overtimeMultiplier: e.target.value})} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Skilled Labor Rate (₹/day)</label><input type="number" value={companySettings.skilledLaborRate || ''} onChange={e => setCompanySettings({...companySettings, skilledLaborRate: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Unskilled Labor Rate (₹/day)</label><input type="number" value={companySettings.unskilledLaborRate || ''} onChange={e => setCompanySettings({...companySettings, unskilledLaborRate: e.target.value})} className={inputClass} /></div>
              </div>
            </div>

            <div className={cardClass}>
              <h3 className={cardHeaderClass}>Authorized Digital Signature</h3>
              <div><label className={labelClass}>Upload Signature Image (PNG recommended)</label><input type="file" accept="image/*" onChange={handleSignatureUpload} className="w-full text-xs text-zinc-600 file:mr-4 file:py-2.5 px-1 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A8A] file:text-white hover:file:bg-blue-900 cursor-pointer" /></div>
              <div><label className={labelClass}>Or Paste Signature Image URL / Base64</label><input type="text" placeholder="https://example.com/signature.png" value={companySettings.signatureUrl || ''} onChange={e => setCompanySettings({...companySettings, signatureUrl: e.target.value})} className={inputClass} /></div>
              {companySettings.signatureUrl && (
                <div className="mt-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-200 inline-block">
                  <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Signature Preview:</p>
                  <img src={companySettings.signatureUrl} alt="Signature Preview" className="h-14 w-auto object-contain border-b border-zinc-200 pb-1" />
                  <button onClick={() => setCompanySettings({...companySettings, signatureUrl: ''})} className="text-[9px] text-red-500 font-bold hover:underline mt-2 block cursor-pointer">Remove Signature</button>
                </div>
              )}
            </div>

            <div className={cardClass}>
              <h3 className={cardHeaderClass}>Bank Details (Printed on PDF)</h3>
              <div><label className={labelClass}>Bank Name</label><input type="text" value={companySettings.bankName || ''} onChange={e => setCompanySettings({...companySettings, bankName: e.target.value})} className={inputClass} /></div>
              <div><label className={labelClass}>Account Name</label><input type="text" value={companySettings.accountName || ''} onChange={e => setCompanySettings({...companySettings, accountName: e.target.value})} className={inputClass} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Account Number</label><input type="text" value={companySettings.accountNo || ''} onChange={e => setCompanySettings({...companySettings, accountNo: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>IFSC Code</label><input type="text" value={companySettings.ifscCode || ''} onChange={e => setCompanySettings({...companySettings, ifscCode: e.target.value})} className={inputClass} /></div>
              </div>
            </div>

          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN */}
          {/* ============================================================== */}
          <div className="space-y-8">
            
            <div className={cardClass}>
              <h3 className={cardHeaderClass}>Document Numbering Prefixes</h3>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelClass}>Tax Invoice</label><input type="text" placeholder="JIC/FY26-27/" value={companySettings.invoicePrefix || ''} onChange={e => setCompanySettings({...companySettings, invoicePrefix: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Purchase Order</label><input type="text" placeholder="PO/" value={companySettings.poPrefix || ''} onChange={e => setCompanySettings({...companySettings, poPrefix: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Work Order</label><input type="text" placeholder="WO/" value={companySettings.woPrefix || ''} onChange={e => setCompanySettings({...companySettings, woPrefix: e.target.value})} className={inputClass} /></div>
              </div>
            </div>

            <div className={cardClass}>
              <h3 className={cardHeaderClass}>Taxation & Compliance Defaults</h3>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelClass}>Default GST (%)</label><input type="number" value={companySettings.defaultGstRate || ''} onChange={e => setCompanySettings({...companySettings, defaultGstRate: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Default TDS (%)</label><input type="number" value={companySettings.defaultTdsRate || ''} onChange={e => setCompanySettings({...companySettings, defaultTdsRate: e.target.value})} className={inputClass} /></div>
                <div><label className={labelClass}>Default HSN/SAC</label><input type="text" value={companySettings.defaultHsnSac || ''} onChange={e => setCompanySettings({...companySettings, defaultHsnSac: e.target.value})} className={inputClass} /></div>
              </div>
            </div>

            <div className={cardClass}>
              <h3 className={cardHeaderClass}>Workflow & Status Customization</h3>
              <div>
                <label className={labelClass}>CRM Lead Stages (Comma Separated)</label>
                <textarea value={companySettings.crmStages || ''} onChange={e => setCompanySettings({...companySettings, crmStages: e.target.value})} className={`${inputClass} h-20 resize-y text-[11px]`}></textarea>
                <p className="text-[9px] text-zinc-400 mt-1.5 font-medium">Example: New Inquiry, Site Visit, Design Proposed, Contract Signed</p>
              </div>
              <div>
                <label className={labelClass}>Project Execution Statuses (Comma Separated)</label>
                <textarea value={companySettings.projectStatuses || ''} onChange={e => setCompanySettings({...companySettings, projectStatuses: e.target.value})} className={`${inputClass} h-20 resize-y text-[11px]`}></textarea>
                <p className="text-[9px] text-zinc-400 mt-1.5 font-medium">Example: Planning, Civil Work, False Ceiling, Painting, Handover</p>
              </div>
            </div>

            <div className={cardClass}>
              <h3 className={cardHeaderClass}>Default Terms & Conditions</h3>
              <div><label className={labelClass}>Tax Invoice Terms</label><textarea value={companySettings.defaultInvoiceTerms || ''} onChange={e => setCompanySettings({...companySettings, defaultInvoiceTerms: e.target.value})} className={`${inputClass} h-16 resize-y text-[11px]`}></textarea></div>
              <div><label className={labelClass}>Estimation / BOQ Terms</label><textarea value={companySettings.defaultEstimateTerms || ''} onChange={e => setCompanySettings({...companySettings, defaultEstimateTerms: e.target.value})} className={`${inputClass} h-16 resize-y text-[11px]`}></textarea></div>
              <div><label className={labelClass}>Purchase & Work Order Terms</label><textarea value={companySettings.defaultPOTerms || ''} onChange={e => setCompanySettings({...companySettings, defaultPOTerms: e.target.value})} className={`${inputClass} h-16 resize-y text-[11px]`}></textarea></div>
            </div>

            <div className={cardClass}>
              <h3 className={cardHeaderClass}>WhatsApp Custom Templates</h3>
              <div><label className={labelClass}>Invoice Sent Message</label><textarea value={companySettings.waInvoiceTemplate || ''} onChange={e => setCompanySettings({...companySettings, waInvoiceTemplate: e.target.value})} className={`${inputClass} h-16 resize-y text-[11px]`}></textarea></div>
              <div><label className={labelClass}>Purchase Order Sent Message</label><textarea value={companySettings.waPoTemplate || ''} onChange={e => setCompanySettings({...companySettings, waPoTemplate: e.target.value})} className={`${inputClass} h-16 resize-y text-[11px]`}></textarea></div>
            </div>

            <div className={cardClass}>
              <h3 className={cardHeaderClass}>Print Layout Visibility</h3>
              <div className="space-y-4 pt-2">
                {[
                  { key: 'showBankDetailsOnPdf', label: 'Show Bank Details Box', desc: 'Include bank name, account number, and IFSC on printed PDFs' },
                  { key: 'showTermsOnPdf', label: 'Show Terms & Conditions', desc: 'Display payment schedules and terms on printed PDFs' },
                  { key: 'showRemarksOnPdf', label: 'Show Remarks Section', desc: 'Include project specific notes on printed PDFs' },
                  { key: 'showSignatoryOnPdf', label: 'Show Authorized Signatory Block', desc: 'Include signature block at the bottom right of PDFs' },
                  { key: 'showSignatureImage', label: 'Render Signature Image on PDF', desc: 'Print the uploaded signature image above the Authorized Signatory text' }
                ].map(item => (
                  <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                    <div className="mt-0.5">
                      <input type="checkbox" checked={companySettings[item.key] || false} onChange={e => setCompanySettings({...companySettings, [item.key]: e.target.checked})} className="w-4 h-4 rounded text-[#1E3A8A] border-zinc-300 focus:ring-[#1E3A8A] cursor-pointer" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-zinc-800 block group-hover:text-zinc-900 transition-colors">{item.label}</span>
                      <span className="text-[10px] text-zinc-500">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className={cardClass}>
              <h3 className={cardHeaderClass}>PDF Footer Note</h3>
              <div><label className={labelClass}>Disclaimer / Note</label><textarea value={companySettings.pdfFooterDisclaimer || ''} onChange={e => setCompanySettings({...companySettings, pdfFooterDisclaimer: e.target.value})} className={`${inputClass} h-20 resize-none text-[11px]`}></textarea></div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}