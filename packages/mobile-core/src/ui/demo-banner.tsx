import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useAuth } from '../api/auth-context';
import { useI18n } from '../i18n/provider';
import { useTheme } from '../theme/provider';
import { spacing } from '../theme/tokens';
import { AppText, Row } from './primitives';

/** Demo rejimda ekran ustida ko'rinadigan ogohlantirish. */
export function DemoBanner() {
  const { isDemo } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();

  if (!isDemo) return null;

  return (
    <View
      style={{
        backgroundColor: colors.warningSoft,
        borderBottomWidth: 1,
        borderBottomColor: colors.warning,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
      }}
    >
      <Row gap={spacing.xs} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
        <AppText variant="caption" weight="600" style={{ color: colors.warning }}>
          {t.auth.demoBanner}
        </AppText>
      </Row>
    </View>
  );
}
