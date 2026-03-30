import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import {
    initOfflineDB,
    getSyncQueue,
    removeFromSyncQueue,
    cacheClients,
    cacheProducts,
    cacheDeals,
} from '../lib/offlineStorage';
import { useAuth } from './AuthContext';

interface NetworkContextType {
    isOnline: boolean;
    isSyncing: boolean;
    pendingSync: number;
    syncNow: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({
    isOnline: true,
    isSyncing: false,
    pendingSync: 0,
    syncNow: async () => { },
});

export const useNetwork = () => useContext(NetworkContext);

export const NetworkProvider = ({ children }: { children: ReactNode }) => {
    const { profile } = useAuth();
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingSync, setPendingSync] = useState(0);

    useEffect(() => {
        initOfflineDB();

        // Monitor network state
        const unsubscribe = NetInfo.addEventListener(state => {
            const online = state.isConnected && state.isInternetReachable !== false;
            setIsOnline(online);

            // Auto-sync when coming back online
            if (online && !isSyncing) {
                setTimeout(() => syncNow(), 1000); // Wait 1 second before syncing
            }
        });

        // Check pending items on mount
        updatePendingCount();

        // Initial sync when app loads (if online)
        if (profile) {
            setTimeout(() => syncNow(), 2000); // Give time for app to load
        }

        return () => unsubscribe();
    }, [profile]);

    const updatePendingCount = () => {
        const queue = getSyncQueue();
        setPendingSync(queue.length);
    };

    const syncNow = async () => {
        if (!isOnline || isSyncing || !profile) return;

        setIsSyncing(true);

        try {
            // 1. Process sync queue (upload pending changes)
            const queue = getSyncQueue();

            for (const item of queue) {
                try {
                    if (item.tableName === 'deals') {
                        const { error } = await supabase
                            .from('deals')
                            .insert([item.data]);

                        if (!error) {
                            removeFromSyncQueue(item.id);
                        }
                    } else if (item.tableName === 'clients') {
                        const { error } = await supabase
                            .from('clients')
                            .insert([item.data]);

                        if (!error) {
                            removeFromSyncQueue(item.id);
                        }
                    } else if (item.tableName === 'commissions') {
                        const { error } = await supabase
                            .from('commissions')
                            .insert([item.data]);

                        if (!error) {
                            removeFromSyncQueue(item.id);
                        }
                    }
                } catch (error) {
                    console.error('Sync error for item:', item.id, error);
                }
            }

            // 2. Download latest data from server and cache it
            try {
                const [clientsRes, productsRes, dealsRes] = await Promise.all([
                    supabase
                        .from('clients')
                        .select('*')
                        .eq('assigned_agent_id', profile.id),

                    supabase
                        .from('products')
                        .select(`
              *,
              wholesaler:clients!products_wholesaler_id_fkey(
                company_name,
                contact_person,
                phone
              )
            `)
                        .eq('status', 'available'),

                    supabase
                        .from('deals')
                        .select(`
              *,
              wholesaler:clients!deals_wholesaler_id_fkey(company_name),
              retailer:clients!deals_retailer_id_fkey(company_name)
            `)
                        .eq('agent_id', profile.id),
                ]);

                if (clientsRes.data) {
                    console.log('Caching', clientsRes.data.length, 'clients');
                    cacheClients(clientsRes.data);
                }
                if (productsRes.data) {
                    console.log('Caching', productsRes.data.length, 'products');
                    cacheProducts(productsRes.data);
                }
                if (dealsRes.data) {
                    console.log('Caching', dealsRes.data.length, 'deals');
                    cacheDeals(dealsRes.data);
                }
            } catch (cacheError) {
                console.error('Error caching data:', cacheError);
            }

            updatePendingCount();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <NetworkContext.Provider value={{ isOnline, isSyncing, pendingSync, syncNow }}>
            {children}
        </NetworkContext.Provider>
    );
};