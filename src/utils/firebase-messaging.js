import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAanwQgR1_WaNwIqEZXBloZZ2Xatww5wnI",
  authDomain: "chatt-45649.firebaseapp.com",
  projectId: "chatt-45649",
  storageBucket: "chatt-45649.firebasestorage.app",
  messagingSenderId: "428936093091",
  appId: "1:428936093091:web:44bb31c7ee03a17c8d8e16",
  measurementId: "G-EWLH36T1E7"
};

const app = initializeApp(firebaseConfig);

let messagingInstance = null;

const initializeMessaging = async () => {
  try {
    const isMessagingSupported = await isSupported();
    if (!isMessagingSupported) {
      console.log('Firebase messaging is not supported in this browser');
      return null;
    }
    return getMessaging(app);
  } catch (error) {
    console.error('Error initializing messaging:', error);
    return null;
  }
};

export const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Initialize messaging if not already done
    if (!messagingInstance) {
      messagingInstance = await initializeMessaging();
      if (!messagingInstance) {
        return null;
      }
    }

    try {
      const token = await getToken(messagingInstance, {
        vapidKey: 'BLBe_ZGmwHFM7O_ZXHGRXGm0pd6LFzaQpQEOyPuv_aSCZ3kBp2_h-y5j_5F7XBd7XYQwp0UVdVy-kxGfMIBqXYo'
      });

      if (token) {
        console.log('FCM Token:', token);
        return token;
      } else {
        console.log('No registration token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

export const onMessageListener = () => {
  return new Promise(async (resolve) => {
    if (!messagingInstance) {
      messagingInstance = await initializeMessaging();
      if (!messagingInstance) {
        resolve(null);
        return;
      }
    }

    onMessage(messagingInstance, (payload) => {
      console.log('Received foreground message:', payload);
      resolve(payload);
    });
  });
};
