import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            await signIn(email, password);
        } catch (error: any) {
            Alert.alert('Login Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                <Text style={styles.logo}>Deal</Text>
                <Text style={styles.subtitle}>Agent Login</Text>

                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#6B7280"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!loading}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#6B7280"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        editable={!loading}
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>Login</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0F0D',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    logo: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#D4472D',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#A8B5AC',
        textAlign: 'center',
        marginBottom: 48,
    },
    form: {
        gap: 16,
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
    button: {
        backgroundColor: '#D4472D',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});