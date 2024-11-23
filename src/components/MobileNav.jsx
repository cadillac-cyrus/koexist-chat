import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ChatBubbleLeftIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import NewChat from './NewChat';

export default function MobileNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [showNewChat, setShowNewChat] = useState(false);

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

  const isInChat = location.pathname.startsWith('/chat/');

  return (
    <>
      {showNewChat && <NewChat onClose={() => setShowNewChat(false)} />}
      <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t z-10 md:hidden">
        <div className="flex justify-around items-center mobile-nav-height">
          {navigationItems.map((item) => {
            const isActive = isActivePath(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
                  isActive ? 'text-accent-blue' : 'text-white/70 hover:text-white'
                }`}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      {!isInChat && (
        <button
          onClick={() => setShowNewChat(true)}
          className="fixed right-4 bottom-20 z-10 button-primary rounded-full p-4 shadow-lg md:hidden"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      )}
    </>
  );
}
