import React, { useState, useEffect } from 'react';
import { Plus, X, Check, AlertCircle } from 'lucide-react';
import { getBranches, createBranch, updateBranch, deleteBranch } from '../../../services/settingService';
import { useTranslation } from 'react-i18next';

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  country: string;
  teamCount: number;
}

const BranchOfficeTab: React.FC = () => {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [branchFeedback, setBranchFeedback] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [formError, setFormError] = useState('');

  // Remove confirmation states
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [showSuccessRemoved, setShowSuccessRemoved] = useState(false);

  // Form states
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchCountry, setNewBranchCountry] = useState('Indonesia');
  const [newBranchTeamCount, setNewBranchTeamCount] = useState<string>('0');

  // Edit Branch states
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editBranchName, setEditBranchName] = useState('');
  const [editBranchAddress, setEditBranchAddress] = useState('');
  const [editBranchPhone, setEditBranchPhone] = useState('');
  const [editBranchCountry, setEditBranchCountry] = useState('Indonesia');
  const [editBranchTeamCount, setEditBranchTeamCount] = useState<string>('0');

  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      try {
        const data = await getBranches();
        if (data) {
          setBranches(data);
        }
      } catch (err) {
        console.error('Failed to load branches from setting-service:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, []);

  const getAddBranchErrorsCount = () => {
    let count = 0;
    if (!newBranchName.trim()) count += 1;
    if (!newBranchAddress.trim()) count += 1;
    return count;
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    if (getAddBranchErrorsCount() > 0) {
      setFormError('Validation failed: Fix errors to proceed');
      return;
    }

    try {
      const saved = await createBranch({
        name: newBranchName.trim(),
        address: newBranchAddress.trim(),
        phone: newBranchPhone.trim(),
        country: newBranchCountry.trim(),
        teamCount: Number(newBranchTeamCount) || 0,
      });
      setBranches(prev => [...prev, saved]);

      setNewBranchName('');
      setNewBranchAddress('');
      setNewBranchPhone('');
      setNewBranchCountry('Indonesia');
      setNewBranchTeamCount('0');
      setIsAddBranchOpen(false);
      setShowValidation(false);
      setFormError('');

      setBranchFeedback('Branch added successfully!');
      setTimeout(() => setBranchFeedback(null), 3000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to add branch');
    }
  };

  const confirmDeleteBranch = async () => {
    if (!branchToDelete) return;
    try {
      await deleteBranch(branchToDelete.id);
      setBranches(prev => prev.filter(b => b.id !== branchToDelete.id));
      setBranchToDelete(null);
      setShowSuccessRemoved(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete branch');
    }
  };

  const handleStartEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setEditBranchName(branch.name);
    setEditBranchAddress(branch.address);
    setEditBranchPhone(branch.phone);
    setEditBranchCountry(branch.country);
    setEditBranchTeamCount(String(branch.teamCount));
    setShowValidation(false);
    setFormError('');
  };

  const getUpdateBranchErrorsCount = () => {
    let count = 0;
    if (!editBranchName.trim()) count += 1;
    if (!editBranchAddress.trim()) count += 1;
    return count;
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    setShowValidation(true);
    if (getUpdateBranchErrorsCount() > 0) {
      setFormError('Validation failed: Fix errors to proceed');
      return;
    }

    try {
      const updated = await updateBranch(editingBranch.id, {
        name: editBranchName.trim(),
        address: editBranchAddress.trim(),
        phone: editBranchPhone.trim(),
        country: editBranchCountry.trim(),
        teamCount: Number(editBranchTeamCount) || 0,
      });
      setBranches(prev => prev.map(b => b.id === editingBranch.id ? updated : b));
      setEditingBranch(null);
      setShowValidation(false);
      setFormError('');

      setBranchFeedback('Branch updated successfully!');
      setTimeout(() => setBranchFeedback(null), 3000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update branch');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {branchFeedback && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[12px] font-semibold font-sans">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{branchFeedback}</span>
        </div>
      )}

      {/* Branch list table card */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm py-6 space-y-4 overflow-hidden">
        <div className="flex justify-between items-center pb-2 px-6">
          <div className="flex items-center space-x-2.5">
            <h3 className="text-[17px] font-bold text-[#0f172a] font-sans">{t('settings.branchManagement')}</h3>
            <span className="bg-[#f1f5f9] text-[#64748b] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-slate-100 font-sans">
              {branches.length} {t('settings.branches')}
            </span>
          </div>
          <button
            onClick={() => setIsAddBranchOpen(true)}
            className="px-4 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-xl text-[13px] font-bold flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer font-sans"
          >
            <Plus className="w-4 h-4" />
            <span>{t('settings.addBranch')}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] font-sans">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('settings.branchName')}</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('settings.locationAddress')}</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('settings.phone')}</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('companies.country')}</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider">{t('settings.team')}</th>
                <th className="px-6 py-3 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {loading ? (
                Array.from({ length: 3 }).map((_, loadIdx) => (
                  <tr key={`skeleton-branch-${loadIdx}`} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-24 h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="w-48 h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="w-28 h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="w-16 h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <div className="w-12 h-8 bg-gray-200/80 rounded-lg"></div>
                        <div className="w-16 h-8 bg-gray-200/80 rounded-lg"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : branches.map(branch => (
                <tr key={branch.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-bold text-[#0f172a]">{branch.name}</td>
                  <td className="px-6 py-4 text-[#475569] max-w-xs truncate" title={branch.address}>
                    {branch.address}
                  </td>
                  <td className="px-6 py-4 text-[#475569]">{branch.phone}</td>
                  <td className="px-6 py-4 text-[#475569]">{branch.country}</td>
                  <td className="px-6 py-4 text-[#475569] font-semibold">{branch.teamCount} members</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleStartEdit(branch)}
                      className="px-3.5 py-1.5 bg-[#f1f5f9] hover:bg-slate-200 text-[#475569] hover:text-[#0c0d0f] font-bold text-[12px] rounded-lg transition-all cursor-pointer font-sans"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => setBranchToDelete(branch)}
                      className="px-3.5 py-1.5 bg-white border border-[#fee2e2] text-[#ef4444] hover:bg-[#fef2f2] hover:text-[#dc2626] font-bold text-[12px] rounded-lg transition-all cursor-pointer font-sans whitespace-nowrap"
                    >
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics card below */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 space-y-4">
        <h4 className="text-[14px] font-bold text-[#0f172a] font-sans">{t('settings.branchStats')}</h4>
        <div className="flex flex-wrap gap-x-16 gap-y-4 font-sans text-left pt-1">
          <div className="space-y-1">
            <span className="block text-[10px] font-normal text-[#94a3b8] uppercase tracking-wider">{t('settings.totalBranches')}</span>
            <span className="text-[32px] font-bold text-[#0c0d0f] block leading-none">{branches.length}</span>
          </div>
          <div className="space-y-1">
            <span className="block text-[10px] font-normal text-[#94a3b8] uppercase tracking-wider">{t('settings.activeBranches')}</span>
            <span className="text-[32px] font-bold text-[#10b981] block leading-none">{branches.length}</span>
          </div>
          <div className="space-y-1">
            <span className="block text-[10px] font-normal text-[#94a3b8] uppercase tracking-wider">{t('settings.totalStaffAcrossBranches')}</span>
            <span className="text-[32px] font-bold text-[#f59e0b] block leading-none">
              {branches.reduce((acc, b) => acc + b.teamCount, 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Add Branch */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-scale-up font-sans">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-md w-full overflow-hidden flex flex-col font-sans p-6 space-y-6">

            {/* Modal Header */}
            <div className="space-y-1.5 text-left">
              <h3 className="text-[20px] font-bold text-[#0c0d0f] tracking-tight">{t('settings.createBranch')}</h3>
              <p className="text-[13px] text-[#64748b] font-medium leading-normal">
                {t('settings.createBranchSubtitle')}
              </p>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddBranch} noValidate className="space-y-4">
              {showValidation && getAddBranchErrorsCount() > 0 && (
                <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-xl text-[12px] font-semibold flex items-center gap-2 animate-fade-in text-left">
                  <AlertCircle className="w-4.5 h-4.5 text-[#ef4444] flex-shrink-0" />
                  <span>{t('settings.errorsFound', { count: getAddBranchErrorsCount() })}</span>
                </div>
              )}
              {formError && !showValidation && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[12px] font-medium flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Branch Name */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[11px] font-bold text-[#64748b] tracking-wider uppercase">{t('settings.branchName')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kantor Jakarta"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] transition-all font-sans focus:outline-none ${showValidation && !newBranchName.trim()
                      ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                      : 'border-[#e2e8f0] text-[#0c0d0f] placeholder:text-slate-400/80 bg-white focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                    }`}
                />
                {showValidation && !newBranchName.trim() && (
                  <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                    {t('settings.branchRequired')}
                  </span>
                )}
              </div>

              {/* Address */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[11px] font-bold text-[#64748b] tracking-wider uppercase">{t('settings.locationAddress')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jakarta Selatan"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] transition-all font-sans focus:outline-none ${showValidation && !newBranchAddress.trim()
                      ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                      : 'border-[#e2e8f0] text-[#0c0d0f] placeholder:text-slate-400/80 bg-white focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                    }`}
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[11px] font-bold text-[#64748b] tracking-wider uppercase">{t('settings.phone')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +62 888 888 88"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] placeholder:text-slate-400/80 bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                />
              </div>

              {/* Country */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[11px] font-bold text-[#64748b] tracking-wider uppercase">{t('companies.country')}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indonesia"
                  value={newBranchCountry}
                  onChange={(e) => setNewBranchCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] placeholder:text-slate-400/80 bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                />
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-100 my-4" />

              {/* Action buttons footer */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBranchOpen(false);
                    setShowValidation(false);
                    setFormError('');
                  }}
                  className="text-[#64748b] hover:text-[#0c0d0f] font-bold text-[14px] transition-all cursor-pointer font-sans"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={showValidation && getAddBranchErrorsCount() > 0}
                  className={`px-6 py-2.5 text-white font-bold text-[14px] rounded-xl shadow-sm transition-all cursor-pointer font-sans ${showValidation && getAddBranchErrorsCount() > 0
                      ? 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed shadow-none'
                      : 'bg-[#f59e0b] hover:bg-[#d97706]'
                    }`}
                >
                  {t('settings.addBranch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Branch */}
      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-scale-up font-sans">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-md w-full overflow-hidden flex flex-col font-sans py-6">

            {/* Modal Header */}
            <div className="flex justify-between items-center text-left pb-4 border-b border-[#e2e8f0] px-6">
              <h3 className="text-[20px] font-bold text-[#0c0d0f] tracking-tight">{t('common.edit')} {t('settings.branches')}</h3>
              <button
                onClick={() => setEditingBranch(null)}
                className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#64748b] hover:text-[#0c0d0f] flex items-center justify-center hover:bg-gray-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateBranch} noValidate className="pt-4 flex flex-col">

              {/* Inputs Wrapper with padding */}
              <div className="px-6 space-y-4">
                {showValidation && getUpdateBranchErrorsCount() > 0 && (
                  <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-xl text-[12px] font-semibold flex items-center gap-2 animate-fade-in text-left">
                    <AlertCircle className="w-4.5 h-4.5 text-[#ef4444] flex-shrink-0" />
                    <span>{t('settings.errorsFound', { count: getUpdateBranchErrorsCount() })}</span>
                  </div>
                )}
                {formError && !showValidation && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[12px] font-medium flex items-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Branch Name */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-[13px] font-semibold text-[#334155] mb-0.5">{t('settings.branchName')}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Graha Al Badegel"
                    value={editBranchName}
                    onChange={(e) => setEditBranchName(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] transition-all font-sans focus:outline-none ${showValidation && !editBranchName.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#e2e8f0] text-[#0c0d0f] bg-white focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                  />
                </div>

                {/* Address / Location */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-[13px] font-semibold text-[#334155] mb-0.5">{t('settings.locationAddress')}</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Menara Kencana Kav 21..."
                    value={editBranchAddress}
                    onChange={(e) => setEditBranchAddress(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] transition-all font-sans focus:outline-none resize-none ${showValidation && !editBranchAddress.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#e2e8f0] text-[#0c0d0f] bg-white focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-[13px] font-semibold text-[#334155] mb-0.5">{t('settings.phone')}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +62 21 5550 1234"
                    value={editBranchPhone}
                    onChange={(e) => setEditBranchPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                  />
                </div>

                {/* Country & Team Count Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-left relative">
                    <label className="block text-[13px] font-semibold text-[#334155] mb-0.5">{t('companies.country')}</label>
                    <select
                      value={editBranchCountry}
                      onChange={(e) => setEditBranchCountry(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] bg-white text-[#0c0d0f] focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans appearance-none"
                    >
                      <option value="Indonesia">Indonesia</option>
                      <option value="Saudi Arabia">Saudi Arabia</option>
                      <option value="Singapore">Singapore</option>
                      <option value="Australia">Australia</option>
                    </select>
                    <div className="absolute right-3.5 bottom-3.5 pointer-events-none text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[13px] font-semibold text-[#334155] mb-0.5">{t('settings.team')}</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5"
                      value={editBranchTeamCount}
                      onChange={(e) => setEditBranchTeamCount(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#e2e8f0] w-full my-5" />

              {/* Action buttons footer with padding */}
              <div className="flex justify-end space-x-3 px-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBranch(null);
                    setShowValidation(false);
                    setFormError('');
                  }}
                  className="px-5 py-2.5 bg-white border border-[#e2e8f0] text-[#334155] font-bold text-[13px] rounded-xl hover:bg-gray-50 transition-all cursor-pointer font-sans"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={showValidation && getUpdateBranchErrorsCount() > 0}
                  className={`px-5 py-2.5 text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans ${showValidation && getUpdateBranchErrorsCount() > 0
                      ? 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed shadow-none'
                      : 'bg-[#2563eb] hover:bg-[#1d4ed8]'
                    }`}
                >
                  {t('common.saveChanges') || 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Remove Branch Confirmation */}
      {branchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-sm w-full overflow-hidden flex flex-col font-sans p-6 text-center animate-scale-up space-y-4">

            {/* Warning Icon */}
            <div className="mx-auto w-12 h-12 rounded-full bg-[#fffbeb] text-[#9a3412] border border-[#fef3c7] flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-[18px] font-bold text-[#0c0d0f] tracking-tight">
              {t('settings.confirmDeletion')}
            </h3>

            {/* Text */}
            <p className="text-[13px] text-[#475569] leading-relaxed">
              {t('settings.confirmDeletionDesc', { name: branchToDelete.name, email: branchToDelete.phone })}
            </p>

            {/* Footer Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setBranchToDelete(null)}
                className="flex-1 py-2.5 bg-white border border-[#e2e8f0] text-[#334155] font-bold text-[13px] rounded-xl hover:bg-gray-50 transition-all cursor-pointer font-sans"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteBranch}
                className="flex-1 py-2.5 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans"
              >
                {t('settings.yesRemove')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Remove Success */}
      {showSuccessRemoved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-sm w-full overflow-hidden flex flex-col font-sans p-6 text-center animate-scale-up space-y-4">

            {/* Checkmark Icon */}
            <div className="mx-auto w-12 h-12 rounded-full bg-[#ecfdf5] text-[#10b981] border border-[#d1fae5] flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-[18px] font-bold text-[#0c0d0f] tracking-tight">
              {t('common.success') || 'Berhasil'}
            </h3>

            {/* Done Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSuccessRemoved(false)}
                className="w-full py-2.5 bg-[#059669] hover:bg-[#047857] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans"
              >
                {t('common.done') || 'Selesai'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default BranchOfficeTab;
