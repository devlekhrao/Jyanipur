import React, { useState, useEffect } from 'react';
import { getTasks, saveTask, updateTaskStatus, deleteTask, getProjects, getEmployees } from './db';
import { exportToCSV } from './utils';

export default function TaskBoard() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '', title: '', description: '', status: 'To Do', dueDate: new Date().toISOString().split('T')[0], assignedTo: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, p, e] = await Promise.all([getTasks(), getProjects(), getEmployees()]);
      setTasks(t || []);
      setProjects((p || []).filter(proj => proj.status !== 'Completed'));
      setEmployees((e || []).filter(emp => emp.status === 'Active'));
    } catch (err) {
      console.warn("Ensure task functions exist in db.js");
      setTasks([]);
      setProjects([]);
      setEmployees([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await saveTask(formData);
    setIsModalOpen(false);
    setFormData({ projectId: '', title: '', description: '', status: 'To Do', dueDate: new Date().toISOString().split('T')[0], assignedTo: '' });
    await loadData();
  };

  const handleStatusMove = async (id, newStatus) => {
    await updateTaskStatus(id, newStatus);
    await loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this task?")) {
      await deleteTask(id);
      await loadData();
    }
  };

  const handleExport = () => {
    const exportData = tasks.map(t => ({
      'Task': t.title,
      'Project': t.projectName,
      'Status': t.status,
      'Due Date': t.dueDate,
      'Assignee': t.assignedTo
    }));
    exportToCSV('Jyanipur_Tasks', exportData);
  };

  const columns = ['To Do', 'In Progress', 'Done'];

  const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] text-zinc-900 text-xs font-medium transition-all shadow-sm";
  const labelClass = "block text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="w-full h-full font-['Poppins'] flex flex-col">
      
      {/* Header Controls */}
      <div className="flex justify-between items-end pb-4 border-b border-zinc-200 mb-6 shrink-0 print:hidden">
        <div>
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Project Task Board</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Assign work, set deadlines, and track completion.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
            🖨️ Save as PDF
          </button>
          <button onClick={handleExport} className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer">
            📥 Export CSV
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-[#1E3A8A] hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer">
            + Add Task
          </button>
        </div>
      </div>

      {/* Task Kanban Columns (Full Width Split) */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1">Loading board...</div>
      ) : (
        <div className="flex w-full gap-4 flex-1 min-h-0 print:block">
          {columns.map(col => (
            <div key={col} className="flex-1 flex flex-col bg-white border border-zinc-200 rounded-[1.5rem] shadow-sm overflow-hidden print:w-full print:mb-8 print:border-none print:shadow-none">
              
              {/* Column Header */}
              <div className="px-4 py-3 border-b border-zinc-100 flex justify-between items-center shrink-0 bg-zinc-50/50">
                <h3 className="text-[10px] font-extrabold text-zinc-800 uppercase tracking-widest">{col}</h3>
                <span className="bg-zinc-200 text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded-md">{tasks.filter(t => t.status === col).length}</span>
              </div>
              
              {/* Column Body */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {tasks.filter(t => t.status === col).map(task => (
                  <div key={task.id} className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group relative print:border-b print:shadow-none print:rounded-none print:p-2">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[9px] font-extrabold text-[#1E3A8A] uppercase tracking-widest">{task.projectName || 'General Office'}</p>
                      <button onClick={() => handleDelete(task.id)} className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm cursor-pointer print:hidden">&times;</button>
                    </div>
                    <h4 className="font-extrabold text-zinc-900 text-sm mb-1 pr-4">{task.title}</h4>
                    {task.description && <p className="text-xs text-zinc-500 mb-3 leading-relaxed">{task.description}</p>}
                    
                    <div className="flex justify-between items-center pt-3 border-t border-zinc-100 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-600'}`}>
                        Due: {task.dueDate}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500">🧑 {task.assignedTo || 'Unassigned'}</span>
                    </div>
                    
                    <select 
                      value={task.status} 
                      onChange={(e) => handleStatusMove(task.id, e.target.value)}
                      className="text-[9px] font-bold uppercase tracking-widest bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg px-2 py-1.5 outline-none cursor-pointer mt-3 w-full print:hidden"
                    >
                      {columns.map(c => <option key={c} value={c}>Move to {c}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-extrabold text-zinc-900 mb-1">New Task</h2>
            <p className="text-zinc-500 text-[10px] font-bold mb-6 uppercase tracking-widest">Assign task to site or office</p>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className={labelClass}>Project Site</label>
                <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className={`${inputClass} cursor-pointer`}>
                  <option value="">Office / General Admin</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Task Title <span className="text-red-500">*</span></label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} placeholder="e.g. Select laminates with client" />
              </div>
              <div>
                <label className={labelClass}>Details</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClass} resize-none h-20`} placeholder="Add specific task instructions..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Due Date <span className="text-red-500">*</span></label>
                  <input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Assign To</label>
                  <select value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} className={`${inputClass} cursor-pointer`}>
                    <option value="">Select Staff...</option>
                    {employees.map(emp => <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-6 border-t border-zinc-100 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-3.5 bg-[#1E3A8A] hover:bg-blue-900 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-md cursor-pointer">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}