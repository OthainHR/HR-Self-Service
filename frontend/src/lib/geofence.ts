// Geofence helper for mobile auto drop-off
// This file centralises all BackgroundGeolocation configuration so UI code only needs to call initTracking()

import BackgroundGeolocation from '@transistorsoft/capacitor-background-geolocation';

/**
 * Initialise BackgroundGeolocation tracking & permissions.
 * – Requests the required runtime permissions (ALWAYS location).
 * – Configures sensible defaults for geofencing / tracking.
 * – Starts the service if it is not already enabled.
 */
export async function initTracking(): Promise<void> {
  try {
    const state = await BackgroundGeolocation.ready({
      // Geolocation config
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 30, // metres between updates
      stopTimeout: 5,

      // Application config
      stopOnTerminate: false, // continue tracking after app terminate
      startOnBoot: true,      // auto-start on device boot
      debug: false,
      logLevel: BackgroundGeolocation.LOG_LEVEL_ERROR,

      // iOS permission upgrade dialog (ALWAYS)
      backgroundPermissionRationale: {
        title: 'Allow "Always" Location Access?',
        message:
          'To automatically confirm your drop-off when you reach the gate, OthainESS needs access to your location even when the app is closed.',
        positiveAction: 'Allow Always',
        negativeAction: 'Not Now',
      },
    });

    // Start tracking if not already started
    if (!state.enabled) {
      await BackgroundGeolocation.start();
    }
  } catch (err) {
    console.error('[geofence] Failed to init tracking', err);
    throw err; // propagate so UI can react
  }
} 