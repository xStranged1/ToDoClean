import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

import { useAuthStore } from '@/stores/authStore';

export default function TabsLayout() {
    const role = useAuthStore((s) => s.activeHouseRole);
    const isAdmin = role === 'owner' || role === 'admin';
    const activeHouseId = useAuthStore((s) => s.activeHouseId);

    return (
        <Tabs
            key={activeHouseId} // fuerza remount
            screenOptions={{ headerShown: false }}>
            <Tabs.Screen
                name="admin"
                options={{
                    href: isAdmin ? '/admin' : null,
                    title: 'Admin',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="crown" size={size} color={color} />),
                }}
            />
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="users"
                options={{
                    title: 'Usuarios',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="more"
                options={{
                    title: 'Más',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialIcons name="more-horiz" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}