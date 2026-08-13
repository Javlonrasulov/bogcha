import { LoginScreen } from '@bogcha/mobile-core';
import { APP_VERSION } from '../src/config';

export default function Login() {
  return <LoginScreen icon="stats-chart" version={APP_VERSION} />;
}
