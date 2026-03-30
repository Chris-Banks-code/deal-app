import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { supabase } from '../lib/supabase';
import { Deal } from '../types/database.types';
import NetworkBanner from '../components/NetworkBanner';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface OrderItem {
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    commission_amount: number;
    commission_rate: number;
    wholesaler_name: string;
}

export default function OrderDetailScreen({ route, navigation }: any) {
    const { dealId } = route.params || {};
    const { profile } = useAuth();
    const { isOnline } = useNetwork();
    const [deal, setDeal] = useState<Deal | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (dealId) {
            loadOrderDetails();
        } else {
            console.error('No dealId provided to OrderDetailScreen');
            setLoading(false);
        }
    }, [dealId, isOnline]);

    const loadOrderDetails = async () => {
        try {
            if (!dealId) {
                console.error('No dealId provided');
                setLoading(false);
                return;
            }

            if (!isOnline) {
                setLoading(false);
                return;
            }

            const { data: dealData, error: dealError } = await supabase
                .from('deals')
                .select('*')
                .eq('id', dealId)
                .single();

            if (dealError) {
                console.error('Error loading order details:', dealError);
                throw dealError;
            }

            setDeal(dealData);

            // Load order items if multi-product
            if (dealData?.has_multiple_products) {
                const { data: itemsData, error: itemsError } = await supabase
                    .from('order_items')
                    .select('*')
                    .eq('deal_id', dealId);

                if (itemsError) {
                    console.error('Error loading order items:', itemsError);
                } else {
                    setOrderItems(itemsData || []);
                }
            }
        } catch (error) {
            console.error('Error loading order details:', error);
        } finally {
            setLoading(false);
        }
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
                return 'Pending Admin Approval';
            case 'completed':
                return 'Completed';
            case 'rejected':
                return 'Rejected';
            default:
                return status;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!deal) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
                <Text style={styles.errorText}>Order not found</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            <NetworkBanner />
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backIcon}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Order Details</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Order ID and Status */}
                <View style={styles.topCard}>
                    <View style={styles.orderIdRow}>
                        <Text style={styles.orderIdLabel}>Order ID</Text>
                        <Text style={styles.orderIdValue}>{deal.deal_number}</Text>
                    </View>
                    <View
                        style={[
                            styles.statusBadgeLarge,
                            { backgroundColor: getStatusBgColor(deal.status) },
                        ]}
                    >
                        <Ionicons
                            name={
                                deal.status === 'completed'
                                    ? 'checkmark-circle'
                                    : deal.status === 'rejected'
                                        ? 'close-circle'
                                        : 'time'
                            }
                            size={20}
                            color={getStatusColor(deal.status)}
                        />
                        <Text style={[styles.statusTextLarge, { color: getStatusColor(deal.status) }]}>
                            {getStatusLabel(deal.status)}
                        </Text>
                    </View>
                </View>

                {/* Client Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Client Information</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Ionicons name="business" size={20} color={Colors.primary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Retailer</Text>
                                <Text style={styles.infoValue}>{deal.retailer_name || 'N/A'}</Text>
                            </View>
                        </View>

                        {deal.wholesaler_name && (
                            <View style={[styles.infoRow, styles.infoRowBorder]}>
                                <Ionicons name="cube" size={20} color={Colors.primary} />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Wholesaler</Text>
                                    <Text style={styles.infoValue}>{deal.wholesaler_name}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Products */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {deal.has_multiple_products ? 'Products' : 'Product Details'}
                    </Text>
                    <View style={styles.card}>
                        {deal.has_multiple_products && orderItems.length > 0 ? (
                            orderItems.map((item, index) => (
                                <View
                                    key={item.id}
                                    style={[
                                        styles.productItem,
                                        index > 0 && styles.productItemBorder,
                                    ]}
                                >
                                    <View style={styles.productHeader}>
                                        <Text style={styles.productName}>{item.product_name}</Text>
                                        <Text style={styles.productSupplier}>
                                            {item.wholesaler_name}
                                        </Text>
                                    </View>
                                    <View style={styles.productDetails}>
                                        <View style={styles.productDetailRow}>
                                            <Text style={styles.productDetailLabel}>Quantity:</Text>
                                            <Text style={styles.productDetailValue}>
                                                {item.quantity}
                                            </Text>
                                        </View>
                                        <View style={styles.productDetailRow}>
                                            <Text style={styles.productDetailLabel}>Unit Price:</Text>
                                            <Text style={styles.productDetailValue}>
                                                ${item.unit_price.toFixed(2)}
                                            </Text>
                                        </View>
                                        <View style={styles.productDetailRow}>
                                            <Text style={styles.productDetailLabel}>Subtotal:</Text>
                                            <Text style={styles.productDetailValue}>
                                                ${item.subtotal.toFixed(2)}
                                            </Text>
                                        </View>
                                        <View style={styles.productDetailRow}>
                                            <Text style={styles.productDetailLabel}>
                                                Commission ({item.commission_rate}%):
                                            </Text>
                                            <Text style={[styles.productDetailValue, styles.commissionText]}>
                                                ${item.commission_amount.toFixed(2)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.productItem}>
                                <Text style={styles.productName}>{deal.product_name || 'N/A'}</Text>
                                <View style={styles.productDetails}>
                                    {deal.quantity && (
                                        <View style={styles.productDetailRow}>
                                            <Text style={styles.productDetailLabel}>Quantity:</Text>
                                            <Text style={styles.productDetailValue}>{deal.quantity}</Text>
                                        </View>
                                    )}
                                    {deal.unit_price && (
                                        <View style={styles.productDetailRow}>
                                            <Text style={styles.productDetailLabel}>Unit Price:</Text>
                                            <Text style={styles.productDetailValue}>
                                                ${parseFloat(deal.unit_price.toString()).toFixed(2)}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Delivery Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Delivery Information</Text>
                    <View style={styles.card}>
                        <View style={styles.infoRow}>
                            <Ionicons name="location" size={20} color={Colors.primary} />
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Delivery Address</Text>
                                <Text style={styles.infoValue}>{deal.delivery_address || 'N/A'}</Text>
                            </View>
                        </View>

                        {deal.delivery_date && (
                            <View style={[styles.infoRow, styles.infoRowBorder]}>
                                <Ionicons name="calendar" size={20} color={Colors.primary} />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Delivery Date</Text>
                                    <Text style={styles.infoValue}>
                                        {new Date(deal.delivery_date).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {deal.notes && (
                            <View style={[styles.infoRow, styles.infoRowBorder]}>
                                <Ionicons name="document-text" size={20} color={Colors.primary} />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Notes</Text>
                                    <Text style={styles.infoValue}>{deal.notes}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Financial Summary */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Financial Summary</Text>
                    <View style={styles.card}>
                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Order Value</Text>
                            <Text style={styles.summaryValue}>
                                ${parseFloat(deal.deal_value?.toString() || '0').toFixed(2)}
                            </Text>
                        </View>

                        <View style={styles.summaryDivider} />

                        <View style={styles.summaryRow}>
                            <Text style={styles.summaryLabel}>Your Commission</Text>
                            <Text style={[styles.summaryValue, styles.commissionHighlight]}>
                                ${parseFloat(deal.agent_commission?.toString() || '0').toFixed(2)}
                            </Text>
                        </View>

                        {deal.supervisor_commission && (
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Supervisor Override</Text>
                                <Text style={styles.summaryValue}>
                                    ${parseFloat(deal.supervisor_commission.toString()).toFixed(2)}
                                </Text>
                            </View>
                        )}
                    </View>
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
    errorContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    errorText: {
        fontSize: 18,
        color: Colors.textPrimary,
        marginTop: 16,
        marginBottom: 24,
        fontWeight: '600',
    },
    backButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backButtonText: {
        color: Colors.textInverse,
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backIcon: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    topCard: {
        backgroundColor: Colors.surface,
        margin: 16,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    orderIdRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    orderIdLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    orderIdValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    statusBadgeLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
    },
    statusTextLarge: {
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 12,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    infoRowBorder: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    infoContent: {
        flex: 1,
        marginLeft: 12,
    },
    infoLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginBottom: 4,
        fontWeight: '600',
    },
    infoValue: {
        fontSize: 15,
        color: Colors.textPrimary,
    },
    productItem: {
        paddingVertical: 12,
    },
    productItemBorder: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        marginTop: 12,
    },
    productHeader: {
        marginBottom: 12,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    productSupplier: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    productDetails: {
        gap: 8,
    },
    productDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productDetailLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    productDetailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    commissionText: {
        color: Colors.success,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: Colors.border,
    },
    summaryLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    commissionHighlight: {
        fontSize: 20,
        color: Colors.success,
    },
});