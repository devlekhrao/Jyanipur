import React, { useState, useEffect } from 'react';
import * as db from '../db';
import { sendWhatsAppMessage } from '../WhatsAppHelper';

const DEFAULT_PACKAGES = [
  {
    id: 1,
    name: 'Turnkey Luxury Residential 3BHK',
    category: 'Residential',
    startingRate: '₹1,650 / Sq.Ft.',
    timeline: '45 - 60 Working Days',
    tagline: 'Complete modular woodwork, false ceiling with ambient cove, and premium wall finishes.',
    inclusions: [
      'Marine ply (BWP grade) modular kitchen with acrylic/PU finish',
      'Full height master & guest wardrobes with soft-close hardware',
      'Gypsum false ceiling with LED magnetic track lighting conduits',
      'Dulux/Asian Paints Royale luxury emulsion with 2-coat putty base',
      'Designer bathroom vanity counters and concealed plumbing fixtures'
    ],
    popular: true
  },
  {
    id: 2,
    name: 'Executive Commercial & Office Fitout',
    category: 'Commercial',
    startingRate: '₹1,200 / Sq.Ft.',
    timeline: '30 - 45 Working Days',
    tagline: 'Modern collaborative workspace design, acoustic glass cabins, and centralized MEP execution.',
    inclusions: [
      'Frameless toughened glass partitions with acoustic sealing',
      'Modular ergonomic workstations with concealed cable raceways',
      'Armstrong mineral fiber acoustic ceiling tiles',
      'High-traffic commercial carpet tile / vitrified flooring',
      'Server rack electrical setup and Biometric access conduits'
    ],
    popular: false
  },
  {
    id: 3,
    name: 'Premium Villa Civil & Interior Package',
    category: 'Turnkey Construction',
    startingRate: '₹2,400 / Sq.Ft.',
    timeline: '90 - 120 Working Days',
    tagline: 'End-to-end architectural construction, Italian marble flooring, and smart automation.',
    inclusions: [
      'Full structural modifications and reinforcement plastering',
      'Imported Italian marble lay-out with mirror diamond polishing',
      'Smart home automation (curtain controllers, lighting & security)',
      'Exterior weather-shield texture paint and stone cladding',
      'Customized terrace pergola with waterproof glass roof'
    ],
    popular: true
  },
  {
    id: 4,
    name: 'Rapid Kitchen & Wardrobe Makeover',
    category: 'Renovation',
    startingRate: '₹4,50,000 L.S.',
    timeline: '15 - 20 Working Days',
    tagline: 'Fast-track modular carpentry and hardware overhaul with zero structural disruption.',
    inclusions: [
      'Demolition and disposal of old kitchen cabinets',
      'Factory-pressed HDHMR cabinetry with anti-scratch laminate',
      'Hafele / Hettich soft-close tandem boxes and pull-outs',
      'Quartz stone countertop installation with undermount sink'
    ],
    popular: false
  }
];

export default function Services({ setActivePage, companySettings = {} }) {
  const [packages, setPackages] = useState(() => {
    const saved = localStorage.getItem('jyanipur_services_catalog');
    return saved ? JSON.parse(saved) : DEFAULT_PACKAGES;
  });

  const [activeCategory, setActiveCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPackage, setNewPackage] = useState({
    name: '',
    category: 'Residential',
    startingRate: '',
    timeline: '',
    tagline: '',
    inclusions: ['']
  });

  const handleSavePackage = (e) => {
    e.preventDefault();
    if (!newPackage.name) return;
    const updated = [
      ...packages,
      {
        ...newPackage,
        id: Date.now(),
        inclusions: newPackage.inclusions.filter(i => i.trim() !== '')
      }
    ];
    setPackages(updated);
    localStorage.setItem('jyanipur_services_catalog', JSON.stringify(updated));
    setIsModalOpen(false);
    setNewPackage({ name: '', category: 'Residential', startingRate: '', timeline: '', tagline: '', inclusions: [''] });
  };

  const handlePitchWhatsApp = (pkg) => {
    const phone = prompt("Enter client phone number (+91):");
    if (!phone) return;
    const msg = `*${companySettings.companyName || 'Jyanipur Interiors & Construction'}* - Service Brochure\n\n*Package:* ${pkg.name}\n*Category:* ${pkg.category}\n*Benchmark Pricing:* ${pkg.startingRate}\n*Expected Timeline:* ${pkg.timeline}\n\n*Key Inclusions:*\n${pkg.inclusions.map(i => `• ${i}`).join('\n')}\n\nFor custom floor plan estimates and 3D walkthroughs, contact us at ${companySettings.companyPhone || '+91 9246546742'}.`;
    sendWhatsAppMessage(phone, msg);
  };

  const handleDraftEstimate = (pkg) => {
    localStorage.setItem('jyanipur_desktop_estimate_draft', JSON.stringify({
      estimateDetails: {
        partyName: '',
        partyAddress: '',
        projectName: pkg.name,
        description: `${pkg.tagline}\nIncludes:\n${pkg.inclusions.join(', ')}`,
        date: new Date().toISOString().split('T')[0],
        terms: companySettings.defaultEstimateTerms || ''
      },
      items: [
        { id: 1, description: `${pkg.name} - Turnkey Execution Scope`, unit: 'Sq.Ft.', sizeL: '', sizeB: '', no: '', qty: 1000, rate: parseFloat(pkg.startingRate.replace(/[^0-9.]/g, '')) || 1500, gst: 18 }
      ],
      taxMode: 'CGST_SGST'
    }));

    if (setActivePage) {
      setActivePage('Estimation');
    } else {
      alert(`Scope for "${pkg.name}" drafted! Navigate to Estimation to review.`);
    }
  };

  const filtered = packages.filter(p => activeCategory === 'All' || p.category === activeCategory);

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Services & Solutions Catalog</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Standardized interior & construction scope packages ready for client pitches and rapid estimation drafts.</p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="h-10 bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 border border-black"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Service Package
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 mb-6 p-1 bg-zinc-100 rounded-lg w-fit shrink-0 border border-zinc-200">
        {['All', 'Residential', 'Commercial', 'Turnkey Construction', 'Renovation'].map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
              activeCategory === cat ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Packages Grid */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map(pkg => (
            <div key={pkg.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:border-zinc-400 transition-all flex flex-col justify-between relative overflow-hidden">
              {pkg.popular && (
                <div className="absolute top-0 right-0 bg-zinc-900 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-sm">
                  Top Client Choice
                </div>
              )}

              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">
                  {pkg.category}
                </span>
                <h3 className="text-lg font-bold text-zinc-900 tracking-tight mb-1">{pkg.name}</h3>
                <p className="text-xs text-zinc-500 mb-4 leading-relaxed font-medium">{pkg.tagline}</p>

                <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 mb-5">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Benchmark Rate</span>
                    <span className="text-sm font-black text-zinc-900">{pkg.startingRate}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Standard Turnaround</span>
                    <span className="text-sm font-bold text-zinc-700">{pkg.timeline}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Scope Inclusions:</span>
                  {pkg.inclusions.map((inc, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-700 font-medium">
                      <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{inc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-100 flex gap-2">
                <button
                  onClick={() => handleDraftEstimate(pkg)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-1.5 border border-black cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Draft BOQ
                </button>
                <button
                  onClick={() => handlePitchWhatsApp(pkg)}
                  className="px-4 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Share Pitch
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal to add package */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-200">
            <div className="px-6 py-5 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Create Service Package</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSavePackage} className="p-6 overflow-y-auto space-y-4 bg-zinc-50/50">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Package Title *</label>
                <input required type="text" value={newPackage.name} onChange={e => setNewPackage({...newPackage, name: e.target.value})} placeholder="e.g. Minimalist Scandinavian 2BHK" className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Category</label>
                  <select value={newPackage.category} onChange={e => setNewPackage({...newPackage, category: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-bold outline-none cursor-pointer">
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Turnkey Construction">Turnkey Construction</option>
                    <option value="Renovation">Renovation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Starting Rate</label>
                  <input type="text" value={newPackage.startingRate} onChange={e => setNewPackage({...newPackage, startingRate: e.target.value})} placeholder="e.g. ₹1,750 / Sq.Ft." className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Marketing Tagline</label>
                <input type="text" value={newPackage.tagline} onChange={e => setNewPackage({...newPackage, tagline: e.target.value})} placeholder="One sentence pitch highlighting materials and finish..." className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Key Inclusions (Separate with commas)</label>
                <textarea rows="3" placeholder="Modular kitchen, Wardrobes, False ceiling, Painting" onChange={e => setNewPackage({...newPackage, inclusions: e.target.value.split(',').map(s => s.trim())})} className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-zinc-200">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer">Save Package</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}