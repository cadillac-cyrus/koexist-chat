import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import Pusher from 'pusher-js';
import { pusherConfig } from '../config/pusher';
import { useAuth } from './AuthContext';
import { showNotification } from '../utils/notifications';
import { requestNotificationPermission, onMessageListener } from '../utils/firebase-messaging';
import { 
  isInWebView, 
  initMessagingBridge, 
  requestNativeNotificationPermission,
  registerForPushNotifications,
  sendToNative 
} from '../utils/webview-bridge';

const PusherContext = createContext();

export function PusherProvider({ children }) {
  const [pusher, setPusher] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);
  const [isMessagingSupported, setIsMessagingSupported] = useState(false);
  const { user } = useAuth();
  const channelRef = useRef(null);
  const pusherRef = useRef(null);

  // Initialize WebView bridge if in WebView
  useEffect(() => {
    if (isInWebView()) {
      initMessagingBridge();
    }
  }, []);

  // Initialize notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      if (!user) return;

      try {
        let token = null;
        
        if (isInWebView()) {
          // Request permissions through WebView bridge
          const permissionGranted = await requestNativeNotificationPermission();
          if (permissionGranted) {
            token = await registerForPushNotifications();
          }
        } else {
          // Use regular web notifications
          token = await requestNotificationPermission();
        }

        if (token) {
          setFcmToken(token);
          setIsMessagingSupported(true);

          // Send token to server
          try {
            const response = await fetch('/api/save-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.uid,
                token: token,
                platform: isInWebView() ? 'mobile' : 'web'
              })
            });

            if (!response.ok) {
              throw new Error('Failed to save token');
            }
          } catch (error) {
            console.error('Error saving FCM token:', error);
          }
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
        setIsMessagingSupported(false);
      }
    };

    initializeNotifications();
  }, [user]);

  // Listen for notifications
  useEffect(() => {
    if (!user || !isMessagingSupported) return;

    if (isInWebView()) {
      // Listen for native notifications
      const handleNativeNotification = (event) => {
        const { title, body, data } = event.detail;
        // Handle the notification in the WebView
        if (data.senderId !== user.uid) {
          showNotification(title, {
            body,
            tag: data.chatId,
            requireInteraction: true
          });
        }
      };

      window.addEventListener('nativeNotification', handleNativeNotification);
      return () => window.removeEventListener('nativeNotification', handleNativeNotification);
    } else {
      // Use regular web notifications
      const unsubscribe = onMessageListener()
        .then(payload => {
          if (payload && payload.notification) {
            showNotification(payload.notification.title, {
              body: payload.notification.body,
              icon: '/chat-icon.png',
              tag: payload.data?.chatId,
              requireInteraction: true,
              vibrate: [200, 100, 200]
            });
          }
        })
        .catch(err => console.log('Failed to receive message:', err));

      return () => unsubscribe;
    }
  }, [user, isMessagingSupported]);

  // Initialize Pusher
  useEffect(() => {
    let mounted = true;

    const initializePusher = async () => {
      if (!user) return;

      // Clean up existing connection
      if (pusherRef.current) {
        if (channelRef.current) {
          channelRef.current.unbind_all();
          channelRef.current.unsubscribe();
        }
        pusherRef.current.disconnect();
      }

      try {
        const pusherClient = new Pusher(pusherConfig.key, {
          cluster: pusherConfig.cluster,
          encrypted: true
        });

        pusherRef.current = pusherClient;
        const channel = pusherClient.subscribe('chat-notifications');
        channelRef.current = channel;

        channel.bind('new-message', async data => {
          console.log('Received new message event:', data);
          if (data.senderId !== user.uid) {
            if (isInWebView()) {
              // Forward message to native app for notification
              sendToNative('SHOW_NOTIFICATION', {
                title: `New message from ${data.senderName}`,
                body: data.message,
                data: {
                  chatId: data.chatId,
                  senderId: data.senderId,
                  type: 'new_message'
                }
              });
            } else if (!isMessagingSupported && document.hidden) {
              // Fallback to browser notifications
              showNotification(`New message from ${data.senderName}`, {
                body: data.message,
                tag: data.chatId,
                icon: '/chat-icon.png',
                requireInteraction: true,
                vibrate: [200, 100, 200]
              });
            }
          }
        });

        if (mounted) {
          setPusher(pusherClient);
          console.log('Pusher initialized successfully');
        }
      } catch (error) {
        console.error('Error initializing Pusher:', error);
      }
    };

    initializePusher();

    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.unbind_all();
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
      setPusher(null);
    };
  }, [user, isMessagingSupported]);

  return (
    <PusherContext.Provider value={{ pusher, fcmToken, isMessagingSupported }}>
      {children}
    </PusherContext.Provider>
  );
}

export const usePusher = () => {
  const context = useContext(PusherContext);
  if (!context) {
    throw new Error('usePusher must be used within a PusherProvider');
  }
  return context;
};
