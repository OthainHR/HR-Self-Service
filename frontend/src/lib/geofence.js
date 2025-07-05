// Geofence helper for mobile auto drop-off (JavaScript version)
import BackgroundGeolocation from '@transistorsoft/capacitor-background-geolocation';

// coordinates of office gate (replace with your own)
const DROP_OFF_COORD = { lat: 17.458968, lng: 78.372215 };

export async function initTracking() {
  try {
    const state = await BackgroundGeolocation.ready({
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 30,
      stopTimeout: 5,
      stopOnTerminate: false,
      startOnBoot: true,
      debug: false,
      logLevel: BackgroundGeolocation.LOG_LEVEL_ERROR,
      backgroundPermissionRationale: {
        title: 'Allow "Always" Location Access?',
        message:
          'To automatically confirm your drop-off when you reach the gate, OthainESS needs access to your location even when the app is closed.',
        positiveAction: 'Allow Always',
        negativeAction: 'Not Now',
      },
    });

    // Native geofence registration
    await BackgroundGeolocation.addGeofence({
      identifier: 'drop-off',
      radius: 50,
      latitude: DROP_OFF_COORD.lat,
      longitude: DROP_OFF_COORD.lng,
      notifyOnEntry: true,
      notifyOnExit: false,
    });

    // Bridge native event -> browser event
    BackgroundGeolocation.onGeofence((event) => {
    if (event.identifier === 'drop-off' && event.action === 'ENTER') {
        window.dispatchEvent(new CustomEvent('ReachedDropoff'));
      }
    });

    if (!state.enabled) {
      await BackgroundGeolocation.start();
    }
  } catch (err) {
    console.error('[geofence] init error', err);
    throw err;
  }
} 