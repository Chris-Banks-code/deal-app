import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Request permission and get push token
export async function registerForPushNotifications(userId: string) {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#D4472D',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Push token:', token);

        // Save token to user profile
        try {
            await supabase
                .from('profiles')
                .update({ push_token: token })
                .eq('id', userId);
        } catch (error) {
            console.error('Error saving push token:', error);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

// Send local notification (for testing)
export async function sendLocalNotification(title: string, body: string) {
    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: true,
        },
        trigger: null, // Show immediately
    });
}

// Handle notification tap
export function addNotificationListener(callback: (notification: any) => void) {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        callback(response.notification);
    });

    return () => subscription.remove();
}