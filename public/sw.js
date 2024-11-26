importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase
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

// This will be replaced by the precache manifest
self.__WB_MANIFEST;

// Cache the Google Firebase scripts
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('firebase-scripts-v1').then((cache) => {
      return cache.addAll([
        'https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js'
      ]);
    })
  );
});

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

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL('/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // If a window client is found, focus it
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window client is found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== 'firebase-scripts-v1') {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tell clients to reload and get the new version
      clients.claim()
    ])
  );
});
