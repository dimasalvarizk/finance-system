import React, { useState, useEffect, useRef } from 'react';
import { Bell, FileText, AlertTriangle, CheckCircle2, Settings, Users, LogOut, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/authService';
import notificationSound from '../../assets/notification.mp3';

const USFlag: React.FC<{ className?: string }> = ({ className = 'w-5 h-3.5' }) => (
  <svg className={`${className} rounded-[2px] shadow-xs flex-shrink-0 object-cover`} viewBox="0 0 640 480">
    <g fillRule="evenodd">
      <path fill="#bd3d44" d="M0 0h640v480H0z"/>
      <path stroke="#fff" strokeWidth="37" d="M0 55.4h640M0 129.2h640M0 203h640M0 277h640M0 350.8h640M0 424.6h640"/>
      <path fill="#192f5d" d="M0 0h295.4v258.5H0z"/>
      <g fill="#fff">
        <circle cx="30" cy="25" r="7"/>
        <circle cx="80" cy="25" r="7"/>
        <circle cx="130" cy="25" r="7"/>
        <circle cx="180" cy="25" r="7"/>
        <circle cx="230" cy="25" r="7"/>
        <circle cx="55" cy="50" r="7"/>
        <circle cx="105" cy="50" r="7"/>
        <circle cx="155" cy="50" r="7"/>
        <circle cx="205" cy="50" r="7"/>
        <circle cx="30" cy="75" r="7"/>
        <circle cx="80" cy="75" r="7"/>
        <circle cx="130" cy="75" r="7"/>
        <circle cx="180" cy="75" r="7"/>
        <circle cx="230" cy="75" r="7"/>
        <circle cx="55" cy="100" r="7"/>
        <circle cx="105" cy="100" r="7"/>
        <circle cx="155" cy="100" r="7"/>
        <circle cx="205" cy="100" r="7"/>
        <circle cx="30" cy="125" r="7"/>
        <circle cx="80" cy="125" r="7"/>
        <circle cx="130" cy="125" r="7"/>
        <circle cx="180" cy="125" r="7"/>
        <circle cx="230" cy="125" r="7"/>
      </g>
    </g>
  </svg>
);

const IDFlag: React.FC<{ className?: string }> = ({ className = 'w-5 h-3.5' }) => (
  <svg className={`${className} rounded-[2px] shadow-xs flex-shrink-0 border border-slate-200`} viewBox="0 0 640 480">
    <g fillRule="evenodd">
      <path fill="#e70011" d="M0 0h640v240H0z"/>
      <path fill="#ffffff" d="M0 240h640v240H0z"/>
    </g>
  </svg>
);

const SAFlag: React.FC<{ className?: string }> = ({ className = 'w-5 h-3.5' }) => (
  <svg className={`${className} rounded-[2px] shadow-xs flex-shrink-0`} viewBox="0 0 640 480">
    <g fillRule="evenodd">
      <path fill="#006c35" d="M0 0h640v480H0z"/>
      <g fill="#ffffff">
        <path d="M190 285h260v12H190zm20-15l-15 21 15 21v-42zm220 0v42l15-21-15-21z"/>
        <text x="320" y="240" fontSize="72" fontWeight="bold" fontFamily="serif" textAnchor="middle" fill="#ffffff">
          لا إله إلا الله
        </text>
      </g>
    </g>
  </svg>
);

const LANGUAGES = [
  { code: 'en' as const, label: 'English', short: 'EN', Flag: USFlag },
  { code: 'id' as const, label: 'Indonesia', short: 'ID', Flag: IDFlag },
  { code: 'ar' as const, label: 'العربية (Arabic)', short: 'AR', Flag: SAFlag },
];

interface NotificationItem {
  id: string;
  type: 'request' | 'warning' | 'completed';
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

const Header: React.FC = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'log'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const currentLang = (i18n.language?.substring(0, 2) as 'en' | 'id' | 'ar') || 'en';
  const selectedLang = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  const handleSelectLang = (code: 'en' | 'id' | 'ar') => {
    i18n.changeLanguage(code);
    setIsLangOpen(false);
  };

  const popoverRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  const lastUnreadIds = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  const playSound = () => {
    try {
      const audio = new Audio(notificationSound);
      audio.play().catch((err) => {
        console.warn('Autoplay prevented playing notification sound:', err);
      });
    } catch (err) {
      console.error('Failed to play sound:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      const currentNotifications: NotificationItem[] = data || [];
      
      const unread = currentNotifications.filter(n => n.unread);
      const unreadIds = new Set(unread.map(n => n.id));

      if (isFirstLoad.current) {
        lastUnreadIds.current = unreadIds;
        isFirstLoad.current = false;
      } else {
        let hasNewUnread = false;
        for (const id of unreadIds) {
          if (!lastUnreadIds.current.has(id)) {
            hasNewUnread = true;
            break;
          }
        }

        if (hasNewUnread) {
          playSound();
        }
        lastUnreadIds.current = unreadIds;
      }

      setNotifications(currentNotifications);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSettingsClick = () => {
    setIsProfileOpen(false);
    navigate('/settings');
  };

  const handleLogoutClick = async () => {
    setIsProfileOpen(false);
    try {
      await logoutUser();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Click outside to close popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node) &&
        avatarRef.current &&
        !avatarRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      lastUnreadIds.current = new Set();
      setNotifications(
        notifications.map((n) => ({
          ...n,
          unread: false,
        }))
      );
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      lastUnreadIds.current.delete(id);
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, unread: false } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'requests') return n.type === 'request';
    if (activeTab === 'log') return n.type === 'warning' || n.type === 'completed';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'request':
        return (
          <div className="w-9 h-9 rounded-full bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-9 h-9 rounded-full bg-[#fef2f2] text-[#ef4444] border border-[#fee2e2] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'completed':
        return (
          <div className="w-9 h-9 rounded-full bg-[#ecfdf5] text-[#10b981] border border-[#d1fae5] flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <header className="h-[70px] bg-white border-b border-[#e2e8f0] px-8 flex items-center justify-between flex-shrink-0 relative">
      {/* Left Dropdown */}
      <div className="flex items-center space-x-2">
        <span className="text-[13px] text-[#94a3b8] font-normal font-sans">
          {t('header.operatingBranch')}
        </span>
        <button className="flex items-center space-x-2 px-3 py-1.5 border border-[#e2e8f0] rounded-full hover:bg-gray-50 transition-all">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
          <span className="text-[13px] font-semibold text-[#1e293b] font-sans">
            {user?.branch || 'CBC Office'}
          </span>
        </button>
      </div>

      {/* Right Info */}
      <div className="flex items-center space-x-4 relative">
        {/* Bell Notification Button */}
        <button
          ref={bellRef}
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 rounded-full transition-all text-[#64748b] hover:bg-gray-100 ${isOpen ? 'bg-gray-100 text-[#0c0d0f]' : ''
            }`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#ef4444] rounded-full border border-white"></span>
          )}
        </button>

        {/* Vertical Divider line */}
        <div className="h-6 w-px bg-[#e2e8f0] self-center"></div>

        {/* User Circle Initials Avatar Button */}
        <button
          ref={avatarRef}
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className={`w-9 h-9 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold flex items-center justify-center text-[13px] font-inter transition-all focus:outline-none shadow-sm ${isProfileOpen ? 'ring-2 ring-[#2563eb]/20' : ''
            }`}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            getInitials(user?.name)
          )}
        </button>

        {/* Interactive Notifications Popover */}
        {isOpen && (
          <div
            ref={popoverRef}
            className="absolute right-0 top-[50px] w-[350px] bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl z-50 flex flex-col overflow-hidden animate-scale-up font-sans"
          >
            {/* Popover Header */}
            <div className="px-4 py-3.5 border-b border-[#e2e8f0] flex justify-between items-center bg-gray-50">
              <div className="flex items-center space-x-2">
                <h4 className="text-[15px] font-bold text-[#0c0d0f]">
                  {t('header.notifications')}
                </h4>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-[#e0f2fe] text-[#0284c7] text-[11px] font-bold rounded-full font-inter">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="text-[12px] font-bold text-[#2563eb] hover:text-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed font-inter transition-all"
              >
                {t('header.markAllRead')}
              </button>
            </div>

            {/* Tab Controls */}
            <div className="px-4 py-2.5 border-b border-[#e2e8f0] flex space-x-2 bg-white">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${activeTab === 'all'
                  ? 'bg-[#242e69] border-[#242e69] text-white'
                  : 'bg-white border-[#e2e8f0] text-[#475569] hover:bg-gray-50'
                  }`}
              >
                {t('header.all')}
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${activeTab === 'requests'
                  ? 'bg-[#242e69] border-[#242e69] text-white'
                  : 'bg-white border-[#e2e8f0] text-[#475569] hover:bg-gray-50'
                  }`}
              >
                {t('nav.requests')}
              </button>
              <button
                onClick={() => setActiveTab('log')}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${activeTab === 'log'
                  ? 'bg-[#242e69] border-[#242e69] text-white'
                  : 'bg-white border-[#e2e8f0] text-[#475569] hover:bg-gray-50'
                  }`}
              >
                {t('header.systemLog')}
              </button>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto max-h-[320px] divide-y divide-[#f1f5f9]">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => notif.unread && handleMarkSingleRead(notif.id)}
                    className={`p-4 flex items-start space-x-3 transition-colors cursor-pointer ${notif.unread ? 'bg-[#f0f7ff] hover:bg-[#e0f0ff]' : 'bg-white hover:bg-gray-50/50'
                      }`}
                  >
                    {/* Left Icon circle */}
                    {getIcon(notif.type)}

                    {/* Middle details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <span className="text-[13px] font-bold text-[#0c0d0f] truncate pr-1">
                          {notif.title}
                        </span>
                        {notif.unread && (
                          <span className="w-2 h-2 bg-[#2563eb] rounded-full flex-shrink-0 mt-1.5"></span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#475569] leading-snug mt-0.5 font-normal">
                        {notif.message}
                      </p>
                      <span className="block text-[11px] text-[#94a3b8] font-semibold mt-1 font-inter">
                        {notif.time}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400 text-[12px] font-medium">
                  {t('header.noNotifications')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Interactive Account Dropdown Popover */}
        {isProfileOpen && (
          <div
            ref={profileRef}
            className="absolute right-0 top-[50px] w-[260px] bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl z-50 flex flex-col overflow-hidden animate-scale-up font-sans p-4 space-y-4"
          >
            {/* Profile Info Header */}
            <div className="flex items-center space-x-3">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-11 h-11 rounded-full object-cover flex-shrink-0 shadow-sm" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#2563eb] text-white font-bold flex items-center justify-center text-[14px] font-inter flex-shrink-0 shadow-sm">
                  {getInitials(user?.name)}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold text-[#0c0d0f] truncate" title={user?.name}>
                  {user?.name || 'Guest User'}
                </span>
                <span className="text-[12px] text-[#64748b] truncate" title={user?.email}>
                  {user?.email || 'guest@odst.id'}
                </span>
              </div>
            </div>

            <div className="h-px bg-[#f1f5f9]"></div>

            {/* Menu Items */}
            <div className="flex flex-col space-y-1">
              <button
                onClick={handleSettingsClick}
                className="flex items-center space-x-3 w-full px-3 py-2 rounded-xl text-left text-[13px] font-semibold text-[#1e293b] hover:bg-gray-50 transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#64748b]" />
                <span>{t('header.settings')}</span>
              </button>
              <button
                onClick={handleLogoutClick}
                className="flex items-center space-x-3 w-full px-3 py-2 rounded-xl text-left text-[13px] font-semibold text-[#1e293b] hover:bg-gray-50 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#64748b]" />
                <span>{t('header.switchAccount')}</span>
              </button>

              {/* Language Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-left text-[13px] font-semibold text-[#1e293b] hover:bg-gray-50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <selectedLang.Flag className="w-5 h-3.5" />
                    <span>{t('header.language')}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-[#f1f5f9] group-hover:bg-gray-200/80 text-[#475569] text-[11px] font-bold rounded-md uppercase font-inter transition-colors">
                      {selectedLang.short}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#94a3b8] transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Submenu for 3 languages */}
                {isLangOpen && (
                  <div className="mt-1 p-1.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl space-y-1 animate-fade-in shadow-xs">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleSelectLang(lang.code)}
                        className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-left text-[12px] font-medium transition-all cursor-pointer ${
                          currentLang === lang.code
                            ? 'bg-white text-[#2563eb] font-bold shadow-xs border border-[#e2e8f0]'
                            : 'text-[#475569] hover:bg-white/70'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <lang.Flag className="w-4 h-3" />
                          <span>{lang.label}</span>
                        </div>
                        {currentLang === lang.code && (
                          <Check className="w-3.5 h-3.5 text-[#2563eb]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-[#f1f5f9]"></div>

            {/* Log Out Button */}
            <button
              onClick={handleLogoutClick}
              className="flex items-center space-x-3 w-full px-3 py-2.5 bg-[#f8fafc] hover:bg-red-50/50 rounded-xl text-left text-[13px] font-bold text-[#ef4444] transition-all border border-[#f1f5f9] hover:border-red-100 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#ef4444]" />
              <span>{t('header.logOut')}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
