import { createContext, useContext, useState, useEffect } from 'react';
import { auth, signInWithGoogle, signInWithEmail } from '../firebase';
import { onAuthStateChanged, getRedirectResult, signOut } from 'firebase/auth';
import { doc, setDoc, getFirestore, serverTimestamp, getDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ref, onDisconnect, set, onValue, serverTimestamp as rtServerTimestamp } from 'firebase/database';
import { db as rtdb } from '../firebase'; // Make sure to import your realtime database instance

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const db = getFirestore();

  const updateUserStatus = async (uid, isOnline) => {
    try {
      // Update Firestore status
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        online: isOnline,
        lastSeen: serverTimestamp(),
      }, { merge: true });

      // Update all chats where user is a participant
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userDetails = {
          displayName: userData.displayName,
          email: userData.email,
          photoURL: userData.photoURL,
          online: isOnline,
          lastSeen: serverTimestamp(),
        };

        // Update user's status in all their chats
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('participants', 'array-contains', uid));
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        querySnapshot.docs.forEach((chatDoc) => {
          const chatRef = doc(db, 'chats', chatDoc.id);
          batch.update(chatRef, {
            [`participantDetails.${uid}`]: userDetails
          });
        });
        await batch.commit();
      }

      // Set up real-time presence
      const userStatusRef = ref(rtdb, `/status/${uid}`);
      const connectedRef = ref(rtdb, '.info/connected');

      onValue(connectedRef, async (snapshot) => {
        if (snapshot.val() === true) {
          // User is online
          await set(userStatusRef, {
            online: true,
            lastSeen: rtServerTimestamp(),
          });

          // When user disconnects, update the status
          onDisconnect(userStatusRef).set({
            online: false,
            lastSeen: rtServerTimestamp(),
          });
        }
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Add or update user in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          lastSeen: serverTimestamp(),
          online: true,
        }, { merge: true });

        // Update online status
        await updateUserStatus(currentUser.uid, true);
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
      // Update status to offline when component unmounts
      if (user?.uid) {
        updateUserStatus(user.uid, false);
      }
    };
  }, [db]);

  const login = async (email, password) => {
    try {
      const result = await signInWithEmail(email, password);
      return result;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithGoogle();
      return result;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (user?.uid) {
        await updateUserStatus(user.uid, false);
      }
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      setError(error.message);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    loginWithGoogle,
    setError,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
