import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  arrayRemove,
  doc
} from 'firebase/firestore';
import { XMarkIcon, UserGroupIcon, UserPlusIcon } from '@heroicons/react/24/outline';

export default function NewChat({ onClose }) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadAllUsers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);
        const usersList = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.id !== user?.uid);
        setUsers(usersList);
      } catch (err) {
        console.error('Error loading users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadAllUsers();
  }, [user]);

  const filteredUsers = searchTerm.trim().length >= 1
    ? users.filter(user => 
        (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !selectedUsers.some(selected => selected.id === user.id)
      )
    : users.filter(user => !selectedUsers.some(selected => selected.id === user.id));

  const selectUser = (selectedUser) => {
    if (isGroup) {
      setSelectedUsers([...selectedUsers, selectedUser]);
    } else {
      createChat([selectedUser]);
    }
  };

  const removeSelectedUser = (userToRemove) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userToRemove.id));
  };

  const createChat = async (selectedUsers, groupName = '') => {
    if (!selectedUsers.length) return;

    try {
      const isGroup = selectedUsers.length > 1;
      const participants = [user.uid, ...selectedUsers.map(u => u.id)];

      // Check if a chat already exists with these participants
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef,
        where('participants', 'array-contains', user.uid)
      );

      const querySnapshot = await getDocs(q);
      let existingChat = null;

      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        const chatParticipants = chatData.participants || [];
        const deletedBy = chatData.deletedBy || [];
        
        // For private chats, check if it's the same two users
        if (!isGroup && chatParticipants.length === 2 &&
            chatParticipants.includes(selectedUsers[0].id)) {
          existingChat = { id: doc.id, ...chatData };
        }
        // For group chats, check if it's the exact same participants and name
        else if (isGroup && 
                chatData.isGroup && 
                chatData.groupName === groupName &&
                chatParticipants.length === participants.length &&
                participants.every(p => chatParticipants.includes(p))) {
          existingChat = { id: doc.id, ...chatData };
        }
      });

      if (existingChat) {
        const chatRef = doc(db, 'chats', existingChat.id);
        const deletedBy = existingChat.deletedBy || [];
        
        // If chat exists and was deleted by the current user, restore it
        if (deletedBy.includes(user.uid)) {
          await updateDoc(chatRef, {
            deletedBy: arrayRemove(user.uid),
            lastMessageTime: serverTimestamp(),
            lastAccessed: serverTimestamp()
          });
        }
        
        onClose();
        navigate(`/chat/${existingChat.id}`);
        return;
      }

      // Create new chat if none exists
      const newChatRef = await addDoc(chatsRef, {
        participants,
        createdAt: serverTimestamp(),
        lastMessageTime: serverTimestamp(),
        isGroup: isGroup,
        groupName: isGroup ? groupName : '',
        unreadMessages: {},
        archivedBy: [],
        deletedBy: []
      });

      onClose();
      navigate(`/chat/${newChatRef.id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Failed to create chat');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-lg glass-panel rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">New Chat</h2>
          <button
            onClick={onClose}
            className="button-secondary p-2"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Group Chat Toggle */}
          <button
            onClick={() => {
              setIsGroup(!isGroup);
              setSelectedUsers([]);
              setGroupName('');
            }}
            className={`w-full button-secondary flex items-center justify-center space-x-2 p-3 rounded-xl transition-all duration-300 ${
              isGroup ? 'bg-gradient-to-r from-accent-blue to-purple-500 text-white' : 'hover:bg-white/10'
            }`}
          >
            <UserGroupIcon className="h-5 w-5" />
            <span>{isGroup ? 'Creating Group Chat' : 'Create Group Chat'}</span>
          </button>

          {/* Group Name Input */}
          {isGroup && (
            <div className="space-y-2">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter Group Name"
                className="input-field w-full bg-white/5 border border-white/10 rounded-xl p-3 focus:ring-2 focus:ring-accent-blue transition-all duration-300"
              />
              <p className="text-xs text-white/50 px-1">
                Select at least 2 participants to create a group
              </p>
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-white/5 rounded-xl border border-white/10">
              {selectedUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center bg-gradient-to-r from-accent-blue/20 to-purple-500/20 rounded-full px-3 py-1.5 backdrop-blur-sm transition-all duration-300 hover:from-accent-blue/30 hover:to-purple-500/30"
                >
                  <span className="text-sm text-white">{user.displayName || user.email?.split('@')[0]}</span>
                  <button
                    onClick={() => removeSelectedUser(user)}
                    className="ml-2 text-white/70 hover:text-white transition-colors duration-300"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="input-field w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-accent-blue transition-all duration-300"
            />
            <UserPlusIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
          </div>

          {error && (
            <p className="text-red-400 text-sm px-1">{error}</p>
          )}

          {/* Users List */}
          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-blue"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-white/70 text-center py-4">No users found</p>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => selectUser(user)}
                  className="flex items-center p-3 glass-panel-hover rounded-xl cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent-blue to-purple-500 flex items-center justify-center text-lg text-white">
                        {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white">
                      {user.displayName || user.email?.split('@')[0]}
                    </p>
                    <p className="text-sm text-white/70">{user.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Create Group Button */}
          {isGroup && selectedUsers.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => createChat(selectedUsers, groupName)}
                disabled={!groupName.trim() || selectedUsers.length < 2}
                className={`w-full p-3 rounded-xl transition-all duration-300 ${
                  !groupName.trim() || selectedUsers.length < 2
                    ? 'bg-white/10 text-white/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-accent-blue to-purple-500 text-white hover:opacity-90'
                }`}
              >
                {selectedUsers.length < 2 
                  ? `Select ${2 - selectedUsers.length} more participant${selectedUsers.length === 1 ? '' : 's'}`
                  : 'Create Group Chat'
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
