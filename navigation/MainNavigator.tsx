import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

import DashboardScreen from '../screens/DashboardScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import EarningsScreen from '../screens/EarningsScreen';
import ClientsScreen from '../screens/ClientsScreen';
import TeamDashboardScreen from '../screens/TeamDashboardScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
    const { profile } = useAuth();
    const isSupervisor = profile?.role === 'supervisor';

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#0A0F0D',
                    borderTopColor: '#2D3A31',
                    borderTopWidth: 1,
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 60,
                },
                tabBarActiveTintColor: '#D4472D',
                tabBarInactiveTintColor: '#6B7280',
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={DashboardScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
                }}
            />
            <Tab.Screen
                name="NewOrder"
                component={CreateOrderScreen}
                options={{
                    tabBarLabel: 'New Order',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>➕</Text>,
                }}
            />
            {isSupervisor && (
                <Tab.Screen
                    name="Team"
                    component={TeamDashboardScreen}
                    options={{
                        tabBarLabel: 'Team',
                        tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text>,
                    }}
                />
            )}
            <Tab.Screen
                name="Earnings"
                component={EarningsScreen}
                options={{
                    tabBarLabel: 'Earnings',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>💰</Text>,
                }}
            />
            <Tab.Screen
                name="Clients"
                component={ClientsScreen}
                options={{
                    tabBarLabel: 'Clients',
                    tabBarIcon: () => <Text style={{ fontSize: 20 }}>👔</Text>,
                }}
            />
        </Tab.Navigator>
    );
}

export default function MainNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Tabs" component={TabNavigator} />
                <Stack.Screen name="Orders" component={OrdersScreen} />
                <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}