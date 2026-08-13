import { ChildProfileScreen, useAuth } from '@bogcha/mobile-core';
import { Permission } from '@bogcha/shared';
import { useLocalSearchParams } from 'expo-router';

export default function AdminChildProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  return <ChildProfileScreen childId={id} showFinance={can(Permission.PAYMENT_VIEW)} />;
}
