import React, { useState, useEffect, useRef } from 'react';
import { Bell, FileText, AlertTriangle, CheckCircle2, Settings, Users, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../services/authService';

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
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'log'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const popoverRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data || []);
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
          Operating Branch:
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
                  Notifications
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
                Mark all as read
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
                All
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${activeTab === 'requests'
                  ? 'bg-[#242e69] border-[#242e69] text-white'
                  : 'bg-white border-[#e2e8f0] text-[#475569] hover:bg-gray-50'
                  }`}
              >
                Requests
              </button>
              <button
                onClick={() => setActiveTab('log')}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all border ${activeTab === 'log'
                  ? 'bg-[#242e69] border-[#242e69] text-white'
                  : 'bg-white border-[#e2e8f0] text-[#475569] hover:bg-gray-50'
                  }`}
              >
                Activity Log
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
                  No notifications in this category.
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
                <span>Settings</span>
              </button>
              <button
                onClick={handleLogoutClick}
                className="flex items-center space-x-3 w-full px-3 py-2 rounded-xl text-left text-[13px] font-semibold text-[#1e293b] hover:bg-gray-50 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#64748b]" />
                <span>Switch Account</span>
              </button>
            </div>

            <div className="h-px bg-[#f1f5f9]"></div>

            {/* Log Out Button */}
            <button
              onClick={handleLogoutClick}
              className="flex items-center space-x-3 w-full px-3 py-2.5 bg-[#f8fafc] hover:bg-red-50/50 rounded-xl text-left text-[13px] font-bold text-[#ef4444] transition-all border border-[#f1f5f9] hover:border-red-100 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-[#ef4444]" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
