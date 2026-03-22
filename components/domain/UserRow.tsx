import { Text } from '@/components/ui/text';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export type UserRowProps = {
  name: string;
  subtitle?: string;
  onPress?: () => void;
};

export function UserRow(props: UserRowProps) {
  const content = (
    <View className="rounded-lg border border-border p-3">
      <Text className="font-medium">{props.name}</Text>
      {!!props.subtitle && <Text className="text-sm text-muted-foreground">{props.subtitle}</Text>}
    </View>
  );

  if (!props.onPress) return content;

  return (
    <Pressable onPress={props.onPress}>
      {content}
    </Pressable>
  );
}

