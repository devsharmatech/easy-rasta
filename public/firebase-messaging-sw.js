importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCeMWyoFt3tdsRTpP9IXKphjG-4UeQkaJk",
    authDomain: "test-notification-2a838.firebaseapp.com",
    projectId: "test-notification-2a838",
    storageBucket: "test-notification-2a838.firebasestorage.app",
    messagingSenderId: "188173484308",
    appId: "1:188173484308:web:923608d8e78078ce660201",
    measurementId: "G-PM7H8RSE91"
};

try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);
        const notificationTitle = payload.notification.title;
        const notificationOptions = {
            body: payload.notification.body,
            icon: '/icon.png' // Or whatever standard icon you have
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
} catch (e) {
    console.log('[SW] Firebase config error', e);
}
