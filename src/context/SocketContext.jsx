import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();
  const [currentChatId, setCurrentChatId] = useState(null);

  const initializeSocket = useCallback(() => {
    if (!user) return null;

    const newSocket = io('http://localhost:3001', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setConnected(true);

      // Join as user after successful connection
      newSocket.emit('user:join', {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0],
        email: user.email,
        photoURL: user.photoURL
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });

    // Listen for active users updates
    newSocket.on('users:active', (users) => {
      setActiveUsers(users.filter(u => u.uid !== user.uid));
    });

    // Listen for typing status updates
    newSocket.on('typing:update', ({ user: typingUser, isTyping, chatId }) => {
      setTypingUsers(prev => ({
        ...prev,
        [chatId]: {
          ...prev[chatId],
          [typingUser.uid]: isTyping ? typingUser : undefined
        }
      }));
    });

    return newSocket;
  }, [user]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = initializeSocket();
    if (newSocket) {
      setSocket(newSocket);
      return () => {
        newSocket.disconnect();
      };
    }
  }, [initializeSocket]);

  useEffect(() => {
    if (!user || !socket) return;

    // Listen for new messages
    socket.on('new_message', async (data) => {
      const { chatId, message } = data;
      
      // Update unread count if the chat is not currently open
      if (currentChatId !== chatId) {
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);
        
        if (chatDoc.exists()) {
          const chatData = chatDoc.data();
          await updateDoc(chatRef, {
            [`unreadMessages.${user.uid}`]: (chatData.unreadMessages?.[user.uid] || 0) + 1
          });
        }
      }
    });

    // Listen for chat actions
    socket.on('chat_action', async (data) => {
      const { chatId, action, userId } = data;
      
      if (userId === user.uid) return; // Ignore own actions
      
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) return;
      
      const chatData = chatDoc.data();
      
      switch (action) {
        case 'archive':
          if (!chatData.archivedBy.includes(userId)) {
            await updateDoc(chatRef, {
              archivedBy: arrayUnion(userId)
            });
          }
          break;
          
        case 'unarchive':
          await updateDoc(chatRef, {
            archivedBy: arrayRemove(userId)
          });
          break;
          
        case 'delete':
          if (!chatData.deletedBy.includes(userId)) {
            await updateDoc(chatRef, {
              deletedBy: arrayUnion(userId)
            });
          }
          break;
          
        case 'mark_read':
          await updateDoc(chatRef, {
            [`unreadMessages.${userId}`]: 0
          });
          break;
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('chat_action');
    };
  }, [user, currentChatId, socket]);

  const sendMessage = useCallback((chatId, message, isGroup = false) => {
    if (!socket || !connected) return;

    if (isGroup) {
      socket.emit('message:group', { chatId, message });
    } else {
      socket.emit('message:private', { to: chatId, message });
    }
  }, [socket, connected]);

  const joinChat = useCallback((chatId) => {
    if (!socket || !connected) return;
    socket.emit('chat:join', chatId);
  }, [socket, connected]);

  const startTyping = useCallback((chatId) => {
    if (!socket || !connected || !user) return;
    socket.emit('typing:start', { chatId, user });
  }, [socket, connected, user]);

  const stopTyping = useCallback((chatId) => {
    if (!socket || !connected || !user) return;
    socket.emit('typing:stop', { chatId, user });
  }, [socket, connected, user]);

  const value = {
    socket,
    activeUsers,
    typingUsers,
    connected,
    sendMessage,
    joinChat,
    startTyping,
    stopTyping,
    setCurrentChatId
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
