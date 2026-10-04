import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'be.trustpulse.app', appName: 'TrustPulse', webDir: 'dist',
  ios: { contentInset: 'never', preferredContentMode: 'mobile' },
};
export default config;
