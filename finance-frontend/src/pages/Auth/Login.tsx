import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { forgotPassword as forgotPasswordAPI } from '../../services/authService';
import heroSignIn from '../../assets/heroSigin.png';
import odstLogo from '../../assets/odstlogo.png';

const Login: React.FC = () => {
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('rememberedEmail') || '';
  });
  const [password, setPassword] = useState(() => {
    return localStorage.getItem('rememberedPassword') || '';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return !!localStorage.getItem('rememberedEmail');
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Custom validation states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Forgot password page state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (val: string) => {
    if (!val) {
      return 'Email or phone number is required';
    }
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    let hasError = false;

    // Custom validations
    const mailErr = validateEmail(email);
    if (mailErr) {
      setEmailError(mailErr);
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser(email, password);

      if (data.success) {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedPassword', password);
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
        }
        navigate('/dashboard');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Invalid credentials. Please try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(false);

    if (!forgotEmail) {
      setForgotError('Please enter your email address');
      return;
    }

    setForgotLoading(true);
    try {
      const data = await forgotPasswordAPI(forgotEmail);
      if (data.success) {
        setForgotSuccess(true);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to send reset link. Please try again.';
      setForgotError(errMsg);
    } finally {
      setForgotLoading(false);
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

      {/* Right side: Login Form (Exactly 32% width on desktop) */}
      <div className="w-full md:w-[32%] flex flex-col bg-white min-h-screen px-4 sm:px-6 lg:px-8 pt-10 pb-4 md:pt-14 md:pb-6 flex-shrink-0">
        {view === 'login' ? (
          <form onSubmit={handleSubmit} className="w-[78%] max-w-[320px] mx-auto flex flex-col flex-1 justify-between" noValidate>
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

              {/* Greeting */}
              <h2 className="text-[20px] font-semibold text-[#0c0d0f] font-sans tracking-tight">
                Nice to see you again
              </h2>

              {/* Form Fields Stack */}
              <div className="space-y-4 pt-1">
                {/* Login Input */}
                <div className="flex flex-col space-y-1.5 font-inter">
                  <label className="text-[11px] font-medium text-[#75777c] tracking-wide">
                    Login
                  </label>
                  <input
                    type="text"
                    placeholder="Email or phone number"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    className={`w-full px-3.5 py-2.5 bg-white text-[#1c1e21] placeholder-[#8d9096] rounded-[6px] focus:outline-none text-[13px] transition-all font-roboto border ${
                      emailError ? 'border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]' : 'border-[#e2e4e8] focus:ring-1 focus:ring-[#007aff]'
                    }`}
                  />
                  {emailError && (
                    <span className="text-[11px] text-[#ef4444] font-medium font-inter mt-1 text-left">
                      {emailError}
                    </span>
                  )}
                </div>

                {/* Password Input */}
                <div className="flex flex-col space-y-1.5 font-inter">
                  <label className="text-[11px] font-medium text-[#75777c] tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password"
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

                {/* Remember Me Switch (Toggle Style) */}
                <div className="flex items-center space-x-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`relative inline-flex h-[18px] w-[32px] items-center rounded-full transition-colors duration-200 focus:outline-none ${
                      rememberMe ? 'bg-[#007aff]' : 'bg-[#e2e4e8]'
                    }`}
                  >
                    <span
                      className={`inline-block h-[12px] w-[12px] transform rounded-full bg-white transition-transform duration-200 ${
                        rememberMe ? 'translate-x-[17px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </button>
                  <span className="text-[12px] text-[#75777c] font-normal font-sfpro">
                    Remember me
                  </span>
                </div>

                {/* Forgot Password Link */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotSuccess(false);
                      setForgotEmail('');
                      setForgotError(null);
                      setView('forgot');
                    }}
                    className="text-[13px] text-[#007aff] font-medium underline focus:outline-none transition-all block text-left"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 pb-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#007aff] text-white font-semibold rounded-[6px] hover:bg-[#006ee0] active:scale-[0.99] disabled:bg-[#a0cfff] disabled:cursor-not-allowed transition-all text-[14px] font-roboto"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        ) : forgotSuccess ? (
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
                  Check your email
                </h2>
                <p className="text-[12px] text-[#75777c] font-normal font-sans leading-relaxed">
                  We've sent a password reset link to <strong className="text-[#0c0d0f] font-semibold">{forgotEmail}</strong>. The link will expire in 30 minutes.
                </p>
              </div>
            </div>

            {/* Bottom Group */}
            <div className="flex flex-col space-y-4 pb-2">
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  setForgotSuccess(false);
                  setForgotEmail('');
                  setError(null);
                }}
                className="w-full py-2.5 bg-[#007aff] text-white font-semibold rounded-[6px] hover:bg-[#006ee0] active:scale-[0.99] transition-all text-[14px] font-roboto text-center"
              >
                Back to Sign In
              </button>
              <div className="pt-2 text-center text-[12px] text-[#75777c] font-normal font-sans">
                Didn't receive the email?{' '}
                <button
                  type="button"
                  onClick={handleForgotSubmit}
                  disabled={forgotLoading}
                  className="text-[#007aff] font-bold underline hover:text-[#006ee0] focus:outline-none transition-all ml-1"
                >
                  {forgotLoading ? 'Resending...' : 'Resend'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="w-[78%] max-w-[320px] mx-auto flex flex-col flex-1 justify-between animate-fade-in" noValidate>
            <div className="flex flex-col space-y-6">
              {/* Logo */}
              <div className="flex justify-start">
                <img
                  src={odstLogo}
                  alt="DST Logo"
                  className="h-10 w-auto object-contain"
                />
              </div>

              {forgotError && (
                <div className="flex items-center space-x-2.5 p-3 bg-[#fef2f2] border border-[#fca5a5] text-[#ef4444] rounded-[6px] text-[12px] font-medium font-inter animate-fade-in">
                  <AlertCircle className="w-[18px] h-[18px] text-[#ef4444] flex-shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {/* Greeting / Reset Title */}
              <div className="space-y-2">
                <h2 className="text-[20px] font-semibold text-[#0c0d0f] font-sans tracking-tight">
                  Reset your password
                </h2>
                <p className="text-[12px] text-[#75777c] font-normal font-sans leading-relaxed">
                  Enter your email address and we'll send you a reset link.
                </p>
              </div>

              {/* Form Fields Stack */}
              <div className="space-y-4 pt-1">
                {/* Email Address Input */}
                <div className="flex flex-col space-y-1.5 font-inter">
                  <label className="text-[11px] font-medium text-[#75777c] tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotError) setForgotError(null);
                    }}
                    className={`w-full px-3.5 py-2.5 bg-white text-[#1c1e21] placeholder-[#8d9096] rounded-[6px] focus:outline-none text-[13px] transition-all font-roboto border ${
                      forgotError ? 'border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]' : 'border-[#e2e4e8] focus:ring-1 focus:ring-[#007aff]'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Group (Button + Link) */}
            <div className="flex flex-col space-y-4 pb-2">
              <button
                type="submit"
                disabled={forgotLoading || forgotSuccess}
                className="w-full py-2.5 bg-[#007aff] text-white font-semibold rounded-[6px] hover:bg-[#006ee0] active:scale-[0.99] disabled:bg-[#a0cfff] disabled:cursor-not-allowed transition-all text-[14px] font-roboto"
              >
                {forgotLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setError(null);
                  }}
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

export default Login;
