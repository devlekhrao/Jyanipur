import React, { useState } from 'react';

export default function MobileSettings({ companySettings = {}, setCompanySettings }) {
  const [activeTab, setActiveTab] = useState('Profile');

  const handleSaveSettings = () => {
    localStorage.setItem('jyanipur_companySettings', JSON.stringify(companySettings));
    alert('Preferences Saved Successfully!');
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

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  const tabs = ['Profile', 'Bank', 'Prefixes & Tax', 'Labor & HR', 'Templates', 'PDF Print'];

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">System Settings</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Branding & System Defaults</p>
          </div>
        </div>

        {/* SWIPEABLE TAB PILLS */}
        <div className="flex overflow-x-auto gap-2 pb-1 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 transition-all ${
                activeTab === tab 
                  ? 'bg-zinc-900 text-white shadow-md' 
                  : 'bg-white border border-zinc-200 text-zinc-500'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* FORM SECTIONS STREAM */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-24 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* TAB 1: COMPANY PROFILE */}
        {activeTab === 'Profile' && (
          <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">Company Profile</h3>

            <div>
              <label className={labelClass}>Company Name</label>
              <input type="text" value={companySettings.companyName || ''} onChange={e => setCompanySettings({...companySettings, companyName: e.target.value})} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Company GSTIN</label>
              <input type="text" value={companySettings.companyGst || ''} onChange={e => setCompanySettings({...companySettings, companyGst: e.target.value})} className={`${inputClass} uppercase font-mono`} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Email Address</label>
                <input type="email" value={companySettings.companyEmail || ''} onChange={e => setCompanySettings({...companySettings, companyEmail: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input type="tel" value={companySettings.companyPhone || ''} onChange={e => setCompanySettings({...companySettings, companyPhone: e.target.value})} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Company Address</label>
              <textarea value={companySettings.companyAddress || ''} onChange={e => setCompanySettings({...companySettings, companyAddress: e.target.value})} className={`${inputClass} min-h-[80px] resize-none`} />
            </div>

            <div>
              <label className={labelClass}>Logo Path / URL</label>
              <input type="text" value={companySettings.logoUrl || ''} onChange={e => setCompanySettings({...companySettings, logoUrl: e.target.value})} className={inputClass} placeholder="https://..." />
            </div>
          </div>
        )}

        {/* TAB 2: BANK DETAILS */}
        {activeTab === 'Bank' && (
          <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">Bank Account (PDF Print)</h3>

            <div>
              <label className={labelClass}>Bank Name</label>
              <input type="text" value={companySettings.bankName || ''} onChange={e => setCompanySettings({...companySettings, bankName: e.target.value})} className={inputClass} placeholder="e.g. ICICI Bank" />
            </div>

            <div>
              <label className={labelClass}>Account Holder Name</label>
              <input type="text" value={companySettings.accountName || ''} onChange={e => setCompanySettings({...companySettings, accountName: e.target.value})} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Account Number</label>
              <input type="text" value={companySettings.accountNo || ''} onChange={e => setCompanySettings({...companySettings, accountNo: e.target.value})} className={`${inputClass} font-mono`} />
            </div>

            <div>
              <label className={labelClass}>IFSC Code</label>
              <input type="text" value={companySettings.ifscCode || ''} onChange={e => setCompanySettings({...companySettings, ifscCode: e.target.value.toUpperCase()})} className={`${inputClass} uppercase font-mono`} />
            </div>
          </div>
        )}

        {/* TAB 3: PREFIXES & TAX DEFAULTS */}
        {activeTab === 'Prefixes & Tax' && (
          <div className="space-y-3">
            <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">Document Numbering Prefixes</h3>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>Tax Invoice</label>
                  <input type="text" placeholder="JIC/FY26/" value={companySettings.invoicePrefix || ''} onChange={e => setCompanySettings({...companySettings, invoicePrefix: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>PO Prefix</label>
                  <input type="text" placeholder="PO/" value={companySettings.poPrefix || ''} onChange={e => setCompanySettings({...companySettings, poPrefix: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>WO Prefix</label>
                  <input type="text" placeholder="WO/" value={companySettings.woPrefix || ''} onChange={e => setCompanySettings({...companySettings, woPrefix: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">Taxation Defaults</h3>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelClass}>Default GST %</label>
                  <input type="number" value={companySettings.defaultGstRate || ''} onChange={e => setCompanySettings({...companySettings, defaultGstRate: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>TDS %</label>
                  <input type="number" value={companySettings.defaultTdsRate || ''} onChange={e => setCompanySettings({...companySettings, defaultTdsRate: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>HSN/SAC</label>
                  <input type="text" value={companySettings.defaultHsnSac || ''} onChange={e => setCompanySettings({...companySettings, defaultHsnSac: e.target.value})} className={inputClass} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: LABOR & HR RULES */}
        {activeTab === 'Labor & HR' && (
          <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">HR & Labor Shift Rules</h3>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Start Time</label>
                <input type="time" value={companySettings.defaultWorkStartTime || ''} onChange={e => setCompanySettings({...companySettings, defaultWorkStartTime: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>End Time</label>
                <input type="time" value={companySettings.defaultWorkEndTime || ''} onChange={e => setCompanySettings({...companySettings, defaultWorkEndTime: e.target.value})} className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Overtime Multiplier (e.g. 1.5x)</label>
              <input type="number" step="0.1" inputMode="decimal" value={companySettings.overtimeMultiplier || ''} onChange={e => setCompanySettings({...companySettings, overtimeMultiplier: e.target.value})} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Skilled Rate (₹/day)</label>
                <input type="number" inputMode="numeric" value={companySettings.skilledLaborRate || ''} onChange={e => setCompanySettings({...companySettings, skilledLaborRate: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Unskilled Rate (₹/day)</label>
                <input type="number" inputMode="numeric" value={companySettings.unskilledLaborRate || ''} onChange={e => setCompanySettings({...companySettings, unskilledLaborRate: e.target.value})} className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TEMPLATES & TERMS */}
        {activeTab === 'Templates' && (
          <div className="space-y-3">
            <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">Default Document Terms</h3>

              <div>
                <label className={labelClass}>Tax Invoice Terms</label>
                <textarea value={companySettings.defaultInvoiceTerms || ''} onChange={e => setCompanySettings({...companySettings, defaultInvoiceTerms: e.target.value})} className={`${inputClass} min-h-[70px] resize-none`} />
              </div>

              <div>
                <label className={labelClass}>Estimation / BOQ Terms</label>
                <textarea value={companySettings.defaultEstimateTerms || ''} onChange={e => setCompanySettings({...companySettings, defaultEstimateTerms: e.target.value})} className={`${inputClass} min-h-[70px] resize-none`} />
              </div>

              <div>
                <label className={labelClass}>PO & Work Order Terms</label>
                <textarea value={companySettings.defaultPOTerms || ''} onChange={e => setCompanySettings({...companySettings, defaultPOTerms: e.target.value})} className={`${inputClass} min-h-[70px] resize-none`} />
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">WhatsApp Templates</h3>

              <div>
                <label className={labelClass}>Invoice Sent Message</label>
                <textarea value={companySettings.waInvoiceTemplate || ''} onChange={e => setCompanySettings({...companySettings, waInvoiceTemplate: e.target.value})} className={`${inputClass} min-h-[60px] resize-none`} />
              </div>

              <div>
                <label className={labelClass}>Purchase Order Sent Message</label>
                <textarea value={companySettings.waPoTemplate || ''} onChange={e => setCompanySettings({...companySettings, waPoTemplate: e.target.value})} className={`${inputClass} min-h-[60px] resize-none`} />
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">Workflow Stages</h3>

              <div>
                <label className={labelClass}>CRM Lead Stages (Comma Separated)</label>
                <textarea value={companySettings.crmStages || ''} onChange={e => setCompanySettings({...companySettings, crmStages: e.target.value})} className={`${inputClass} min-h-[60px] resize-none`} />
              </div>

              <div>
                <label className={labelClass}>Project Execution Statuses (Comma Separated)</label>
                <textarea value={companySettings.projectStatuses || ''} onChange={e => setCompanySettings({...companySettings, projectStatuses: e.target.value})} className={`${inputClass} min-h-[60px] resize-none`} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PDF PRINT & SIGNATURE */}
        {activeTab === 'PDF Print' && (
          <div className="space-y-3">
            
            {/* DIGITAL SIGNATURE */}
            <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">Digital Signature</h3>

              <div>
                <label className={labelClass}>Upload Signature Image</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleSignatureUpload} 
                  className="w-full text-xs text-zinc-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1E3A8A] file:text-white cursor-pointer" 
                />
              </div>

              <div>
                <label className={labelClass}>Or Paste Image URL / Base64</label>
                <input 
                  type="text" 
                  value={companySettings.signatureUrl || ''} 
                  onChange={e => setCompanySettings({...companySettings, signatureUrl: e.target.value})} 
                  className={inputClass} 
                  placeholder="https://..." 
                />
              </div>

              {companySettings.signatureUrl && (
                <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 flex justify-between items-center">
                  <div>
                    <span className="text-[8px] font-black text-zinc-400 uppercase block mb-1">Preview</span>
                    <img src={companySettings.signatureUrl} alt="Signature Preview" className="h-10 w-auto object-contain" />
                  </div>
                  <button 
                    onClick={() => setCompanySettings({...companySettings, signatureUrl: ''})}
                    className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* PRINT LAYOUT VISIBILITY */}
            <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">PDF Print Visibility</h3>

              <div className="space-y-3 pt-1">
                {[
                  { key: 'showBankDetailsOnPdf', label: 'Show Bank Details Box', desc: 'Bank name, A/C & IFSC' },
                  { key: 'showTermsOnPdf', label: 'Show Terms & Conditions', desc: 'Payment schedule text' },
                  { key: 'showRemarksOnPdf', label: 'Show Remarks Section', desc: 'Project specific scope notes' },
                  { key: 'showSignatoryOnPdf', label: 'Show Authorized Signatory', desc: 'Signature block on bottom right' },
                  { key: 'showSignatureImage', label: 'Render Signature Image', desc: 'Print uploaded signature graphic' }
                ].map(item => (
                  <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={companySettings[item.key] || false} 
                      onChange={e => setCompanySettings({...companySettings, [item.key]: e.target.checked})} 
                      className="w-5 h-5 rounded text-[#1E3A8A] border-zinc-300 focus:ring-[#1E3A8A] shrink-0 mt-0.5" 
                    />
                    <div>
                      <span className="text-xs font-black text-zinc-900 block leading-tight">{item.label}</span>
                      <span className="text-[9px] font-semibold text-zinc-400 block">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* PDF FOOTER DISCLAIMER */}
            <div className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm space-y-3">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">PDF Footer Note</h3>
              <textarea 
                value={companySettings.pdfFooterDisclaimer || ''} 
                onChange={e => setCompanySettings({...companySettings, pdfFooterDisclaimer: e.target.value})} 
                placeholder="This is a computer generated document..." 
                className={`${inputClass} min-h-[70px] resize-none`} 
              />
            </div>

          </div>
        )}

      </div>

      {/* FIXED BOTTOM SAVE BAR */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pb-4 bg-white border-t border-zinc-200 shadow-lg z-50">
        <button 
          onClick={handleSaveSettings}
          className="w-full py-4 bg-[#1E3A8A] text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md active:scale-95 transition-transform"
        >
          Save Preferences
        </button>
      </div>

    </div>
  );
}