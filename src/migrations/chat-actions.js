import { db } from '../firebase';
import { collection, getDocs, updateDoc } from 'firebase/firestore';

export async function migrateChatActions() {
  try {
    const chatsRef = collection(db, 'chats');
    const snapshot = await getDocs(chatsRef);

    const batch = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.unreadMessages || !data.archivedBy || !data.deletedBy) {
        batch.push(
          updateDoc(doc.ref, {
            unreadMessages: data.unreadMessages || {},
            archivedBy: data.archivedBy || [],
            deletedBy: data.deletedBy || []
          })
        );
      }
    });

    await Promise.all(batch);
    console.log('Successfully migrated chat actions');
  } catch (error) {
    console.error('Error migrating chat actions:', error);
  }
}
