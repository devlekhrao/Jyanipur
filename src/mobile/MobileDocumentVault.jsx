import React, { useState, useEffect } from 'react';
import { getVaultDocuments, saveVaultDocument, deleteVaultDocument, getProjects } from '../db';

export default function MobileDocumentVault() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProject, setSelectedProject] = useState('All');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '', documentName: '', category: '2D Drawings', fileUrl: '', fileType: 'PDF', notes: ''
  });

  const categories = ['All', '2D Drawings', '3D Renders', 'Client Approvals', 'Contracts & Legal', 'Site Photos'];

  const loadData = async () => {
    setLoading(true);
    try {
      const [docs, projs] = await Promise.all([getVaultDocuments(), getProjects()]);
      setDocuments(docs || []);
      setProjects(projs || []);
    } catch (e) {
      console.warn("Ensure getVaultDocuments and getProjects exist in db.js");
      setDocuments([]);
      setProjects([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          fileUrl: reader.result,
          documentName: prev.documentName || file.name.split('.')[0],
          fileType: file.type.includes('pdf') ? 'PDF' : file.type.includes('image') ? 'IMAGE' : 'FILE'
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.fileUrl) {
      alert("Please upload a file or paste a valid document link.");
      return;
    }
    await saveVaultDocument(formData);
    setIsModalOpen(false);
    setFormData({ projectId: '', documentName: '', category: '2D Drawings', fileUrl: '', fileType: 'PDF', notes: '' });
    await loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this document from the vault?")) {
      await deleteVaultDocument(id);
      await loadData();
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesCat = activeCategory === 'All' || doc.category === activeCategory;
    const matchesProj = selectedProject === 'All' || doc.projectId === Number(selectedProject);
    return matchesCat && matchesProj;
  });

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-sm font-medium transition-all shadow-sm";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full flex flex-col font-['Poppins']">
      
      {/* HEADER SECTION */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Document Vault</h2>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Drawings & Drive</p>
          </div>
          
          {/* PROJECT SELECTOR DROPDOWN */}
          <div className="relative">
            <select 
              value={selectedProject} 
              onChange={e => setSelectedProject(e.target.value)} 
              className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-800 outline-none shadow-sm pr-7 appearance-none"
            >
              <option value="All">All Sites</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400 text-[10px]">▼</div>
          </div>
        </div>

        {/* UPLOAD BUTTON */}
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="w-full mt-3 bg-[#1E3A8A] hover:bg-blue-900 text-white py-3.5 rounded-xl text-xs font-semibold text-[11px] uppercase tracking-wider transition-all shadow-md active:scale-[0.98]"
        >
          + Upload Document / Drawing
        </button>
      </div>

      {/* SWIPEABLE CATEGORY PILLS */}
      <div className="flex overflow-x-auto gap-2 pb-2 mb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {categories.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2.5 rounded-full text-[10px] font-semibold text-[11px] uppercase tracking-widest shrink-0 transition-all ${
                isActive 
                  ? 'bg-zinc-900 text-white shadow-md' 
                  : 'bg-white border border-zinc-200 text-zinc-500'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* DOCUMENT CARDS LIST */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1">Loading Document Vault...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-12 bg-white/50 border border-zinc-200 border-dashed rounded-3xl mt-4">
          <span className="text-3xl mb-2 block">📁</span>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">No documents found</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-4 space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white border border-zinc-200 rounded-[1.5rem] p-4 shadow-sm active:scale-[0.99] transition-transform flex flex-col justify-between">
              
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                    {doc.fileType === 'IMAGE' ? '🖼️' : doc.fileType === 'PDF' ? '📄' : '📁'}
                  </div>
                  <div>
                    <span className="bg-blue-50 text-[#1E3A8A] text-[8px] font-semibold text-[11px] px-2 py-0.5 rounded uppercase tracking-wider">
                      {doc.category}
                    </span>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-0.5">
                      {doc.projectName || 'General Site'}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => handleDelete(doc.id)} 
                  className="text-zinc-300 hover:text-red-500 active:text-red-600 p-1 -mr-1 -mt-1"
                >
                  ✕
                </button>
              </div>

              <h4 className="font-bold text-zinc-900 text-sm mt-1 mb-1 leading-snug">{doc.documentName}</h4>
              
              {doc.notes && (
                <p className="text-xs text-zinc-500 mb-3 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 line-clamp-2">
                  {doc.notes}
                </p>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-zinc-100 mt-2">
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{doc.uploadedAt || 'Uploaded'}</span>
                <a 
                  href={doc.fileUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="bg-[#1E3A8A] text-white px-4 py-2 rounded-xl text-[10px] font-semibold text-[11px] uppercase tracking-wider active:scale-95 transition-transform"
                >
                  View / Open
                </a>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MOBILE UPLOAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full h-[90vh] rounded-t-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300">
            
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Upload to Vault</h2>
                <p className="text-zinc-500 text-[9px] font-bold mt-0.5 uppercase tracking-widest">Drawings & Files</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-zinc-100 text-zinc-600 rounded-full font-bold active:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <form id="vaultForm" onSubmit={handleSave} className="space-y-4 pb-20">
                
                <div>
                  <label className={labelClass}>Project Site</label>
                  <div className="relative">
                    <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className={`${inputClass} appearance-none`}>
                      <option value="">General Company Document</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Category</label>
                  <div className="relative">
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={`${inputClass} appearance-none`}>
                      {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">▼</div>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Document Title <span className="text-red-500">*</span></label>
                  <input type="text" required value={formData.documentName} onChange={e => setFormData({...formData, documentName: e.target.value})} placeholder="e.g. Master Bedroom 2D Layout" className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Upload File (Photo or PDF)</label>
                  <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="w-full text-xs text-zinc-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1E3A8A] file:text-white cursor-pointer" />
                </div>

                <div>
                  <label className={labelClass}>Or Paste File / Drive URL</label>
                  <input type="text" value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} placeholder="https://..." className={inputClass} />
                </div>

                <div>
                  <label className={labelClass}>Notes / Revision Comments</label>
                  <textarea 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="Approved by client on Aug 12..." 
                    className={`${inputClass} min-h-[90px] resize-none`} 
                  />
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom,20px)+16px)] border-t border-zinc-100 bg-white shrink-0">
              <button 
                type="submit" 
                form="vaultForm"
                className="w-full py-4 bg-[#1E3A8A] text-white font-semibold text-[11px] rounded-xl text-xs uppercase tracking-wider shadow-lg active:scale-[0.98] transition-transform"
              >
                Save to Vault
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}