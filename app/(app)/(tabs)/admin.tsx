import { Text } from '@/components/ui/text';
import { Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

export default function AdminMenuScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Admin' }} />
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-muted-foreground">Menu admin (placeholder)</Text>
      </View>
    </>
  );
}

