import { NativeTabs } from 'expo-router/unstable-native-tabs';
import * as React from 'react';

import { useAuthStore } from '@/stores/authStore';

export default function TabsLayout() {
    const role = useAuthStore((s) => s.activeHouseRole);
    const isAdmin = role === 'owner' || role === 'admin';

    return (
        <NativeTabs>
            {isAdmin && (
                <NativeTabs.Trigger name="admin">
                    <NativeTabs.Trigger.Icon sf="gear" md="settings" />
                    <NativeTabs.Trigger.Label>Admin</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>
            )}

            <NativeTabs.Trigger name="index">
                <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
                <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="users">
                <NativeTabs.Trigger.Icon sf="person.2.fill" md="group" />
                <NativeTabs.Trigger.Label>Usuarios</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}

