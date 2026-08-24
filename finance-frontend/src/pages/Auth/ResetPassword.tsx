import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword as resetPasswordAPI } from '../../services/authService';
import heroSignIn from '../../assets/heroSigin.png';
import odstLogo from '../../assets/odstlogo.png';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    let hasError = false;

    if (!token) {
      setError('Password reset token is missing. Please request a new link.');
      return;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      const data = await resetPasswordAPI(token, password);
      if (data.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to reset password. Token may be invalid or expired.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-white select-none overflow-hidden">
      {/* Left side: Hero Image (Skyscrapers - Exactly 68% width on desktop) */}
      <div className="hidden md:block md:w-[68%] h-screen relative overflow-hidden flex-shrink-0">
        <img
          src={heroSignIn}
          alt="Modern Architecture Skyscrapers"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Right side: Form Panel (Exactly 32% width on desktop) */}
      <div className="w-full md:w-[32%] flex flex-col bg-white min-h-screen px-4 sm:px-6 lg:px-8 pt-10 pb-4 md:pt-14 md:pb-6 flex-shrink-0">
        {success ? (
          <div className="w-[78%] max-w-[320px] mx-auto flex flex-col flex-1 justify-between animate-fade-in">
            <div className="flex flex-col space-y-6">
              {/* Logo */}
              <div className="flex justify-start">
                <img
                  src={odstLogo}
                  alt="DST Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>

              {/* Green Checkmark Circle */}
              <div className="flex justify-start pt-2">
                <div className="w-12 h-12 rounded-full bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <h2 className="text-[20px] font-semibold text-[#0c0d0f] font-sans tracking-tight">
                  Password Reset Complete
                </h2>
                <p className="text-[12px] text-[#75777c] font-normal font-sans leading-relaxed">
                  Your password has been successfully reset. You can now use your new password to sign in.
                </p>
              </div>
            </div>

            {/* Bottom Group */}
            <div className="flex flex-col space-y-4 pb-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full py-2.5 bg-[#007aff] text-white font-semibold rounded-[6px] hover:bg-[#006ee0] active:scale-[0.99] transition-all text-[14px] font-roboto text-center"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-[78%] max-w-[320px] mx-auto flex flex-col flex-1 justify-between animate-fade-in" noValidate>
            <div className="flex flex-col space-y-6">
              {/* Logo */}
              <div className="flex justify-start">
                <img
                  src={odstLogo}
                  alt="DST Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>

              {error && (
                <div className="flex items-center space-x-2.5 p-3 bg-[#fef2f2] border border-[#fca5a5] text-[#ef4444] rounded-[6px] text-[12px] font-medium font-inter animate-fade-in">
                  <AlertCircle className="w-[18px] h-[18px] text-[#ef4444] flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Reset Title */}
              <div className="space-y-2">
                <h2 className="text-[20px] font-semibold text-[#0c0d0f] font-sans tracking-tight">
                  Create new password
                </h2>
                <p className="text-[12px] text-[#75777c] font-normal font-sans leading-relaxed">
                  Please enter your new password below.
                </p>
              </div>

              {/* Form Fields Stack */}
              <div className="space-y-4 pt-1">
                {/* New Password Input */}
                <div className="flex flex-col space-y-1.5 font-inter">
                  <label className="text-[11px] font-medium text-[#75777c] tracking-wide">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      className={`w-full px-3.5 py-2.5 pr-10 bg-white text-[#1c1e21] placeholder-[#8d9096] rounded-[6px] focus:outline-none text-[13px] transition-all font-roboto border ${
                        passwordError ? 'border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]' : 'border-[#e2e4e8] focus:ring-1 focus:ring-[#007aff]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8d9096] hover:text-[#5c5f64] focus:outline-none transition-colors animate-fade-in"
                    >
                      {showPassword ? (
                        <EyeOff className="w-[18px] h-[18px]" />
                      ) : (
                        <Eye className="w-[18px] h-[18px]" />
                      )}
                    </button>
                  </div>
                  {passwordError && (
                    <span className="text-[11px] text-[#ef4444] font-medium font-inter mt-1 text-left">
                      {passwordError}
                    </span>
                  )}
                </div>

                {/* Confirm Password Input */}
                <div className="flex flex-col space-y-1.5 font-inter">
                  <label className="text-[11px] font-medium text-[#75777c] tracking-wide">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmPasswordError) setConfirmPasswordError(null);
                      }}
                      className={`w-full px-3.5 py-2.5 pr-10 bg-white text-[#1c1e21] placeholder-[#8d9096] rounded-[6px] focus:outline-none text-[13px] transition-all font-roboto border ${
                        confirmPasswordError ? 'border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]' : 'border-[#e2e4e8] focus:ring-1 focus:ring-[#007aff]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8d9096] hover:text-[#5c5f64] focus:outline-none transition-colors animate-fade-in"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-[18px] h-[18px]" />
                      ) : (
                        <Eye className="w-[18px] h-[18px]" />
                      )}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <span className="text-[11px] text-[#ef4444] font-medium font-inter mt-1 text-left">
                      {confirmPasswordError}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Group (Button + Link) */}
            <div className="flex flex-col space-y-4 pb-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#007aff] text-white font-semibold rounded-[6px] hover:bg-[#006ee0] active:scale-[0.99] disabled:bg-[#a0cfff] disabled:cursor-not-allowed transition-all text-[14px] font-roboto"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-[13px] text-[#007aff] font-medium underline hover:text-[#006ee0] focus:outline-none transition-all"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
