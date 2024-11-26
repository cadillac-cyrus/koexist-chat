import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ChatBubbleLeftIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const navigationItems = [
    {
      name: 'Chats',
      icon: ChatBubbleLeftIcon,
      path: '/',
    },
    {
      name: 'Groups',
      icon: UserGroupIcon,
      path: '/groups',
    },
    {
      name: 'Profile',
      icon: UserCircleIcon,
      path: '/profile',
    },
    {
      name: 'Settings',
      icon: Cog6ToothIcon,
      path: '/settings',
    },
  ];

  const isActivePath = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  const getFullImageUrl = (path) => {
    if (!path) return null;
    return path.startsWith('https') ? path : `https://koexist-server.onrender.com${path}`;
  };
  
  const displayPhotoURL = getFullImageUrl(user?.photoURL || user?.profileData?.photoURL);

  return (
    <div className="flex flex-col h-full">
      {/* User Profile Section */}
      <div className="p-6 glass-panel">
        <div className="flex items-center space-x-4">
          {displayPhotoURL ? (
            <img
              src={displayPhotoURL}
              alt="Profile"
              className="w-12 h-12 rounded-full ring-2 ring-white/20"
            />
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-accent-blue to-purple-500 rounded-full blur opacity-50"></div>
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-r from-accent-blue to-purple-500 flex items-center justify-center text-white font-semibold ring-2 ring-white/20">
                {user?.displayName?.[0] || user?.email?.[0] || '?'}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-white truncate">
              {user?.displayName || user?.email?.split('@')[0]}
            </h2>
            <p className="text-sm text-white/50 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = isActivePath(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${
                isActive
                  ? 'glass-panel-active text-white'
                  : 'text-white/70 hover:text-white glass-panel-hover'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : ''
                }`}
              />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 rounded-xl glass-panel-hover text-white/70 hover:text-white transition-all group"
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 transition-transform group-hover:scale-110" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
