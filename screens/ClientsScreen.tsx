import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    TextInput,
    Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Client } from '../types/database.types';

export default function ClientsScreen() {
    const { profile } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'wholesaler' | 'retailer'>('all');
    const [modalVisible, setModalVisible] = useState(false);
    const [newClient, setNewClient] = useState({
        company_name: '',
        client_type: 'wholesaler' as 'wholesaler' | 'retailer',
        contact_person: '',
        phone: '',
        address: '',
    });

    useEffect(() => {
        loadClients();
    }, [filter]);

    const loadClients = async () => {
        try {
            let query = supabase
                .from('clients')
                .select('*')
                .eq('assigned_agent_id', profile?.id)
                .order('company_name', { ascending: true });

            if (filter !== 'all') {
                query = query.eq('client_type', filter);
            }

            const { data, error } = await query;

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Error loading clients:', error);
            Alert.alert('Error', 'Failed to load clients');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadClients();
    };

    const handleAddClient = async () => {
        if (!newClient.company_name || !newClient.contact_person || !newClient.phone) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            const { error } = await supabase.from('clients').insert([
                {
                    ...newClient,
                    assigned_agent_id: profile?.id,
                },
            ]);

            if (error) throw error;

            Alert.alert('Success', 'Client added successfully');
            setModalVisible(false);
            setNewClient({
                company_name: '',
                client_type: 'wholesaler',
                contact_person: '',
                phone: '',
                address: '',
            });
            loadClients();
        } catch (error: any) {
            console.error('Error adding client:', error);
            Alert.alert('Error', error.message || 'Failed to add client');
        }
    };

    const renderClient = ({ item }: { item: Client }) => (
        <View style={styles.clientCard}>
            <View style={styles.clientHeader}>
                <Text style={styles.clientName}>{item.company_name}</Text>
                <View style={[styles.typeBadge, item.client_type === 'wholesaler' ? styles.wholesalerBadge : styles.retailerBadge]}>
                    <Text style={styles.typeBadgeText}>
                        {item.client_type === 'wholesaler' ? 'Wholesaler' : 'Retailer'}
                    </Text>
                </View>
            </View>
            <Text style={styles.clientContact}>{item.contact_person}</Text>
            <Text style={styles.clientPhone}>{item.phone}</Text>
            {item.address && <Text style={styles.clientAddress}>{item.address}</Text>}
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
                <Text style={styles.title}>My Clients</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                        All ({clients.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'wholesaler' && styles.filterButtonActive]}
                    onPress={() => setFilter('wholesaler')}
                >
                    <Text style={[styles.filterText, filter === 'wholesaler' && styles.filterTextActive]}>
                        Wholesalers
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'retailer' && styles.filterButtonActive]}
                    onPress={() => setFilter('retailer')}
                >
                    <Text style={[styles.filterText, filter === 'retailer' && styles.filterTextActive]}>
                        Retailers
                    </Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={clients}
                renderItem={renderClient}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4472D" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No clients yet</Text>
                        <Text style={styles.emptySubtext}>Add your first client to get started</Text>
                    </View>
                }
            />

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add New Client</Text>

                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[styles.typeButton, newClient.client_type === 'wholesaler' && styles.typeButtonActive]}
                                onPress={() => setNewClient({ ...newClient, client_type: 'wholesaler' })}
                            >
                                <Text style={[styles.typeButtonText, newClient.client_type === 'wholesaler' && styles.typeButtonTextActive]}>
                                    Wholesaler
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeButton, newClient.client_type === 'retailer' && styles.typeButtonActive]}
                                onPress={() => setNewClient({ ...newClient, client_type: 'retailer' })}
                            >
                                <Text style={[styles.typeButtonText, newClient.client_type === 'retailer' && styles.typeButtonTextActive]}>
                                    Retailer
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Company Name *"
                            placeholderTextColor="#6B7280"
                            value={newClient.company_name}
                            onChangeText={(text) => setNewClient({ ...newClient, company_name: text })}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Contact Person *"
                            placeholderTextColor="#6B7280"
                            value={newClient.contact_person}
                            onChangeText={(text) => setNewClient({ ...newClient, contact_person: text })}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number *"
                            placeholderTextColor="#6B7280"
                            value={newClient.phone}
                            onChangeText={(text) => setNewClient({ ...newClient, phone: text })}
                            keyboardType="phone-pad"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Address (Optional)"
                            placeholderTextColor="#6B7280"
                            value={newClient.address}
                            onChangeText={(text) => setNewClient({ ...newClient, address: text })}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleAddClient}
                            >
                                <Text style={styles.saveButtonText}>Add Client</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#F8F9FA',
    },
    addButton: {
        backgroundColor: '#D4472D',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
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
    clientCard: {
        backgroundColor: '#131A16',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    clientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    clientName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#F8F9FA',
        flex: 1,
    },
    typeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    wholesalerBadge: {
        backgroundColor: '#2D7A4D30',
    },
    retailerBadge: {
        backgroundColor: '#F4A54230',
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2D7A4D',
    },
    clientContact: {
        fontSize: 16,
        color: '#A8B5AC',
        marginBottom: 4,
    },
    clientPhone: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    clientAddress: {
        fontSize: 14,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#131A16',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#F8F9FA',
        marginBottom: 24,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#0A0F0D',
        borderWidth: 1,
        borderColor: '#2D3A31',
        alignItems: 'center',
    },
    typeButtonActive: {
        backgroundColor: '#D4472D',
        borderColor: '#D4472D',
    },
    typeButtonText: {
        fontSize: 16,
        color: '#A8B5AC',
        fontWeight: '600',
    },
    typeButtonTextActive: {
        color: '#FFFFFF',
    },
    input: {
        backgroundColor: '#0A0F0D',
        borderWidth: 1,
        borderColor: '#2D3A31',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#F8F9FA',
        marginBottom: 12,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#0A0F0D',
        borderWidth: 1,
        borderColor: '#2D3A31',
    },
    cancelButtonText: {
        color: '#A8B5AC',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#D4472D',
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});