/**
 * Utility to detect device and browser information
 */

interface DeviceInfo {
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  browser: string;
  os: string;
  fullUserAgent: string;
}

/**
 * Get detailed information about the user's device and browser
 */
export function getDeviceInfo(): DeviceInfo {
  // Get the userAgent and platform
  const userAgent = navigator.userAgent;
  const platform = navigator.platform || '';

  // Determine device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
  
  let deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  if (isTablet) {
    deviceType = 'Tablet';
  } else if (isMobile) {
    deviceType = 'Mobile';
  } else {
    deviceType = 'Desktop';
  }

  // Determine OS
  let os = 'Unknown';
  if (/Windows/i.test(userAgent)) {
    os = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
    os = 'Mac OS';
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    os = 'iOS';
  } else if (/Android/i.test(userAgent)) {
    os = 'Android';
  } else if (/Linux/i.test(userAgent)) {
    os = 'Linux';
  }

  // Determine browser - order is important here!
  // We check for Edge/Edg before Chrome since Edge includes Chrome in its user agent
  let browser = 'Unknown';
  if (/Edg\//i.test(userAgent)) {
    browser = 'Microsoft Edge';
  } else if (/MSIE|Trident/i.test(userAgent)) {
    browser = 'Internet Explorer';
  } else if (/Firefox/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/Chrome/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(userAgent)) {
    browser = 'Safari';
  } else if (/Opera|OPR/i.test(userAgent)) {
    browser = 'Opera';
  }

  return {
    deviceType,
    browser,
    os,
    fullUserAgent: userAgent
  };
}

/**
 * Get a formatted string of the device information
 */
export function getFormattedDeviceInfo(): string {
  const { deviceType, browser, os } = getDeviceInfo();
  return `${os} • ${deviceType} • ${browser}`;
} 