import React, { useState, useEffect } from 'react';
import { getVaultDocuments, saveVaultDocument, deleteVaultDocument, getProjects } from '../db';

export default function DocumentVault() {
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

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full font-sans flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-200 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Document Vault & Drawings Drive</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Store 2D layout drawings, 3D renders, contracts, and site approvals in one place.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer">
          + Upload Document
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6 shrink-0">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {categories.map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)} 
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === cat ? 'bg-[#1E3A8A] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Project:</span>
          <select 
            value={selectedProject} 
            onChange={e => setSelectedProject(e.target.value)} 
            className="bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none cursor-pointer shadow-sm"
          >
            <option value="All">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Documents Grid (Fluid, 6-Columns on large screens) */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1">Loading Document Vault...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-3xl p-12 text-center text-zinc-400 text-xs font-medium flex-1 flex items-center justify-center">
          No drawings or documents found in this category. Click "+ Upload Document" above.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative">
              <button onClick={() => handleDelete(doc.id)} className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm cursor-pointer">&times;</button>
              
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{doc.fileType === 'IMAGE' ? '🖼️' : doc.fileType === 'PDF' ? '📄' : '📁'}</span>
                  <div>
                    <span className="bg-zinc-100 text-zinc-700 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{doc.category}</span>
                    <p className="text-[9px] font-bold text-[#1E3A8A] uppercase tracking-wider mt-0.5">{doc.projectName || 'General'}</p>
                  </div>
                </div>

                <h4 className="font-bold text-zinc-900 text-sm mb-1 line-clamp-2">{doc.documentName}</h4>
                {doc.notes && <p className="text-xs text-zinc-500 mb-4 line-clamp-2">{doc.notes}</p>}
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-between items-center mt-3">
                <span className="text-[9px] text-zinc-400 font-semibold">{doc.uploadedAt}</span>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm">
                  Open / View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">Add to Document Vault</h2>
            <p className="text-zinc-500 text-[10px] font-bold mb-6 uppercase tracking-widest">Store project drawings & approvals</p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>Project Site</label>
                <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className={`${inputClass} cursor-pointer`}>
                  <option value="">General Company Document</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className={labelClass}>Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={`${inputClass} cursor-pointer`}>
                  {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Document Title <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.documentName} onChange={e => setFormData({...formData, documentName: e.target.value})} placeholder="e.g. Master Bedroom 2D Plan Rev 3" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Upload File (Image/PDF)</label>
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="w-full text-xs text-zinc-600 file:mr-4 file:py-2 px-1 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#1E3A8A] file:text-white hover:file:bg-blue-900 cursor-pointer" />
              </div>

              <div>
                <label className={labelClass}>Or Paste File / Drive URL</label>
                <input type="text" value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} placeholder="https://..." className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Notes / Revision Comments</label>
                <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Approved by client on Aug 12..." className={inputClass} />
              </div>

              <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">
                  Save to Vault
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}