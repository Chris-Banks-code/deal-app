import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { supabase } from '../lib/supabase';
import { Deal } from '../types/database.types';
import { getCachedDeals } from '../lib/offlineStorage';
import NetworkBanner from '../components/NetworkBanner';
import Colors from '../constants/Colors';

interface Stats {
    totalDeals: number;
    pendingDeals: number;
    completedDeals: number;
    totalValue: number;
    totalCommission: number;
    completionRate: number;
}

export default function DashboardScreen({ navigation }: any) {
    const { profile, signOut } = useAuth();
    const { isOnline } = useNetwork();
    const [deals, setDeals] = useState<Deal[]>([]);
    const [stats, setStats] = useState<Stats>({
        totalDeals: 0,
        pendingDeals: 0,
        completedDeals: 0,
        totalValue: 0,
        totalCommission: 0,
        completionRate: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (profile?.id) {
            loadStats();
        }
    }, [isOnline, profile?.id]);

    const loadStats = async () => {
        try {
            if (!profile?.id) {
                console.log('Profile not loaded yet, skipping stats load');
                setLoading(false);
                setRefreshing(false);
                return;
            }

            if (isOnline) {
                const { data: dealsData, error: dealsError } = await supabase
                    .from('deals')
                    .select('*')
                    .eq('agent_id', profile.id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (dealsError) {
                    console.error('Error loading deals:', dealsError);
                    throw dealsError;
                }

                setDeals(dealsData || []);

                const totalDeals = dealsData?.length || 0;
                const pendingDeals = dealsData?.filter((d) => d.status === 'pending_admin').length || 0;
                const completedDeals = dealsData?.filter((d) => d.status === 'completed').length || 0;
                const totalValue = dealsData?.reduce(
                    (sum, d) => sum + parseFloat(d.deal_value?.toString() || '0'),
                    0
                ) || 0;
                const totalCommission = dealsData?.reduce(
                    (sum, d) => sum + parseFloat(d.agent_commission?.toString() || '0'),
                    0
                ) || 0;
                const completionRate = totalDeals > 0 ? (completedDeals / totalDeals) * 100 : 0;

                setStats({
                    totalDeals,
                    pendingDeals,
                    completedDeals,
                    totalValue,
                    totalCommission,
                    completionRate,
                });
            } else {
                const cachedDeals = getCachedDeals();
                setDeals(cachedDeals.slice(0, 10));

                const totalDeals = cachedDeals.length;
                const pendingDeals = cachedDeals.filter((d) => d.status === 'pending_admin').length;
                const completedDeals = cachedDeals.filter((d) => d.status === 'completed').length;
                const totalValue = cachedDeals.reduce(
                    (sum, d) => sum + parseFloat(d.deal_value?.toString() || '0'),
                    0
                );
                const totalCommission = cachedDeals.reduce(
                    (sum, d) => sum + parseFloat(d.agent_commission?.toString() || '0'),
                    0
                );
                const completionRate = totalDeals > 0 ? (completedDeals / totalDeals) * 100 : 0;

                setStats({
                    totalDeals,
                    pendingDeals,
                    completedDeals,
                    totalValue,
                    totalCommission,
                    completionRate,
                });
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadStats();
    };

    const handleLogout = async () => {
        await signOut();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return Colors.success;
            case 'pending_admin':
                return Colors.warning;
            case 'rejected':
                return Colors.error;
            default:
                return Colors.textSecondary;
        }
    };

    const getStatusBgColor = (status: string) => {
        switch (status) {
            case 'completed':
                return Colors.successBg;
            case 'pending_admin':
                return Colors.warningBg;
            case 'rejected':
                return Colors.errorBg;
            default:
                return Colors.surfaceVariant;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending_admin':
                return 'Pending';
            case 'completed':
                return 'Completed';
            case 'rejected':
                return 'Rejected';
            default:
                return status;
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const renderDeal = ({ item }: { item: Deal }) => (
        <TouchableOpacity
            style={styles.dealCard}
            onPress={() => navigation.navigate('OrderDetail', { dealId: item.id })}
            activeOpacity={0.7}
        >
            <View style={styles.dealHeader}>
                <View style={styles.dealHeaderLeft}>
                    <View
                        style={[
                            styles.dealIcon,
                            { backgroundColor: getStatusBgColor(item.status) },
                        ]}
                    >
                        <Ionicons
                            name={
                                item.status === 'completed'
                                    ? 'checkmark-circle'
                                    : item.status === 'rejected'
                                        ? 'close-circle'
                                        : 'time'
                            }
                            size={20}
                            color={getStatusColor(item.status)}
                        />
                    </View>
                    <View>
                        <Text style={styles.dealId}>{item.deal_number}</Text>
                        <Text style={styles.dealDate}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
                <View
                    style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusBgColor(item.status) },
                    ]}
                >
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusLabel(item.status)}
                    </Text>
                </View>
            </View>

            <View style={styles.dealBody}>
                <Text style={styles.retailerName}>{item.retailer_name || 'N/A'}</Text>
                {item.has_multiple_products ? (
                    <View style={styles.productRow}>
                        <Ionicons name="layers" size={14} color={Colors.primary} />
                        <Text style={styles.productCount}>
                            {item.total_items || 0} Products
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.productName}>{item.product_name || 'N/A'}</Text>
                )}
            </View>

            <View style={styles.dealFooter}>
                <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>Total Value</Text>
                    <Text style={styles.footerValue}>
                        ${parseFloat(item.deal_value?.toString() || '0').toFixed(2)}
                    </Text>
                </View>
                <View style={styles.footerDivider} />
                <View style={[styles.footerItem, styles.footerItemRight]}>
                    <Text style={styles.footerLabel}>Your Cut</Text>
                    <Text style={styles.commissionValue}>
                        ${parseFloat(item.agent_commission?.toString() || '0').toFixed(2)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
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
            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <LinearGradient
                    colors={['#1B2838', '#2C3E50']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroSection}
                >
                    <View style={styles.heroHeader}>
                        <View>
                            <Text style={styles.greeting}>{getGreeting()},</Text>
                            <Text style={styles.userName}>{profile?.full_name}</Text>
                        </View>
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                        </TouchableOpacity>
                    </View>

                    {/* Main Stats */}
                    <View style={styles.mainStatsContainer}>
                        <View style={styles.mainStatCard}>
                            <View style={styles.mainStatHeader}>
                                <Ionicons name="wallet" size={24} color="#C6A561" />
                                <Text style={styles.mainStatLabel}>Total Earnings</Text>
                            </View>
                            <Text style={styles.mainStatValue}>
                                ${stats.totalCommission.toFixed(2)}
                            </Text>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${Math.min(stats.completionRate, 100)}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {stats.completionRate.toFixed(0)}% completion rate
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Quick Stats Grid */}
                <View style={styles.quickStatsGrid}>
                    <View style={[styles.quickStatCard, styles.quickStatPrimary]}>
                        <Ionicons name="cube" size={28} color={Colors.primary} />
                        <Text style={styles.quickStatValue}>{stats.totalDeals}</Text>
                        <Text style={styles.quickStatLabel}>Total Orders</Text>
                    </View>

                    <View style={styles.quickStatCard}>
                        <Ionicons name="hourglass" size={28} color={Colors.warning} />
                        <Text style={styles.quickStatValue}>{stats.pendingDeals}</Text>
                        <Text style={styles.quickStatLabel}>Pending</Text>
                    </View>

                    <View style={styles.quickStatCard}>
                        <Ionicons name="checkmark-done" size={28} color={Colors.success} />
                        <Text style={styles.quickStatValue}>{stats.completedDeals}</Text>
                        <Text style={styles.quickStatLabel}>Completed</Text>
                    </View>

                    <View style={styles.quickStatCard}>
                        <Ionicons name="cash" size={28} color="#C6A561" />
                        <Text style={styles.quickStatValue}>
                            ${stats.totalValue.toFixed(0)}
                        </Text>
                        <Text style={styles.quickStatLabel}>Total Value</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('NewOrder')}
                        >
                            <View style={styles.actionIcon}>
                                <Ionicons name="add-circle" size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.actionText}>New Order</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('Clients')}
                        >
                            <View style={styles.actionIcon}>
                                <Ionicons name="people" size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.actionText}>My Clients</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => navigation.navigate('Earnings')}
                        >
                            <View style={styles.actionIcon}>
                                <Ionicons name="trending-up" size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.actionText}>Earnings</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent Orders */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Orders</Text>
                    {deals.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={48} color={Colors.textTertiary} />
                            <Text style={styles.emptyText}>No orders yet</Text>
                            <Text style={styles.emptySubtext}>
                                Create your first order to get started
                            </Text>
                        </View>
                    ) : (
                        deals.map((deal) => (
                            <View key={deal.id}>{renderDeal({ item: deal })}</View>
                        ))
                    )}
                </View>

                <View style={{ height: 24 }} />
            </ScrollView>
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

    // Hero Section
    heroSection: {
        paddingTop: 60,
        paddingBottom: 32,
        paddingHorizontal: 20,
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    greeting: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 4,
    },
    userName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    logoutButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Main Stats
    mainStatsContainer: {
        marginTop: 8,
    },
    mainStatCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    mainStatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    mainStatLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginLeft: 8,
        fontWeight: '600',
    },
    mainStatValue: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#1B2838',
        marginBottom: 16,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#E2E8F0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#C6A561',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },

    // Quick Stats Grid
    quickStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 12,
        marginTop: -40,
    },
    quickStatCard: {
        width: '48%',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    quickStatPrimary: {
        backgroundColor: Colors.infoBg,
        borderColor: Colors.primary,
    },
    quickStatValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginVertical: 8,
    },
    quickStatLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontWeight: '600',
    },

    // Quick Actions
    section: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 16,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.infoBg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textPrimary,
        textAlign: 'center',
    },

    // Deal Cards
    dealCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    dealHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dealHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dealIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    dealId: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    dealDate: {
        fontSize: 11,
        color: Colors.textTertiary,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    dealBody: {
        marginBottom: 12,
    },
    retailerName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    productCount: {
        fontSize: 13,
        color: Colors.primary,
        fontWeight: '600',
    },
    productName: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    dealFooter: {
        flexDirection: 'row',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    footerItem: {
        flex: 1,
    },
    footerItemRight: {
        alignItems: 'flex-end',
    },
    footerDivider: {
        width: 1,
        backgroundColor: Colors.border,
        marginHorizontal: 16,
    },
    footerLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginBottom: 4,
        fontWeight: '600',
    },
    footerValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    commissionValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.success,
    },

    // Empty State
    emptyState: {
        padding: 48,
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyText: {
        fontSize: 18,
        color: Colors.textPrimary,
        marginTop: 16,
        marginBottom: 8,
        fontWeight: '600',
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
});