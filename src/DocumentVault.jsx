import React, { useState, useEffect } from 'react';
import { getVaultDocuments, saveVaultDocument, deleteVaultDocument, getProjects } from './db';

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
    const [docs, projs] = await Promise.all([getVaultDocuments(), getProjects()]);
    setDocuments(docs);
    setProjects(projs);
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

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-zinc-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full font-['Poppins'] pb-12 relative h-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Document Vault & Drawings Drive</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Store 2D layout drawings, 3D renders, contracts, and site approvals in one place.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">
          + Upload Document
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6 shrink-0">
        <div className="flex bg-white/60 p-1 rounded-xl shadow-sm border border-zinc-200 overflow-x-auto custom-scrollbar">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-800'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Project:</span>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="bg-white/80 border border-zinc-200 rounded-xl px-3 py-2 text-xs font-bold text-zinc-800 outline-none cursor-pointer">
            <option value="All">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading Document Vault...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-white/40 border border-white/60 rounded-3xl p-12 text-center text-zinc-400 text-xs font-medium">
          No drawings or documents found in this category. Click "+ Upload Document" above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar pb-6">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white/80 backdrop-blur-xl border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative">
              <button onClick={() => handleDelete(doc.id)} className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs">&times;</button>
              
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{doc.fileType === 'IMAGE' ? '🖼️' : doc.fileType === 'PDF' ? '📄' : '📁'}</span>
                  <div>
                    <span className="bg-zinc-100 text-zinc-600 text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{doc.category}</span>
                    <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider mt-0.5">{doc.projectName}</p>
                  </div>
                </div>

                <h4 className="font-bold text-zinc-900 text-sm mb-1 line-clamp-2">{doc.documentName}</h4>
                {doc.notes && <p className="text-xs text-zinc-500 mb-4 line-clamp-2">{doc.notes}</p>}
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-between items-center mt-3">
                <span className="text-[9px] text-zinc-400 font-medium">{doc.uploadedAt}</span>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="bg-zinc-900 hover:bg-black text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">
                  Open / View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">Add to Document Vault</h2>
            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className={labelClass}>Project Site</label>
                <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className={inputClass}>
                  <option value="">General Company Document</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className={labelClass}>Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className={inputClass}>
                  {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Document Title *</label>
                <input type="text" required value={formData.documentName} onChange={e => setFormData({...formData, documentName: e.target.value})} placeholder="e.g. Master Bedroom 2D Plan Rev 3" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Upload File (Image/PDF)</label>
                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="w-full text-xs text-zinc-600 file:mr-4 file:py-2 px-1 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-black cursor-pointer" />
              </div>

              <div>
                <label className={labelClass}>Or Paste File / Drive URL</label>
                <input type="text" value={formData.fileUrl} onChange={e => setFormData({...formData, fileUrl: e.target.value})} placeholder="https://..." className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Notes / Revision Comments</label>
                <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Approved by client on Aug 12..." className={inputClass} />
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-zinc-900 text-white font-bold rounded-xl text-xs">Save to Vault</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}