import React, { useState, useEffect } from 'react';
import { getTasks, saveTask, updateTaskStatus, deleteTask, getProjects, getEmployees } from '../db';
import { exportToCSV } from '../utils';

export default function TaskBoard() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    status: 'To Do',
    dueDate: new Date().toISOString().split('T')[0],
    assignedTo: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [t, p, e] = await Promise.all([getTasks(), getProjects(), getEmployees()]);
      setTasks(t || []);
      setProjects((p || []).filter(proj => proj.status !== 'Completed'));
      setEmployees((e || []).filter(emp => emp.status === 'Active'));
    } catch (err) {
      console.error("Error loading tasks from cloud DB:", err);
      setTasks([]);
      setProjects([]);
      setEmployees([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title) return alert("Task title is required.");

    setSubmitting(true);
    try {
      const selectedProj = projects.find(p => String(p.id || p._id) === String(formData.projectId));
      await saveTask({
        ...formData,
        projectId: formData.projectId ? (Number(formData.projectId) || formData.projectId) : '',
        projectName: selectedProj ? (selectedProj.name || selectedProj.projectName) : 'General Office'
      });
      setIsModalOpen(false);
      setFormData({
        projectId: '',
        title: '',
        description: '',
        status: 'To Do',
        dueDate: new Date().toISOString().split('T')[0],
        assignedTo: ''
      });
      await loadData();
    } catch (err) {
      alert("Failed to save task to cloud database.");
    }
    setSubmitting(false);
  };

  const handleStatusMove = async (id, newStatus) => {
    try {
      await updateTaskStatus(id, newStatus);
      await loadData();
    } catch (err) {
      console.error("Failed to move task status:", err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this task?")) {
      setLoading(true);
      await deleteTask(id);
      await loadData();
    }
  };

  const handleExport = () => {
    const exportData = tasks.map(t => ({
      'Task': t.title,
      'Project': t.projectName || 'General Office',
      'Status': t.status,
      'Due Date': t.dueDate,
      'Assignee': t.assignedTo || 'Unassigned'
    }));
    exportToCSV('Jyanipur_Tasks', exportData);
  };

  const columns = ['To Do', 'In Progress', 'Done'];

  const inputClass = "w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 text-zinc-900 text-sm font-medium transition-all shadow-sm disabled:opacity-75 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5";

  return (
    <div className="w-full h-full flex flex-col font-['Inter',sans-serif]">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-6 border-b border-zinc-200 shrink-0 gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Project Task Board</h2>
          <p className="text-zinc-500 text-sm mt-1 font-medium">Assign work, set deadlines, and track execution across active job sites.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.print()} 
            className="bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 h-10"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="hidden sm:inline">Save PDF</span>
          </button>
          <button 
            onClick={handleExport} 
            className="bg-white border border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 h-10"
          >
            <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-zinc-900 hover:bg-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm cursor-pointer flex items-center gap-2 h-10 border border-black"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      {/* KANBAN BOARD */}
      {loading ? (
        <div className="py-20 text-center text-zinc-400 font-medium text-xs flex-1 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
          <p>Syncing task board from cloud database...</p>
        </div>
      ) : (
        <div className="flex w-full gap-5 flex-1 min-h-0 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] print:block">
          {columns.map(col => {
            const columnTasks = tasks.filter(t => t.status === col);
            return (
              <div 
                key={col} 
                className="flex-1 min-w-[320px] flex flex-col bg-zinc-100/60 border border-zinc-200 rounded-xl shadow-sm overflow-hidden print:w-full print:mb-8 print:border-none print:shadow-none"
              >
                {/* Column Header */}
                <div className="px-5 py-4 border-b border-zinc-200 bg-white flex justify-between items-center shrink-0">
                  <h3 className="text-[10px] font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${
                      col === 'Done' ? 'bg-emerald-600' : 
                      col === 'In Progress' ? 'bg-blue-600' : 'bg-zinc-400'
                    }`}></span>
                    {col}
                  </h3>
                  <span className="bg-zinc-100 text-zinc-700 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded border border-zinc-200">
                    {columnTasks.length}
                  </span>
                </div>
                
                {/* Column Body */}
                <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {columnTasks.map(task => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';
                    
                    return (
                      <div 
                        key={task.id} 
                        className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm hover:border-zinc-300 transition-all group relative print:border-b print:shadow-none print:rounded-none print:p-2 flex flex-col"
                      >
                        {/* Tags & Delete */}
                        <div className="flex justify-between items-start mb-2.5">
                          <span className="inline-block bg-zinc-100 text-zinc-700 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border border-zinc-200 truncate max-w-[200px]">
                            {task.projectName || 'General Office'}
                          </span>
                          <button 
                            onClick={() => handleDelete(task.id)} 
                            className="text-zinc-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer print:hidden p-0.5"
                            title="Delete Task"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Content */}
                        <h4 className="font-bold text-zinc-900 text-sm mb-1.5 leading-snug tracking-tight">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed font-medium">
                            {task.description}
                          </p>
                        )}
                        
                        {/* Footer Metadata & Status */}
                        <div className="flex justify-between items-end mt-auto pt-3.5 border-t border-zinc-100">
                          <div className="flex flex-col gap-1.5">
                            {task.dueDate && (
                              <span className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded w-fit ${
                                isOverdue 
                                  ? 'bg-red-50 text-red-700 border border-red-200' 
                                  : 'bg-zinc-50 text-zinc-600 border border-zinc-200'
                              }`}>
                                <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {task.dueDate}
                              </span>
                            )}
                            <span className="text-[10px] font-semibold text-zinc-600 flex items-center gap-1.5 px-0.5">
                              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {task.assignedTo || 'Unassigned'}
                            </span>
                          </div>
                          
                          <select 
                            value={task.status || 'To Do'} 
                            onChange={(e) => handleStatusMove(task.id, e.target.value)}
                            className={`appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%223%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_0.45rem_center] bg-[length:0.65rem_0.65rem] pr-6 pl-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border outline-none cursor-pointer transition-all print:hidden ${
                              task.status === 'Done' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                              task.status === 'In Progress' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                              'bg-zinc-50 border-zinc-200 text-zinc-800'
                            }`}
                          >
                            {columns.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="py-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest border border-dashed border-zinc-200 rounded-lg">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD TASK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border border-zinc-200">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-zinc-200 flex justify-between items-center bg-white shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 tracking-tight">New Task Assignment</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Assign work to site or office</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden bg-[#F4F4F5]">
              <form id="taskForm" onSubmit={handleSave} className="space-y-5 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                  <label className={labelClass}>Project Site</label>
                  <select 
                    value={formData.projectId} 
                    onChange={e => setFormData({...formData, projectId: e.target.value})} 
                    className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                  >
                    <option value="">Office / General Admin</option>
                    {projects.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.projectName}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Task Title <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className={inputClass} 
                    placeholder="e.g. Select laminate swatches with client" 
                  />
                </div>
                <div>
                  <label className={labelClass}>Details</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className={`${inputClass} resize-y min-h-[90px] leading-relaxed`} 
                    placeholder="Add specific execution instructions..." 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Due Date <span className="text-red-500">*</span></label>
                    <input 
                      type="date" 
                      required 
                      value={formData.dueDate} 
                      onChange={e => setFormData({...formData, dueDate: e.target.value})} 
                      className={inputClass} 
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Assign To</label>
                    <select 
                      value={formData.assignedTo} 
                      onChange={e => setFormData({...formData, assignedTo: e.target.value})} 
                      className={`${inputClass} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2318181B%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem] pr-10`}
                    >
                      <option value="">Select Staff...</option>
                      {employees.map(emp => <option key={emp.id || emp._id} value={emp.fullName}>{emp.fullName}</option>)}
                    </select>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 bg-white shrink-0">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="taskForm" 
                disabled={submitting} 
                className="px-8 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all cursor-pointer disabled:opacity-50 border border-black"
              >
                {submitting ? 'Saving...' : 'Save Task'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}