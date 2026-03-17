import { Checkbox } from '@/components/ui/checkbox';
import { Text } from '@/components/ui/text';
import * as React from 'react';
import { View } from 'react-native';

export type TaskItemProps = {
  title: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  subtitle?: string;
};

export function TaskItem(props: TaskItemProps) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-lg border border-border p-3">
      <View className="flex-1">
        <Text className="font-medium">{props.title}</Text>
        {!!props.subtitle && <Text className="text-sm text-muted-foreground">{props.subtitle}</Text>}
      </View>
      <Checkbox checked={!!props.checked} onCheckedChange={(v) => props.onCheckedChange?.(!!v)} />
    </View>
  );
}

