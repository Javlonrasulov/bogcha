import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Column,
  EmptyState,
  ErrorState,
  NotificationCard,
  RealtimeEvent,
  Screen,
  Segmented,
  SkeletonList,
  useApi,
  useI18n,
  useRealtimeRefresh,
  useResource,
  useTheme,
} from '@bogcha/mobile-core';
import type { NotificationList } from '@bogcha/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

type Filter = 'all' | 'unread';

/**
 * Bildirishnomalar — desktop Lider Manager NotificationsScreen uslubi:
 * violet unread kartalar, tur bo‘yicha ikon, “hammasini o‘qish” gradient tugma.
 */
export default function NotificationsScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const api = useApi();
  const [filter, setFilter] = useState<Filter>('all');
  const [busy, setBusy] = useState(false);

  const list = useResource<NotificationList>(
    `/notifications?limit=50${filter === 'unread' ? '&unreadOnly=true' : ''}`,
    `notifications.${filter}`,
  );

  useRealtimeRefresh([RealtimeEvent.NOTIFICATION_CREATED], list.refresh);

  const markAllRead = async () => {
    setBusy(true);
    try {
      await api.post('/notifications/read-all', {});
      await list.refresh();
    } finally {
      setBusy(false);
    }
  };

  const markRead = async (id: string) => {
    await api.post(`/notifications/${id}/read`, {});
    await list.refresh();
  };

  const items = list.data?.items ?? [];
  const unread = list.data?.unreadCount ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Screen refreshing={list.refreshing} onRefresh={list.refresh}>
        <Segmented
          options={[
            { value: 'all' as Filter, label: t.common.all },
            { value: 'unread' as Filter, label: `${t.notifications.unread} (${unread})` },
          ]}
          value={filter}
          onChange={setFilter}
        />

        {unread > 0 ? (
          <Pressable
            onPress={() => void markAllRead()}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={t.notifications.markAllRead}
            style={({ pressed }) => ({
              opacity: busy ? 0.7 : pressed ? 0.9 : 1,
              borderRadius: 13,
              overflow: 'hidden',
            })}
          >
            <LinearGradient
              colors={['#6C5CE7', '#A66BFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 44,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
              <AppText variant="label" weight="800" style={{ color: '#fff', fontSize: 13 }}>
                {busy ? '…' : t.notifications.markAllRead}
              </AppText>
            </LinearGradient>
          </Pressable>
        ) : null}

        {list.loading && !list.data ? (
          <SkeletonList rows={8} />
        ) : !list.data ? (
          <ErrorState
            message={list.error ?? t.common.loadFailed}
            onRetry={list.refresh}
            retryLabel={t.common.retry}
          />
        ) : items.length === 0 ? (
          <EmptyState icon="🔔" title={t.notifications.empty} />
        ) : (
          <Column gap={10}>
            {items.map((item) => {
              const isUnread = !item.readAt;
              return (
                <NotificationCard
                  key={item.id}
                  title={item.title}
                  message={item.message}
                  createdAt={item.createdAt}
                  severity={item.severity}
                  kind={item.kind}
                  unread={isUnread}
                  onPress={isUnread ? () => void markRead(item.id) : undefined}
                />
              );
            })}
          </Column>
        )}
      </Screen>
    </View>
  );
}
