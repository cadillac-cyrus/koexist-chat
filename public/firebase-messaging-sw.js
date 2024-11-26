importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAanwQgR1_WaNwIqEZXBloZZ2Xatww5wnI",
  authDomain: "chatt-45649.firebaseapp.com",
  projectId: "chatt-45649",
  storageBucket: "chatt-45649.firebasestorage.app",
  messagingSenderId: "428936093091",
  appId: "1:428936093091:web:44bb31c7ee03a17c8d8e16",
  measurementId: "G-EWLH36T1E7"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/chat-icon.png',
    badge: '/chat-icon.png',
    tag: payload.data?.chatId,
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
