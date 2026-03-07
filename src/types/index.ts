export const devices = {
    CONSOLE: 'console',
    DESKTOP: 'desktop',
    EMBEDDED: 'embedded',
    MOBILE: 'mobile',
    SMARTTV: 'smarttv',
    TABLET: 'tablet',
    WEARABLE: 'wearable',
    XR: 'xr',
    UNKNOWN: 'unknown',
} as const;

export type DeviceType = typeof devices[keyof typeof devices];