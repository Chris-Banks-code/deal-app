import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { supabase } from '../lib/supabase';
import { getCachedDeals } from '../lib/offlineStorage';
import { Deal } from '../types/database.types';
import NetworkBanner from '../components/NetworkBanner';
import Colors from '../constants/Colors';

interface CommissionWithDeal {
    id: string;
    amount: number;
    status: 'pending' | 'paid';
    paid_at: string | null;
    created_at: string;
    commission_type: 'agent' | 'supervisor_override';
    deal: {
        deal_number: string;
        product_name: string;
        deal_value: number;
        status: string;
        has_multiple_products?: boolean;
        total_items?: number;
    };
}

export default function EarningsScreen() {
    const { profile } = useAuth();
    const { isOnline } = useNetwork();
    const [commissions, setCommissions] = useState<CommissionWithDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
    const [stats, setStats] = useState({
        totalEarned: 0,
        agentEarnings: 0,
        supervisorOverride: 0,
        pendingCommission: 0,
        paidOutThisMonth: 0,
    });

    const isSupervisor = profile?.role === 'supervisor';
    const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        if (profile?.id) {
            loadCommissions();
            if (isOnline) setupRealtime();
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
            .channel(`earnings-${profile.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'deals',
                    filter: `agent_id=eq.${profile.id}`,
                },
                () => { loadCommissions(); }
            )
            .subscribe();
    };

    const loadCommissions = async () => {
        if (!profile?.id) return;
        try {
            if (isOnline) {
                // Filtered query — drives the displayed list
                let dealsQuery = supabase
                    .from('deals')
                    .select('*')
                    .eq('agent_id', profile?.id)
                    .order('created_at', { ascending: false });

                if (filter === 'pending') {
                    dealsQuery = dealsQuery.neq('status', 'completed');
                } else if (filter === 'paid') {
                    dealsQuery = dealsQuery.eq('status', 'completed');
                }

                // Unfiltered query — always all deals, used only for stats
                const allDealsQuery = supabase
                    .from('deals')
                    .select('agent_commission, status, created_at')
                    .eq('agent_id', profile?.id);

                const [{ data, error }, { data: allDealsData }] = await Promise.all([
                    dealsQuery,
                    allDealsQuery,
                ]);

                if (error) throw error;

                // Compute stats from ALL deals regardless of active filter
                const allDeals = (allDealsData as Pick<Deal, 'agent_commission' | 'status' | 'created_at'>[]) || [];

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                // Total Earned = all completed deals (all time)
                const totalEarned = allDeals
                    .filter(d => d.status === 'completed')
                    .reduce((sum, d) => sum + parseFloat(d.agent_commission?.toString() || '0'), 0);

                // Pending = active deals not yet completed or rejected
                const pendingCommission = allDeals
                    .filter(d => d.status !== 'completed' && d.status !== 'rejected')
                    .reduce((sum, d) => sum + parseFloat(d.agent_commission?.toString() || '0'), 0);

                // Paid Out = completed deals this calendar month only
                const paidOutThisMonth = allDeals
                    .filter(d => {
                        if (d.status !== 'completed') return false;
                        const dealDate = new Date(d.created_at);
                        return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear;
                    })
                    .reduce((sum, d) => sum + parseFloat(d.agent_commission?.toString() || '0'), 0);

                setStats({
                    totalEarned,
                    agentEarnings: totalEarned,
                    supervisorOverride: 0,
                    pendingCommission,
                    paidOutThisMonth,
                });

                let allCommissions: CommissionWithDeal[] = [];

                if (data) {
                    allCommissions = (data as Deal[]).map(deal => ({
                        id: deal.id,
                        amount: parseFloat(deal.agent_commission?.toString() || '0'),
                        status: deal.status === 'completed' ? 'paid' as const : 'pending' as const,
                        paid_at: deal.status === 'completed' ? (deal.delivered_at ?? null) : null,
                        created_at: deal.created_at,
                        commission_type: 'agent' as const,
                        deal: {
                            deal_number: deal.deal_number,
                            product_name: deal.product_name,
                            deal_value: parseFloat(deal.deal_value?.toString() || '0'),
                            status: deal.status,
                            has_multiple_products: deal.has_multiple_products,
                            total_items: deal.total_items,
                        },
                    }));
                }

                if (isSupervisor) {
                    const { data: supervisorDeals, error: supervisorError } = await supabase
                        .from('deals')
                        .select('*')
                        .eq('supervisor_id', profile?.id)
                        .gt('supervisor_commission', 0);

                    if (supervisorError) {
                        Alert.alert('Notice', 'Could not load supervisor override commissions. Showing agent commissions only.');
                    }

                    if (!supervisorError && supervisorDeals) {
                        const overrideCommissions = supervisorDeals
                            .filter(deal => {
                                if (filter === 'pending') return deal.status !== 'completed';
                                if (filter === 'paid') return deal.status === 'completed';
                                return true;
                            })
                            .map(deal => ({
                                id: `override_${deal.id}`,
                                amount: parseFloat(deal.supervisor_commission?.toString() || '0'),
                                status: deal.status === 'completed' ? 'paid' as const : 'pending' as const,
                                paid_at: deal.status === 'completed' ? deal.delivered_at : null,
                                created_at: deal.created_at,
                                commission_type: 'supervisor_override' as const,
                                deal: {
                                    deal_number: deal.deal_number,
                                    product_name: deal.product_name,
                                    deal_value: parseFloat(deal.deal_value?.toString() || '0'),
                                    status: deal.status,
                                    has_multiple_products: deal.has_multiple_products,
                                    total_items: deal.total_items,
                                },
                            }));

                        allCommissions = [...allCommissions, ...overrideCommissions];
                    }
                }

                allCommissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setCommissions(allCommissions);
            } else {
                const cachedDeals = getCachedDeals();

                const offlineCommissions = (cachedDeals as Deal[])
                    .filter((deal) => deal.agent_id === profile?.id)
                    .map((deal) => ({
                        id: `comm_${deal.id}`,
                        amount: parseFloat(deal.agent_commission?.toString() || '0'),
                        status: deal.status === 'completed' ? 'paid' : 'pending',
                        paid_at: deal.status === 'completed' ? (deal as unknown as { delivered_at: string | null }).delivered_at : null,
                        created_at: deal.created_at,
                        commission_type: 'agent' as const,
                        deal: {
                            deal_number: deal.deal_number,
                            product_name: deal.product_name,
                            deal_value: parseFloat(deal.deal_value?.toString() || '0'),
                            status: deal.status,
                            has_multiple_products: deal.has_multiple_products,
                            total_items: deal.total_items,
                        },
                    }));

                let filtered = offlineCommissions;
                if (filter === 'pending') {
                    filtered = offlineCommissions.filter((c) => c.status === 'pending');
                } else if (filter === 'paid') {
                    filtered = offlineCommissions.filter((c) => c.status === 'paid');
                }

                setCommissions(filtered);

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const total = offlineCommissions
                    .filter((c) => c.status === 'paid')
                    .reduce((sum, c) => sum + c.amount, 0);
                const pending = offlineCommissions
                    .filter((c) => c.status === 'pending')
                    .reduce((sum, c) => sum + c.amount, 0);
                const paidOutThisMonth = offlineCommissions
                    .filter((c) => {
                        if (c.status !== 'paid') return false;
                        const d = new Date(c.created_at);
                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                    })
                    .reduce((sum, c) => sum + c.amount, 0);

                setStats({
                    totalEarned: total,
                    agentEarnings: total,
                    supervisorOverride: 0,
                    pendingCommission: pending,
                    paidOutThisMonth,
                });
            }
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
                <View style={styles.headerLeft}>
                    <Text style={styles.dealNumber}>{item.deal.deal_number}</Text>
                    {item.commission_type === 'supervisor_override' && (
                        <View style={styles.overrideBadge}>
                            <Text style={styles.overrideText}>Override</Text>
                        </View>
                    )}
                </View>
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
            {item.deal.has_multiple_products && (
                <Text style={styles.multiProductBadge}>📦 {item.deal.total_items} products</Text>
            )}

            <View style={styles.cardRow}>
                <Text style={styles.label}>Deal Value:</Text>
                <Text style={styles.value}>${parseFloat(item.deal.deal_value.toString()).toFixed(2)}</Text>
            </View>

            <View style={styles.cardRow}>
                <Text style={styles.labelHighlight}>
                    {item.commission_type === 'supervisor_override' ? 'Your Override:' : 'Your Commission:'}
                </Text>
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
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <>
            <NetworkBanner />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>My Earnings</Text>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Earned</Text>
                        <Text style={styles.statValue}>${stats.totalEarned.toFixed(2)}</Text>
                    </View>
                </View>

                {isSupervisor && (
                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, styles.statCardSmall]}>
                            <Text style={styles.statLabel}>Agent Sales</Text>
                            <Text style={[styles.statValue, styles.statValueSmall]}>
                                ${stats.agentEarnings.toFixed(2)}
                            </Text>
                        </View>

                        <View style={[styles.statCard, styles.statCardSmall]}>
                            <Text style={styles.statLabel}>Team Override</Text>
                            <Text style={[styles.statValue, styles.statValueSmall, { color: Colors.warning }]}>
                                ${stats.supervisorOverride.toFixed(2)}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.statsRow}>
                    <View style={[styles.statCard, styles.statCardSmall, styles.statCardWarning]}>
                        <Text style={styles.statLabel}>Pending</Text>
                        <Text style={[styles.statValue, styles.statValueSmall, { color: Colors.warning }]}>
                            ${stats.pendingCommission.toFixed(2)}
                        </Text>
                    </View>

                    <View style={[styles.statCard, styles.statCardSmall, styles.statCardSuccess]}>
                        <Text style={styles.statLabel}>
                            Paid Out ({new Date().toLocaleString('default', { month: 'short' })})
                        </Text>
                        <Text style={[styles.statValue, styles.statValueSmall, { color: Colors.success }]}>
                            ${stats.paidOutThisMonth.toFixed(2)}
                        </Text>
                    </View>
                </View>

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

                <FlatList
                    data={commissions}
                    renderItem={renderCommission}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No commissions yet</Text>
                            <Text style={styles.emptySubtext}>Create your first order to start earning</Text>
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
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    statsContainer: {
        paddingHorizontal: 16,
        paddingTop: 16,
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
        padding: 16,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statCardSmall: {
        flex: 1,
    },
    statCardWarning: {
        backgroundColor: Colors.warningBg,
        borderColor: Colors.warning,
    },
    statCardSuccess: {
        backgroundColor: Colors.successBg,
        borderColor: Colors.success,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    statValueSmall: {
        fontSize: 20,
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
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    filterButtonActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    filterText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    filterTextActive: {
        color: Colors.textInverse,
    },
    listContainer: {
        padding: 16,
        paddingTop: 0,
    },
    commissionCard: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dealNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    overrideBadge: {
        backgroundColor: Colors.warningBg,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    overrideText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.warning,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusPending: {
        backgroundColor: Colors.warningBg,
    },
    statusPaid: {
        backgroundColor: Colors.successBg,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusTextPending: {
        color: Colors.warning,
    },
    statusTextPaid: {
        color: Colors.success,
    },
    productName: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    multiProductBadge: {
        fontSize: 12,
        color: Colors.primary,
        fontWeight: '600',
        marginBottom: 8,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    value: {
        fontSize: 14,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
    labelHighlight: {
        fontSize: 16,
        color: Colors.success,
        fontWeight: 'bold',
    },
    valueHighlight: {
        fontSize: 18,
        color: Colors.success,
        fontWeight: 'bold',
    },
    cardFooter: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    dateText: {
        fontSize: 12,
        color: Colors.textTertiary,
    },
    emptyState: {
        padding: 48,
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyText: {
        fontSize: 18,
        color: Colors.textPrimary,
        marginBottom: 8,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
});