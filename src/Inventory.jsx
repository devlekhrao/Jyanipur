import React, { useState, useEffect } from 'react';
import { getProjects, getInventoryItems, getInventoryMovements, saveInventoryItem, recordInventoryMovement } from './db';

export default function Inventory() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Godown'); // 'Godown' or 'Movements'
  
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  const [itemForm, setItemForm] = useState({ name: '', category: 'Electrical', unit: 'Pcs' });
  const [movementForm, setMovementForm] = useState({ 
    itemId: '', type: 'IN', quantity: '', projectId: '', date: new Date().toISOString().split('T')[0], notes: '' 
  });

  const loadData = async () => {
    setLoading(true);
    const [fetchedItems, fetchedMovements, fetchedProjects] = await Promise.all([
      getInventoryItems(), getInventoryMovements(), getProjects()
    ]);
    setItems(fetchedItems);
    setMovements(fetchedMovements);
    setProjects(fetchedProjects.filter(p => p.status !== 'Completed'));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemForm.name) return alert("Item name required.");
    try {
      await saveInventoryItem(itemForm);
      setIsItemModalOpen(false);
      setItemForm({ name: '', category: 'Electrical', unit: 'Pcs' });
      await loadData();
    } catch (err) {
      alert("Failed to save item.");
    }
  };

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    if (!movementForm.itemId || !movementForm.quantity) return alert("Item and Quantity required.");
    if (movementForm.type === 'OUT' && !movementForm.projectId) return alert("Project Site is required for dispatches.");
    
    // Check if enough stock for dispatch
    if (movementForm.type === 'OUT') {
      const currentItem = items.find(i => i.id === parseInt(movementForm.itemId));
      if (currentItem && parseFloat(movementForm.quantity) > currentItem.totalStock) {
        return alert(`Insufficient stock in Godown. You only have ${currentItem.totalStock} ${currentItem.unit} available.`);
      }
    }

    try {
      await recordInventoryMovement({
        ...movementForm,
        quantity: parseFloat(movementForm.quantity),
        projectId: movementForm.type === 'OUT' ? parseInt(movementForm.projectId) : null
      });
      setIsMovementModalOpen(false);
      setMovementForm({ itemId: '', type: 'IN', quantity: '', projectId: '', date: new Date().toISOString().split('T')[0], notes: '' });
      await loadData();
    } catch (err) {
      alert("Failed to record movement.");
    }
  };

  const openMovementModal = (item = null, forceType = 'OUT') => {
    setMovementForm({ 
      itemId: item ? item.id : '', 
      type: forceType, 
      quantity: '', 
      projectId: '', 
      date: new Date().toISOString().split('T')[0], 
      notes: '' 
    });
    setIsMovementModalOpen(true);
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.category.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMovements = movements.filter(m => m.itemName.toLowerCase().includes(searchQuery.toLowerCase()) || (m.projectName && m.projectName.toLowerCase().includes(searchQuery.toLowerCase())));

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-zinc-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1";

  const lowStockCount = items.filter(i => i.totalStock <= 5 && i.totalStock > 0).length;
  const outOfStockCount = items.filter(i => i.totalStock === 0).length;
  const dispatchesThisMonth = movements.filter(m => m.type === 'OUT' && m.date.startsWith(new Date().toISOString().slice(0, 7))).length;

  return (
    <div className="w-full font-['Poppins'] pb-12 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end pb-4 border-b border-zinc-300/50 mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Material Inventory</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Track godown stock and material dispatches to active sites.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsItemModalOpen(true)} className="bg-white border border-zinc-200 text-zinc-700 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm hover:bg-zinc-50">+ Add Material Type</button>
          <button onClick={() => openMovementModal(null, 'OUT')} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">Dispatch to Site</button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest block mb-1">Total Unique Materials</span>
          <p className="text-xl font-semibold text-zinc-800">{items.length}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl border border-amber-200/60 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest block mb-1">Low Stock Alerts</span>
          <p className="text-xl font-semibold text-amber-600">{lowStockCount}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl border border-red-200/60 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest block mb-1">Out of Stock</span>
          <p className="text-xl font-semibold text-red-500">{outOfStockCount}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl border border-zinc-200/80 p-5 rounded-2xl shadow-sm">
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest block mb-1">Dispatches This Month</span>
          <p className="text-xl font-semibold text-emerald-600">{dispatchesThisMonth}</p>
        </div>
      </div>

      {/* TABS & SEARCH */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 bg-zinc-200/50 p-1 rounded-xl">
          <button onClick={() => setActiveTab('Godown')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'Godown' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>Godown Stock</button>
          <button onClick={() => setActiveTab('Movements')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'Movements' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>Dispatch History</button>
        </div>
        
        <div className="flex items-center h-9 bg-white/60 border border-zinc-200/60 rounded-xl px-3 shadow-sm">
          <span className="text-[10px] text-zinc-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search materials..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs font-medium text-zinc-700 outline-none px-2 w-48 placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2rem] shadow-xl overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading inventory...</div>
        ) : activeTab === 'Godown' ? (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-200/80 bg-zinc-50/50">
                  <th className="py-4 px-6 font-semibold w-1/3">Material Name</th>
                  <th className="py-4 px-4 font-semibold">Category</th>
                  <th className="py-4 px-4 font-semibold text-right">In Hand (Godown)</th>
                  <th className="py-4 px-6 font-semibold text-center w-32">Quick Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-zinc-700 divide-y divide-zinc-100">
                {filteredItems.length === 0 ? (
                  <tr><td colSpan="4" className="py-12 text-center text-zinc-400 text-xs">No materials found. Add one above.</td></tr>
                ) : filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-4 px-6 font-semibold text-zinc-800">{item.name}</td>
                    <td className="py-4 px-4"><span className="px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-md text-[10px] font-medium">{item.category}</span></td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-bold text-lg ${item.totalStock === 0 ? 'text-red-500' : item.totalStock <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {item.totalStock}
                      </span>
                      <span className="text-[10px] text-zinc-500 ml-1">{item.unit}</span>
                    </td>
                    <td className="py-4 px-6 text-center space-x-2">
                      <button onClick={() => openMovementModal(item, 'IN')} className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded uppercase tracking-wider transition-colors">+ Stock</button>
                      <button onClick={() => openMovementModal(item, 'OUT')} className="text-[9px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded uppercase tracking-wider transition-colors">Send</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="text-zinc-400 text-[9px] uppercase tracking-widest border-b border-zinc-200/80 bg-zinc-50/50">
                  <th className="py-4 px-6 font-semibold w-24">Date</th>
                  <th className="py-4 px-4 font-semibold w-20 text-center">Type</th>
                  <th className="py-4 px-4 font-semibold">Material</th>
                  <th className="py-4 px-4 font-semibold text-right w-24">Qty</th>
                  <th className="py-4 px-4 font-semibold w-1/4">Destination Site</th>
                  <th className="py-4 px-6 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="text-sm text-zinc-700 divide-y divide-zinc-100">
                {filteredMovements.length === 0 ? (
                  <tr><td colSpan="6" className="py-12 text-center text-zinc-400 text-xs">No movement history found.</td></tr>
                ) : filteredMovements.map(mov => (
                  <tr key={mov.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-4 px-6 text-xs text-zinc-500 font-medium">{mov.date}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold tracking-widest ${mov.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        {mov.type === 'IN' ? 'INWARD' : 'DISPATCH'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-zinc-800">{mov.itemName}</td>
                    <td className="py-4 px-4 text-right font-bold text-zinc-700">{mov.quantity} <span className="text-[9px] text-zinc-400 font-normal">{mov.unit}</span></td>
                    <td className="py-4 px-4 text-xs font-semibold text-zinc-600">{mov.projectName || <span className="text-zinc-400 italic">Central Godown</span>}</td>
                    <td className="py-4 px-6 text-[10px] text-zinc-500 truncate max-w-[200px]">{mov.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- ADD NEW MATERIAL MODAL --- */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-3xl w-full max-w-sm rounded-[2rem] shadow-2xl border border-white p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">Add Material Type</h2>
            <p className="text-zinc-500 text-[10px] font-medium mb-6 uppercase tracking-widest">Register a new item to the master list.</p>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className={labelClass}>Material Name *</label>
                <input type="text" required placeholder="e.g., Plywood 18mm" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Category</label>
                  <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})} className={`${inputClass} cursor-pointer appearance-none`}>
                    <option value="Hardware">Hardware</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Wood/Board">Wood / Board</option>
                    <option value="Paint">Paint</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Unit of Measure</label>
                  <select value={itemForm.unit} onChange={e => setItemForm({...itemForm, unit: e.target.value})} className={`${inputClass} cursor-pointer appearance-none`}>
                    <option value="Pcs">Pieces (Pcs)</option>
                    <option value="Bags">Bags</option>
                    <option value="SqFt">SqFt</option>
                    <option value="Sheets">Sheets</option>
                    <option value="Ltrs">Liters</option>
                    <option value="Mtrs">Meters</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-zinc-900 text-white font-bold rounded-xl text-xs">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RECORD MOVEMENT MODAL --- */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-3xl w-full max-w-md rounded-[2rem] shadow-2xl border border-white p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">
              {movementForm.type === 'IN' ? 'Add Stock to Godown' : 'Dispatch Material to Site'}
            </h2>
            <p className="text-zinc-500 text-[10px] font-medium mb-6 uppercase tracking-widest">
              {movementForm.type === 'IN' ? 'Record materials received at central storage.' : 'Move materials from godown to an active project.'}
            </p>

            <form onSubmit={handleRecordMovement} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-xl mb-2">
                <button type="button" onClick={() => setMovementForm({...movementForm, type: 'IN', projectId: ''})} className={`py-2 rounded-lg text-xs font-bold transition-all ${movementForm.type === 'IN' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-400'}`}>INWARD</button>
                <button type="button" onClick={() => setMovementForm({...movementForm, type: 'OUT'})} className={`py-2 rounded-lg text-xs font-bold transition-all ${movementForm.type === 'OUT' ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-400'}`}>DISPATCH</button>
              </div>

              <div>
                <label className={labelClass}>Select Material *</label>
                <select required value={movementForm.itemId} onChange={e => setMovementForm({...movementForm, itemId: e.target.value})} className={`${inputClass} cursor-pointer appearance-none`}>
                  <option value="" disabled>Choose item...</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} (Available: {i.totalStock} {i.unit})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Quantity *</label>
                  <input type="number" step="any" required placeholder="0" value={movementForm.quantity} onChange={e => setMovementForm({...movementForm, quantity: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Date</label>
                  <input type="date" required value={movementForm.date} onChange={e => setMovementForm({...movementForm, date: e.target.value})} className={inputClass} />
                </div>
              </div>

              {movementForm.type === 'OUT' && (
                <div>
                  <label className={labelClass}>Destination Project Site *</label>
                  <select required value={movementForm.projectId} onChange={e => setMovementForm({...movementForm, projectId: e.target.value})} className={`${inputClass} cursor-pointer appearance-none`}>
                    <option value="" disabled>Select active project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className={labelClass}>Notes / Reference</label>
                <input type="text" placeholder="Challan no, truck no, etc." value={movementForm.notes} onChange={e => setMovementForm({...movementForm, notes: e.target.value})} className={inputClass} />
              </div>

              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setIsMovementModalOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-xs">Cancel</button>
                <button type="submit" className={`flex-1 py-3 text-white font-bold rounded-xl text-xs ${movementForm.type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Confirm {movementForm.type === 'IN' ? 'Inward' : 'Dispatch'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}