import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { forgotPassword as forgotPasswordAPI } from '../../services/authService';
import heroSignIn from '../../assets/heroSigin.png';
import odstLogo from '../../assets/odstlogo.png';
import saudiFlagImg from '../../assets/saudi-flag.png';

const USFlag: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <svg className={`${className} rounded-[2px] shadow-xs flex-shrink-0 object-cover`} viewBox="0 0 640 480">
    <g fillRule="evenodd">
      <path fill="#bd3d44" d="M0 0h640v480H0z" />
      <path stroke="#fff" strokeWidth="37" d="M0 55.4h640M0 129.2h640M0 203h640M0 277h640M0 350.8h640M0 424.6h640" />
      <path fill="#192f5d" d="M0 0h295.4v258.5H0z" />
      <g fill="#fff">
        <circle cx="30" cy="25" r="7" /><circle cx="80" cy="25" r="7" /><circle cx="130" cy="25" r="7" /><circle cx="180" cy="25" r="7" /><circle cx="230" cy="25" r="7" />
        <circle cx="55" cy="50" r="7" /><circle cx="105" cy="50" r="7" /><circle cx="155" cy="50" r="7" /><circle cx="205" cy="50" r="7" />
        <circle cx="30" cy="75" r="7" /><circle cx="80" cy="75" r="7" /><circle cx="130" cy="75" r="7" /><circle cx="180" cy="75" r="7" /><circle cx="230" cy="75" r="7" />
        <circle cx="55" cy="100" r="7" /><circle cx="105" cy="100" r="7" /><circle cx="155" cy="100" r="7" /><circle cx="205" cy="100" r="7" />
        <circle cx="30" cy="125" r="7" /><circle cx="80" cy="125" r="7" /><circle cx="130" cy="125" r="7" /><circle cx="180" cy="125" r="7" /><circle cx="230" cy="125" r="7" />
      </g>
    </g>
  </svg>
);

const IDFlag: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <svg className={`${className} rounded-[2px] shadow-xs flex-shrink-0 border border-slate-200`} viewBox="0 0 640 480">
    <g fillRule="evenodd">
      <path fill="#e70011" d="M0 0h640v240H0z" />
      <path fill="#ffffff" d="M0 240h640v240H0z" />
    </g>
  </svg>
);

const SAFlag: React.FC<{ className?: string }> = ({ className = 'w-4 h-3' }) => (
  <img 
    src={saudiFlagImg} 
    alt="Saudi Arabia Flag" 
    className={`${className} rounded-[2px] shadow-xs flex-shrink-0 object-cover`} 
  />
);

const languages = [
  { code: 'en', label: 'English', short: 'EN', Flag: USFlag },
  { code: 'id', label: 'Bahasa Indonesia', short: 'ID', Flag: IDFlag },
  { code: 'ar', label: 'العربية', short: 'AR', Flag: SAFlag }
];

const Login: React.FC = () => {
  const { t, i18n } = useTranslation();
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
      return t('auth.emailOrPhoneRequired');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      return t('auth.validEmailRequired');
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    let hasError = false;

    const mailErr = validateEmail(email);
    if (mailErr) {
      setEmailError(mailErr);
      hasError = true;
    }

    if (!password) {
      setPasswordError(t('auth.passwordRequired'));
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
        if (data.user?.role === 'Viewer') {
          navigate('/invoices');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || t('auth.invalidCredentials');
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
      setForgotError(t('auth.enterEmailRequired'));
      return;
    }

    setForgotLoading(true);
    try {
      const data = await forgotPasswordAPI(forgotEmail);
      if (data.success) {
        setForgotSuccess(true);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || t('auth.failedToSendResetLink');
      setForgotError(errMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  const renderLanguageSwitcher = () => (
    <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200/80 rounded-full p-0.5">
      {languages.map((lang) => {
        const active = (i18n.language || 'en').startsWith(lang.code);
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
              active
                ? 'bg-white text-[#007aff] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title={lang.label}
          >
            <lang.Flag className="w-3.5 h-2.5" />
            <span>{lang.short}</span>
          </button>
        );
      })}
    </div>
  );

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
              {/* Logo & Language Switcher */}
              <div className="flex items-center justify-between">
                <img
                  src={odstLogo}
                  alt="DST Logo"
                  className="h-10 w-auto object-contain"
                />
                {renderLanguageSwitcher()}
              </div>

              {error && (
                <div className="flex items-center space-x-2.5 p-3 bg-[#fef2f2] border border-[#fca5a5] text-[#ef4444] rounded-[6px] text-[12px] font-medium font-inter animate-fade-in">
                  <AlertCircle className="w-[18px] h-[18px] text-[#ef4444] flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Greeting */}
              <h2 className="text-[20px] font-semibold text-[#0c0d0f] font-sans tracking-tight">
                {t('auth.welcomeBack')}
              </h2>

              {/* Form Fields Stack */}
              <div className="space-y-4 pt-1">
                {/* Login Input */}
                <div className="flex flex-col space-y-1.5 font-inter">
                  <label className="text-[11px] font-medium text-[#75777c] tracking-wide">
                    {t('auth.emailOrPhone')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('auth.emailOrPhone')}
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
                    {t('settings.password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.enterPassword')}
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
                    {t('auth.rememberMe')}
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
                    {t('auth.forgotPassword')}
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
                {loading ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </div>
          </form>
        ) : forgotSuccess ? (
          <div className="w-[78%] max-w-[320px] mx-auto flex flex-col flex-1 justify-between animate-fade-in">
            <div className="flex flex-col space-y-6">
              {/* Logo & Language Switcher */}
              <div className="flex items-center justify-between">
                <img
                  src={odstLogo}
                  alt="DST Logo"
                  className="h-10 w-auto object-contain"
                />
                {renderLanguageSwitcher()}
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
                  {t('auth.checkYourEmail')}
                </h2>
                <p className="text-[12px] text-[#75777c] font-normal font-sans leading-relaxed">
                  {t('auth.resetLinkSent', { email: forgotEmail })}
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
                {t('auth.backToSignIn')}
              </button>
              <div className="pt-2 text-center text-[12px] text-[#75777c] font-normal font-sans">
                {t('auth.didntReceiveEmail')}{' '}
                <button
                  type="button"
                  onClick={handleForgotSubmit}
                  disabled={forgotLoading}
                  className="text-[#007aff] font-bold underline hover:text-[#006ee0] focus:outline-none transition-all ml-1"
                >
                  {forgotLoading ? t('auth.resending') : t('auth.resend')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="w-[78%] max-w-[320px] mx-auto flex flex-col flex-1 justify-between animate-fade-in" noValidate>
            <div className="flex flex-col space-y-6">
              {/* Logo & Language Switcher */}
              <div className="flex items-center justify-between">
                <img
                  src={odstLogo}
                  alt="DST Logo"
                  className="h-10 w-auto object-contain"
                />
                {renderLanguageSwitcher()}
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
                  {t('auth.resetPasswordTitle')}
                </h2>
                <p className="text-[12px] text-[#75777c] font-normal font-sans leading-relaxed">
                  {t('auth.resetPasswordDesc')}
                </p>
              </div>

              {/* Form Fields Stack */}
              <div className="space-y-4 pt-1">
                {/* Email Address Input */}
                <div className="flex flex-col space-y-1.5 font-inter">
                  <label className="text-[11px] font-medium text-[#75777c] tracking-wide">
                    {t('auth.emailAddress')}
                  </label>
                  <input
                    type="email"
                    placeholder={t('auth.enterEmail')}
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
                {forgotLoading ? t('auth.sending') : t('auth.sendResetLink')}
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
                  {t('auth.backToSignIn')}
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
