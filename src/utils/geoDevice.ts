import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import { DeviceType, IGeoInfo, IDeviceInfo } from '../interfaces';

export function getGeoInfo(ip: string): IGeoInfo {
  try {
    // Strip IPv6 prefix from mapped IPv4 addresses
    const cleanIp = ip.replace(/^::ffff:/, '');
    const geo = geoip.lookup(cleanIp);
    if (!geo) return { country: 'Unknown', countryCode: 'XX' };
    return {
      country: geo.country || 'Unknown',
      countryCode: geo.country || 'XX',
    };
  } catch {
    return { country: 'Unknown', countryCode: 'XX' };
  }
}

export function getDeviceInfo(userAgent: string): IDeviceInfo {
  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const deviceType = result.device.type as string | undefined;

    let device: DeviceType = 'desktop';
    if (deviceType === 'mobile') device = 'mobile';
    else if (deviceType === 'tablet') device = 'tablet';
    else if (deviceType) device = 'unknown';

    return {
      device,
      platform: result.os.name || 'Unknown',
      browser: result.browser.name || 'Unknown',
    };
  } catch {
    return { device: 'unknown', platform: 'Unknown', browser: 'Unknown' };
  }
}

export function extractIp(headers: Record<string, string | string[] | undefined>, remoteAddress: string): string {
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first.trim();
  }
  return remoteAddress || '0.0.0.0';
}
