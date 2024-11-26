import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, arrayRemove, arrayUnion, getDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { PlusIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import NewChat from './NewChat';
import ChatActions from './ChatActions';

export default function ChatList() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [activeTab, setActiveTab] = useState('private');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        unreadCount: doc.data().unreadMessages?.[auth.currentUser.uid] || 0
      }));
      setChats(chatsList);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching chats:', err);
      setError('Failed to load chats');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getFullImageUrl = (path) => {
    if (!path) return null;
    return path.startsWith('https') ? path : `https://koexist-server.onrender.com${path}`;
  };

  const handleMarkAsRead = async (chat) => {
    try {
      const chatRef = doc(db, 'chats', chat.id);
      await updateDoc(chatRef, {
        [`unreadMessages.${auth.currentUser.uid}`]: 0
      });
    } catch (err) {
      console.error('Error marking chat as read:', err);
    }
  };

  const handleArchive = async (chat) => {
    try {
      const chatRef = doc(db, 'chats', chat.id);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) return;
      
      const chatData = chatDoc.data();
      const archivedBy = chatData.archivedBy || [];
      const isArchived = Array.isArray(archivedBy) && archivedBy.includes(auth.currentUser.uid);

      await updateDoc(chatRef, {
        archivedBy: isArchived 
          ? arrayRemove(auth.currentUser.uid)
          : arrayUnion(auth.currentUser.uid)
      });
    } catch (err) {
      console.error('Error archiving chat:', err);
    }
  };

  const handleDelete = async (chat) => {
    try {
      const chatRef = doc(db, 'chats', chat.id);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) return;
      
      // Instead of deleting, mark the chat as hidden and store metadata
      await updateDoc(chatRef, {
        deletedBy: arrayUnion(auth.currentUser.uid),
        deletionInfo: {
          [`${auth.currentUser.uid}`]: {
            deletedAt: new Date().toISOString(),
            wasDeleted: true
          }
        }
      });
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const filterChats = (chats, type) => {
    return chats
      .filter(chat => {
        if (!chat) return false;
        
        const deletedBy = chat.deletedBy || [];
        const archivedBy = chat.archivedBy || [];
        const isDeleted = Array.isArray(deletedBy) && deletedBy.includes(auth.currentUser.uid);
        const isArchived = Array.isArray(archivedBy) && archivedBy.includes(auth.currentUser.uid);
        
        // Don't show deleted chats
        if (isDeleted) return false;
        
        // Only show archived chats when viewing archived
        if (showArchived !== isArchived) return false;
        
        // Filter by chat type (private or group)
        return type === 'private' ? !chat.isGroup : chat.isGroup;
      });
  };

  const privateChats = filterChats(chats, 'private');
  const groupChats = filterChats(chats, 'groups');

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
      {showNewChat && <NewChat onClose={() => setShowNewChat(false)} />}
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="chat-list-header">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-white">Messages</h1>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`p-1.5 rounded-lg transition-colors ${
                showArchived ? 'bg-accent-blue text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <ArchiveBoxIcon className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="button-primary px-4 py-2 flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="chat-list-tabs">
          <button
            onClick={() => setActiveTab('private')}
            className={`chat-list-tab ${activeTab === 'private' ? 'active' : ''}`}
          >
            Private
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`chat-list-tab ${activeTab === 'groups' ? 'active' : ''}`}
          >
            Groups
          </button>
        </div>

        {/* Chat List */}
        <div className="chat-list-container">
          {activeTab === 'private' ? (
            privateChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/70 p-4">
                <p className="mb-4">No conversations yet</p>
                <p className="text-sm text-white/50 text-center">
                  Start a new chat to begin messaging
                </p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-6 button-primary px-6 py-3 flex items-center space-x-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>New Chat</span>
                </button>
              </div>
            ) : (
              <div className="space-y-px">
                {privateChats.map(chat => {
                  const otherParticipantId = chat.participants.find(id => id !== auth.currentUser.uid);
                  const otherParticipant = chat.participantDetails[otherParticipantId];
                  
                  return (
                    <Link
                      key={chat.id}
                      to={`/chat/${chat.id}`}
                      className="chat-list-item block group relative z-[-1]"
                      style={{zIndex: -1}}
                    >
                      <div className="absolute right-4 bottom-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-[100]">
                        <ChatActions
                          chat={chat}
                          onDelete={handleDelete}
                          onArchive={handleArchive}
                          onMarkAsRead={handleMarkAsRead}
                        />
                      </div>
                      <div className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {otherParticipant?.photoURL ? (
                              <img
                                src={getFullImageUrl(otherParticipant.photoURL)}
                                alt={otherParticipant.displayName}
                                className="w-12 h-12 rounded-full"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-accent-blue to-purple-500 text-white flex items-center justify-center text-lg">
                                {otherParticipant?.displayName?.[0]?.toUpperCase() || 
                                 otherParticipant?.email?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 min-w-0">
                                <p className="text-sm font-medium text-white truncate max-w-[150px]">
                                  {otherParticipant?.displayName || 'Anonymous'}
                                </p>
                                {chat.unreadCount > 0 && (
                                  <span className="px-2 py-0.5 text-xs bg-accent-blue rounded-full flex-shrink-0">
                                    {chat.unreadCount}
                                  </span>
                                )}
                              </div>
                              {chat.lastMessageTime && (
                                <p className="text-xs text-white/50 flex-shrink-0">
                                  {formatDistanceToNow(chat.lastMessageTime.toDate(), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                            {chat.lastMessage && (
                              <div className="mt-1">
                                <p className="text-sm text-white/70 truncate max-w-[250px]">
                                  {chat.lastMessage.senderId === auth.currentUser.uid ? 'You: ' : ''}
                                  {chat.lastMessage.text}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          ) : (
            groupChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/70 p-4">
                <p className="mb-4">No group conversations yet</p>
                <p className="text-sm text-white/50 text-center">
                  Create a new group to start chatting
                </p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-6 button-primary px-6 py-3 flex items-center space-x-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>New Group</span>
                </button>
              </div>
            ) : (
              <div className="space-y-px">
                {groupChats.map(chat => (
                  <Link
                    key={chat.id}
                    to={`/chat/${chat.id}`}
                    className="chat-list-item block z-[-50]"
                  >
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-100">
                      <ChatActions
                        chat={chat}
                        onDelete={handleDelete}
                        onArchive={handleArchive}
                        onMarkAsRead={handleMarkAsRead}
                      />
                    </div>
                    <div className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-accent-blue to-purple-500 text-white flex items-center justify-center text-lg">
                            {chat.groupName?.[0]?.toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white truncate">
                                {chat.groupName}
                              </p>
                              <p className="text-xs text-white/50">
                                {chat.participants.length} members
                              </p>
                            </div>
                            {chat.lastMessageTime && (
                              <p className="text-xs text-white/50">
                                {formatDistanceToNow(chat.lastMessageTime.toDate(), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                          {chat.lastMessage && (
                            <div className="mt-1">
                              <p className="text-sm text-white/70 truncate">
                                {chat.lastMessage.senderId === auth.currentUser.uid ? 'You: ' : 
                                 `${chat.participantDetails[chat.lastMessage.senderId]?.displayName?.split(' ')[0] || 'Someone'}: `}
                                {chat.lastMessage.text}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
