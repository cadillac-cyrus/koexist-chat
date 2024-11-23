import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  arrayUnion, 
  arrayRemove,
  serverTimestamp, 
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteField
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db } from '../firebase';

const storage = getStorage();

// Create a new chat
export const createChat = async (participants, type = 'private') => {
  try {
    const chatRef = await addDoc(collection(db, 'chats'), {
      participants,
      type,
      createdAt: serverTimestamp(),
      lastMessage: null,
      lastMessageAt: serverTimestamp()
    });

    for (const userId of participants) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        chats: arrayUnion(chatRef.id)
      });
    }

    return chatRef.id;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
};

// Send a message
export const sendMessage = async (chatId, message) => {
  try {
    const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
      ...message,
      reactions: {},
      replyTo: message.replyTo || null,
      status: 'sent', 
      readBy: {}, 
      deleted: false,
      edited: false,
      timestamp: serverTimestamp()
    });

    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: message.deleted ? '🗑️ Message deleted' : message.text,
      lastMessageAt: serverTimestamp()
    });

    return messageRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Upload file
export const uploadFile = async (file, chatId, onProgress) => {
  try {
    const fileRef = ref(storage, `chats/${chatId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            path: fileRef.fullPath,
            name: file.name,
            type: file.type,
            size: file.size
          });
        }
      );
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Delete message
export const deleteMessage = async (chatId, messageId, userId) => {
  try {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) return;

    // Instead of deleting, mark as deleted and store metadata
    await updateDoc(messageRef, {
      deleted: true,
      deletionInfo: {
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        originalContent: messageDoc.data().text
      },
      text: 'This message was deleted'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    throw error;
  }
};

// Add reaction to message
export const addReaction = async (chatId, messageId, userId, reaction) => {
  try {
    if (!chatId || !messageId || !userId || !reaction) {
      throw new Error('Missing required parameters for adding reaction');
    }
    
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, {
      [`reactions.${reaction}`]: arrayUnion(userId)
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw error;
  }
};

// Remove reaction from message
export const removeReaction = async (chatId, messageId, userId, reaction) => {
  try {
    if (!chatId || !messageId || !userId || !reaction) {
      throw new Error('Missing required parameters for removing reaction');
    }
    
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, {
      [`reactions.${reaction}`]: arrayRemove(userId)
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    throw error;
  }
};

// Get chat details
export const getChatDetails = async (chatId) => {
  try {
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) {
      throw new Error('Chat not found');
    }
    return { id: chatDoc.id, ...chatDoc.data() };
  } catch (error) {
    console.error('Error getting chat details:', error);
    throw error;
  }
};

// Get user's chats
export const getUserChats = async (userId) => {
  try {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user chats:', error);
    throw error;
  }
};

// Mark messages as read
export const markMessagesAsRead = async (chatId, userId) => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      where('readBy.' + userId, '==', null)
    );
    
    const snapshot = await getDocs(q);
    const batch = [];
    
    snapshot.forEach((doc) => {
      const messageRef = doc.ref;
      batch.push(updateDoc(messageRef, {
        [`readBy.${userId}`]: serverTimestamp(),
        status: 'read'
      }));
    });
    
    await Promise.all(batch);
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Update user's online status
export const updateOnlineStatus = async (userId, isOnline) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      online: isOnline,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating online status:', error);
    throw error;
  }
};

// Update typing status
export const updateTypingStatus = async (chatId, userId, isTyping) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    if (isTyping) {
      await updateDoc(chatRef, {
        [`typing.${userId}`]: serverTimestamp()
      });
    } else {
      await updateDoc(chatRef, {
        [`typing.${userId}`]: null
      });
    }
  } catch (error) {
    console.error('Error updating typing status:', error);
    throw error;
  }
};
