import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface CommissionWithDeal {
    id: string;
    amount: number;
    status: 'pending' | 'paid';
    paid_at: string | null;
    created_at: string;
    deal: {
        deal_number: string;
        product_name: string;
        deal_value: number;
        status: string;
    };
}

export default function EarningsScreen() {
    const { profile } = useAuth();
    const [commissions, setCommissions] = useState<CommissionWithDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
    const [stats, setStats] = useState({
        totalEarned: 0,
        pendingCommission: 0,
        paidCommission: 0,
    });

    useEffect(() => {
        loadCommissions();
    }, [filter]);

    const loadCommissions = async () => {
        try {
            let query = supabase
                .from('commissions')
                .select(`
          *,
          deal:deals (
            deal_number,
            product_name,
            deal_value,
            status
          )
        `)
                .eq('agent_id', profile?.id)
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query;

            if (error) throw error;

            setCommissions(data || []);

            // Calculate stats
            const total = data?.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;
            const pending = data?.filter(c => c.status === 'pending')
                .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;
            const paid = data?.filter(c => c.status === 'paid')
                .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;

            setStats({
                totalEarned: total,
                pendingCommission: pending,
                paidCommission: paid,
            });
        } catch (error) {
            console.error('Error loading commissions:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadCommissions();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const renderCommission = ({ item }: { item: CommissionWithDeal }) => (
        <View style={styles.commissionCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.dealNumber}>{item.deal.deal_number}</Text>
                <View style={[
                    styles.statusBadge,
                    item.status === 'paid' ? styles.statusPaid : styles.statusPending
                ]}>
                    <Text style={[
                        styles.statusText,
                        item.status === 'paid' ? styles.statusTextPaid : styles.statusTextPending
                    ]}>
                        {item.status === 'paid' ? 'Paid' : 'Pending'}
                    </Text>
                </View>
            </View>

            <Text style={styles.productName}>{item.deal.product_name}</Text>

            <View style={styles.cardRow}>
                <Text style={styles.label}>Deal Value:</Text>
                <Text style={styles.value}>${parseFloat(item.deal.deal_value.toString()).toFixed(2)}</Text>
            </View>

            <View style={styles.cardRow}>
                <Text style={styles.labelHighlight}>Your Commission:</Text>
                <Text style={styles.valueHighlight}>${parseFloat(item.amount.toString()).toFixed(2)}</Text>
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.dateText}>
                    {item.status === 'paid' && item.paid_at
                        ? `Paid on ${formatDate(item.paid_at)}`
                        : `Created ${formatDate(item.created_at)}`
                    }
                </Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D4472D" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Earnings</Text>
            </View>

            {/* Stats Summary */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Earned</Text>
                    <Text style={styles.statValue}>${stats.totalEarned.toFixed(2)}</Text>
                </View>
            </View>

            <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.statCardSmall]}>
                    <Text style={styles.statLabel}>Pending</Text>
                    <Text style={[styles.statValue, styles.statValuePending]}>
                        ${stats.pendingCommission.toFixed(2)}
                    </Text>
                </View>

                <View style={[styles.statCard, styles.statCardSmall]}>
                    <Text style={styles.statLabel}>Paid Out</Text>
                    <Text style={[styles.statValue, styles.statValuePaid]}>
                        ${stats.paidCommission.toFixed(2)}
                    </Text>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                        All ({commissions.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
                    onPress={() => setFilter('pending')}
                >
                    <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
                        Pending
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'paid' && styles.filterButtonActive]}
                    onPress={() => setFilter('paid')}
                >
                    <Text style={[styles.filterText, filter === 'paid' && styles.filterTextActive]}>
                        Paid
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Commissions List */}
            <FlatList
                data={commissions}
                renderItem={renderCommission}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4472D" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No commissions yet</Text>
                        <Text style={styles.emptySubtext}>Create your first order to start earning</Text>
                    </View>
                }
            />
        </View>
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
    statsContainer: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 16,
        padding: 16,
    },
    statCardSmall: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#A8B5AC',
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F8F9FA',
    },
    statValuePending: {
        fontSize: 24,
        color: '#F4A542',
    },
    statValuePaid: {
        fontSize: 24,
        color: '#2D7A4D',
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
        paddingHorizontal: 12,
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
        fontSize: 14,
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
    commissionCard: {
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    dealNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F8F9FA',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusPending: {
        backgroundColor: '#F4A54230',
    },
    statusPaid: {
        backgroundColor: '#2D7A4D30',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusTextPending: {
        color: '#F4A542',
    },
    statusTextPaid: {
        color: '#2D7A4D',
    },
    productName: {
        fontSize: 14,
        color: '#A8B5AC',
        marginBottom: 12,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: '#6B7280',
    },
    value: {
        fontSize: 14,
        color: '#F8F9FA',
        fontWeight: '600',
    },
    labelHighlight: {
        fontSize: 16,
        color: '#2D7A4D',
        fontWeight: 'bold',
    },
    valueHighlight: {
        fontSize: 18,
        color: '#2D7A4D',
        fontWeight: 'bold',
    },
    cardFooter: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#2D3A31',
    },
    dateText: {
        fontSize: 12,
        color: '#6B7280',
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