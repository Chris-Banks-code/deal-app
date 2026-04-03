import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { supabase } from '../lib/supabase';
import { Deal } from '../types/database.types';
import { getCachedDeals } from '../lib/offlineStorage';
import NetworkBanner from '../components/NetworkBanner';

interface DealWithClients extends Deal {
    wholesaler?: { company_name: string };
    retailer?: { company_name: string };
}

export default function OrdersScreen({ navigation }: any) {
    const { profile } = useAuth();
    const { isOnline } = useNetwork();
    const [orders, setOrders] = useState<DealWithClients[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        loadOrders();
        if (profile?.id && isOnline) {
            setupRealtime();
        }
        return () => {
            if (realtimeRef.current) {
                realtimeRef.current.unsubscribe();
            }
        };
    }, [filter, isOnline, profile?.id]);

    const setupRealtime = () => {
        if (!profile?.id) return;
        if (realtimeRef.current) realtimeRef.current.unsubscribe();

        realtimeRef.current = supabase
            .channel(`orders-${profile.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'deals',
                    filter: `agent_id=eq.${profile.id}`,
                },
                () => { loadOrders(); }
            )
            .subscribe();
    };

    const loadOrders = async () => {
        try {
            if (isOnline) {
                let query = supabase
                    .from('deals')
                    .select(`
            *,
            wholesaler:clients!deals_wholesaler_id_fkey(company_name),
            retailer:clients!deals_retailer_id_fkey(company_name)
          `)
                    .eq('agent_id', profile?.id)
                    .order('created_at', { ascending: false });

                if (filter !== 'all') {
                    query = query.eq('status', filter);
                }

                const { data, error } = await query;

                if (error) throw error;
                setOrders(data || []);
            } else {
                const cachedDeals = getCachedDeals();

                let filtered = cachedDeals;
                if (filter !== 'all') {
                    filtered = cachedDeals.filter((d: any) => d.status === filter);
                }

                setOrders(filtered);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadOrders();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed':
            case 'delivered':
            case 'completed':
                return '#2D7A4D';
            case 'pending_admin':
            case 'pending_wholesaler':
                return '#F4A542';
            case 'rejected':
                return '#D4472D';
            default:
                return '#6B7280';
        }
    };

    const formatStatus = (status: string) => {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const renderOrder = ({ item }: { item: DealWithClients }) => (
        <TouchableOpacity
            style={styles.orderCard}
            onPress={() => navigation.navigate('OrderDetail', { dealId: item.id })}
        >
            <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>{item.deal_number}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(item.status) + '30' }
                ]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {formatStatus(item.status)}
                    </Text>
                </View>
            </View>

            <Text style={styles.orderRoute}>
                {item.wholesaler?.company_name} → {item.retailer?.company_name}
            </Text>

            <Text style={styles.productName}>{item.product_name}</Text>

            <View style={styles.orderFooter}>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <Text style={styles.dealValue}>${parseFloat(item.deal_value.toString()).toFixed(0)}</Text>
            </View>

            <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>Your Commission:</Text>
                <Text style={styles.commissionValue}>
                    ${parseFloat(item.agent_commission.toString()).toFixed(2)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D4472D" />
            </View>
        );
    }

    return (
        <>
            <NetworkBanner />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>My Orders</Text>
                </View>

                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                        onPress={() => setFilter('all')}
                    >
                        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                            All ({orders.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'pending_admin' && styles.filterButtonActive]}
                        onPress={() => setFilter('pending_admin')}
                    >
                        <Text style={[styles.filterText, filter === 'pending_admin' && styles.filterTextActive]}>
                            Pending
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'confirmed' && styles.filterButtonActive]}
                        onPress={() => setFilter('confirmed')}
                    >
                        <Text style={[styles.filterText, filter === 'confirmed' && styles.filterTextActive]}>
                            Confirmed
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'delivered' && styles.filterButtonActive]}
                        onPress={() => setFilter('delivered')}
                    >
                        <Text style={[styles.filterText, filter === 'delivered' && styles.filterTextActive]}>
                            Delivered
                        </Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={orders}
                    renderItem={renderOrder}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4472D" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No orders yet</Text>
                            <Text style={styles.emptySubtext}>Create your first order to get started</Text>
                        </View>
                    }
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0F0D',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#0A0F0D',
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 16,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F8F9FA',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 8,
        marginBottom: 16,
    },
    filterButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: '#D4472D',
        borderColor: '#D4472D',
    },
    filterText: {
        fontSize: 12,
        color: '#A8B5AC',
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    listContainer: {
        padding: 16,
        paddingTop: 0,
    },
    orderCard: {
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F8F9FA',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    orderRoute: {
        fontSize: 14,
        color: '#A8B5AC',
        marginBottom: 8,
    },
    productName: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 12,
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    quantity: {
        fontSize: 14,
        color: '#6B7280',
    },
    dealValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F8F9FA',
    },
    commissionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#2D3A31',
    },
    commissionLabel: {
        fontSize: 14,
        color: '#2D7A4D',
        fontWeight: '600',
    },
    commissionValue: {
        fontSize: 16,
        color: '#2D7A4D',
        fontWeight: 'bold',
    },
    emptyState: {
        padding: 48,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        color: '#A8B5AC',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
});