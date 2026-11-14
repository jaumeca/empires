import type { CapacitorConfig } from '@capacitor/cli';

// Native packaging (D-007). Platforms are not added yet: see docs/ARCHITECTURE.md §13
// for the steps (requires Android Studio / Xcode and real devices, F1.11).
const config: CapacitorConfig = {
  appId: 'top.expires.empires',
  appName: 'EMPIRES',
  webDir: 'dist',
  backgroundColor: '#f6d9c4',
};

export default config;
