import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Client } from '../types/database.types';

export default function CreateOrderScreen({ navigation }: any) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [wholesalers, setWholesalers] = useState<Client[]>([]);
    const [retailers, setRetailers] = useState<Client[]>([]);

    const [formData, setFormData] = useState({
        wholesaler_id: '',
        retailer_id: '',
        product_name: '',
        quantity: '',
        unit_price: '',
        delivery_address: '',
        delivery_date: '',
        agent_notes: '',
    });

    const [calculated, setCalculated] = useState({
        dealValue: 0,
        commissionAmount: 0,
        agentCommission: 0,
    });

    useEffect(() => {
        loadClients();
    }, []);

    useEffect(() => {
        calculateValues();
    }, [formData.quantity, formData.unit_price]);

    const loadClients = async () => {
        try {
            const { data: wholesalersData } = await supabase
                .from('clients')
                .select('*')
                .eq('assigned_agent_id', profile?.id)
                .eq('client_type', 'wholesaler')
                .order('company_name');

            const { data: retailersData } = await supabase
                .from('clients')
                .select('*')
                .eq('assigned_agent_id', profile?.id)
                .eq('client_type', 'retailer')
                .order('company_name');

            setWholesalers(wholesalersData || []);
            setRetailers(retailersData || []);
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    };

    const calculateValues = () => {
        const qty = parseFloat(formData.quantity) || 0;
        const price = parseFloat(formData.unit_price) || 0;
        const dealValue = qty * price;
        const commissionAmount = dealValue * 0.1;
        const agentCommission = commissionAmount * 0.7;

        setCalculated({
            dealValue,
            commissionAmount,
            agentCommission,
        });
    };

    const handleSubmit = async () => {
        if (!formData.wholesaler_id) {
            Alert.alert('Error', 'Please select a wholesaler');
            return;
        }
        if (!formData.retailer_id) {
            Alert.alert('Error', 'Please select a retailer');
            return;
        }
        if (!formData.product_name) {
            Alert.alert('Error', 'Please enter product name');
            return;
        }
        if (!formData.quantity) {
            Alert.alert('Error', 'Please enter quantity');
            return;
        }
        if (!formData.unit_price) {
            Alert.alert('Error', 'Please enter unit price');
            return;
        }

        setLoading(true);

        try {
            const { data: dealData, error: dealError } = await supabase
                .from('deals')
                .insert([
                    {
                        wholesaler_id: formData.wholesaler_id,
                        retailer_id: formData.retailer_id,
                        agent_id: profile?.id,
                        product_name: formData.product_name,
                        quantity: formData.quantity,
                        unit_price: parseFloat(formData.unit_price),
                        deal_value: calculated.dealValue,
                        commission_rate: 10,
                        commission_amount: calculated.commissionAmount,
                        agent_commission: calculated.agentCommission,
                        delivery_address: formData.delivery_address,
                        delivery_date: formData.delivery_date || null,
                        agent_notes: formData.agent_notes,
                        status: 'pending_admin',
                    },
                ])
                .select()
                .single();

            if (dealError) throw dealError;

            const { error: commissionError } = await supabase
                .from('commissions')
                .insert([
                    {
                        deal_id: dealData.id,
                        agent_id: profile?.id,
                        amount: calculated.agentCommission,
                        status: 'pending',
                    },
                ]);

            if (commissionError) throw commissionError;

            Alert.alert(
                'Success!',
                `Order ${dealData.deal_number} created successfully!\n\nYour commission: $${calculated.agentCommission.toFixed(2)}`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setFormData({
                                wholesaler_id: '',
                                retailer_id: '',
                                product_name: '',
                                quantity: '',
                                unit_price: '',
                                delivery_address: '',
                                delivery_date: '',
                                agent_notes: '',
                            });
                            navigation.navigate('Home');
                        },
                    },
                ]
            );
        } catch (error: any) {
            console.error('Error creating order:', error);
            Alert.alert('Error', error.message || 'Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>Create New Order</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Wholesaler *</Text>
                {wholesalers.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No wholesalers yet</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Clients')}>
                            <Text style={styles.linkText}>Add wholesaler first</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.pickerContainer}>
                        {wholesalers.map((wholesaler) => (
                            <TouchableOpacity
                                key={wholesaler.id}
                                style={[
                                    styles.pickerOption,
                                    formData.wholesaler_id === wholesaler.id && styles.pickerOptionSelected,
                                ]}
                                onPress={() => setFormData({ ...formData, wholesaler_id: wholesaler.id })}
                            >
                                <Text
                                    style={[
                                        styles.pickerOptionText,
                                        formData.wholesaler_id === wholesaler.id && styles.pickerOptionTextSelected,
                                    ]}
                                >
                                    {wholesaler.company_name}
                                </Text>
                                <Text style={styles.pickerOptionSubtext}>{wholesaler.contact_person}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <Text style={styles.label}>Retailer *</Text>
                {retailers.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No retailers yet</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Clients')}>
                            <Text style={styles.linkText}>Add retailer first</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.pickerContainer}>
                        {retailers.map((retailer) => (
                            <TouchableOpacity
                                key={retailer.id}
                                style={[
                                    styles.pickerOption,
                                    formData.retailer_id === retailer.id && styles.pickerOptionSelected,
                                ]}
                                onPress={() => setFormData({ ...formData, retailer_id: retailer.id })}
                            >
                                <Text
                                    style={[
                                        styles.pickerOptionText,
                                        formData.retailer_id === retailer.id && styles.pickerOptionTextSelected,
                                    ]}
                                >
                                    {retailer.company_name}
                                </Text>
                                <Text style={styles.pickerOptionSubtext}>{retailer.contact_person}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Rice (50kg bags)"
                    placeholderTextColor="#6B7280"
                    value={formData.product_name}
                    onChangeText={(text) => setFormData({ ...formData, product_name: text })}
                />

                <Text style={styles.label}>Quantity *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., 200 bags"
                    placeholderTextColor="#6B7280"
                    value={formData.quantity}
                    onChangeText={(text) => setFormData({ ...formData, quantity: text })}
                />

                <Text style={styles.label}>Unit Price ($) *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., 25.00"
                    placeholderTextColor="#6B7280"
                    value={formData.unit_price}
                    onChangeText={(text) => setFormData({ ...formData, unit_price: text })}
                    keyboardType="decimal-pad"
                />

                {calculated.dealValue > 0 && (
                    <View style={styles.calculationBox}>
                        <View style={styles.calculationRow}>
                            <Text style={styles.calculationLabel}>Deal Value:</Text>
                            <Text style={styles.calculationValue}>${calculated.dealValue.toFixed(2)}</Text>
                        </View>
                        <View style={styles.calculationRow}>
                            <Text style={styles.calculationLabel}>Commission (10%):</Text>
                            <Text style={styles.calculationValue}>${calculated.commissionAmount.toFixed(2)}</Text>
                        </View>
                        <View style={styles.calculationRow}>
                            <Text style={styles.calculationLabelHighlight}>Your Share (70%):</Text>
                            <Text style={styles.calculationValueHighlight}>${calculated.agentCommission.toFixed(2)}</Text>
                        </View>
                    </View>
                )}

                <Text style={styles.label}>Delivery Address</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Red Light, Paynesville"
                    placeholderTextColor="#6B7280"
                    value={formData.delivery_address}
                    onChangeText={(text) => setFormData({ ...formData, delivery_address: text })}
                />

                <Text style={styles.label}>Expected Delivery Date</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., 2026-03-25"
                    placeholderTextColor="#6B7280"
                    value={formData.delivery_date}
                    onChangeText={(text) => setFormData({ ...formData, delivery_date: text })}
                />

                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Any special instructions..."
                    placeholderTextColor="#6B7280"
                    value={formData.agent_notes}
                    onChangeText={(text) => setFormData({ ...formData, agent_notes: text })}
                    multiline
                    numberOfLines={3}
                />

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.submitButtonText}>Create Order</Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0F0D',
    },
    contentContainer: {
        paddingBottom: 100,
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
    form: {
        padding: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#A8B5AC',
        marginBottom: 8,
        marginTop: 16,
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#F8F9FA',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    pickerContainer: {
        gap: 8,
    },
    pickerOption: {
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 12,
        padding: 12,
    },
    pickerOptionSelected: {
        backgroundColor: '#D4472D20',
        borderColor: '#D4472D',
    },
    pickerOptionText: {
        fontSize: 16,
        color: '#F8F9FA',
        fontWeight: '600',
    },
    pickerOptionTextSelected: {
        color: '#D4472D',
    },
    pickerOptionSubtext: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    emptyBox: {
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 8,
    },
    linkText: {
        fontSize: 14,
        color: '#D4472D',
        fontWeight: '600',
    },
    calculationBox: {
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
    },
    calculationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    calculationLabel: {
        fontSize: 14,
        color: '#A8B5AC',
    },
    calculationValue: {
        fontSize: 14,
        color: '#F8F9FA',
        fontWeight: '600',
    },
    calculationLabelHighlight: {
        fontSize: 16,
        color: '#2D7A4D',
        fontWeight: 'bold',
    },
    calculationValueHighlight: {
        fontSize: 18,
        color: '#2D7A4D',
        fontWeight: 'bold',
    },
    submitButton: {
        backgroundColor: '#D4472D',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 40,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});