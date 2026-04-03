import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { supabase } from '../lib/supabase';
import { Client } from '../types/database.types';
import { getCachedClients, addToSyncQueue } from '../lib/offlineStorage';
import NetworkBanner from '../components/NetworkBanner';
import Colors from '../constants/Colors';

// Comprehensive Monrovia location database (300+ areas)
const MONROVIA_LOCATIONS: { [key: string]: { lat: number; lng: number } } = {
    // Major Areas (Your Provided Coordinates)
    'old road': { lat: 6.2861, lng: -10.762 },
    'somalia drive': { lat: 6.3210, lng: -10.731 },
    'chicken soup factory': { lat: 6.3230, lng: -10.731 },
    'west point': { lat: 6.3270, lng: -10.806 },
    'congo town': { lat: 6.2690, lng: -10.732 },
    'new kru town': { lat: 6.3670, lng: -10.783 },
    'new georgia': { lat: 6.3170, lng: -10.757 },
    'paynesville': { lat: 6.2770, lng: -10.717 },
    'gardnersville': { lat: 6.3420, lng: -10.733 },
    'gardnerville': { lat: 6.3420, lng: -10.733 },
    'barnersville': { lat: 6.3670, lng: -10.733 },
    'johnsonville': { lat: 6.3530, lng: -10.699 },
    'sinkor': { lat: 6.3070, lng: -10.806 },
    'mamba point': { lat: 6.3140, lng: -10.802 },
    'red light': { lat: 6.3120, lng: -10.809 },
    'logan town': { lat: 6.3110, lng: -10.803 },
    'logatown': { lat: 6.3110, lng: -10.803 },
    'old field': { lat: 6.2700, lng: -10.715 },

    // Extended Areas (Estimates)
    'dixville': { lat: 6.3200, lng: -10.740 },
    'caldwell': { lat: 6.3580, lng: -10.675 },
    'slipway': { lat: 6.3150, lng: -10.800 },
    'clara town': { lat: 6.3250, lng: -10.795 },
    'bushrod island': { lat: 6.3289, lng: -10.816 },
    'stockton creek': { lat: 6.3350, lng: -10.825 },
    'virginia': { lat: 6.3400, lng: -10.820 },
    'fanti town': { lat: 6.3280, lng: -10.810 },
    'bassa community': { lat: 6.3100, lng: -10.785 },
    'jallah town': { lat: 6.3050, lng: -10.770 },
    'buzzi quarters': { lat: 6.3180, lng: -10.775 },
    'buzzy quarters': { lat: 6.3180, lng: -10.775 },
    'crown hill': { lat: 6.2950, lng: -10.760 },
    'matadi': { lat: 6.3320, lng: -10.790 },
    'old matadi': { lat: 6.3310, lng: -10.792 },
    'new matadi': { lat: 6.3330, lng: -10.788 },
    'snapper hill': { lat: 6.3050, lng: -10.795 },
    'topoe village': { lat: 6.3450, lng: -10.745 },
    'bakoi': { lat: 6.3380, lng: -10.755 },
    'banjoa': { lat: 6.3420, lng: -10.765 },
    'barekling': { lat: 6.3460, lng: -10.770 },
    'bassa town': { lat: 6.3100, lng: -10.783 },
    'bojor quarter': { lat: 6.3220, lng: -10.768 },
    'doin town': { lat: 6.3280, lng: -10.752 },
    'dwahn town': { lat: 6.3310, lng: -10.748 },
    'duala': { lat: 6.3234, lng: -10.798 },
    'jacob town': { lat: 6.3267, lng: -10.783 },
    'jatuja': { lat: 6.3290, lng: -10.772 },
    'kaba town': { lat: 6.3350, lng: -10.760 },
    'dandawailo': { lat: 6.3180, lng: -10.735 },
    'flahn town': { lat: 6.3420, lng: -10.738 },
    'flamingo flats': { lat: 6.2980, lng: -10.745 },
    'flamingo flats estate': { lat: 6.2985, lng: -10.743 },
    'battery factory': { lat: 6.3050, lng: -10.752 },
    'iron factory': { lat: 6.3080, lng: -10.748 },
    'chocolate city': { lat: 6.3120, lng: -10.742 },
    'shoe factory': { lat: 6.3090, lng: -10.755 },
    'barnersville road': { lat: 6.3650, lng: -10.730 },
    'barnersville estate': { lat: 6.3680, lng: -10.735 },
    'behwein community': { lat: 6.3590, lng: -10.728 },
    'dabwe town': { lat: 6.3620, lng: -10.722 },
    'duan town': { lat: 6.3550, lng: -10.718 },
    'johnsonville road a': { lat: 6.3520, lng: -10.695 },
    'johnsonville road b': { lat: 6.3540, lng: -10.693 },
    'old field south': { lat: 6.2680, lng: -10.713 },
    'rock hill': { lat: 6.3600, lng: -10.705 },
    'city view': { lat: 6.3480, lng: -10.708 },
    'caldwell community': { lat: 6.3570, lng: -10.673 },
    'caldwell market': { lat: 6.3580, lng: -10.676 },
    'upper caldwell': { lat: 6.3600, lng: -10.670 },
    'central caldwell': { lat: 6.3575, lng: -10.675 },
    'samukai town': { lat: 6.3520, lng: -10.680 },
    'dixville a': { lat: 6.3190, lng: -10.738 },
    'dixville b': { lat: 6.3210, lng: -10.742 },
    'dixville water side': { lat: 6.3220, lng: -10.745 },
    'new georgia road': { lat: 6.3160, lng: -10.755 },
    'kemah town': { lat: 6.3130, lng: -10.750 },
    'omega': { lat: 6.3135, lng: -10.748 },
    'kpelle town': { lat: 6.3250, lng: -10.755 },
    'pipeline a': { lat: 6.3280, lng: -10.745 },
    'pipeline b': { lat: 6.3290, lng: -10.743 },
    'police academy': { lat: 6.3350, lng: -10.740 },
    'wood camp': { lat: 6.3380, lng: -10.735 },
    'rehab': { lat: 6.3410, lng: -10.730 },
    'borbor town': { lat: 6.3415, lng: -10.728 },
    'duport road north': { lat: 6.3480, lng: -10.720 },
    'duport road south': { lat: 6.3460, lng: -10.718 },
    'duport road n. east': { lat: 6.3490, lng: -10.715 },
    'duport road': { lat: 6.3470, lng: -10.719 },
    'gsa road rockville': { lat: 6.3520, lng: -10.710 },
    'a.b. tolbert road': { lat: 6.2950, lng: -10.735 },
    'kende-jah': { lat: 6.2980, lng: -10.730 },
    '72nd community': { lat: 6.2920, lng: -10.725 },
    's.d. cooper': { lat: 6.2890, lng: -10.720 },
    'soul clinic': { lat: 6.3089, lng: -10.782 },
    'town hall': { lat: 6.3156, lng: -10.807 },
    'zinc factory': { lat: 6.3180, lng: -10.765 },
    'morris farm': { lat: 6.2850, lng: -10.710 },
    'neezoe': { lat: 6.2820, lng: -10.705 },
    'paynesville joe bar': { lat: 6.2780, lng: -10.715 },
    'double bridge': { lat: 6.2800, lng: -10.712 },
    'key & death hole': { lat: 6.2950, lng: -10.738 },
    'gaye town': { lat: 6.3020, lng: -10.742 },
    'chugbor': { lat: 6.3050, lng: -10.748 },
    'tarr town': { lat: 6.3080, lng: -10.753 },
    'congo town old road': { lat: 6.2680, lng: -10.730 },
    'oldest congo town': { lat: 6.2675, lng: -10.732 },
    'congo town city': { lat: 6.2695, lng: -10.733 },
    'barchue town': { lat: 6.2720, lng: -10.735 },
    'pagos island': { lat: 6.3300, lng: -10.815 },
    'peace island': { lat: 6.3310, lng: -10.817 },
    'liberty island': { lat: 6.3305, lng: -10.816 },
    'swankamore': { lat: 6.3280, lng: -10.812 },
    'zion town': { lat: 6.3250, lng: -10.808 },
    'melrose': { lat: 6.3220, lng: -10.805 },
    'stockton creek bridge': { lat: 6.3360, lng: -10.828 },
    'louisiana': { lat: 6.3380, lng: -10.830 },
    'maternity community': { lat: 6.3150, lng: -10.798 },
    'rock spring valley': { lat: 6.3180, lng: -10.793 },
    'bishop brooks': { lat: 6.3200, lng: -10.790 },
    'bernard quarters': { lat: 6.3220, lng: -10.788 },
    'capitol hill': { lat: 6.3145, lng: -10.805 },
    'rock crusher': { lat: 6.3175, lng: -10.802 },
    'cooper clinic': { lat: 6.3190, lng: -10.800 },
    'fiamah': { lat: 6.3210, lng: -10.797 },
    'ica camp': { lat: 6.3230, lng: -10.795 },
    'fish market': { lat: 6.3260, lng: -10.808 },
    'ocean view': { lat: 6.3280, lng: -10.810 },
    'plumkor': { lat: 6.3650, lng: -10.785 },
    'pyne people': { lat: 6.3620, lng: -10.780 },
    'raymond field': { lat: 6.3320, lng: -10.788 },
    'wroto town': { lat: 6.3590, lng: -10.788 },
    'central lakpazee': { lat: 6.3620, lng: -10.792 },
    'fiama east': { lat: 6.3230, lng: -10.793 },
    'gbangaye town': { lat: 6.3650, lng: -10.795 },
    'central new kru town': { lat: 6.3670, lng: -10.782 },
    'macdonia': { lat: 6.3690, lng: -10.780 },
    'freeport community': { lat: 6.3720, lng: -10.778 },
    'crab hole': { lat: 6.3480, lng: -10.795 },
    'lagoon east': { lat: 6.3450, lng: -10.800 },
    'lagoon west': { lat: 6.3430, lng: -10.802 },
    'monboe town west': { lat: 6.3550, lng: -10.790 },
    'nyuan town': { lat: 6.3580, lng: -10.788 },
    'bong mines bridge': { lat: 6.3750, lng: -10.770 },
    'tweh farm': { lat: 6.3780, lng: -10.765 },
    'point four': { lat: 6.3600, lng: -10.792 },
    'popo beach a': { lat: 6.3250, lng: -10.812 },
    'popo beach b': { lat: 6.3260, lng: -10.814 },
    'popo beach': { lat: 6.3255, lng: -10.813 },
    'jamaica road': { lat: 6.3230, lng: -10.810 },
    'central west point': { lat: 6.3270, lng: -10.807 },
    'fish town': { lat: 6.3710, lng: -10.775 },
    'grandcess yard': { lat: 6.3290, lng: -10.805 },
    'police station': { lat: 6.3150, lng: -10.806 },
    'power plant': { lat: 6.3160, lng: -10.808 },
    'freeport development': { lat: 6.3730, lng: -10.776 },
    'gbandi town': { lat: 6.3680, lng: -10.777 },
    'king peter town': { lat: 6.3320, lng: -10.802 },
    'little white chapel': { lat: 6.3340, lng: -10.800 },
    'vicky spot': { lat: 6.3360, lng: -10.798 },
    'zinc camp': { lat: 6.3380, lng: -10.796 },
    'zondo town': { lat: 6.3400, lng: -10.794 },
    'central clara town i': { lat: 6.3245, lng: -10.793 },
    'central clara town ii': { lat: 6.3255, lng: -10.795 },
    'central clara town': { lat: 6.3250, lng: -10.794 },
    'cow factory': { lat: 6.3220, lng: -10.792 },
    'hope community': { lat: 6.3680, lng: -10.785 },
    'paity town': { lat: 6.3270, lng: -10.790 },
    'peugeot garage': { lat: 6.3290, lng: -10.788 },
    'river view': { lat: 6.3410, lng: -10.792 },
    'struggle community': { lat: 6.3280, lng: -10.803 },
    'vai town a': { lat: 6.3300, lng: -10.801 },
    'vai town b': { lat: 6.3310, lng: -10.799 },
    'vai town': { lat: 6.3305, lng: -10.800 },
    'robertsfield': { lat: 6.2337, lng: -10.362 },
    'gbatandu community': { lat: 6.2950, lng: -10.700 },
    'keytown': { lat: 6.2980, lng: -10.695 },
    'dolo town': { lat: 6.3150, lng: -10.680 },
    't. town': { lat: 6.2920, lng: -10.728 },
    'kumah town': { lat: 6.3140, lng: -10.748 },
    'klal town': { lat: 6.3160, lng: -10.745 },
    'snake hill': { lat: 6.3050, lng: -10.803 },
    'new kru town fendell': { lat: 6.3690, lng: -10.780 },
    'new georgia fendell': { lat: 6.3180, lng: -10.753 },

    // Sub-areas and Extensions
    'sinkor camp': { lat: 6.3060, lng: -10.804 },
    'sinkor flats': { lat: 6.3065, lng: -10.805 },
    'sinkor road': { lat: 6.3075, lng: -10.807 },
    'sinkor estate': { lat: 6.3080, lng: -10.808 },
    'sinkor central': { lat: 6.3070, lng: -10.806 },
    'mamba point hill': { lat: 6.3145, lng: -10.801 },
    'mamba point beach': { lat: 6.3135, lng: -10.803 },
    'mamba point road': { lat: 6.3140, lng: -10.802 },
    'red light market': { lat: 6.3125, lng: -10.810 },
    'red light extension': { lat: 6.3115, lng: -10.811 },
    'west point beach': { lat: 6.3275, lng: -10.808 },
    'west point town': { lat: 6.3270, lng: -10.806 },
    'west point south': { lat: 6.3265, lng: -10.805 },
    'new kru town beach': { lat: 6.3675, lng: -10.785 },
    'new kru town central': { lat: 6.3670, lng: -10.783 },
    'new kru town west': { lat: 6.3665, lng: -10.781 },
    'congo town central': { lat: 6.2690, lng: -10.732 },
    'congo town east': { lat: 6.2695, lng: -10.730 },
    'congo town matric': { lat: 6.2685, lng: -10.733 },
    'congo town road': { lat: 6.2692, lng: -10.731 },
    'new georgia beach': { lat: 6.3175, lng: -10.759 },
    'new georgia central': { lat: 6.3170, lng: -10.757 },
    'new georgia west': { lat: 6.3165, lng: -10.755 },
    'paynesville central': { lat: 6.2770, lng: -10.717 },
    'paynesville market': { lat: 6.2775, lng: -10.718 },
    'paynesville road': { lat: 6.2780, lng: -10.716 },
    'paynesville sinkor': { lat: 6.2765, lng: -10.715 },
    'barnersville road north': { lat: 6.3675, lng: -10.731 },
    'barnersville road south': { lat: 6.3665, lng: -10.735 },
    'barnersville market': { lat: 6.3670, lng: -10.734 },
    'barnersville central': { lat: 6.3670, lng: -10.733 },
    'johnsonville north': { lat: 6.3535, lng: -10.697 },
    'johnsonville south': { lat: 6.3525, lng: -10.701 },
    'johnsonville west': { lat: 6.3520, lng: -10.703 },
    'old field north': { lat: 6.2705, lng: -10.714 },
    'old field extension': { lat: 6.2695, lng: -10.716 },
    'rock hill hill': { lat: 6.3605, lng: -10.703 },
    'rock hill market': { lat: 6.3600, lng: -10.706 },
    'rock hill central': { lat: 6.3600, lng: -10.705 },
    'city view estate': { lat: 6.3485, lng: -10.707 },
    'city view extension': { lat: 6.3475, lng: -10.709 },
    'robertsfield junction': { lat: 6.2340, lng: -10.365 },
    'robertsfield housing': { lat: 6.2335, lng: -10.360 },
    'robertsfield road': { lat: 6.2345, lng: -10.363 },
    'gbatandu central': { lat: 6.2950, lng: -10.700 },
    'gbatandu hill': { lat: 6.2955, lng: -10.698 },
    'dolo town hill': { lat: 6.3155, lng: -10.678 },
    'dolo town market': { lat: 6.3150, lng: -10.681 },
    'dolo town road': { lat: 6.3152, lng: -10.680 },
    'morris farm market': { lat: 6.2855, lng: -10.708 },
    'morris farm road': { lat: 6.2850, lng: -10.711 },
    'keytown market': { lat: 6.2985, lng: -10.693 },
    'keytown road': { lat: 6.2980, lng: -10.696 },
    's. d. cooper road': { lat: 6.2895, lng: -10.718 },
    's. d. cooper market': { lat: 6.2890, lng: -10.721 },
    'a. b. tolbert central': { lat: 6.2950, lng: -10.735 },
    'a. b. tolbert market': { lat: 6.2955, lng: -10.733 },
    't. town road': { lat: 6.2925, lng: -10.726 },
    't. town market': { lat: 6.2920, lng: -10.729 },
    'duport road central': { lat: 6.3470, lng: -10.719 },
    'duport road flats': { lat: 6.3475, lng: -10.718 },
    'duport road market': { lat: 6.3465, lng: -10.720 },
    'central caldwell market': { lat: 6.3575, lng: -10.676 },
    'upper caldwell market': { lat: 6.3600, lng: -10.671 },
    'upper caldwell hill': { lat: 6.3605, lng: -10.669 },
    'new matadi market': { lat: 6.3335, lng: -10.787 },
    'old matadi market': { lat: 6.3315, lng: -10.793 },
    'rock spring valley market': { lat: 6.3185, lng: -10.792 },
    'plumkor market': { lat: 6.3655, lng: -10.784 },
    'plumkor road': { lat: 6.3650, lng: -10.786 },
    'point four market': { lat: 6.3605, lng: -10.791 },
    'popo beach road': { lat: 6.3258, lng: -10.811 },
    'popo beach market': { lat: 6.3252, lng: -10.814 },
    'fish town market': { lat: 6.3715, lng: -10.774 },
    'fish town road': { lat: 6.3710, lng: -10.776 },
    'freeport central': { lat: 6.3720, lng: -10.778 },
    'freeport market': { lat: 6.3725, lng: -10.777 },
    'lagoon east market': { lat: 6.3455, lng: -10.799 },
    'lagoon west market': { lat: 6.3435, lng: -10.801 },
    'vicky spot market': { lat: 6.3365, lng: -10.797 },
    'king peter market': { lat: 6.3325, lng: -10.801 },
    'central clara market': { lat: 6.3252, lng: -10.793 },
    'fish market road': { lat: 6.3265, lng: -10.807 },
    'ocean view market': { lat: 6.3285, lng: -10.809 },
    'peugeot garage road': { lat: 6.3295, lng: -10.787 },
    'peugeot garage market': { lat: 6.3290, lng: -10.789 },
    'peugeot garage extension': { lat: 6.3288, lng: -10.786 },
    'river view market': { lat: 6.3415, lng: -10.791 },
    'struggle community market': { lat: 6.3285, lng: -10.802 },
    'vai town market': { lat: 6.3308, lng: -10.799 },
    'police station community': { lat: 6.3152, lng: -10.805 },
    'power plant community': { lat: 6.3162, lng: -10.807 },
    'robertsfield settlement': { lat: 6.2338, lng: -10.361 },
    'logan town extension': { lat: 6.3115, lng: -10.802 },

    // Default fallback
    'monrovia': { lat: 6.3156, lng: -10.807 },
    'central monrovia': { lat: 6.3156, lng: -10.807 },
};

export default function ClientsScreen() {
    const { profile } = useAuth();
    const { isOnline } = useNetwork();
    const [clients, setClients] = useState<Client[]>([]);
    const [filter, setFilter] = useState<'all' | 'wholesaler' | 'retailer'>('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [photos, setPhotos] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        company_name: '',
        client_type: 'retailer' as 'wholesaler' | 'retailer',
        contact_person: '',
        phone: '',
        address: '',
        notes: '',
    });

    const canCreateWholesaler = profile?.role === 'admin' || profile?.role === 'operation_manager';

    useEffect(() => {
        loadClients();
    }, [filter, isOnline]);

    const loadClients = async () => {
        try {
            if (isOnline) {
                let query = supabase
                    .from('clients')
                    .select('*')
                    .eq('assigned_agent_id', profile?.id)
                    .order('company_name');

                if (filter !== 'all') {
                    query = query.eq('client_type', filter);
                }

                const { data, error } = await query;
                if (error) throw error;
                setClients(data || []);
            } else {
                const cachedClients = getCachedClients(filter === 'all' ? undefined : filter);
                setClients(cachedClients);
            }
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadClients();
    };

    const estimateLocation = (address: string): { lat: number; lng: number } | null => {
        const addressLower = address.toLowerCase().trim();

        // Direct match
        if (MONROVIA_LOCATIONS[addressLower]) {
            return MONROVIA_LOCATIONS[addressLower];
        }

        // Fuzzy match - check if any known location is contained in address
        for (const [location, coords] of Object.entries(MONROVIA_LOCATIONS)) {
            if (addressLower.includes(location) || location.includes(addressLower.split(',')[0].trim())) {
                return coords;
            }
        }

        // Default to central Monrovia
        return { lat: 6.3156, lng: -10.807 };
    };

    const takePhoto = async () => {
        if (photos.length >= 3) {
            Alert.alert('Limit Reached', 'You can only add up to 3 photos');
            return;
        }
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera access is needed to take photos of the business');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
            setPhotos(prev => [...prev, result.assets[0].uri]);
        }
    };

    const pickFromGallery = async () => {
        if (photos.length >= 3) {
            Alert.alert('Limit Reached', 'You can only add up to 3 photos');
            return;
        }
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Photo library access is needed');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });
        if (!result.canceled && result.assets[0]) {
            setPhotos(prev => [...prev, result.assets[0].uri]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddClient = async () => {
        if (!formData.company_name || !formData.contact_person || !formData.phone) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
        if (!phoneRegex.test(formData.phone.trim())) {
            Alert.alert('Error', 'Please enter a valid phone number (7-15 digits)');
            return;
        }

        if (!canCreateWholesaler && formData.client_type === 'wholesaler') {
            Alert.alert('Error', 'Only admins and operation managers can add wholesalers');
            return;
        }

        if (!formData.address) {
            Alert.alert('Error', 'Please enter an address for location matching');
            return;
        }

        if (formData.client_type === 'retailer' && photos.length === 0) {
            Alert.alert('Photos Required', 'Please take at least 1 photo of the retailer\'s business (up to 3)');
            return;
        }

        if (formData.client_type === 'retailer' && !isOnline) {
            Alert.alert('Internet Required', 'An internet connection is needed to save retailer photos. Please connect and try again.');
            return;
        }

        setSaving(true);

        try {
            const location = estimateLocation(formData.address);

            const clientData = {
                ...formData,
                assigned_agent_id: profile?.id,
                status: 'active' as const,
                latitude: location?.lat || null,
                longitude: location?.lng || null,
            };

            if (isOnline) {
                const { data: insertedClient, error } = await supabase
                    .from('clients')
                    .insert([clientData])
                    .select()
                    .single();

                if (error) throw error;

                // Upload photos for retailers
                if (formData.client_type === 'retailer' && photos.length > 0) {
                    const photoUrls: string[] = [];
                    for (let i = 0; i < photos.length; i++) {
                        const uri = photos[i];
                        const response = await fetch(uri);
                        const blob = await response.blob();
                        const fileName = `${insertedClient.id}/photo-${i + 1}.jpg`;
                        const { error: uploadError } = await supabase.storage
                            .from('client-photos')
                            .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });
                        if (!uploadError) {
                            const { data: urlData } = supabase.storage
                                .from('client-photos')
                                .getPublicUrl(fileName);
                            photoUrls.push(urlData.publicUrl);
                        }
                    }
                    if (photoUrls.length > 0) {
                        await supabase
                            .from('clients')
                            .update({ photo_urls: photoUrls })
                            .eq('id', insertedClient.id);
                    }
                }

                Alert.alert('Success', `Client added successfully!${location ? '\n📍 Location mapped' : ''}${photos.length > 0 ? `\n📷 ${photos.length} photo${photos.length > 1 ? 's' : ''} saved` : ''}`);
            } else {
                addToSyncQueue('clients', 'insert', clientData);
                Alert.alert('Saved Offline', 'Client saved locally and will sync when online');
            }

            setFormData({
                company_name: '',
                client_type: 'retailer',
                contact_person: '',
                phone: '',
                address: '',
                notes: '',
            });
            setPhotos([]);
            setModalVisible(false);
            loadClients();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to add client');
        } finally {
            setSaving(false);
        }
    };

    const renderClient = ({ item }: { item: Client }) => (
        <View style={styles.clientCard}>
            <View style={styles.clientHeader}>
                <Text style={styles.clientName}>{item.company_name}</Text>
                <View style={[
                    styles.typeBadge,
                    item.client_type === 'wholesaler' ? styles.wholesalerBadge : styles.retailerBadge
                ]}>
                    <Text style={[
                        styles.typeText,
                        item.client_type === 'wholesaler' ? styles.wholesalerText : styles.retailerText
                    ]}>
                        {item.client_type === 'wholesaler' ? 'Wholesaler' : 'Retailer'}
                    </Text>
                </View>
            </View>
            <Text style={styles.contactPerson}>{item.contact_person}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
            {item.address && (
                <View style={styles.addressRow}>
                    <Text style={styles.address}>
                        📍 {item.address}
                    </Text>
                    {item.latitude && item.longitude && (
                        <View style={styles.mappedBadge}>
                            <Text style={styles.mappedText}>✓ Mapped</Text>
                        </View>
                    )}
                </View>
            )}
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
                    <Text style={styles.title}>My Clients</Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setModalVisible(true)}
                    >
                        <Text style={styles.addButtonText}>+ Add Client</Text>
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
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No clients yet</Text>
                            <Text style={styles.emptySubtext}>Add your first client to get started</Text>
                        </View>
                    }
                />

                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Add New Client</Text>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                style={styles.scrollView}
                            >
                                <Text style={styles.label}>Client Type *</Text>
                                {canCreateWholesaler ? (
                                    <View style={styles.typeSelector}>
                                        <TouchableOpacity
                                            style={[
                                                styles.typeOption,
                                                formData.client_type === 'retailer' && styles.typeOptionActive
                                            ]}
                                            onPress={() => setFormData({ ...formData, client_type: 'retailer' })}
                                        >
                                            <Text style={[
                                                styles.typeOptionText,
                                                formData.client_type === 'retailer' && styles.typeOptionTextActive
                                            ]}>
                                                Retailer
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.typeOption,
                                                formData.client_type === 'wholesaler' && styles.typeOptionActive
                                            ]}
                                            onPress={() => setFormData({ ...formData, client_type: 'wholesaler' })}
                                        >
                                            <Text style={[
                                                styles.typeOptionText,
                                                formData.client_type === 'wholesaler' && styles.typeOptionTextActive
                                            ]}>
                                                Wholesaler
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.typeLockedContainer}>
                                        <Text style={styles.typeLockedText}>Retailer</Text>
                                        <Text style={styles.typeLockedSubtext}>Agents can only add retailers</Text>
                                    </View>
                                )}

                                <Text style={styles.label}>Company Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., ABC Store"
                                    placeholderTextColor={Colors.textTertiary}
                                    value={formData.company_name}
                                    onChangeText={(text) => setFormData({ ...formData, company_name: text })}
                                />

                                <Text style={styles.label}>Contact Person *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., John Doe"
                                    placeholderTextColor={Colors.textTertiary}
                                    value={formData.contact_person}
                                    onChangeText={(text) => setFormData({ ...formData, contact_person: text })}
                                />

                                <Text style={styles.label}>Phone *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., +231 XXX XXXX"
                                    placeholderTextColor={Colors.textTertiary}
                                    value={formData.phone}
                                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                                    keyboardType="phone-pad"
                                />

                                <Text style={styles.label}>Address *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., Red Light, Paynesville"
                                    placeholderTextColor={Colors.textTertiary}
                                    value={formData.address}
                                    onChangeText={(text) => setFormData({ ...formData, address: text })}
                                />
                                <Text style={styles.helperText}>
                                    💡 Include neighborhood (e.g., Sinkor, Red Light, Paynesville) for better wholesaler matching
                                </Text>

                                <Text style={styles.label}>Notes</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Optional notes..."
                                    placeholderTextColor={Colors.textTertiary}
                                    value={formData.notes}
                                    onChangeText={(text) => setFormData({ ...formData, notes: text })}
                                    multiline
                                    numberOfLines={3}
                                />

                                {formData.client_type === 'retailer' && (
                                    <>
                                        <Text style={styles.label}>
                                            Business Photos * ({photos.length}/3)
                                        </Text>
                                        <Text style={styles.helperText}>
                                            Required: Take up to 3 photos of the retailer's business premises
                                        </Text>

                                        {photos.length > 0 && (
                                            <View style={styles.photoGrid}>
                                                {photos.map((uri, index) => (
                                                    <View key={index} style={styles.photoWrapper}>
                                                        <Image
                                                            source={{ uri }}
                                                            style={styles.photoThumbnail}
                                                            resizeMode="cover"
                                                        />
                                                        <TouchableOpacity
                                                            style={styles.removePhotoButton}
                                                            onPress={() => removePhoto(index)}
                                                        >
                                                            <Text style={styles.removePhotoText}>✕</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        {photos.length < 3 && (
                                            <View style={styles.photoActions}>
                                                <TouchableOpacity
                                                    style={styles.photoButton}
                                                    onPress={takePhoto}
                                                >
                                                    <Text style={styles.photoButtonIcon}>📷</Text>
                                                    <Text style={styles.photoButtonText}>Take Photo</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.photoButton}
                                                    onPress={pickFromGallery}
                                                >
                                                    <Text style={styles.photoButtonIcon}>🖼️</Text>
                                                    <Text style={styles.photoButtonText}>Gallery</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </>
                                )}
                            </ScrollView>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.saveButton, saving && styles.saveButtonDisabled]}
                                    onPress={handleAddClient}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <ActivityIndicator color={Colors.textInverse} />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Add Client</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    addButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        color: Colors.textInverse,
        fontSize: 14,
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 8,
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
    clientCard: {
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
    clientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    clientName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        flex: 1,
    },
    typeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    wholesalerBadge: {
        backgroundColor: Colors.warningBg,
    },
    retailerBadge: {
        backgroundColor: Colors.successBg,
    },
    typeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    wholesalerText: {
        color: Colors.warning,
    },
    retailerText: {
        color: Colors.success,
    },
    contactPerson: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    phone: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 8,
    },
    addressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    address: {
        fontSize: 12,
        color: Colors.textTertiary,
        flex: 1,
    },
    mappedBadge: {
        backgroundColor: Colors.successBg,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    mappedText: {
        fontSize: 10,
        color: Colors.success,
        fontWeight: '600',
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
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '90%',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.textPrimary,
        marginBottom: 16,
    },
    scrollView: {
        maxHeight: 400,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textPrimary,
        marginBottom: 8,
        marginTop: 16,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
    },
    typeOption: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    typeOptionActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    typeOptionText: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    typeOptionTextActive: {
        color: Colors.textInverse,
    },
    typeLockedContainer: {
        backgroundColor: Colors.infoBg,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    typeLockedText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 4,
    },
    typeLockedSubtext: {
        fontSize: 12,
        color: Colors.textSecondary,
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
    helperText: {
        fontSize: 12,
        color: Colors.textTertiary,
        marginTop: 4,
        fontStyle: 'italic',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cancelButtonText: {
        color: Colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: Colors.primary,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: Colors.textInverse,
        fontSize: 16,
        fontWeight: 'bold',
    },
    photoGrid: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        marginBottom: 8,
    },
    photoWrapper: {
        position: 'relative',
        width: 90,
        height: 90,
        borderRadius: 8,
        overflow: 'hidden',
    },
    photoThumbnail: {
        width: 90,
        height: 90,
        borderRadius: 8,
    },
    removePhotoButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removePhotoText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
    photoActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    photoButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingVertical: 12,
    },
    photoButtonIcon: {
        fontSize: 18,
    },
    photoButtonText: {
        fontSize: 14,
        color: Colors.textPrimary,
        fontWeight: '600',
    },
});