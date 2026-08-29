import React, { useState, useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { updateProfile } from '../../../services/settingService';

const EditProfileTab: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('');
  const [registeredCompany] = useState('ODST Group');
  const [avatar, setAvatar] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state once user is loaded from context
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      setEmployeeId(user.employeeId || 'EMP-101');
      setDepartment(user.department || 'Finance');
      setJobTitle(user.jobTitle || 'Financial Controller');
      setDefaultBranch(user.branch === 'Graha Al Badegel' ? 'ODST Group' : (user.branch || ''));
      setAvatar(user.avatar || null);
    }
  }, [user]);

  const getInitials = (name: string) => {
    if (!name) return 'UN';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 70% quality to keep file size small (~20KB-50KB)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setAvatar(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = () => {
    setAvatar(null);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile({ name: fullName, phone, avatar });
      await refreshUser();
      setFeedback('Profile details saved successfully!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save profile details');
    }
  };

  return (
    <form onSubmit={handleProfileSubmit} className="space-y-6 animate-fade-in text-left w-full font-sans">

      {feedback && (
        <div className="flex items-center space-x-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[12px] font-semibold font-sans">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* CARD 1: DISPLAY PICTURE */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm flex items-center space-x-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        {avatar ? (
          <img src={avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover border border-[#e2e8f0]" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#2563eb] text-white font-bold text-[20px] flex items-center justify-center tracking-wider">
            {getInitials(fullName)}
          </div>
        )}
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="text-[16px] font-bold text-[#0f172a] font-sans">Profile Display Picture</h4>
            <p className="text-[11px] text-[#64748b] font-normal font-sans mt-0.5">PNG, JPG or GIF up to 5MB. 400×400px recommended.</p>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[13px] rounded-xl transition-all cursor-pointer font-sans shadow-sm"
            >
              Change Photo
            </button>
            <button
              type="button"
              onClick={handleDeletePhoto}
              className="px-4 py-2 bg-white border border-[#e2e8f0] text-[#475569] hover:bg-slate-50 font-bold text-[13px] rounded-xl transition-all cursor-pointer font-sans"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* CARD 2: PERSONAL DETAILS */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm py-5 overflow-hidden flex flex-col">
        <div className="px-6 pb-4">
          <h3 className="text-[16px] font-bold text-[#0f172a] font-sans">Personal Details</h3>
        </div>

        {/* Horizontal Divider Line stretching edge-to-edge */}
        <div className="h-px bg-[#e2e8f0] w-full" />

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Full Name */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[13px] font-semibold text-[#475569]">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
            />
          </div>

          {/* Email Address (Read-only) */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[13px] font-semibold text-[#475569]">Email Address</label>
            <input
              type="email"
              readOnly
              disabled
              value={email}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#64748b] bg-[#f8fafc] cursor-not-allowed font-sans focus:outline-none"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[13px] font-semibold text-[#475569]">Phone Number</label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#0c0d0f] bg-white focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b] transition-all font-sans"
            />
          </div>

          {/* Employee ID (Read-only) */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[13px] font-semibold text-[#475569]">Employee ID</label>
            <input
              type="text"
              readOnly
              disabled
              value={employeeId}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#64748b] bg-[#f8fafc] cursor-not-allowed font-sans focus:outline-none"
            />
          </div>

          {/* Department (Read-only) */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[13px] font-semibold text-[#475569]">Department</label>
            <input
              type="text"
              readOnly
              disabled
              value={department}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#64748b] bg-[#f8fafc] cursor-not-allowed font-sans focus:outline-none"
            />
          </div>

          {/* Job Title (Read-only) */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[13px] font-semibold text-[#475569]">Job Title</label>
            <input
              type="text"
              readOnly
              disabled
              value={jobTitle}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#64748b] bg-[#f8fafc] cursor-not-allowed font-sans focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* CARD 3: COMPANY ASSIGNMENT */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-sm py-5 overflow-hidden flex flex-col">
        <div className="px-6 pb-4">
          <h3 className="text-[16px] font-bold text-[#0f172a] font-sans">Company Assignment (Read-Only)</h3>
        </div>

        {/* Horizontal Divider Line stretching edge-to-edge */}
        <div className="h-px bg-[#e2e8f0] w-full" />

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Registered Company (Read-only) */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[13px] font-semibold text-[#475569]">Registered Company</label>
            <input
              type="text"
              readOnly
              disabled
              value={registeredCompany}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#64748b] bg-[#f8fafc] cursor-not-allowed font-sans focus:outline-none"
            />
          </div>

          {/* Default Branch (Read-only) */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[13px] font-semibold text-[#475569]">Default Branch</label>
            <input
              type="text"
              readOnly
              disabled
              value={defaultBranch}
              className="w-full px-3.5 py-2.5 border border-[#e2e8f0] rounded-xl text-[13px] text-[#64748b] bg-[#f8fafc] cursor-not-allowed font-sans focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex justify-end space-x-3 pt-2">
        <button
          type="button"
          className="px-6 py-2.5 bg-white border border-[#e2e8f0] text-[#475569] hover:bg-slate-50 font-bold text-[13px] rounded-xl transition-all cursor-pointer font-sans"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold text-[13px] rounded-xl shadow-sm transition-all cursor-pointer font-sans"
        >
          Save Changes
        </button>
      </div>

    </form>
  );
};

export default EditProfileTab;
