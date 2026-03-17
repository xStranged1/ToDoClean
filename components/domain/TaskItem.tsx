import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export type TaskItemProps = {
  title: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  subtitle?: string;
  description?: string;
};

export function TaskItem(props: TaskItemProps) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-lg border border-border p-3">
      <View className="flex-1">
        <Text className="font-medium">{props.title}</Text>
        {!!props.subtitle && <Text className="text-sm text-muted-foreground">{props.subtitle}</Text>}
      </View>
      <View className="flex-row items-center gap-3">
        {!!props.description && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Pressable hitSlop={8}>
                <Icon as={InfoIcon} className="text-muted-foreground size-5" />
              </Pressable>
            </TooltipTrigger>
            <TooltipContent side="top">
              <Text>{props.description}</Text>
            </TooltipContent>
          </Tooltip>
        )}
        <Checkbox checked={!!props.checked} onCheckedChange={(v) => props.onCheckedChange?.(!!v)} />
      </View>
    </View>
  );
}

