import { createContext, useContext, useState, useEffect } from 'react';
import { ChatService } from '../services/ChatService';
import { useAuth } from './AuthContext';

const MessagesContext = createContext();

export function MessagesProvider({ children }) {
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const { user } = useAuth();

  // Load user's chats
  useEffect(() => {
    if (user) {
      loadUserChats();
    }
  }, [user]);

  // Subscribe to current chat messages
  useEffect(() => {
    if (currentChat) {
      const unsubscribe = ChatService.subscribeToChat(currentChat.id, (messages) => {
        setMessages(messages);
      });
      return () => unsubscribe();
    }
  }, [currentChat]);

  const loadUserChats = async () => {
    try {
      const userChats = await ChatService.getUserChats(user.uid);
      setChats(userChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const sendMessage = async (content, type = 'text') => {
    if (!currentChat || !user) return;
    
    try {
      await ChatService.sendMessage(currentChat.id, user.uid, content, type);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const createChat = async (otherUserId) => {
    if (!user) return;
    
    try {
      const chatId = await ChatService.createChat(user.uid, otherUserId);
      await loadUserChats(); // Reload chats to include new chat
      return chatId;
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const addReaction = async (messageId, reaction) => {
    if (!currentChat || !user) return;
    
    try {
      await ChatService.addReaction(currentChat.id, messageId, reaction, user.uid);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!currentChat) return;
    
    try {
      await ChatService.deleteMessage(currentChat.id, messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const value = {
    chats,
    currentChat,
    setCurrentChat,
    messages,
    sendMessage,
    createChat,
    addReaction,
    deleteMessage
  };

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}
