import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { supabase } from '../lib/supabase';
import NetworkBanner from '../components/NetworkBanner';
import Colors from '../constants/Colors';

interface TeamAgent {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    status: string;
    totalDeals: number;
    completedDeals: number;
    totalValue: number;
    yourOverride: number;
}

interface TeamStats {
    totalAgents: number;
    activeAgents: number;
    totalDeals: number;
    totalValue: number;
    totalOverride: number;
}

export default function TeamDashboardScreen({ navigation }: any) {
    const { profile } = useAuth();
    const { isOnline } = useNetwork();
    const [agents, setAgents] = useState<TeamAgent[]>([]);
    const [stats, setStats] = useState<TeamStats>({
        totalAgents: 0,
        activeAgents: 0,
        totalDeals: 0,
        totalValue: 0,
        totalOverride: 0,
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (profile?.role === 'supervisor') {
            loadTeamData();
        }
    }, [isOnline, profile]);

    const loadTeamData = async () => {
        if (!isOnline) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const { data: agentsData, error: agentsError } = await supabase
                .from('profiles')
                .select('*')
                .eq('supervisor_id', profile?.id)
                .eq('role', 'agent');

            if (agentsError) throw agentsError;

            if (!agentsData || agentsData.length === 0) {
                setAgents([]);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const agentIds = agentsData.map(a => a.id);
            const { data: dealsData, error: dealsError } = await supabase
                .from('deals')
                .select('*')
                .in('agent_id', agentIds);

            if (dealsError) throw dealsError;

            const teamAgents: TeamAgent[] = agentsData.map(agent => {
                const agentDeals = dealsData?.filter(d => d.agent_id === agent.id) || [];
                const completedDeals = agentDeals.filter(d => d.status === 'completed');

                const totalValue = agentDeals.reduce((sum, d) => sum + parseFloat(d.deal_value?.toString() || '0'), 0);
                const yourOverride = agentDeals.reduce((sum, d) => sum + parseFloat(d.supervisor_commission?.toString() || '0'), 0);

                return {
                    id: agent.id,
                    full_name: agent.full_name,
                    phone: agent.phone,
                    email: agent.email,
                    status: agent.status,
                    totalDeals: agentDeals.length,
                    completedDeals: completedDeals.length,
                    totalValue,
                    yourOverride,
                };
            });

            setAgents(teamAgents);

            const totalAgents = teamAgents.length;
            const activeAgents = teamAgents.filter(a => a.status === 'active').length;
            const totalDeals = teamAgents.reduce((sum, a) => sum + a.totalDeals, 0);
            const totalValue = teamAgents.reduce((sum, a) => sum + a.totalValue, 0);
            const totalOverride = teamAgents.reduce((sum, a) => sum + a.yourOverride, 0);

            setStats({
                totalAgents,
                activeAgents,
                totalDeals,
                totalValue,
                totalOverride,
            });
        } catch (error) {
            console.error('Error loading team data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadTeamData();
    };

    const renderAgent = ({ item }: { item: TeamAgent }) => (
        <View style={styles.agentCard}>
            <View style={styles.agentHeader}>
                <View style={styles.agentInfo}>
                    <Text style={styles.agentName}>{item.full_name}</Text>
                    <Text style={styles.agentContact}>{item.phone}</Text>
                </View>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'active' ? Colors.successBg : Colors.surfaceVariant }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.status === 'active' ? Colors.success : Colors.textSecondary }
                    ]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <View style={styles.agentStats}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{item.totalDeals}</Text>
                    <Text style={styles.statLabel}>Deals</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{item.completedDeals}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>${item.totalValue.toFixed(0)}</Text>
                    <Text style={styles.statLabel}>Total Value</Text>
                </View>
            </View>

            <View style={styles.overrideSection}>
                <Text style={styles.overrideLabel}>Your Override (7%):</Text>
                <Text style={styles.overrideValue}>${item.yourOverride.toFixed(2)}</Text>
            </View>
        </View>
    );

    if (profile?.role !== 'supervisor') {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Team Dashboard</Text>
                    <Text style={styles.subtitle}>Only supervisors can access this page</Text>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!isOnline) {
        return (
            <>
                <NetworkBanner />
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Team Dashboard</Text>
                        <Text style={styles.offlineText}>Team data requires internet connection</Text>
                    </View>
                </View>
            </>
        );
    }

    return (
        <>
            <NetworkBanner />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>My Team</Text>
                    <Text style={styles.subtitle}>Manage your agents</Text>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statCardValue}>{stats.totalAgents}</Text>
                        <Text style={styles.statCardLabel}>Team Size</Text>
                    </View>

                    <View style={[styles.statCard, styles.statCardSuccess]}>
                        <Text style={[styles.statCardValue, { color: Colors.success }]}>
                            ${stats.totalOverride.toFixed(2)}
                        </Text>
                        <Text style={styles.statCardLabel}>Your Override</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={[styles.statCard, styles.statCardSmall]}>
                        <Text style={[styles.statCardValue, styles.statCardValueSmall]}>
                            {stats.totalDeals}
                        </Text>
                        <Text style={styles.statCardLabel}>Team Deals</Text>
                    </View>

                    <View style={[styles.statCard, styles.statCardSmall]}>
                        <Text style={[styles.statCardValue, styles.statCardValueSmall]}>
                            ${stats.totalValue.toFixed(0)}
                        </Text>
                        <Text style={styles.statCardLabel}>Team Value</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Team Members</Text>
                </View>

                <FlatList
                    data={agents}
                    renderItem={renderAgent}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No agents assigned yet</Text>
                            <Text style={styles.emptySubtext}>Contact admin to assign agents to your team</Text>
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
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    offlineText: {
        fontSize: 14,
        color: Colors.warning,
        marginTop: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
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
    statCardSuccess: {
        backgroundColor: Colors.successBg,
        borderColor: Colors.success,
    },
    statCardSmall: {
        flex: 1,
    },
    statCardValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    statCardValueSmall: {
        fontSize: 24,
    },
    statCardLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    listContainer: {
        padding: 16,
        paddingTop: 0,
    },
    agentCard: {
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
    agentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    agentInfo: {
        flex: 1,
    },
    agentName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    agentContact: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    agentStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    overrideSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.successBg,
        padding: 12,
        borderRadius: 8,
    },
    overrideLabel: {
        fontSize: 14,
        color: Colors.success,
        fontWeight: '600',
    },
    overrideValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.success,
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