import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import NewChat from './NewChat';

export default function GroupList() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', user.uid),
      where('type', '==', 'group')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsList);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching groups:', err);
      setError('Failed to load groups');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getFullImageUrl = (path) => {
    if (!path) return null;
    return path.startsWith('https') ? path : `https://koexist-server.onrender.com${path}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        {error}
      </div>
    );
  }

  return (
    <>
      {showNewChat && <NewChat onClose={() => setShowNewChat(false)} initialIsGroup={true} />}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="glass-panel p-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-white">Groups</h1>
          <button
            onClick={() => setShowNewChat(true)}
            className="button-secondary p-2 rounded-xl"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto p-4">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/70 p-4">
              <UserGroupIcon className="h-12 w-12 mb-4 text-white/50" />
              <p className="mb-4">No groups yet</p>
              <p className="text-sm text-white/50 text-center mb-6">
                Create a group to start chatting with multiple people
              </p>
              <button
                onClick={() => setShowNewChat(true)}
                className="button-primary px-6 py-3 flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>New Group</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/chat/${group.id}`)}
                  className="w-full glass-panel-hover p-4 rounded-xl flex items-center space-x-4"
                >
                  <div className="relative flex-shrink-0">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-accent-blue flex items-center justify-center">
                      <UserGroupIcon className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-accent-blue rounded-full px-2 py-0.5">
                      <span className="text-xs text-white font-medium">
                        {Object.keys(group.participantDetails).length}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-medium truncate">
                      {group.groupName || 'Unnamed Group'}
                    </h2>
                    <p className="text-sm text-white/50 truncate">
                      {group.lastMessage?.text || 'No messages yet'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
