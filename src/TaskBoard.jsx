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
    const [t, p, e] = await Promise.all([getTasks(), getProjects(), getEmployees()]);
    setTasks(t);
    setProjects(p.filter(proj => proj.status !== 'Completed'));
    setEmployees(e.filter(emp => emp.status === 'Active'));
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

  const inputClass = "w-full px-4 py-3 rounded-xl border-none bg-zinc-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-inner";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="w-full font-['Poppins'] pb-12 relative h-full flex flex-col">
      <div className="flex justify-between items-end pb-4 border-b border-zinc-300/50 mb-6 shrink-0 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-zinc-800 tracking-tight">Project Task Board</h2>
          <p className="text-zinc-500 text-xs mt-1 font-medium">Assign work, set deadlines, and track completion.</p>
        </div>
        <div className="flex gap-2">
          {/* PDF EXPORT BUTTON ENGINE */}
          <button onClick={() => window.print()} className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm">
            🖨️ Save as PDF
          </button>
          <button onClick={handleExport} className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm">
            📥 Export CSV
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md">+ Add Task</button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs">Loading board...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start custom-scrollbar print:block">
          {columns.map(col => (
            <div key={col} className="min-w-[300px] w-[300px] flex flex-col gap-3 bg-zinc-100/50 rounded-2xl p-3 border border-zinc-200/50 print:w-full print:mb-8 print:border-none print:bg-transparent">
              <div className="flex justify-between items-center px-2 py-1 border-b border-zinc-200/60 pb-2">
                <h3 className="text-xs font-extrabold text-zinc-800 uppercase tracking-widest">{col}</h3>
                <span className="bg-zinc-200 text-zinc-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{tasks.filter(t => t.status === col).length}</span>
              </div>
              
              <div className="flex flex-col gap-3">
                {tasks.filter(t => t.status === col).map(task => (
                  <div key={task.id} className="bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group relative print:border-b print:shadow-none print:rounded-none print:p-2">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">{task.projectName}</p>
                      <button onClick={() => handleDelete(task.id)} className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs print:hidden">&times;</button>
                    </div>
                    <h4 className="font-bold text-zinc-900 text-sm mb-1 pr-4">{task.title}</h4>
                    {task.description && <p className="text-xs text-zinc-500 mb-3">{task.description}</p>}
                    
                    <div className="flex justify-between items-center pt-3 border-t border-zinc-100 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${new Date(task.dueDate) < new Date() && task.status !== 'Done' ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-600'}`}>
                        Due: {task.dueDate}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500">🧑 {task.assignedTo || 'Unassigned'}</span>
                    </div>
                    
                    <select 
                      value={task.status} 
                      onChange={(e) => handleStatusMove(task.id, e.target.value)}
                      className="text-[9px] font-bold uppercase tracking-widest bg-zinc-50 border border-zinc-200 text-zinc-600 rounded px-2 py-1 outline-none cursor-pointer mt-3 w-full print:hidden"
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8">
            <h2 className="text-xl font-bold text-zinc-900 mb-1">New Task</h2>
            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className={labelClass}>Project Site</label>
                <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className={inputClass}>
                  <option value="">Office / General Admin</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className={labelClass}>Task Title *</label><input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} placeholder="e.g. Select laminates with client" /></div>
              <div><label className={labelClass}>Details</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClass} resize-none h-20`} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Due Date *</label><input type="date" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className={inputClass} /></div>
                <div>
                  <label className={labelClass}>Assign To</label>
                  <select value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})} className={inputClass}>
                    <option value="">Select Staff...</option>
                    {employees.map(emp => <option key={emp.id} value={emp.fullName}>{emp.fullName}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl text-xs">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-zinc-900 text-white font-bold rounded-xl text-xs">Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}