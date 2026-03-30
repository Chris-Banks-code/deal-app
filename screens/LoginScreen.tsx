import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import Colors from '../constants/Colors';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            const { error } = await signIn(email, password);
            if (error) {
                Alert.alert('Login Failed', error.message);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient
            colors={['#1B2838', '#2C3E50', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradient}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero Section */}
                    <View style={styles.heroSection}>
                        <View style={styles.logoWrapper}>
                            <Image
                                source={require('../assets/icon.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.heroTitle}>Deal Agent</Text>
                        <View style={styles.divider} />
                        <Text style={styles.heroSubtitle}>
                            Empowering B2B Commerce Across Liberia
                        </Text>
                    </View>

                    {/* Login Card */}
                    <View style={styles.cardContainer}>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Welcome Back</Text>
                            <Text style={styles.cardSubtitle}>
                                Sign in to access your dashboard
                            </Text>

                            <View style={styles.form}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Email Address</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your email"
                                            placeholderTextColor="#94A3B8"
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            editable={!loading}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Password</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter your password"
                                            placeholderTextColor="#94A3B8"
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry
                                            editable={!loading}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.signInButton,
                                        loading && styles.signInButtonDisabled,
                                    ]}
                                    onPress={handleLogin}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.signInButtonText}>Sign In</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Test Credentials */}
                            <View style={styles.testCredsSection}>
                                <View style={styles.testCredsHeader}>
                                    <View style={styles.testCredsDot} />
                                    <Text style={styles.testCredsTitle}>Development Mode</Text>
                                </View>
                                <View style={styles.testCredItem}>
                                    <Text style={styles.testCredLabel}>Agent:</Text>
                                    <Text style={styles.testCredValue}>
                                        agent@test.com / test123456
                                    </Text>
                                </View>
                                <View style={styles.testCredItem}>
                                    <Text style={styles.testCredLabel}>Supervisor:</Text>
                                    <Text style={styles.testCredValue}>
                                        supervisor@test.com / test123456
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Crossroads Technologies</Text>
                        <Text style={styles.footerVersion}>Version 1.1.0</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 32,
    },

    // Hero Section
    heroSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoWrapper: {
        width: 100,
        height: 100,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    logo: {
        width: 70,
        height: 70,
    },
    heroTitle: {
        fontSize: 36,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        marginBottom: 12,
    },
    divider: {
        width: 60,
        height: 3,
        backgroundColor: '#C6A561',
        borderRadius: 2,
        marginBottom: 12,
    },
    heroSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        textAlign: 'center',
        letterSpacing: 0.5,
    },

    // Card
    cardContainer: {
        flex: 1,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 12,
    },
    cardTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1B2838',
        marginBottom: 8,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 32,
    },

    // Form
    form: {
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    inputWrapper: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    input: {
        padding: 16,
        fontSize: 15,
        color: '#1E293B',
    },
    signInButton: {
        backgroundColor: '#1B2838',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#1B2838',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    signInButtonDisabled: {
        opacity: 0.6,
    },
    signInButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },

    // Test Credentials
    testCredsSection: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: '#C6A561',
    },
    testCredsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    testCredsDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#C6A561',
        marginRight: 8,
    },
    testCredsTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    testCredItem: {
        marginBottom: 6,
    },
    testCredLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 2,
    },
    testCredValue: {
        fontSize: 11,
        color: '#64748B',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },

    // Footer
    footer: {
        alignItems: 'center',
        marginTop: 32,
    },
    footerText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 4,
    },
    footerVersion: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.5)',
    },
});