import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const isWeb = () => !Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();
export const isAndroid = () => Capacitor.getPlatform() === 'android';
export const isIOS = () => Capacitor.getPlatform() === 'ios';

export const platformInfo = {
  isNative: isNativePlatform(),
  isWeb: isWeb(),
  platform: getPlatform(),
  isAndroid: isAndroid(),
  isIOS: isIOS(),
};

console.log('Platform Detection:', platformInfo);
