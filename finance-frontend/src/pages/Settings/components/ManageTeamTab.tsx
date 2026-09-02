import React, { useState, useEffect } from 'react';
import { Plus, Check, X, AlertCircle } from 'lucide-react';
import { getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember, getBranches } from '../../../services/settingService';
import { useAuth } from '../../../context/AuthContext';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  employeeId: string;
  role: string;
  branch: string;
  department?: string;
  jobTitle?: string;
  status: string;
  lastActive: string;
}

const ManageTeamTab: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableBranches, setAvailableBranches] = useState<any[]>([]);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [addMemberStep, setAddMemberStep] = useState(1);
  const [teamFeedback, setTeamFeedback] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit team member states
  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);

  // Form states
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberEmpId, setNewMemberEmpId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Accountant');
  const [newMemberBranch, setNewMemberBranch] = useState('');
  const [newMemberDept, setNewMemberDept] = useState('');
  const [newMemberJobTitle, setNewMemberJobTitle] = useState('');

  useEffect(() => {
    const fetchTeam = async () => {
      setLoading(true);
      try {
        const list = await getTeamMembers();
        if (list) {
          setMembers(list);
        }
      } catch (err) {
        console.error('Failed to load team members from API:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchBranches = async () => {
      try {
        const list = await getBranches();
        if (list && list.length > 0) {
          setAvailableBranches(list);
          setNewMemberBranch(list[0].name);
        }
      } catch (err) {
        console.error('Failed to load branches from settings in team tab:', err);
      }
    };

    fetchTeam();
    fetchBranches();
  }, []);

  const renderBranchOptions = () => {
    if (availableBranches && availableBranches.length > 0) {
      const options = availableBranches.map((b) => (
        <option key={b.id} value={b.name}>{b.name}</option>
      ));

      // If the currently assigned branch is not in the list of available branches,
      // include it as a temporary fallback option so the dropdown shows the correct state.
      const hasCurrent = availableBranches.some(b => b.name === newMemberBranch);
      if (newMemberBranch && !hasCurrent) {
        options.unshift(
          <option key="fallback-current" value={newMemberBranch}>
            {newMemberBranch}
          </option>
        );
      }
      return options;
    }

    if (newMemberBranch) {
      return <option value={newMemberBranch}>{newMemberBranch}</option>;
    }

    return (
      <option value="" disabled>No branches available. Add in settings first.</option>
    );
  };

  const getAddMemberErrorsCount = () => {
    let count = 0;
    if (!newMemberName.trim()) count += 1;
    if (!newMemberEmail.trim()) count += 1;
    if (!newMemberBranch.trim()) count += 1;
    return count;
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    if (getAddMemberErrorsCount() > 0) {
      setFormError('Validation failed: Fix errors to proceed');
      return;
    }
    setFormError('');
    setAddMemberStep(2);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setEditingMember(member);
    setNewMemberName(member.name);
    setNewMemberEmail(member.email);
    setNewMemberPhone(member.phone || '');
    setNewMemberEmpId(member.employeeId);
    setNewMemberRole(member.role);
    setNewMemberBranch(member.branch);
    setNewMemberDept(member.department || '');
    setNewMemberJobTitle(member.jobTitle || '');
    setShowValidation(false);
    setFormError('');
    setIsEditMemberOpen(true);
  };

  const getUpdateMemberErrorsCount = () => {
    let count = 0;
    if (!newMemberName.trim()) count += 1;
    return count;
  };

  const handleUpdateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setShowValidation(true);

    if (getUpdateMemberErrorsCount() > 0) {
      setFormError('Validation failed: Fix errors to proceed');
      return;
    }

    const payload = {
      name: newMemberName.trim(),
      phone: newMemberPhone.trim() || undefined,
      employeeId: newMemberEmpId.trim(),
      role: newMemberRole,
      branch: newMemberBranch,
      department: newMemberDept.trim() || undefined,
      jobTitle: newMemberJobTitle.trim() || undefined,
    };

    try {
      const saved = await updateTeamMember(editingMember.id, payload);
      setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...saved } : m));
      
      // If the updated member is the logged-in user, refresh their session context
      if (editingMember.id === user?.id) {
        await refreshUser();
      }

      setIsEditMemberOpen(false);
      setEditingMember(null);
      setTeamFeedback('Team member updated successfully!');
      setTimeout(() => setTeamFeedback(null), 3000);
      handleResetAddMember();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update team member');
    }
  };

  const handleConfirmAddMember = async () => {
    const finalEmpId = newMemberEmpId.trim() || `EMP-${Math.floor(100 + Math.random() * 900)}`;

    const payload = {
      email: newMemberEmail.trim(),
      name: newMemberName.trim(),
      phone: newMemberPhone.trim() || undefined,
      employeeId: finalEmpId,
      role: newMemberRole,
      branch: newMemberBranch,
      department: newMemberDept.trim() || undefined,
      jobTitle: newMemberJobTitle.trim() || undefined,
      status: 'Active',
      lastActive: 'Just now'
    };

    try {
      const saved = await createTeamMember(payload);
      setMembers(prev => [...prev, saved]);
      setAddMemberStep(3);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add team member');
    }
  };

  const handleResetAddMember = () => {
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberPhone('');
    setNewMemberEmpId('');
    setNewMemberRole('Accountant');
    setNewMemberBranch(availableBranches && availableBranches.length > 0 ? availableBranches[0].name : '');
    setNewMemberDept('');
    setNewMemberJobTitle('');
    setIsAddMemberOpen(false);
    setAddMemberStep(1);
    setShowValidation(false);
    setFormError('');
  };

  const handleRemoveMember = async (id: string) => {
    try {
      await deleteTeamMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
      setTeamFeedback('Team member removed successfully!');
      setTimeout(() => setTeamFeedback(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove team member');
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    const member = members.find(m => m.id === id);
    if (!member) return;

    try {
      const saved = await updateTeamMember(id, {
        name: member.name,
        email: member.email,
        role: newRole,
        phone: member.phone,
        employeeId: member.employeeId,
        department: member.department,
        jobTitle: member.jobTitle,
        status: member.status
      });
      setMembers(prev => prev.map(m => m.id === id ? saved : m));
      setTeamFeedback('Role updated successfully!');
      setTimeout(() => setTeamFeedback(null), 2000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {teamFeedback && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[12px] font-semibold animate-fade-in font-sans">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{teamFeedback}</span>
        </div>
      )}

      {/* Team Members List Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm py-6 space-y-4 overflow-hidden">
        <div className="flex justify-between items-center pb-2 px-6">
          <div className="flex items-center space-x-2.5">
            <h3 className="text-[17px] font-bold text-[#0f172a] font-sans">Team Members</h3>
            <span className="bg-[#f1f5f9] text-[#64748b] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-slate-100 font-sans">
              {loading ? <span className="inline-block w-4 h-3 bg-slate-300 animate-pulse rounded"></span> : `${members.length} Members`}
            </span>
          </div>
          <button
            onClick={() => {
              if (availableBranches && availableBranches.length > 0) {
                setNewMemberBranch(availableBranches[0].name);
              }
              setNewMemberRole('Accountant');
              setIsAddMemberOpen(true);
            }}
            className="px-4 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl text-[13px] font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer font-sans"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] font-sans">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Name & Email</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Role</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Last Active</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {loading ? (
                Array.from({ length: 4 }).map((_, loadIdx) => (
                  <tr key={`skeleton-team-${loadIdx}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        <div className="w-32 h-4 bg-gray-200 rounded"></div>
                        <div className="w-48 h-3.5 bg-gray-150 rounded"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-28 h-8 bg-gray-200/80 rounded-lg"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-16 h-5 bg-gray-200 rounded-full"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-24 h-4 bg-gray-200 rounded"></div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2.5">
                        <div className="w-14 h-8 bg-gray-200/80 rounded-lg"></div>
                        <div className="w-20 h-8 bg-gray-200/80 rounded-lg"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : members.map(member => (
                <tr key={member.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#0c0d0f]">{member.name}</span>
                      <span className="text-[11px] text-[#94a3b8]">{member.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-[#e2e8f0] rounded-lg text-[12px] font-semibold text-[#334155] focus:outline-none focus:border-[#f59e0b]"
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="Chief Accountant">Chief Accountant</option>
                      <option value="Division Director">Division Director</option>
                      <option value="Accountant">Accountant</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      member.status === 'Active' ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {member.lastActive}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2.5">
                    <button
                      onClick={() => handleOpenEdit(member)}
                      className="px-3.5 py-1.5 bg-[#f1f5f9] hover:bg-slate-200 text-[#475569] hover:text-[#0c0d0f] font-bold text-[12px] rounded-lg transition-all cursor-pointer font-sans"
                    >
                      Edit
                    </button>
                    {member.id !== user?.id && (
                      <button
                        onClick={() => setMemberToDelete(member)}
                        className="px-3.5 py-1.5 bg-white border border-[#fee2e2] text-[#ef4444] hover:bg-[#fef2f2] hover:text-[#dc2626] font-bold text-[12px] rounded-lg transition-all cursor-pointer font-sans"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles & Permissions Matrix Card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm py-6 space-y-4 overflow-hidden">
        <div className="px-6 pb-2">
          <h3 className="text-[17px] font-bold text-[#0f172a] font-sans">Roles & Permissions Matrix</h3>
          <p className="text-[11px] text-[#64748b] font-medium font-sans">Overview of default permission credentials across system roles</p>
        </div>
        <div className="overflow-x-auto font-sans text-[13px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">Permission</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center">Super Admin</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center">Chief Accountant</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center">Division Director</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-center">Accountant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] font-medium text-slate-700">
              {[
                { name: 'Create Confirmations', sa: true, ca: true, dd: true, ac: true },
                { name: 'Approve Confirmations', sa: true, ca: true, dd: true, ac: false },
                { name: 'Manage Companies', sa: true, ca: true, dd: true, ac: false },
                { name: 'View Reports', sa: true, ca: true, dd: true, ac: true },
                { name: 'Manage Team', sa: true, ca: false, dd: false, ac: false },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3.5 text-slate-800 font-bold">{row.name}</td>
                  <td className="px-6 py-3.5 text-center">
                    {row.sa ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : (
                      <div className="w-4 h-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-200"><X className="w-2.5 h-2.5" /></div>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {row.ca ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : (
                      <div className="w-4 h-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-200"><X className="w-2.5 h-2.5" /></div>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {row.dd ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : (
                      <div className="w-4 h-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-200"><X className="w-2.5 h-2.5" /></div>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {row.ac ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : (
                      <div className="w-4 h-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto border border-red-200"><X className="w-2.5 h-2.5" /></div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Team Member */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-scale-up font-sans">
          
          {/* STEP 1: MEMBER INFO FORM */}
          {addMemberStep === 1 && (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col font-sans">
              <div className="px-6 py-5 border-b border-[#e2e8f0] flex justify-between items-center bg-white">
                <h3 className="text-[17px] font-bold text-[#0c0d0f]">Add New Team Member</h3>
                <button
                  onClick={() => handleResetAddMember()}
                  className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#64748b] hover:text-[#0c0d0f] flex items-center justify-center hover:bg-gray-200 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddMember} noValidate className="p-6 space-y-5">
                {showValidation && getAddMemberErrorsCount() > 0 && (
                  <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-xl text-[12px] font-semibold flex items-center gap-2 animate-fade-in text-left">
                    <AlertCircle className="w-4.5 h-4.5 text-[#ef4444] flex-shrink-0" />
                    <span>{getAddMemberErrorsCount()} errors found. Please fix them before submitting.</span>
                  </div>
                )}
                {formError && !showValidation && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[12px] font-medium flex items-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-[13px] font-sans text-left">
                  
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#64748b]">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] font-medium transition-all font-sans focus:outline-none ${
                        showValidation && !newMemberName.trim()
                          ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                          : 'border-[#e2e8f0] text-[#0c0d0f] bg-white focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                    />
                    {showValidation && !newMemberName.trim() && (
                      <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                        Full Name is required
                      </span>
                    )}
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#64748b]">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. khalid@odst.id"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] font-medium transition-all font-sans focus:outline-none ${
                        showValidation && !newMemberEmail.trim()
                          ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                          : 'border-[#e2e8f0] text-[#0c0d0f] bg-white focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                    />
                    {showValidation && !newMemberEmail.trim() && (
                      <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                        Email Address is required
                      </span>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#64748b]">Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. +62 812..."
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                    />
                  </div>

                  {/* Employee ID */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#64748b]">Employee ID</label>
                    <input
                      type="text"
                      placeholder="e.g. EMP-104"
                      value={newMemberEmpId}
                      onChange={(e) => setNewMemberEmpId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                    />
                    <span className="block text-[10px] text-slate-400 font-medium font-sans">
                      Auto-generated if left blank
                    </span>
                  </div>

                  {/* Role */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#64748b]">Role</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] font-semibold bg-white text-[#0c0d0f] focus:outline-none focus:border-[#f59e0b] transition-all font-sans"
                    >
                      <option value="Accountant">Accountant</option>
                      <option value="Chief Accountant">Chief Accountant</option>
                      <option value="Division Director">Division Director</option>
                      <option value="Super Admin">Super Admin</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>

                  {/* Assigned Branch / Office */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#64748b]">Assigned Branch / Office</label>
                    <select
                      value={newMemberBranch}
                      onChange={(e) => setNewMemberBranch(e.target.value)}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] font-semibold bg-white text-[#0c0d0f] focus:outline-none transition-all font-sans ${
                        showValidation && !newMemberBranch.trim()
                          ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                          : 'border-[#e2e8f0] focus:border-[#f59e0b]'
                      }`}
                    >
                      {renderBranchOptions()}
                    </select>
                    {showValidation && !newMemberBranch.trim() && (
                      <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                        Branch is required. Add in settings first.
                      </span>
                    )}
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#64748b]">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Finance"
                      value={newMemberDept}
                      onChange={(e) => setNewMemberDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                    />
                  </div>

                  {/* Job Title */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#64748b]">Job Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Associate"
                      value={newMemberJobTitle}
                      onChange={(e) => setNewMemberJobTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] font-medium text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                    />
                  </div>

                </div>

                {/* Action buttons footer */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-[#e2e8f0]">
                  <button
                    type="button"
                    onClick={() => handleResetAddMember()}
                    className="px-5 py-2.5 bg-white border border-[#e2e8f0] text-[#64748b] hover:text-[#0c0d0f] font-semibold text-[13px] rounded-xl hover:bg-gray-50 transition-all cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={showValidation && getAddMemberErrorsCount() > 0}
                    className={`px-5 py-2.5 text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans ${
                      showValidation && getAddMemberErrorsCount() > 0
                        ? 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed shadow-none'
                        : 'bg-[#f59e0b] hover:bg-[#d97706]'
                    }`}
                  >
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: CONFIRM ACTION DIALOG */}
          {addMemberStep === 2 && (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col font-sans animate-scale-up">
              <div className="px-6 py-5 border-b border-[#e2e8f0] flex justify-between items-center bg-white">
                <h3 className="text-[17px] font-bold text-[#0c0d0f]">Confirm Action</h3>
                <button
                  onClick={() => setAddMemberStep(1)}
                  className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#64748b] hover:text-[#0c0d0f] flex items-center justify-center hover:bg-gray-200 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-[18px] font-bold text-[#0c0d0f]">
                    Are you sure you want to add this member?
                  </h4>
                  <p className="text-[13px] text-[#64748b] leading-relaxed">
                    This action will send an invitation email to the new team member so they can access the platform.
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-[#e2e8f0]">
                  <button
                    type="button"
                    onClick={() => setAddMemberStep(1)}
                    className="px-5 py-2.5 bg-white border border-[#e2e8f0] text-[#64748b] hover:text-[#0c0d0f] font-semibold text-[13px] rounded-xl hover:bg-gray-50 transition-all cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAddMember}
                    className="px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans"
                  >
                    Yes, Add Member
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS STATE DIALOG */}
          {addMemberStep === 3 && (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-md w-full overflow-hidden flex flex-col font-sans animate-scale-up">
              <div className="p-8 text-center space-y-6">
                
                {/* Circular Checkmark Badge */}
                <div className="w-16 h-16 rounded-full bg-[#ecfdf5] text-emerald-500 border border-[#d1fae5] flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h4 className="text-[18px] font-bold text-[#0c0d0f]">
                    Member Added Successfully!
                  </h4>
                  <p className="text-[13px] text-[#64748b] leading-relaxed">
                    The new team member has been added and an invitation email has been sent.
                  </p>
                </div>

                <div className="pt-4 border-t border-[#e2e8f0] flex justify-center">
                  <button
                    type="button"
                    onClick={handleResetAddMember}
                    className="px-8 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Modal: Edit Team Member */}
      {isEditMemberOpen && editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-scale-up font-sans">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col font-sans text-left">
            <div className="px-6 py-5 border-b border-[#e2e8f0] flex justify-between items-center bg-white">
              <h3 className="text-[17px] font-bold text-[#0c0d0f]">Edit Team Member</h3>
              <button
                onClick={() => {
                  setIsEditMemberOpen(false);
                  setEditingMember(null);
                  handleResetAddMember();
                }}
                className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#64748b] hover:text-[#0c0d0f] flex items-center justify-center hover:bg-gray-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateMemberSubmit} noValidate className="p-6 space-y-5">
              {showValidation && getUpdateMemberErrorsCount() > 0 && (
                <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-xl text-[12px] font-semibold flex items-center gap-2 animate-fade-in text-left">
                  <AlertCircle className="w-4.5 h-4.5 text-[#ef4444] flex-shrink-0" />
                  <span>{getUpdateMemberErrorsCount()} errors found. Please fix them before submitting.</span>
                </div>
              )}
              {formError && !showValidation && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[12px] font-medium flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-[13px] font-sans text-left">
                
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#64748b]">Full Name</label>
                  <input
                    type="text"
                    required
                    className={`w-full px-4 py-2.5 rounded-xl font-sans font-medium transition-all focus:outline-none ${
                      showValidation && !newMemberName.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#e2e8f0] text-[#0c0d0f] bg-white focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                    }`}
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                  {showValidation && !newMemberName.trim() && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Full Name is required
                    </span>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#64748b]">Email Address (Read-only)</label>
                  <input
                    type="email"
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-50 border border-[#e2e8f0] rounded-xl text-slate-400 font-sans font-medium focus:outline-none cursor-not-allowed"
                    value={newMemberEmail}
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#64748b]">Phone Number</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[#0c0d0f] font-sans font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                  />
                </div>

                {/* Employee ID */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#64748b]">Employee ID</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[#0c0d0f] font-sans font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all"
                    value={newMemberEmpId}
                    onChange={(e) => setNewMemberEmpId(e.target.value)}
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#64748b]">Role</label>
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[#0c0d0f] font-sans font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all cursor-pointer"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Chief Accountant">Chief Accountant</option>
                    <option value="Division Director">Division Director</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                {/* Assigned Branch / Office */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#64748b]">Assigned Branch / Office</label>
                  <select
                    className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[#0c0d0f] font-sans font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all cursor-pointer"
                    value={newMemberBranch}
                    onChange={(e) => setNewMemberBranch(e.target.value)}
                  >
                    {renderBranchOptions()}
                  </select>
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#64748b]">Department</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[#0c0d0f] font-sans font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all"
                    value={newMemberDept}
                    onChange={(e) => setNewMemberDept(e.target.value)}
                  />
                </div>

                {/* Job Title */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#64748b]">Job Title</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-[#e2e8f0] rounded-xl text-[#0c0d0f] font-sans font-medium focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all"
                    value={newMemberJobTitle}
                    onChange={(e) => setNewMemberJobTitle(e.target.value)}
                  />
                </div>

              </div>

              {/* Action buttons footer */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-[#e2e8f0]">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMemberOpen(false);
                    setEditingMember(null);
                    handleResetAddMember();
                  }}
                  className="px-5 py-2.5 bg-white border border-[#e2e8f0] text-[#64748b] hover:text-[#0c0d0f] font-semibold text-[13px] rounded-xl hover:bg-gray-50 transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={showValidation && getUpdateMemberErrorsCount() > 0}
                  className={`px-5 py-2.5 text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans ${
                    showValidation && getUpdateMemberErrorsCount() > 0
                      ? 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed shadow-none'
                      : 'bg-[#f59e0b] hover:bg-[#d97706]'
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Team Member */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-scale-up font-sans">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-md w-full overflow-hidden flex flex-col font-sans">
            <div className="px-6 py-5 border-b border-[#e2e8f0] flex justify-between items-center bg-white">
              <h3 className="text-[17px] font-bold text-[#991b1b] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#ef4444]" />
                Confirm Deletion
              </h3>
              <button
                onClick={() => setMemberToDelete(null)}
                className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#64748b] hover:text-[#0c0d0f] flex items-center justify-center hover:bg-gray-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-left">
              <p className="text-[14px] text-[#334155] leading-relaxed">
                Are you sure you want to remove <strong>{memberToDelete.name}</strong> ({memberToDelete.email}) from the team?
              </p>
              <div className="p-3 bg-[#fffbeb] border border-[#fef3c7] text-[#92400e] rounded-xl text-[12px] font-medium leading-relaxed">
                <strong>Warning:</strong> This action cannot be undone. This user will lose all access to the system immediately.
              </div>
            </div>

            <div className="flex justify-end space-x-3 px-6 py-4 bg-[#f8fafc] border-t border-[#e2e8f0]">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-5 py-2.5 bg-white border border-[#e2e8f0] text-[#64748b] hover:text-[#0c0d0f] font-semibold text-[13px] rounded-xl hover:bg-gray-50 transition-all cursor-pointer font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRemoveMember(memberToDelete.id);
                  setMemberToDelete(null);
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTeamTab;
