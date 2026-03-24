// UserRow.tsx
import { Text } from '@/components/ui/text';
import * as React from 'react';
import { Pressable, View } from 'react-native';

export type UserState = 'active' | 'completed' | 'finished' | 'none';

export type UserRowProps = {
  name: string;
  inHome?: boolean;
  role?: string;
  canControl?: boolean;
  state?: UserState;
  sectors?: string[];
  onPress?: () => void;
  onLongPress?: () => void;
};

const STATE_DOT: Record<UserState, string> = {
  finished: 'bg-green-500',
  completed: 'bg-blue-500',
  active: 'bg-yellow-400',
  none: 'bg-muted-foreground/40',
};

const STATE_LABEL: Record<UserState, string> = {
  finished: 'Completo',
  completed: 'En progreso',
  active: 'Pendiente',
  none: 'Sin tareas',
};

export function UserRow({
  name,
  inHome,
  role,
  canControl,
  state = 'none',
  sectors = [],
  onPress,
  onLongPress,
}: UserRowProps) {
  const content = (
    <View className="rounded-xl border border-border bg-card p-4 gap-2">
      {/* Top row: name + state dot */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 flex-1 flex-shrink">
          {/* Crown for admins/controllers */}
          {canControl && (
            <Text className="text-base leading-none">👑</Text>
          )}
          <Text className="font-semibold text-base text-foreground flex-shrink" numberOfLines={1}>
            {name}
          </Text>
        </View>

        {/* State indicator */}
        <View className="flex-row items-center gap-1.5 ml-2">
          <View className={`w-2.5 h-2.5 rounded-full ${STATE_DOT[state]}`} />
          <Text className="text-xs text-muted-foreground">{STATE_LABEL[state]}</Text>
        </View>
      </View>

      {/* Second row: role + inHome badge */}
      <View className="flex-row items-center gap-2">
        {role && (
          <Text className="text-xs text-muted-foreground capitalize">{role}</Text>
        )}
        {inHome !== undefined && (
          <View
            className={`rounded-full px-2 py-0.5 ${inHome ? 'bg-green-500/15' : 'bg-muted/60'
              }`}
          >
            <Text
              className={`text-xs font-medium ${inHome ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
                }`}
            >
              {inHome ? 'En casa' : 'Fuera de casa'}
            </Text>
          </View>
        )}
      </View>

      {/* Sectors */}
      {sectors.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5 mt-0.5">
          {sectors.map((s) => (
            <View key={s} className="rounded-md bg-muted px-2 py-0.5">
              <Text className="text-xs text-muted-foreground">{s}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (!onPress && !onLongPress) return content;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
      className="active:opacity-70"
    >
      {content}
    </Pressable>
  );
}