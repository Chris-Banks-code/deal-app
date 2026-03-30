import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetwork } from '../contexts/NetworkContext';

export default function NetworkBanner() {
    const { isOnline, isSyncing, pendingSync, syncNow } = useNetwork();

    if (isOnline && pendingSync === 0 && !isSyncing) {
        return null; // Don't show banner when everything is fine
    }

    return (
        <View style={[
            styles.banner,
            !isOnline ? styles.offline : styles.syncing
        ]}>
            {!isOnline ? (
                <Text style={styles.text}>
                    📵 Offline Mode • {pendingSync} items to sync
                </Text>
            ) : isSyncing ? (
                <Text style={styles.text}>
                    🔄 Syncing {pendingSync} items...
                </Text>
            ) : pendingSync > 0 ? (
                <TouchableOpacity onPress={syncNow} style={styles.syncButton}>
                    <Text style={styles.text}>
                        ⚡ Tap to sync {pendingSync} items
                    </Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    offline: {
        backgroundColor: '#D4472D',
    },
    syncing: {
        backgroundColor: '#F4A542',
    },
    syncButton: {
        width: '100%',
        alignItems: 'center',
    },
    text: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});