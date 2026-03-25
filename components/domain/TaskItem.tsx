import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export type TaskStatus = 'pending' | 'completed' | 'verified';

export type TaskItemProps = {
  title: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  checkboxDisabled?: boolean;
  subtitle?: string;
  description?: string;
  status?: TaskStatus;
};

const STATUS_DOT: Record<TaskStatus, string> = {
  verified: 'bg-green-500',
  completed: 'bg-blue-500',
  pending: 'bg-yellow-400',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  verified: 'Controlada',
  completed: 'Completada',
  pending: 'Pendiente',
};

const STATUS_BADGE_BG: Record<TaskStatus, string> = {
  verified: 'bg-green-500/15',
  completed: 'bg-blue-500/15',
  pending: 'bg-yellow-400/15',
};

const STATUS_BADGE_TEXT: Record<TaskStatus, string> = {
  verified: 'text-green-700 dark:text-green-400',
  completed: 'text-blue-700 dark:text-blue-400',
  pending: 'text-yellow-700 dark:text-yellow-400',
};

export function TaskItem(props: TaskItemProps) {
  const status = props.status ?? 'pending';

  return (
    <View className="rounded-xl border border-border bg-card p-3 gap-2">
      {/* Top row: title + status badge */}
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-medium text-foreground flex-1" numberOfLines={2}>
          {props.title}
        </Text>

        {/* Status badge */}
        <View className={`flex-row items-center gap-1.5 rounded-full px-2 py-0.5 ${STATUS_BADGE_BG[status]}`}>
          <View className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
          <Text className={`text-xs font-medium ${STATUS_BADGE_TEXT[status]}`}>
            {STATUS_LABEL[status]}
          </Text>
        </View>
      </View>

      {/* Bottom row: subtitle + info tooltip + checkbox */}
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          {!!props.subtitle && (
            <Text className="text-xs text-muted-foreground">{props.subtitle}</Text>
          )}
        </View>

        <View className="flex-row items-center gap-3">
          {!!props.description && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Pressable hitSlop={8}>
                  <Icon as={InfoIcon} className="text-muted-foreground size-4" />
                </Pressable>
              </TooltipTrigger>
              <TooltipContent side="top">
                <Text>{props.description}</Text>
              </TooltipContent>
            </Tooltip>
          )}
          <Checkbox
            checked={!!props.checked}
            disabled={props.checkboxDisabled}
            onCheckedChange={(v) => props.onCheckedChange?.(!!v)}
          />
        </View>
      </View>
    </View>
  );
}