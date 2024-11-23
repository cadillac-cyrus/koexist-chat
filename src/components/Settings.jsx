import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  SunIcon,
  MoonIcon,
  BellIcon,
  BellSlashIcon,
  ChevronLeftIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('notifications') !== 'disabled';
  });
  const [loading, setLoading] = useState(false);

  const handleNotificationToggle = async () => {
    const newState = !notifications;
    setNotifications(newState);
    localStorage.setItem('notifications', newState ? 'enabled' : 'disabled');
    
    if (newState) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setNotifications(false);
          localStorage.setItem('notifications', 'disabled');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        setNotifications(false);
        localStorage.setItem('notifications', 'disabled');
      }
    }
  };

  const handleClearCache = async () => {
    setLoading(true);
    try {
      localStorage.clear();
      // Preserve theme and notification settings
      localStorage.setItem('theme', theme);
      localStorage.setItem('notifications', notifications ? 'enabled' : 'disabled');
      
      // Update user's last cache clear timestamp
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          lastCacheCleared: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="glass-panel p-4 flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5 text-white" />
        </button>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
      </div>

      {/* Settings List */}
      <div className="flex-1 p-4 space-y-4">
        {/* Theme Toggle */}
        <div className="glass-panel p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-white font-medium">Theme</h3>
              <p className="text-sm text-white/70">
                {theme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark'
                  ? 'bg-white/10 text-yellow-400'
                  : 'bg-blue-500/10 text-blue-400'
              }`}
            >
              {theme === 'dark' ? (
                <SunIcon className="h-6 w-6" />
              ) : (
                <MoonIcon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Notifications Toggle */}
        <div className="glass-panel p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-white font-medium">Notifications</h3>
              <p className="text-sm text-white/70">
                {notifications ? 'Notifications enabled' : 'Notifications disabled'}
              </p>
            </div>
            <button
              onClick={handleNotificationToggle}
              className={`p-2 rounded-xl transition-colors ${
                notifications
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              {notifications ? (
                <BellIcon className="h-6 w-6" />
              ) : (
                <BellSlashIcon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Clear Cache */}
        <div className="glass-panel p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-white font-medium">Clear Cache</h3>
              <p className="text-sm text-white/70">
                Clear local storage and cached data
              </p>
            </div>
            <button
              onClick={handleClearCache}
              disabled={loading}
              className={`p-2 rounded-xl transition-colors ${
                loading
                  ? 'bg-white/5 text-white/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              <ArrowPathIcon className={`h-6 w-6 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <div className="glass-panel p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-white font-medium">Logout</h3>
              <p className="text-sm text-white/70">
                Sign out of your account
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
