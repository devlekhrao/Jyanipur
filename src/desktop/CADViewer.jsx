import React, { useState, useEffect, useRef } from 'react';
import { getProjects, getVaultDocuments, saveVaultDocument } from '../db';

export default function CADViewer() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [activeDrawing, setActiveDrawing] = useState(null);

  // Canvas & Interaction States
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState('pan'); // 'pan', 'measure', 'rect', 'circle', 'text'

  // CAD Layers Control
  const [layers, setLayers] = useState({
    walls: { name: 'Walls & Structure', visible: true, color: '#1E293B', width: 3 },
    furniture: { name: 'Furniture & Fixtures', visible: true, color: '#B45309', width: 1.5 },
    electrical: { name: 'Electrical & Lighting', visible: true, color: '#EAB308', width: 1.5 },
    plumbing: { name: 'Plumbing & Drainage', visible: true, color: '#0284C7', width: 1.5 },
    hvac: { name: 'HVAC & Ducting', visible: true, color: '#10B981', width: 1.5 },
    dimensions: { name: 'Dimensions & Grid', visible: true, color: '#94A3B8', width: 1 },
    annotations: { name: 'User Markups & Notes', visible: true, color: '#DC2626', width: 2 }
  });

  // User Markups & Measurement Overlay State
  const [markups, setMarkups] = useState([]);
  const [currentShape, setCurrentShape] = useState(null);
  const [measuredDistance, setMeasuredDistance] = useState(null);

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    projectId: '',
    documentName: '',
    category: '2D Drawings',
    notes: '',
    fileUrl: '',
    fileType: 'DWG'
  });

  // Load Projects and CAD Drawings from Neon DB via Vault
  const loadData = async () => {
    setLoading(true);
    try {
      const [projs, docs] = await Promise.all([getProjects(), getVaultDocuments()]);
      setProjects(projs || []);
      
      const cadDocs = (docs || []).filter(d => 
        d.fileType === 'DWG' || 
        d.category === '2D Drawings' || 
        (d.documentName && d.documentName.toLowerCase().includes('.dwg'))
      );
      
      setDrawings(cadDocs);
      if (cadDocs.length > 0 && !activeDrawing) {
        setActiveDrawing(cadDocs[0]);
      }
    } catch (err) {
      console.error("Error loading CAD drawings from DB:", err);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // --- CANVAS VECTOR RENDER ENGINE ---
  const renderCAD = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Resize canvas to parent bounds
    const parent = canvas.parentElement;
    if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    // Clear Screen & Draw Dark Architectural Grid Floor
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Apply Transform Matrix (Pan + Zoom Centered)
    ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
    ctx.scale(scale, scale);

    // 1. Draw Architectural Grid
    if (layers.dimensions.visible) {
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 0.5 / scale;
      const gridSize = 50;
      const gridCount = 30;

      for (let x = -gridCount * gridSize; x <= gridCount * gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, -gridCount * gridSize);
        ctx.lineTo(x, gridCount * gridSize);
        ctx.stroke();
      }
      for (let y = -gridCount * gridSize; y <= gridCount * gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-gridCount * gridSize, y);
        ctx.lineTo(gridCount * gridSize, y);
        ctx.stroke();
      }
    }

    // 2. Draw Sample Procedural CAD Layout Vectors if active drawing is present
    // Wall Structure Layer
    if (layers.walls.visible) {
      ctx.strokeStyle = layers.walls.color;
      ctx.lineWidth = layers.walls.width / scale;
      
      // Outer Perimeter Walls
      ctx.strokeRect(-350, -250, 700, 500);
      // Internal Room Dividers
      ctx.beginPath();
      ctx.moveTo(-100, -250); ctx.lineTo(-100, 250); // Main Spine Wall
      ctx.moveTo(-100, 0); ctx.lineTo(350, 0);       // Horizontal Split
      ctx.moveTo(120, -250); ctx.lineTo(120, 0);     // Bedroom Wall
      ctx.stroke();
    }

    // Furniture Layer
    if (layers.furniture.visible) {
      ctx.strokeStyle = layers.furniture.color;
      ctx.lineWidth = layers.furniture.width / scale;
      
      // Conference Table / Living Sofa
      ctx.strokeRect(-300, -180, 140, 90);
      ctx.strokeRect(-280, -160, 100, 50);
      // Reception Desk
      ctx.beginPath();
      ctx.arc(200, -120, 45, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Electrical Layer
    if (layers.electrical.visible) {
      ctx.strokeStyle = layers.electrical.color;
      ctx.fillStyle = layers.electrical.color;
      ctx.lineWidth = layers.electrical.width / scale;

      const switches = [
        { x: -250, y: -200 }, { x: 0, y: -120 }, { x: 220, y: 120 }, { x: -200, y: 150 }
      ];
      switches.forEach(sw => {
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, 6 / scale, 0, Math.PI * 2);
        ctx.fill();
        // Cable Routing Dashed Path
        ctx.setLineDash([4 / scale, 4 / scale]);
        ctx.beginPath();
        ctx.moveTo(sw.x, sw.y);
        ctx.lineTo(sw.x + 40, sw.y + 20);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // Plumbing Layer
    if (layers.plumbing.visible) {
      ctx.strokeStyle = layers.plumbing.color;
      ctx.lineWidth = layers.plumbing.width / scale;
      ctx.beginPath();
      ctx.moveTo(320, -230); ctx.lineTo(320, 230); ctx.lineTo(120, 230);
      ctx.stroke();
    }

    // HVAC Layer
    if (layers.hvac.visible) {
      ctx.strokeStyle = layers.hvac.color;
      ctx.lineWidth = layers.hvac.width / scale;
      ctx.strokeRect(-80, -220, 40, 440);
    }

    // 3. Render User Markups & Measurements
    markups.forEach(m => {
      ctx.strokeStyle = m.color || layers.annotations.color;
      ctx.fillStyle = m.color || layers.annotations.color;
      ctx.lineWidth = 2 / scale;

      if (m.type === 'measure') {
        ctx.beginPath();
        ctx.moveTo(m.x1, m.y1);
        ctx.lineTo(m.x2, m.y2);
        ctx.stroke();

        const distFeet = (Math.hypot(m.x2 - m.x1, m.y2 - m.y1) / 10).toFixed(2);
        ctx.font = `${12 / scale}px sans-serif`;
        ctx.fillText(`${distFeet} ft`, (m.x1 + m.x2) / 2, (m.y1 + m.y2) / 2 - 5);
      } else if (m.type === 'rect') {
        ctx.strokeRect(m.x, m.y, m.w, m.h);
      } else if (m.type === 'text') {
        ctx.font = `${14 / scale}px sans-serif`;
        ctx.fillText(m.text, m.x, m.y);
      }
    });

    // Draw Shape in Progress
    if (currentShape) {
      ctx.strokeStyle = layers.annotations.color;
      ctx.lineWidth = 2 / scale;
      if (currentShape.type === 'measure') {
        ctx.beginPath();
        ctx.moveTo(currentShape.x1, currentShape.y1);
        ctx.lineTo(currentShape.x2, currentShape.y2);
        ctx.stroke();
      } else if (currentShape.type === 'rect') {
        ctx.strokeRect(currentShape.x, currentShape.y, currentShape.w, currentShape.h);
      }
    }

    ctx.restore();
  };

  useEffect(() => {
    renderCAD();
  }, [scale, offset, layers, markups, currentShape, activeDrawing]);

  // Convert Screen Mouse Coordinates to CAD Canvas Vector Coordinates
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    return {
      x: (screenX - canvas.width / 2 - offset.x) / scale,
      y: (screenY - canvas.height / 2 - offset.y) / scale
    };
  };

  // Canvas Mouse Controls (Pan, Measure & Markups)
  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);

    if (activeTool === 'pan') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    } else if (activeTool === 'measure') {
      setCurrentShape({ type: 'measure', x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
    } else if (activeTool === 'rect') {
      setCurrentShape({ type: 'rect', x: coords.x, y: coords.y, w: 0, h: 0 });
    } else if (activeTool === 'text') {
      const text = prompt("Enter CAD Note / Annotation:");
      if (text) {
        setMarkups(prev => [...prev, { type: 'text', x: coords.x, y: coords.y, text, color: '#DC2626' }]);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning && activeTool === 'pan') {
      setOffset({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    } else if (currentShape) {
      const coords = getCanvasCoords(e);
      if (currentShape.type === 'measure') {
        setCurrentShape(prev => ({ ...prev, x2: coords.x, y2: coords.y }));
        const distFeet = (Math.hypot(coords.x - currentShape.x1, coords.y - currentShape.y1) / 10).toFixed(2);
        setMeasuredDistance(distFeet);
      } else if (currentShape.type === 'rect') {
        setCurrentShape(prev => ({ ...prev, w: coords.x - prev.x, h: coords.y - prev.y }));
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (currentShape) {
      setMarkups(prev => [...prev, currentShape]);
      setCurrentShape(null);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setScale(prevScale => Math.min(Math.max(0.2, prevScale * zoomFactor), 15));
  };

  const handleToggleLayer = (layerKey) => {
    setLayers(prev => ({
      ...prev,
      [layerKey]: { ...prev[layerKey], visible: !prev[layerKey].visible }
    }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadForm(prev => ({
          ...prev,
          fileUrl: reader.result,
          documentName: prev.documentName || file.name
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.fileUrl) return alert("Please select a DWG / CAD file.");

    const selectedProj = projects.find(p => String(p.id || p._id) === String(uploadForm.projectId));
    const payload = {
      ...uploadForm,
      projectId: uploadForm.projectId ? (Number(uploadForm.projectId) || uploadForm.projectId) : '',
      projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'General Drawing',
      uploadedAt: new Date().toISOString().split('T')[0]
    };

    await saveVaultDocument(payload);
    setIsUploadOpen(false);
    setUploadForm({ projectId: '', documentName: '', category: '2D Drawings', notes: '', fileUrl: '', fileType: 'DWG' });
    await loadData();
  };

  const filteredDrawings = drawings.filter(d => 
    selectedProjectId === 'ALL' || String(d.projectId) === String(selectedProjectId)
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-white font-['Poppins'] select-none">
      
      {/* 1. TOP CAD TOOLBAR */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#B45309] text-white flex items-center justify-center font-bold text-lg shadow-md">
            📐
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide">CAD Vector Drawing Studio</h2>
            <p className="text-[10px] text-slate-400 font-medium">
              {activeDrawing ? `${activeDrawing.documentName} • ${activeDrawing.projectName || 'General Site'}` : 'Select a drawing from left panel'}
            </p>
          </div>
        </div>

        {/* CAD Interaction Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button 
            onClick={() => setActiveTool('pan')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTool === 'pan' ? 'bg-[#B45309] text-white' : 'text-slate-400 hover:text-white'}`}
            title="Pan Mode"
          >
            ✋ Pan
          </button>
          <button 
            onClick={() => setActiveTool('measure')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTool === 'measure' ? 'bg-[#B45309] text-white' : 'text-slate-400 hover:text-white'}`}
            title="Tape Measure Distance"
          >
            📏 Measure
          </button>
          <button 
            onClick={() => setActiveTool('rect')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTool === 'rect' ? 'bg-[#B45309] text-white' : 'text-slate-400 hover:text-white'}`}
            title="Markup Box"
          >
            🔲 Box
          </button>
          <button 
            onClick={() => setActiveTool('text')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTool === 'text' ? 'bg-[#B45309] text-white' : 'text-slate-400 hover:text-white'}`}
            title="Add Text Annotation"
          >
            💬 Note
          </button>
          {markups.length > 0 && (
            <button onClick={() => setMarkups([])} className="px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer">
              Clear Markups
            </button>
          )}
        </div>

        {/* Zoom & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1 text-xs font-mono">
            <button onClick={() => setScale(s => Math.max(0.2, s * 0.85))} className="pr-2 hover:text-[#B45309] cursor-pointer">-</button>
            <span>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(15, s * 1.15))} className="pl-2 hover:text-[#B45309] cursor-pointer">+</button>
            <button onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} className="ml-3 text-[10px] font-bold text-amber-500 hover:underline cursor-pointer">Reset</button>
          </div>

          <button onClick={() => setIsUploadOpen(true)} className="bg-[#B45309] hover:bg-[#92400E] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5">
            + Upload CAD
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE (SIDEBAR + CANVAS) */}
      <div className="flex flex-1 min-h-0 relative">
        
        {/* LEFT PANEL: DRAWING DIRECTORY */}
        <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Filter Site</label>
            <select 
              value={selectedProjectId} 
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
            >
              <option value="ALL">All Project Sites</option>
              {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 [&::-webkit-scrollbar]:hidden">
            {loading ? (
              <p className="text-xs text-slate-500 text-center py-8">Loading CAD Vault...</p>
            ) : filteredDrawings.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs font-medium">
                No CAD drawings uploaded yet. Click "+ Upload CAD" above.
              </div>
            ) : (
              filteredDrawings.map(dwg => (
                <div 
                  key={dwg.id}
                  onClick={() => setActiveDrawing(dwg)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                    activeDrawing?.id === dwg.id ? 'bg-[#B45309]/20 border-[#B45309] text-white' : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xl">📐</span>
                  <div className="overflow-hidden flex-1">
                    <h4 className="font-semibold text-xs truncate">{dwg.documentName}</h4>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{dwg.projectName}</p>
                    <span className="text-[9px] font-mono text-amber-500/80 block mt-1">{dwg.uploadedAt || 'CAD Drawing'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CENTER: INTERACTIVE CANVAS */}
        <div className="flex-1 h-full relative overflow-hidden bg-slate-950">
          <canvas 
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className={`w-full h-full ${activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
          />

          {/* Real-time Distance Readout Floating Banner */}
          {measuredDistance && activeTool === 'measure' && (
            <div className="absolute top-4 left-4 bg-amber-500/20 border border-amber-500/50 backdrop-blur-md px-4 py-2 rounded-xl text-amber-300 font-mono text-xs font-bold shadow-2xl">
              📐 Measured Length: {measuredDistance} ft
            </div>
          )}
        </div>

        {/* RIGHT PANEL: LAYER CONTROL & MARKUPS */}
        <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 p-4 space-y-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
              CAD Layer Visibility
            </h3>
            <div className="space-y-2">
              {Object.entries(layers).map(([key, layer]) => (
                <div 
                  key={key}
                  onClick={() => handleToggleLayer(key)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                    layer.visible ? 'bg-slate-950 border-slate-800' : 'bg-slate-950/30 border-slate-900 opacity-40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: layer.color }}></span>
                    <span className="text-xs font-semibold text-slate-200">{layer.name}</span>
                  </div>
                  <span className="text-xs">{layer.visible ? '👁️' : '🙈'}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">
              Drawing Specifications
            </h3>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs font-mono text-slate-400">
              <div className="flex justify-between"><span>Scale Ratio:</span><span className="text-slate-200">1 : 100</span></div>
              <div className="flex justify-between"><span>Grid Units:</span><span className="text-slate-200">Feet & Inches</span></div>
              <div className="flex justify-between"><span>Active Layer:</span><span className="text-amber-500">Annotations</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. UPLOAD CAD MODAL */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Upload New CAD Drawing</h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveUpload} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Project Site</label>
                <select required value={uploadForm.projectId} onChange={e => setUploadForm({...uploadForm, projectId: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 text-white outline-none">
                  <option value="">Select Project Site...</option>
                  {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Drawing Title</label>
                <input type="text" required placeholder="e.g. Master Floor Plan Rev 3.dwg" value={uploadForm.documentName} onChange={e => setUploadForm({...uploadForm, documentName: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold rounded-xl px-3 py-2.5 text-white outline-none" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Select DWG / DXF File</label>
                <input type="file" accept=".dwg,.dxf,image/*" onChange={handleFileUpload} className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#B45309] file:text-white cursor-pointer" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Revision Notes</label>
                <textarea rows="2" placeholder="Approved by site architect..." value={uploadForm.notes} onChange={e => setUploadForm({...uploadForm, notes: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold rounded-xl p-3 text-white outline-none resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-[#B45309] hover:bg-[#92400E] text-white rounded-xl text-xs font-bold cursor-pointer">Save to Vault</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}