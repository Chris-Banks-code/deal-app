import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function DashboardScreen({ navigation }: any) {
    const { profile, signOut } = useAuth();
    const [stats, setStats] = useState({
        totalDeals: 0,
        totalEarned: 0,
        pendingCommission: 0,
    });
    const [recentDeals, setRecentDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            const { count: dealsCount } = await supabase
                .from('deals')
                .select('*', { count: 'exact', head: true })
                .eq('agent_id', profile?.id);

            const { data: commissions } = await supabase
                .from('commissions')
                .select('amount, status')
                .eq('agent_id', profile?.id);

            const totalEarned = commissions
                ?.filter(c => c.status === 'paid')
                .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;

            const pendingCommission = commissions
                ?.filter(c => c.status === 'pending')
                .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;

            const { data: deals } = await supabase
                .from('deals')
                .select('*')
                .eq('agent_id', profile?.id)
                .order('created_at', { ascending: false })
                .limit(5);

            setStats({
                totalDeals: dealsCount || 0,
                totalEarned,
                pendingCommission,
            });
            setRecentDeals(deals || []);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboardData();
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D4472D" />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4472D" />
            }
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>👋 Hi {profile?.full_name?.split(' ')[0] || 'Agent'}</Text>
                    <Text style={styles.subGreeting}>Welcome back</Text>
                </View>
                <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Deals</Text>
                    <Text style={styles.statValue}>{stats.totalDeals}</Text>
                    <Text style={styles.statSubtext}>This month</Text>
                </View>

                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Earned</Text>
                    <Text style={styles.statValue}>${stats.totalEarned.toFixed(0)}</Text>
                    <Text style={styles.statSubtext}>Paid out</Text>
                </View>
            </View>

            <View style={[styles.statCard, { marginHorizontal: 16, marginBottom: 16 }]}>
                <Text style={styles.statLabel}>Pending</Text>
                <Text style={[styles.statValue, { color: '#F4A542' }]}>
                    ${stats.pendingCommission.toFixed(0)}
                </Text>
                <Text style={styles.statSubtext}>Awaiting payment</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Deals</Text>
                    {recentDeals.length > 0 && (
                        <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                            <Text style={styles.viewAllText}>View All →</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {recentDeals.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No deals yet</Text>
                        <Text style={styles.emptySubtext}>Create your first order to get started</Text>
                    </View>
                ) : (
                    recentDeals.map((deal) => (
                        <TouchableOpacity
                            key={deal.id}
                            style={styles.dealCard}
                            onPress={() => navigation.navigate('OrderDetail', { orderId: deal.id })}
                        >
                            <View style={styles.dealHeader}>
                                <Text style={styles.dealNumber}>{deal.deal_number}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(deal.status) + '30' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(deal.status) }]}>
                                        {formatStatus(deal.status)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.dealProduct}>{deal.product_name}</Text>
                            <View style={styles.dealFooter}>
                                <Text style={styles.dealQuantity}>{deal.quantity}</Text>
                                <Text style={styles.dealValue}>${parseFloat(deal.deal_value).toFixed(0)}</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </ScrollView>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 60,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F8F9FA',
    },
    subGreeting: {
        fontSize: 14,
        color: '#A8B5AC',
        marginTop: 4,
    },
    logoutButton: {
        padding: 8,
    },
    logoutText: {
        color: '#D4472D',
        fontSize: 14,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 16,
        padding: 16,
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
        marginBottom: 4,
    },
    statSubtext: {
        fontSize: 12,
        color: '#6B7280',
    },
    section: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F8F9FA',
    },
    viewAllText: {
        fontSize: 14,
        color: '#D4472D',
        fontWeight: '600',
    },
    dealCard: {
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    dealHeader: {
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
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    dealProduct: {
        fontSize: 14,
        color: '#A8B5AC',
        marginBottom: 12,
    },
    dealFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dealQuantity: {
        fontSize: 14,
        color: '#6B7280',
    },
    dealValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#F8F9FA',
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#A8B5AC',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
});