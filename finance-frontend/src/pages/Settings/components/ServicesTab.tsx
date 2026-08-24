import React, { useState, useEffect } from 'react';
import { Plus, Check, X, AlertCircle } from 'lucide-react';
import { getServices, createService, updateService, deleteService, getTaxSetting, updateTaxSetting } from '../../../services/settingService';

export interface Service {
  id: string;
  name: string;
  price: number;
  status: 'Active' | 'Inactive';
}

const ServicesTab: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [formError, setFormError] = useState('');

  // Tax settings state
  const [taxInput, setTaxInput] = useState('0.00');
  const [taxFeedback, setTaxFeedback] = useState<string | null>(null);
  const [savingTax, setSavingTax] = useState(false);

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form inputs state
  const [nameInput, setNameInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [statusInput, setStatusInput] = useState<'Active' | 'Inactive'>('Active');

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const data = await getServices();
        if (data) {
          setServices(data);
        }
      } catch (err) {
        console.error('Failed to load services from setting-service:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchTax = async () => {
      try {
        const taxData = await getTaxSetting();
        if (taxData) {
          setTaxInput(taxData.taxPercentage);
        }
      } catch (err) {
        console.error('Failed to load tax setting:', err);
      }
    };

    fetchServices();
    fetchTax();
  }, []);

  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTax(true);
    try {
      await updateTaxSetting(parseFloat(taxInput) || 0);
      setTaxFeedback('Tax / VAT configuration saved successfully!');
      setTimeout(() => setTaxFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to save tax setting:', err);
      alert('Failed to save Tax / VAT settings');
    } finally {
      setSavingTax(false);
    }
  };

  const handleOpenAdd = () => {
    setNameInput('');
    setPriceInput('');
    setStatusInput('Active');
    setShowValidation(false);
    setFormError('');
    setIsAddOpen(true);
  };

  const getServiceErrorsCount = () => {
    let count = 0;
    if (!nameInput.trim()) count += 1;
    if (!priceInput || Number(priceInput) <= 0) count += 1;
    return count;
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);
    if (getServiceErrorsCount() > 0) {
      setFormError('Validation failed: Fix errors to proceed');
      return;
    }

    try {
      const saved = await createService({
        name: nameInput.trim(),
        price: Number(priceInput),
        status: statusInput
      });
      setServices(prev => [...prev, saved]);
      setIsAddOpen(false);
      setShowValidation(false);
      setFormError('');
      setFeedback('Service added successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to add service');
    }
  };

  const handleOpenEdit = (service: Service) => {
    setEditingService(service);
    setNameInput(service.name);
    setPriceInput(service.price.toString());
    setStatusInput(service.status);
    setShowValidation(false);
    setFormError('');
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setShowValidation(true);
    if (getServiceErrorsCount() > 0) {
      setFormError('Validation failed: Fix errors to proceed');
      return;
    }

    try {
      const updated = await updateService(editingService.id, {
        name: nameInput.trim(),
        price: Number(priceInput),
        status: statusInput
      });
      setServices(prev => prev.map(s => s.id === editingService.id ? updated : s));
      setEditingService(null);
      setShowValidation(false);
      setFormError('');
      setFeedback('Service details updated successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to update service');
    }
  };

  const handleRemoveService = async (id: string) => {
    try {
      await deleteService(id);
      setServices(prev => prev.filter(s => s.id !== id));
      setFeedback('Service removed from catalog!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove service');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left w-full font-sans">

      {feedback && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[12px] font-semibold font-sans">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* CARD 1: SERVICE CATALOG */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm py-5 overflow-hidden flex flex-col w-full text-left">
        {/* Card Header */}
        <div className="px-6 pb-4 flex justify-between items-center">
          <div className="flex items-center">
            <h3 className="text-[16px] font-bold text-[#0f172a] font-sans">Service Catalog</h3>
            <span className="bg-[#f1f5f9] text-[#64748b] text-[11px] font-semibold px-2.5 py-0.5 rounded-full ml-2.5 inline-block">
              {services.length} Services
            </span>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 font-sans"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#e2e8f0] w-full" />

        {/* Catalog Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] font-sans">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider w-[280px]">Service Name</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-left w-[160px]">Unit Price (USD)</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-left w-[120px]">Status</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#64748b] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] font-medium text-slate-700">
              {loading ? (
                Array.from({ length: 3 }).map((_, loadIdx) => (
                  <tr key={`skeleton-service-${loadIdx}`} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-40 h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="w-20 h-4 bg-gray-200 rounded"></div></td>
                    <td className="px-6 py-4"><div className="w-16 h-5 bg-gray-200 rounded-full"></div></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <div className="w-12 h-8 bg-gray-200/80 rounded-lg"></div>
                        <div className="w-16 h-8 bg-gray-200/80 rounded-lg"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : services.map(service => (
                <tr key={service.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-bold text-[#0c0d0f]">{service.name}</td>
                  <td className="px-6 py-4 text-slate-600 text-left">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2
                    }).format(service.price)}
                  </td>
                  <td className="px-6 py-4 text-left">
                    <span className={`inline-block font-bold text-[10px] px-2.5 py-0.5 rounded-md ${service.status === 'Active' ? 'bg-[#ecfdf5] text-[#10b981]' : 'bg-[#f1f5f9] text-[#64748b]'
                      }`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => handleOpenEdit(service)}
                      className="px-3.5 py-1.5 bg-[#f1f5f9] hover:bg-slate-200 text-[#475569] hover:text-[#0c0d0f] font-bold text-[12px] rounded-lg transition-all cursor-pointer font-sans"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveService(service.id)}
                      className="px-3.5 py-1.5 bg-white border border-[#fee2e2] text-[#ef4444] hover:bg-[#fef2f2] hover:text-[#dc2626] font-bold text-[12px] rounded-lg transition-all cursor-pointer font-sans"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card Footer pagination/stat */}
        <div className="px-6 pt-4 text-[12px] text-[#94a3b8] font-medium border-t border-[#e2e8f0] text-left">
          Showing {services.length} of {services.length} services
        </div>
      </div>

      {/* CARD 1.5: TAX / VAT CONFIGURATION */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 flex flex-col w-full text-left space-y-4">
        <div className="space-y-1">
          <h3 className="text-[16px] font-bold text-[#0f172a] font-sans">Tax / VAT Configuration</h3>
          <p className="text-[12px] text-slate-400 font-medium font-sans">Set the default tax or VAT percentage applied to Invoices</p>
        </div>

        {taxFeedback && (
          <div className="flex items-center space-x-2 p-3 bg-[#ecfdf5] border border-[#a7f3d0] text-[#065f46] rounded-xl text-[12px] font-semibold font-sans">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{taxFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSaveTax} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-bold text-[#334155]">Tax / VAT (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={taxInput}
              onChange={(e) => setTaxInput(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] text-[#0c0d0f] bg-white rounded-xl text-[13px] font-semibold focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={savingTax}
            className="px-5 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] disabled:bg-[#cbd5e1] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans"
          >
            {savingTax ? 'Saving...' : 'Save'}
          </button>
        </form>
      </div>

      {/* CARD 2: CATALOG STATISTICS */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm p-6 flex flex-col w-full text-left space-y-4">
        <h3 className="text-[16px] font-bold text-[#0f172a] font-sans">Catalog Statistics</h3>

        <div className="flex items-center space-x-16 pt-1">
          {/* Total Offered Services */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] font-normal text-[#94a3b8] uppercase tracking-wider font-sans">Total Offered Services</span>
            <span className="text-3xl font-bold text-[#0c0d0f] font-sans">{services.length}</span>
          </div>

          {/* Active Offerings */}
          <div className="flex flex-col text-left space-y-1">
            <span className="text-[10px] font-normal text-[#94a3b8] uppercase tracking-wider font-sans">Active Offerings</span>
            <span className="text-3xl font-bold text-[#10b981] font-sans">
              {services.filter(s => s.status === 'Active').length}
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Add Service */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-scale-up font-sans">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col font-sans py-6">

            {/* Modal Header */}
            <div className="flex justify-between items-center text-left pb-4 border-b border-[#e2e8f0] px-6">
              <h3 className="text-[18px] font-bold text-[#0c0d0f] tracking-tight">Add Service</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#64748b] hover:text-[#0c0d0f] flex items-center justify-center hover:bg-gray-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddService} noValidate className="pt-5 flex flex-col">

              <div className="px-6 space-y-5">
                {showValidation && getServiceErrorsCount() > 0 && (
                  <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-xl text-[12px] font-semibold flex items-center gap-2 animate-fade-in text-left">
                    <AlertCircle className="w-4.5 h-4.5 text-[#ef4444] flex-shrink-0" />
                    <span>{getServiceErrorsCount()} errors found. Please fix them before submitting.</span>
                  </div>
                )}
                {formError && !showValidation && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[12px] font-medium flex items-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Service Name */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-[13px] font-bold text-[#334155]">Service Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VIP Ground Handling Package"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] transition-all font-sans focus:outline-none ${
                      showValidation && !nameInput.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#e2e8f0] text-[#0c0d0f] bg-white focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                    }`}
                  />
                  {showValidation && !nameInput.trim() && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Service Name is required
                    </span>
                  )}
                </div>

                {/* Price (USD) */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-[13px] font-bold text-[#334155]">Price (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#64748b]">
                      $
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className={`w-full pl-8 pr-3.5 py-2.5 border rounded-xl text-[13px] transition-all font-sans focus:outline-none ${
                        showValidation && (!priceInput || Number(priceInput) <= 0)
                          ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                          : 'border-[#e2e8f0] text-[#0c0d0f] bg-white focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                    />
                  </div>
                  {showValidation && (!priceInput || Number(priceInput) <= 0) ? (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Price must be greater than 0
                    </span>
                  ) : (
                    <p className="text-[11px] text-[#64748b] font-normal leading-normal mt-1">
                      Specify the default unit price charged to clients.
                    </p>
                  )}
                </div>

                {/* Divider Line above Toggle */}
                <div className="h-px bg-[#e2e8f0] w-full my-1" />

                {/* Toggle Status Row */}
                <div className="flex items-center justify-between text-left py-1">
                  <div className="flex flex-col space-y-0.5">
                    <span className="text-[13px] font-bold text-[#0c0d0f]">
                      {statusInput === 'Active' ? 'Active Status' : 'Inactive'}
                    </span>
                    <span className="text-[11px] text-[#64748b] font-normal leading-normal max-w-sm">
                      {statusInput === 'Active'
                        ? 'Enable to make this service orderable immediately'
                        : 'Hide this service from active invoices and selection catalogs'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatusInput(statusInput === 'Active' ? 'Inactive' : 'Active')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${statusInput === 'Active' ? 'bg-[#f59e0b]' : 'bg-[#e2e8f0]'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${statusInput === 'Active' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              </div>

              {/* Divider Line above Footer */}
              <div className="h-px bg-[#e2e8f0] w-full my-5" />

              {/* Footer buttons */}
              <div className="flex justify-end space-x-3 px-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setShowValidation(false);
                    setFormError('');
                  }}
                  className="px-5 py-2.5 bg-white border border-[#e2e8f0] text-[#334155] font-bold text-[13px] rounded-xl hover:bg-gray-50 transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={showValidation && getServiceErrorsCount() > 0}
                  className={`px-5 py-2.5 text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans ${
                    showValidation && getServiceErrorsCount() > 0
                      ? 'bg-[#cbd5e1] text-[#94a3b8] cursor-not-allowed shadow-none'
                      : 'bg-[#f59e0b] hover:bg-[#d97706]'
                  }`}
                >
                  Add Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Service */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0f]/50 backdrop-blur-sm p-4 animate-scale-up font-sans">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col font-sans py-6">

            {/* Modal Header */}
            <div className="flex justify-between items-center text-left pb-4 border-b border-[#e2e8f0] px-6">
              <h3 className="text-[18px] font-bold text-[#0c0d0f] tracking-tight">Edit Service</h3>
              <button
                onClick={() => setEditingService(null)}
                className="w-8 h-8 rounded-full bg-[#f1f5f9] text-[#64748b] hover:text-[#0c0d0f] flex items-center justify-center hover:bg-gray-200 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateService} noValidate className="pt-5 flex flex-col">

              <div className="px-6 space-y-5">
                {showValidation && getServiceErrorsCount() > 0 && (
                  <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-xl text-[12px] font-semibold flex items-center gap-2 animate-fade-in text-left">
                    <AlertCircle className="w-4.5 h-4.5 text-[#ef4444] flex-shrink-0" />
                    <span>{getServiceErrorsCount()} errors found. Please fix them before submitting.</span>
                  </div>
                )}
                {formError && !showValidation && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[12px] font-medium flex items-center gap-2 text-left">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Service Name */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-[13px] font-bold text-[#334155]">Service Name</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-[13px] transition-all font-sans focus:outline-none ${
                      showValidation && !nameInput.trim()
                        ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                        : 'border-[#e2e8f0] text-[#0c0d0f] bg-white focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                    }`}
                  />
                  {showValidation && !nameInput.trim() && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Service Name is required
                    </span>
                  )}
                </div>

                {/* Unit Price (USD) */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-[13px] font-bold text-[#334155]">Unit Price (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-[#64748b]">
                      $
                    </span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className={`w-full pl-8 pr-3.5 py-2.5 border rounded-xl text-[13px] transition-all font-sans focus:outline-none ${
                        showValidation && (!priceInput || Number(priceInput) <= 0)
                          ? 'border-[#ef4444] text-[#ef4444] bg-[#fef2f2] ring-1 ring-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
                          : 'border-[#e2e8f0] text-[#0c0d0f] bg-white focus:border-[#f59e0b] focus:ring-[#f59e0b]'
                      }`}
                    />
                  </div>
                  {showValidation && (!priceInput || Number(priceInput) <= 0) && (
                    <span className="block text-[11px] text-[#ef4444] font-semibold mt-1 animate-fade-in font-sans">
                      Price must be greater than 0
                    </span>
                  )}
                </div>

                {/* Divider Line above Toggle */}
                <div className="h-px bg-[#e2e8f0] w-full my-1" />

                {/* Toggle Status Row */}
                <div className="flex items-center justify-between text-left py-1">
                  <div className="flex flex-col space-y-0.5">
                    <span className="text-[13px] font-bold text-[#0c0d0f]">
                      {statusInput === 'Active' ? 'Active Status' : 'Inactive'}
                    </span>
                    <span className="text-[11px] text-[#64748b] font-normal leading-normal max-w-sm">
                      {statusInput === 'Active'
                        ? 'Enable to make this service orderable immediately'
                        : 'Hide this service from active invoices and selection catalogs'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStatusInput(statusInput === 'Active' ? 'Inactive' : 'Active')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${statusInput === 'Active' ? 'bg-[#f59e0b]' : 'bg-[#e2e8f0]'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${statusInput === 'Active' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              </div>

              {/* Divider Line above Footer */}
              <div className="h-px bg-[#e2e8f0] w-full my-5" />

              {/* Footer buttons */}
              <div className="flex justify-end space-x-3 px-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditingService(null);
                    setShowValidation(false);
                    setFormError('');
                  }}
                  className="px-5 py-2.5 bg-white border border-[#e2e8f0] text-[#334155] font-bold text-[13px] rounded-xl hover:bg-gray-50 transition-all cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={showValidation && getServiceErrorsCount() > 0}
                  className={`px-5 py-2.5 text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans ${
                    showValidation && getServiceErrorsCount() > 0
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

    </div>
  );
};

export default ServicesTab;
