import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Avatar,
  Badge,
  Card,
  Column,
  ListCard,
  ListRow,
  Row,
  Screen,
  SectionHeader,
  spacing,
  useAuth,
  useI18n,
  useTheme,
} from '@bogcha/mobile-core';
import { Permission } from '@bogcha/shared';
import { useRouter, type Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { ScreenHeader } from '../../src/components/screen-header';

interface MenuItem {
  href: Href;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Kamida bitta ruxsat kerak. */
  permissions: Permission[];
}

/**
 * Qo'shimcha menyu — web admin nav bilan mos:
 * bolalar, mahsulotlar sarfi, to'lovlar, qarzdorlik, bildirishnomalar + sozlamalar.
 */
export default function MoreScreen() {
  const { user, can, signOut } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  const sections: Array<{ title: string; items: MenuItem[] }> = [
    {
      title: t.children.title,
      items: [
        {
          href: '/children',
          label: t.children.title,
          icon: 'people-outline',
          permissions: [Permission.CHILD_VIEW],
        },
      ],
    },
    {
      title: t.inventory.title,
      items: [
        {
          href: '/food-consumption',
          label: t.foodConsumption.title,
          icon: 'restaurant-outline',
          permissions: [
            Permission.PRODUCT_VIEW,
            Permission.RECIPE_VIEW,
            Permission.STOCK_VIEW,
          ],
        },
      ],
    },
    {
      title: t.finance.title,
      items: [
        {
          href: '/payments',
          label: t.finance.payments,
          icon: 'card-outline',
          permissions: [Permission.PAYMENT_VIEW],
        },
        {
          href: '/debts',
          label: t.finance.debts,
          icon: 'alert-circle-outline',
          permissions: [Permission.DEBT_VIEW],
        },
      ],
    },
    {
      title: t.notifications.title,
      items: [
        {
          href: '/notifications',
          label: t.notifications.title,
          icon: 'notifications-outline',
          permissions: [Permission.NOTIFICATION_VIEW],
        },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScreenHeader title={t.common.more} showBranchPicker={false} />

      <Screen>
        <Card>
          <Row gap={spacing.md}>
            <Avatar name={user?.fullName ?? '—'} size={52} />
            <Column gap={spacing.xs} style={{ flex: 1 }}>
              <AppText variant="heading" numberOfLines={1}>
                {user?.fullName}
              </AppText>
              <AppText variant="caption" tone="muted">
                {user?.phone}
              </AppText>
              <Row gap={spacing.xs} wrap>
                {(user?.roles ?? []).map((role) => (
                  <Badge key={role} tone="brand" label={role} />
                ))}
              </Row>
            </Column>
          </Row>
        </Card>

        {sections.map((section) => {
          const visible = section.items.filter((item) => can(...item.permissions));
          if (visible.length === 0) return null;

          return (
            <Column key={section.title} gap={spacing.sm}>
              <SectionHeader title={section.title} />
              <ListCard>
                {visible.map((item, index) => (
                  <ListRow
                    key={String(item.href)}
                    title={item.label}
                    leading={
                      <Ionicons name={item.icon} size={20} color={colors.contentSecondary} />
                    }
                    trailing={
                      <Ionicons name="chevron-forward" size={18} color={colors.contentMuted} />
                    }
                    onPress={() => router.push(item.href)}
                    last={index === visible.length - 1}
                  />
                ))}
              </ListCard>
            </Column>
          );
        })}

        <SectionHeader title={t.settings.title} />
        <ListCard>
          <ListRow
            title={t.settings.title}
            leading={<Ionicons name="settings-outline" size={20} color={colors.contentSecondary} />}
            trailing={<Ionicons name="chevron-forward" size={18} color={colors.contentMuted} />}
            onPress={() => router.push('/settings')}
          />
          <ListRow
            title={t.auth.signOut}
            leading={<Ionicons name="log-out-outline" size={20} color={colors.danger} />}
            onPress={() => void signOut()}
            last
          />
        </ListCard>
      </Screen>
    </View>
  );
}
