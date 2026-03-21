import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text } from 'react-native';
import DashboardScreen from '../screens/DashboardScreen';
import ClientsScreen from '../screens/ClientsScreen';
import CreateOrderScreen from '../screens/CreateOrderScreen';
import EarningsScreen from '../screens/EarningsScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#131A16',
                    borderTopColor: '#2D3A31',
                    borderTopWidth: 1,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
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
                    tabBarIcon: () => <View><Text style={{ fontSize: 20 }}>🏠</Text></View>,
                }}
            />
            <Tab.Screen
                name="NewOrder"
                component={CreateOrderScreen}
                options={{
                    tabBarLabel: 'New Order',
                    tabBarIcon: () => <View><Text style={{ fontSize: 20 }}>➕</Text></View>,
                }}
            />
            <Tab.Screen
                name="Earnings"
                component={EarningsScreen}
                options={{
                    tabBarLabel: 'Earnings',
                    tabBarIcon: () => <View><Text style={{ fontSize: 20 }}>💰</Text></View>,
                }}
            />
            <Tab.Screen
                name="Clients"
                component={ClientsScreen}
                options={{
                    tabBarLabel: 'Clients',
                    tabBarIcon: () => <View><Text style={{ fontSize: 20 }}>👥</Text></View>,
                }}
            />
        </Tab.Navigator>
    );
}

function MainStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen name="Orders" component={OrdersScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        </Stack.Navigator>
    );
}

export default function MainNavigator() {
    return (
        <NavigationContainer>
            <MainStack />
        </NavigationContainer>
    );
}