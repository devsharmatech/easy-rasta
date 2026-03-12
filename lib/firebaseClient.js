import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const messaging = async () => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker registered with scope:', registration.scope);
            
            return getMessaging(app);
        } catch (error) {
            console.error("Firebase messaging initialization error", error);
            return null;
        }
    }
    return null;
};

export const generateToken = async () => {
    try {
        const msg = await messaging();
        if (!msg) return null;

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(msg, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
            });
            return token;
        }
        return null;
    } catch (error) {
        console.error('Error getting push token', error);
        return null;
    }
};

export const onMessageListener = (callback) => {
    messaging().then((msg) => {
        if (msg) {
            onMessage(msg, (payload) => {
                callback(payload);
            });
        }
    }).catch(err => console.log('Messaging error: ', err));
};
