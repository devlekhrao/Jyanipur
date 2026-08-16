import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const triggerLightHaptic = async () => {
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch (error) {
    // Fails silently if running in a standard desktop web browser
    // so it won't crash your app!
  }
};

export const triggerSuccessHaptic = async () => {
  try {
    await Haptics.notification({ type: 'SUCCESS' });
  } catch (error) {}
};