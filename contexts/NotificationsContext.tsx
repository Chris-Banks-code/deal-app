import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications, addNotificationListener } from '../lib/notifications';

interface NotificationsContextType {
    expoPushToken: string | undefined;
    notification: Notifications.Notification | undefined;
}

const NotificationsContext = createContext<NotificationsContextType>({
    expoPushToken: undefined,
    notification: undefined,
});

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
    const { profile } = useAuth();
    const [expoPushToken, setExpoPushToken] = useState<string>();
    const [notification, setNotification] = useState<Notifications.Notification>();

    useEffect(() => {
        if (profile?.id) {
            // Register for push notifications
            registerForPushNotifications(profile.id).then(token => setExpoPushToken(token));

            // Listen for notifications while app is open
            const notificationListener = Notifications.addNotificationReceivedListener(notification => {
                setNotification(notification);
            });

            // Handle notification tap
            const responseListener = addNotificationListener((notification) => {
                console.log('Notification tapped:', notification);
                // You can navigate to specific screens based on notification data here
            });

            // Subscribe to realtime changes for this agent's deals
            const channel = supabase
                .channel('deal-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'deals',
                        filter: `agent_id=eq.${profile.id}`,
                    },
                    (payload) => {
                        const newStatus = payload.new.status;
                        const oldStatus = payload.old.status;
                        const dealNumber = payload.new.deal_number;

                        if (newStatus !== oldStatus) {
                            let title = '';
                            let body = '';

                            if (newStatus === 'confirmed') {
                                title = '✅ Order Confirmed!';
                                body = `Order ${dealNumber} has been confirmed by the wholesaler`;
                            } else if (newStatus === 'rejected') {
                                title = '❌ Order Rejected';
                                body = `Order ${dealNumber} was rejected. Check admin notes for details.`;
                            } else if (newStatus === 'delivered') {
                                title = '🚚 Order Delivered!';
                                body = `Order ${dealNumber} has been delivered`;
                            } else if (newStatus === 'completed') {
                                title = '💰 Commission Ready!';
                                body = `Order ${dealNumber} completed. Commission will be processed.`;
                            }

                            if (title) {
                                Notifications.scheduleNotificationAsync({
                                    content: {
                                        title,
                                        body,
                                        sound: true,
                                        data: { dealId: payload.new.id },
                                    },
                                    trigger: null,
                                });
                            }
                        }
                    }
                )
                .subscribe();

            // Subscribe to commission updates
            const commissionChannel = supabase
                .channel('commission-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'commissions',
                        filter: `agent_id=eq.${profile.id}`,
                    },
                    (payload) => {
                        const newStatus = payload.new.status;
                        const oldStatus = payload.old.status;
                        const amount = payload.new.amount;

                        if (newStatus === 'paid' && oldStatus === 'pending') {
                            Notifications.scheduleNotificationAsync({
                                content: {
                                    title: '💸 Payment Received!',
                                    body: `You received $${parseFloat(amount).toFixed(2)} commission payment`,
                                    sound: true,
                                    data: { commissionId: payload.new.id },
                                },
                                trigger: null,
                            });
                        }
                    }
                )
                .subscribe();

            return () => {
                notificationListener.remove();
                responseListener();
                channel.unsubscribe();
                commissionChannel.unsubscribe();
            };
        }
    }, [profile?.id]);

    return (
        <NotificationsContext.Provider value={{ expoPushToken, notification }}>
            {children}
        </NotificationsContext.Provider>
    );
};