export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const showNotification = (title, options = {}) => {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission === "granted" && document.hidden) {
    const notification = new Notification(title, {
      icon: "/chat-icon.png", // Make sure to add a chat icon to your public folder
      badge: "/chat-icon.png",
      ...options
    });

    // Auto close notification after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Handle notification click
    notification.onclick = function(event) {
      event.preventDefault();
      window.focus();
      notification.close();
    };
  }
};
