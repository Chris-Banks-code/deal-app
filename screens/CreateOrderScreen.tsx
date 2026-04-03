import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { supabase } from '../lib/supabase';
import { Product, Client, CartItem } from '../types/database.types';
import { addToSyncQueue } from '../lib/offlineStorage';
import NetworkBanner from '../components/NetworkBanner';
import Colors from '../constants/Colors';

const AGENT_COMMISSION_SHARE = 0.55;
const SUPERVISOR_COMMISSION_SHARE = 0.07;
const MANAGER_COMMISSION_SHARE = 0.04;
const MAX_COMMISSION_RATE = 100;

export default function CreateOrderScreen({ navigation }: any) {
    const { profile } = useAuth();
    const { isOnline } = useNetwork();

    const [clients, setClients] = useState<Client[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

    const [selectedRetailer, setSelectedRetailer] = useState<Client | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [quantity, setQuantity] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [notes, setNotes] = useState('');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    useEffect(() => {
        loadData();
    }, [isOnline]);

    useEffect(() => {
        if (searchQuery) {
            searchProducts();
        } else {
            setFilteredProducts([]);
        }
    }, [searchQuery]);

    const loadData = async () => {
        try {
            if (isOnline) {
                // Load retailers
                const { data: clientsData, error: clientsError } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('assigned_agent_id', profile?.id)
                    .eq('client_type', 'retailer')
                    .eq('status', 'active')
                    .order('company_name');

                if (clientsError) throw clientsError;
                setClients(clientsData || []);

                // Load products
                const { data: productsData, error: productsError } = await supabase
                    .from('products')
                    .select('*')
                    .order('product_name');

                if (productsError) throw productsError;
                setProducts(productsData || []);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const searchProducts = async () => {
        if (!isOnline || !searchQuery) return;

        try {
            let query = supabase
                .from('products')
                .select(`
          *,
          wholesaler_location:wholesaler_locations!products_wholesaler_location_id_fkey (
            latitude,
            longitude,
            address,
            branch_name
          )
        `)
                .ilike('product_name', `%${searchQuery}%`);

            const { data, error } = await query;

            if (error) throw error;

            if (data && selectedRetailer?.latitude && selectedRetailer?.longitude) {
                // Calculate distances
                const productsWithDistance = data.map(product => {
                    if (product.wholesaler_location) {
                        const distance = calculateDistance(
                            selectedRetailer.latitude!,
                            selectedRetailer.longitude!,
                            product.wholesaler_location.latitude,
                            product.wholesaler_location.longitude
                        );
                        return { ...product, distance_from_retailer: distance };
                    }
                    return product;
                });

                // Smart sorting logic
                const cartWholesalerIds = cart.map(item => item.product.wholesaler_id);

                const sorted = productsWithDistance.sort((a, b) => {
                    // Priority 1: Same wholesaler as items in cart
                    const aInCart = cartWholesalerIds.includes(a.wholesaler_id);
                    const bInCart = cartWholesalerIds.includes(b.wholesaler_id);

                    if (aInCart && !bInCart) return -1;
                    if (!aInCart && bInCart) return 1;

                    // Priority 2: Distance + Price score
                    const aDistance = a.distance_from_retailer || 999;
                    const bDistance = b.distance_from_retailer || 999;
                    const aPrice = parseFloat(a.unit_price?.toString() || '999999');
                    const bPrice = parseFloat(b.unit_price?.toString() || '999999');

                    const aScore = (aDistance * 0.6) + (aPrice * 0.4);
                    const bScore = (bDistance * 0.6) + (bPrice * 0.4);

                    return aScore - bScore;
                });

                setFilteredProducts(sorted);
            } else {
                setFilteredProducts(data || []);
            }
        } catch (error) {
            console.error('Error searching products:', error);
        }
    };

    const getBadgeInfo = (product: Product, index: number) => {
        const cartWholesalerIds = cart.map(item => item.product.wholesaler_id);
        const sameSupplier = cartWholesalerIds.includes(product.wholesaler_id);

        if (sameSupplier) {
            return { text: '🏢 SAME SUPPLIER', color: Colors.badgeBlue };
        }

        if (index === 0 && product.distance_from_retailer) {
            return { text: '⭐ RECOMMENDED', color: Colors.success };
        }

        return null;
    };

    const openProductModal = (product: Product) => {
        setSelectedProduct(product);
        setQuantity('');
        setShowProductModal(true);
    };

    const addToCart = () => {
        if (!selectedProduct || !quantity || parseInt(quantity) <= 0) {
            Alert.alert('Error', 'Please enter a valid quantity');
            return;
        }

        const qty = parseInt(quantity);
        const unitPrice = parseFloat(selectedProduct.unit_price?.toString() || '0');
        const subtotal = qty * unitPrice;
        const rawRate = parseFloat(selectedProduct.commission_rate?.toString() || '0');
        const commissionRate = Math.min(Math.max(rawRate, 0), MAX_COMMISSION_RATE);
        const totalCommission = subtotal * (commissionRate / 100);
        const agentCommission = totalCommission * AGENT_COMMISSION_SHARE;

        const cartItem: CartItem = {
            product: selectedProduct,
            quantity: qty,
            subtotal: subtotal,
            commission: agentCommission,
            distance: selectedProduct.distance_from_retailer || undefined,
        };

        setCart([...cart, cartItem]);
        setShowProductModal(false);
        setSearchQuery('');
        setFilteredProducts([]);
        Alert.alert('Success', 'Product added to cart');
    };

    const removeFromCart = (index: number) => {
        Alert.alert(
            'Remove Product',
            'Remove this product from cart?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        const newCart = cart.filter((_, i) => i !== index);
                        setCart(newCart);
                    },
                },
            ]
        );
    };

    const totals = useMemo(() => {
        const totalValue = cart.reduce((sum, item) => sum + item.subtotal, 0);
        const totalCommission = cart.reduce((sum, item) => sum + item.commission, 0);

        const supervisorDeduction = profile?.supervisor_id
            ? totalCommission * SUPERVISOR_COMMISSION_SHARE
            : 0;
        const managerDeduction = profile?.operation_manager_id
            ? totalCommission * MANAGER_COMMISSION_SHARE
            : 0;

        return {
            totalValue,
            totalCommission,
            supervisorDeduction,
            managerDeduction,
            finalEarnings: totalCommission - supervisorDeduction - managerDeduction,
        };
    }, [cart, profile?.supervisor_id, profile?.operation_manager_id]);

    const handleSubmit = async () => {
        if (!selectedRetailer) {
            Alert.alert('Error', 'Please select a retailer');
            return;
        }

        if (cart.length === 0) {
            Alert.alert('Error', 'Please add at least one product to cart');
            return;
        }

        if (!deliveryAddress || !deliveryDate) {
            Alert.alert('Error', 'Please fill in delivery details');
            return;
        }

        setSubmitting(true);

        try {
            // Use first product for main deal record (legacy compatibility)
            const firstItem = cart[0];

            const dealData = {
                agent_id: profile?.id,
                retailer_id: selectedRetailer.id,
                retailer_name: selectedRetailer.company_name,
                product_name: cart.length > 1
                    ? `${firstItem.product.product_name} + ${cart.length - 1} more`
                    : firstItem.product.product_name,
                wholesaler_id: firstItem.product.wholesaler_id,
                wholesaler_name: firstItem.product.wholesaler_name,
                quantity: firstItem.quantity,
                deal_value: totals.totalValue,
                agent_commission: totals.finalEarnings,
                supervisor_commission: totals.supervisorDeduction,
                operation_manager_commission: totals.managerDeduction,
                supervisor_id: profile?.supervisor_id || null,
                operation_manager_id: profile?.operation_manager_id || null,
                product_commission_rate: parseFloat(firstItem.product.commission_rate?.toString() || '0'),
                delivery_address: deliveryAddress,
                delivery_date: deliveryDate,
                notes: notes || null,
                status: 'pending_admin' as const,
                total_items: cart.length,
                has_multiple_products: cart.length > 1,
            };

            if (isOnline) {
                // Create deal
                const { data: deal, error: dealError } = await supabase
                    .from('deals')
                    .insert([dealData])
                    .select()
                    .single();

                if (dealError) throw dealError;

                // Create order items
                const orderItems = cart.map(item => ({
                    deal_id: deal.id,
                    product_id: item.product.id,
                    product_name: item.product.product_name,
                    quantity: item.quantity,
                    unit_price: parseFloat(item.product.unit_price?.toString() || '0'),
                    subtotal: item.subtotal,
                    commission_rate: parseFloat(item.product.commission_rate?.toString() || '0'),
                    commission_amount: item.commission,
                    wholesaler_id: item.product.wholesaler_id,
                    wholesaler_name: item.product.wholesaler_name,
                    wholesaler_location_id: item.product.wholesaler_location_id,
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(orderItems);

                if (itemsError) throw itemsError;

                Alert.alert('Success', 'Order created successfully!', [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Reset form
                            setSelectedRetailer(null);
                            setCart([]);
                            setDeliveryAddress('');
                            setDeliveryDate('');
                            setNotes('');
                            navigation.navigate('Home');
                        },
                    },
                ]);
            } else {
                addToSyncQueue('deals', 'insert', dealData);
                Alert.alert('Saved Offline', 'Order saved locally and will sync when online');

                // Reset form
                setSelectedRetailer(null);
                setCart([]);
                setDeliveryAddress('');
                setDeliveryDate('');
                setNotes('');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

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
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Create Order</Text>
                    <Text style={styles.subtitle}>Add products and submit for approval</Text>
                </View>

                {/* Retailer Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Retailer *</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientScroll}>
                        {clients.map((client) => (
                            <TouchableOpacity
                                key={client.id}
                                style={[
                                    styles.clientCard,
                                    selectedRetailer?.id === client.id && styles.clientCardActive,
                                ]}
                                onPress={() => setSelectedRetailer(client)}
                            >
                                <Text style={[
                                    styles.clientName,
                                    selectedRetailer?.id === client.id && styles.clientNameActive,
                                ]}>
                                    {client.company_name}
                                </Text>
                                <Text style={[
                                    styles.clientContact,
                                    selectedRetailer?.id === client.id && styles.clientContactActive,
                                ]}>
                                    {client.contact_person}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Product Search */}
                {selectedRetailer && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Search Products</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search for products..."
                            placeholderTextColor={Colors.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />

                        {filteredProducts.length > 0 && (
                            <View style={styles.productsContainer}>
                                {filteredProducts.map((product, index) => {
                                    const badge = getBadgeInfo(product, index);
                                    return (
                                        <TouchableOpacity
                                            key={product.id}
                                            style={styles.productCard}
                                            onPress={() => openProductModal(product)}
                                        >
                                            <View style={styles.productHeader}>
                                                <View style={styles.productInfo}>
                                                    <Text style={styles.productName}>{product.product_name}</Text>
                                                    <Text style={styles.productCategory}>{product.category}</Text>
                                                </View>
                                                {badge && (
                                                    <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
                                                        <Text style={[styles.badgeText, { color: badge.color }]}>
                                                            {badge.text}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <View style={styles.productDetails}>
                                                <View style={styles.productRow}>
                                                    <Text style={styles.productLabel}>Price:</Text>
                                                    <Text style={styles.productValue}>
                                                        ${parseFloat(product.unit_price?.toString() || '0').toFixed(2)}
                                                    </Text>
                                                </View>
                                                <View style={styles.productRow}>
                                                    <Text style={styles.productLabel}>Commission:</Text>
                                                    <Text style={styles.productValue}>
                                                        {parseFloat(product.commission_rate?.toString() || '0')}%
                                                    </Text>
                                                </View>
                                                {product.distance_from_retailer && (
                                                    <View style={styles.productRow}>
                                                        <Text style={styles.productLabel}>Distance:</Text>
                                                        <Text style={styles.productValue}>
                                                            {product.distance_from_retailer.toFixed(1)} km
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>

                                            <Text style={styles.wholesalerName}>{product.wholesaler_name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                )}

                {/* Cart */}
                {cart.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Cart ({cart.length} items)</Text>

                        {cart.map((item, index) => (
                            <View key={index} style={styles.cartItem}>
                                <View style={styles.cartItemHeader}>
                                    <Text style={styles.cartProductName}>{item.product.product_name}</Text>
                                    <TouchableOpacity onPress={() => removeFromCart(index)}>
                                        <Text style={styles.removeButton}>Remove</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.cartItemDetails}>
                                    <Text style={styles.cartItemText}>
                                        {item.quantity} × ${parseFloat(item.product.unit_price?.toString() || '0').toFixed(2)} = ${item.subtotal.toFixed(2)}
                                    </Text>
                                    <Text style={styles.cartItemCommission}>
                                        Commission: ${item.commission.toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        ))}

                        {/* Cart Summary */}
                        <View style={styles.cartSummary}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Value:</Text>
                                <Text style={styles.summaryValue}>${totals.totalValue.toFixed(2)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Your Base (55%):</Text>
                                <Text style={styles.summaryValue}>${totals.totalCommission.toFixed(2)}</Text>
                            </View>
                            {totals.supervisorDeduction > 0 && (
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabelDeduction}>Supervisor (7%):</Text>
                                    <Text style={styles.summaryValueDeduction}>-${totals.supervisorDeduction.toFixed(2)}</Text>
                                </View>
                            )}
                            {totals.managerDeduction > 0 && (
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabelDeduction}>Manager (4%):</Text>
                                    <Text style={styles.summaryValueDeduction}>-${totals.managerDeduction.toFixed(2)}</Text>
                                </View>
                            )}
                            <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                                <Text style={styles.summaryLabelTotal}>YOU WILL EARN:</Text>
                                <Text style={styles.summaryValueTotal}>${totals.finalEarnings.toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Delivery Details */}
                {cart.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Delivery Details</Text>

                        <Text style={styles.label}>Delivery Address *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Red Light, Paynesville"
                            placeholderTextColor={Colors.textTertiary}
                            value={deliveryAddress}
                            onChangeText={setDeliveryAddress}
                            multiline
                        />

                        <Text style={styles.label}>Delivery Date *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., 2026-04-01"
                            placeholderTextColor={Colors.textTertiary}
                            value={deliveryDate}
                            onChangeText={setDeliveryDate}
                        />

                        <Text style={styles.label}>Notes (Optional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Any special instructions..."
                            placeholderTextColor={Colors.textTertiary}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                )}

                {/* Submit Button */}
                {cart.length > 0 && (
                    <View style={styles.submitSection}>
                        <TouchableOpacity
                            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color={Colors.textInverse} />
                            ) : (
                                <Text style={styles.submitButtonText}>Submit Order</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Product Modal */}
                <Modal
                    visible={showProductModal}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setShowProductModal(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Add to Cart</Text>

                            {selectedProduct && (
                                <>
                                    <Text style={styles.modalProductName}>{selectedProduct.product_name}</Text>
                                    <Text style={styles.modalProductPrice}>
                                        ${parseFloat(selectedProduct.unit_price?.toString() || '0').toFixed(2)} per unit
                                    </Text>

                                    <Text style={styles.modalLabel}>Quantity *</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Enter quantity"
                                        placeholderTextColor={Colors.textTertiary}
                                        value={quantity}
                                        onChangeText={setQuantity}
                                        keyboardType="numeric"
                                    />

                                    <View style={styles.modalButtons}>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.modalButtonCancel]}
                                            onPress={() => setShowProductModal(false)}
                                        >
                                            <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.modalButton, styles.modalButtonAdd]}
                                            onPress={addToCart}
                                        >
                                            <Text style={styles.modalButtonTextAdd}>Add to Cart</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>
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
    section: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 12,
    },
    clientScroll: {
        marginTop: 8,
    },
    clientCard: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 16,
        marginRight: 12,
        minWidth: 160,
    },
    clientCardActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    clientNameActive: {
        color: Colors.textInverse,
    },
    clientContact: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    clientContactActive: {
        color: Colors.textInverse,
        opacity: 0.9,
    },
    searchInput: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: Colors.textPrimary,
    },
    productsContainer: {
        marginTop: 12,
    },
    productCard: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    productHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    productCategory: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    productDetails: {
        marginBottom: 12,
    },
    productRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    productLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    productValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    wholesalerName: {
        fontSize: 13,
        color: Colors.textTertiary,
        fontStyle: 'italic',
    },
    cartItem: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    cartItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cartProductName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        flex: 1,
    },
    removeButton: {
        fontSize: 14,
        color: Colors.error,
        fontWeight: '600',
    },
    cartItemDetails: {
        gap: 4,
    },
    cartItemText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    cartItemCommission: {
        fontSize: 14,
        color: Colors.success,
        fontWeight: '600',
    },
    cartSummary: {
        backgroundColor: Colors.infoBg,
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    summaryLabelDeduction: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    summaryValueDeduction: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.error,
    },
    summaryRowTotal: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 2,
        borderTopColor: Colors.primary,
    },
    summaryLabelTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.textPrimary,
    },
    summaryValueTotal: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.success,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: Colors.textPrimary,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    submitSection: {
        padding: 16,
        paddingBottom: 40,
    },
    submitButton: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: Colors.textInverse,
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: Colors.background,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 16,
    },
    modalProductName: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    modalProductPrice: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: Colors.textPrimary,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonCancel: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    modalButtonTextCancel: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    modalButtonAdd: {
        backgroundColor: Colors.primary,
    },
    modalButtonTextAdd: {
        color: Colors.textInverse,
        fontSize: 16,
        fontWeight: 'bold',
    },
});