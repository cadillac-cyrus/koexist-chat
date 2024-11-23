import { 
  collection,
  query,
  where,
  orderBy,
  addDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase';

export class ChatService {
  static async createChat(userId1, userId2) {
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: {
          [userId1]: true,
          [userId2]: true
        },
        createdAt: serverTimestamp(),
        lastMessage: null,
        lastMessageTime: null
      });
      return chatRef.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  static async sendMessage(chatId, senderId, content, type = 'text') {
    try {
      const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId,
        content,
        type,
        timestamp: serverTimestamp(),
        reactions: {},
        replyTo: null,
        status: 'sent'
      });

      // Update last message in chat
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: content,
        lastMessageTime: serverTimestamp()
      });

      return messageRef.id;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  static subscribeToChat(chatId, callback) {
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      callback(messages);
    });
  }

  static async getUserChats(userId) {
    try {
      const chatsQuery = query(
        collection(db, 'chats'),
        where(`participants.${userId}`, '==', true)
      );

      const snapshot = await getDocs(chatsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastMessageTime: doc.data().lastMessageTime?.toDate()
      }));
    } catch (error) {
      console.error('Error getting user chats:', error);
      throw error;
    }
  }

  static async addReaction(chatId, messageId, reaction, userId) {
    try {
      const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(messageRef, {
        [`reactions.${userId}`]: reaction
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  static async deleteMessage(chatId, messageId) {
    try {
      await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  static async createUserProfile(userId, data) {
    try {
      await setDoc(doc(db, 'users', userId), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }
}
