// Constants for message types
const MESSAGE_TYPES = {
  INIT_MESSAGING: 'INIT_MESSAGING',
  REQUEST_PERMISSION: 'REQUEST_PERMISSION',
  REGISTER_PUSH: 'REGISTER_PUSH',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
  NOTIFICATION_CLICKED: 'NOTIFICATION_CLICKED'
};

// Check if running in WebView
export const isInWebView = () => {
  return window.ReactNativeWebView !== undefined;
};

// Initialize messaging bridge
export const initMessagingBridge = () => {
  if (!isInWebView()) return;

  // Listen for messages from native
  window.addEventListener('message', handleNativeMessage);

  // Notify native that web is ready
  sendToNative(MESSAGE_TYPES.INIT_MESSAGING);
};

// Handle messages from native
const handleNativeMessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
      case MESSAGE_TYPES.NOTIFICATION_CLICKED:
        // Dispatch custom event for notification click
        const clickEvent = new CustomEvent('nativeNotificationClick', {
          detail: message.data
        });
        window.dispatchEvent(clickEvent);
        break;
        
      default:
        // Dispatch generic native message event
        const messageEvent = new CustomEvent('nativeMessage', {
          detail: message
        });
        window.dispatchEvent(messageEvent);
    }
  } catch (error) {
    console.error('Error handling native message:', error);
  }
};

// Send message to native
export const sendToNative = (type, data = {}) => {
  if (!isInWebView()) return;

  try {
    const message = JSON.stringify({
      type,
      data
    });
    window.ReactNativeWebView.postMessage(message);
  } catch (error) {
    console.error('Error sending message to native:', error);
  }
};

// Request notification permission through native
export const requestNativeNotificationPermission = () => {
  return new Promise((resolve) => {
    if (!isInWebView()) {
      resolve(false);
      return;
    }

    // Listen for permission response
    const handlePermissionResponse = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === MESSAGE_TYPES.REQUEST_PERMISSION) {
        window.removeEventListener('message', handlePermissionResponse);
        resolve(message.data.granted);
      }
    };

    window.addEventListener('message', handlePermissionResponse);
    
    // Request permission from native
    sendToNative(MESSAGE_TYPES.REQUEST_PERMISSION);
  });
};

// Register for push notifications through native
export const registerForPushNotifications = () => {
  return new Promise((resolve, reject) => {
    if (!isInWebView()) {
      reject(new Error('Not in WebView'));
      return;
    }

    // Listen for registration response
    const handleRegistrationResponse = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === MESSAGE_TYPES.REGISTER_PUSH) {
        window.removeEventListener('message', handleRegistrationResponse);
        if (message.data.token) {
          resolve(message.data.token);
        } else {
          reject(new Error('Failed to get push token'));
        }
      }
    };

    window.addEventListener('message', handleRegistrationResponse);
    
    // Request registration from native
    sendToNative(MESSAGE_TYPES.REGISTER_PUSH);
  });
};
