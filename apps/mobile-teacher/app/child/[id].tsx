import { ChildProfileScreen } from '@bogcha/mobile-core';
import { useLocalSearchParams } from 'expo-router';

export default function TeacherChildProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChildProfileScreen childId={id} />;
}
