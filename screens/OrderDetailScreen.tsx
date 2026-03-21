import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface OrderDetail {
    id: string;
    deal_number: string;
    product_name: string;
    quantity: string;
    unit_price: number;
    deal_value: number;
    commission_amount: number;
    agent_commission: number;
    delivery_address: string | null;
    delivery_date: string | null;
    status: string;
    agent_notes: string | null;
    admin_notes: string | null;
    created_at: string;
    delivered_at: string | null;
    wholesaler: { company_name: string; contact_person: string; phone: string };
    retailer: { company_name: string; contact_person: string; phone: string };
}

export default function OrderDetailScreen({ route, navigation }: any) {
    const { orderId } = route.params;
    const { profile } = useAuth();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadOrderDetail();
    }, []);

    const loadOrderDetail = async () => {
        try {
            const { data, error } = await supabase
                .from('deals')
                .select(`
          *,
          wholesaler:clients!deals_wholesaler_id_fkey(company_name, contact_person, phone),
          retailer:clients!deals_retailer_id_fkey(company_name, contact_person, phone)
        `)
                .eq('id', orderId)
                .single();

            if (error) throw error;
            setOrder(data);
        } catch (error) {
            console.error('Error loading order:', error);
            Alert.alert('Error', 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsDelivered = async () => {
        Alert.alert(
            'Mark as Delivered',
            'Are you sure the delivery is complete?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Delivered',
                    onPress: async () => {
                        setUpdating(true);
                        try {
                            const { error } = await supabase
                                .from('deals')
                                .update({
                                    status: 'delivered',
                                    delivered_at: new Date().toISOString(),
                                })
                                .eq('id', orderId);

                            if (error) throw error;

                            Alert.alert('Success', 'Order marked as delivered!');
                            loadOrderDetail();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to update order');
                        } finally {
                            setUpdating(false);
                        }
                    },
                },
            ]
        );
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

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Not set';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#D4472D" />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.errorText}>Order not found</Text>
            </View>
        );
    }

    const canMarkAsDelivered = order.status === 'confirmed';

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.orderNumber}>{order.deal_number}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(order.status) + '30' }
                ]}>
                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                        {formatStatus(order.status)}
                    </Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Product Details</Text>
                    <View style={styles.card}>
                        <Text style={styles.productName}>{order.product_name}</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Quantity:</Text>
                            <Text style={styles.value}>{order.quantity}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Unit Price:</Text>
                            <Text style={styles.value}>${parseFloat(order.unit_price.toString()).toFixed(2)}</Text>
                        </View>
                        <View style={styles.separator} />
                        <View style={styles.row}>
                            <Text style={styles.labelBold}>Deal Value:</Text>
                            <Text style={styles.valueBold}>${parseFloat(order.deal_value.toString()).toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Commission</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Total Commission (10%):</Text>
                            <Text style={styles.value}>${parseFloat(order.commission_amount.toString()).toFixed(2)}</Text>
                        </View>
                        <View style={styles.separator} />
                        <View style={styles.row}>
                            <Text style={styles.labelHighlight}>Your Share (70%):</Text>
                            <Text style={styles.valueHighlight}>${parseFloat(order.agent_commission.toString()).toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Wholesaler</Text>
                    <View style={styles.card}>
                        <Text style={styles.companyName}>{order.wholesaler.company_name}</Text>
                        <Text style={styles.contactText}>{order.wholesaler.contact_person}</Text>
                        <Text style={styles.phoneText}>{order.wholesaler.phone}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Retailer</Text>
                    <View style={styles.card}>
                        <Text style={styles.companyName}>{order.retailer.company_name}</Text>
                        <Text style={styles.contactText}>{order.retailer.contact_person}</Text>
                        <Text style={styles.phoneText}>{order.retailer.phone}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Delivery Information</Text>
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Address:</Text>
                            <Text style={styles.value}>{order.delivery_address || 'Not specified'}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Expected Date:</Text>
                            <Text style={styles.value}>{formatDate(order.delivery_date)}</Text>
                        </View>
                        {order.delivered_at && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Delivered:</Text>
                                <Text style={[styles.value, { color: '#2D7A4D' }]}>{formatDate(order.delivered_at)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {order.agent_notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Your Notes</Text>
                        <View style={styles.card}>
                            <Text style={styles.notesText}>{order.agent_notes}</Text>
                        </View>
                    </View>
                )}

                {order.admin_notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Admin Notes</Text>
                        <View style={styles.card}>
                            <Text style={styles.notesText}>{order.admin_notes}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Timeline</Text>
                    <View style={styles.card}>
                        <View style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineContent}>
                                <Text style={styles.timelineText}>Order Created</Text>
                                <Text style={styles.timelineDate}>{formatDate(order.created_at)}</Text>
                            </View>
                        </View>
                        {order.status !== 'pending_admin' && (
                            <View style={styles.timelineItem}>
                                <View style={styles.timelineDot} />
                                <View style={styles.timelineContent}>
                                    <Text style={styles.timelineText}>Admin Approved</Text>
                                    <Text style={styles.timelineDate}>Status: {formatStatus(order.status)}</Text>
                                </View>
                            </View>
                        )}
                        {order.delivered_at && (
                            <View style={styles.timelineItem}>
                                <View style={[styles.timelineDot, { backgroundColor: '#2D7A4D' }]} />
                                <View style={styles.timelineContent}>
                                    <Text style={styles.timelineText}>Delivered</Text>
                                    <Text style={styles.timelineDate}>{formatDate(order.delivered_at)}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {canMarkAsDelivered && (
                    <TouchableOpacity
                        style={[styles.deliveredButton, updating && styles.deliveredButtonDisabled]}
                        onPress={handleMarkAsDelivered}
                        disabled={updating}
                    >
                        {updating ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.deliveredButtonText}>✓ Mark as Delivered</Text>
                        )}
                    </TouchableOpacity>
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
    errorText: {
        color: '#D4472D',
        fontSize: 16,
    },
    header: {
        padding: 16,
        paddingTop: 60,
    },
    backButton: {
        marginBottom: 16,
    },
    backButtonText: {
        color: '#D4472D',
        fontSize: 16,
        fontWeight: '600',
    },
    orderNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F8F9FA',
        marginBottom: 12,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#A8B5AC',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    card: {
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 12,
        padding: 16,
    },
    productName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F8F9FA',
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: '#A8B5AC',
    },
    value: {
        fontSize: 14,
        color: '#F8F9FA',
        fontWeight: '600',
    },
    labelBold: {
        fontSize: 16,
        color: '#F8F9FA',
        fontWeight: 'bold',
    },
    valueBold: {
        fontSize: 18,
        color: '#F8F9FA',
        fontWeight: 'bold',
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
    separator: {
        height: 1,
        backgroundColor: '#2D3A31',
        marginVertical: 12,
    },
    companyName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F8F9FA',
        marginBottom: 8,
    },
    contactText: {
        fontSize: 14,
        color: '#A8B5AC',
        marginBottom: 4,
    },
    phoneText: {
        fontSize: 14,
        color: '#6B7280',
    },
    notesText: {
        fontSize: 14,
        color: '#F8F9FA',
        lineHeight: 20,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#D4472D',
        marginTop: 4,
        marginRight: 12,
    },
    timelineContent: {
        flex: 1,
    },
    timelineText: {
        fontSize: 14,
        color: '#F8F9FA',
        fontWeight: '600',
        marginBottom: 4,
    },
    timelineDate: {
        fontSize: 12,
        color: '#6B7280',
    },
    deliveredButton: {
        backgroundColor: '#2D7A4D',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 40,
    },
    deliveredButtonDisabled: {
        opacity: 0.6,
    },
    deliveredButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});