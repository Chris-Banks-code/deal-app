import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

// Custom storage for Expo
const ExpoSecureStoreAdapter = {
    getItem: (key: string) => {
        return SecureStore.getItemAsync(key);
    },
    setItem: (key: string, value: string) => {
        SecureStore.setItemAsync(key, value);
    },
    removeItem: (key: string) => {
        SecureStore.deleteItemAsync(key);
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});