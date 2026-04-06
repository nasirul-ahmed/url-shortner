import { DeviceBreakdown } from '../interfaces';

/**
 * Normalize device breakdown to ensure all device types are present with default values
 */
export function normalizeDeviceBreakdown(
  deviceMap: Record<string, number>
): DeviceBreakdown {
  return {
    desktop: deviceMap.desktop || 0,
    mobile: deviceMap.mobile || 0,
    tablet: deviceMap.tablet || 0,
    unknown: deviceMap.unknown || 0,
  };
}
