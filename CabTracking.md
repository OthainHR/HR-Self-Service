# Othain ESS — Mobile Wrapper & Geofencing Drop‑Off

> **Goal:** Give employees a *hands‑free* way to confirm they’ve been dropped off at their drop off locations, while keeping the existing React + Python web stack on Render intact.

---

## 1 · Why this exists

The browser’s Geolocation API stops in the background, so pure web tracking misses most events. Wrapping the React build with **Capacitor** lets us tap iOS/Android geofencing APIs without rewriting the UI.

---

## 2 · Repo layout

```text
root/
├─ frontend/          # React SPA (existing)
├─ backend/          # FastAPI backend (existing)
├─ mobile/       # Capacitor config + native projects (generated)
└─ .github/
    └─ workflows/
       ├─ web-render.yml   # Continues to deploy to Render
       └─ mobile-tag.yml   # Builds iOS/Android on Git tags
```

> The heavy `mobile/ios` & `mobile/android` folders are **git‑ignored**; CI regenerates them.

---

## 3 · Prerequisites

| Item                     | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| **macOS + Xcode**        | Required once to compile and sign iOS builds. |
| **Android Studio**       | Android SDK & signing tools.                  |
| **Apple Developer acct** |  US \$99/yr; D‑U‑N‑S® number needed.          |
| **Google Play acct**     |  US \$25 one‑time.                            |
| **Node ≥ 18 & npm**      | Builds React + Capacitor CLI.                 |
| **JDK 17**               | Android Gradle builds.                        |

---

## 4 · Local setup (one time)

```bash
# 1) Clone & install JS deps
npm --prefix frontend ci

# 2) Add Capacitor in /web
cd web
npm install @capacitor/core @capacitor/cli
npx cap init OthainESS ess.othain.com --web-dir=build
npm run build
npx cap add ios
npx cap add android

# 3) Move native projects under repo & ignore
mv ios android ../mobile/
echo -e "/mobile/ios\n/mobile/android" >> ../.gitignore
```

---

## 5 · Add background geofencing

```bash
npm install @transistorsoft/capacitor-background-geolocation
npx cap sync
```

Create `frontend/src/lib/geofence.ts` and paste `initTracking()`.
Call it from a settings/onboarding button labelled **Enable auto drop‑off**.

### Native permission text

* **iOS:** edit `mobile/ios/App/Info.plist`  → add `NSLocationAlwaysAndWhenInUseUsageDescription`.
* **Android:** edit `mobile/android/app/src/main/AndroidManifest.xml`  → add `ACCESS_FINE_LOCATION` & `ACCESS_BACKGROUND_LOCATION`.

Store these changes as patch files (see `mobile/ios-permissions.patch`).

---

## 6 · GitHub Actions

### 6.1  Web → Render (unchanged)

`web-render.yml` builds React & Python, then hits Render Deploy Hook.

### 6.2  Mobile tag build

`mobile-tag.yml` triggers on tags matching `mobile-v*`.

* macOS runner → builds `.ipa` and uploads to TestFlight.
* Linux runner → builds `.aab`, signs, uploads to Google Play Internal.

Secrets required:

* `APPLE_ID`, `APP_STORE_API_KEY`, `APP_STORE_API_ISSUER`  (Apple)
* `ANDROID_KEYSTORE`, `ANDROID_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD` (Android)

---

## 7 · Signing keys

1. **iOS:**

   * Create App ID `com.othain.ess` in Apple Dev portal.
   * Generate Distribution Certificate & Provisioning Profile.
2. **Android:**

   * `keytool -genkeypair -keystore othain.jks -alias ess` …
   * Encrypt `.jks` as Base64 and store in GitHub Secrets.

---

## 8 · Store assets & compliance

* Privacy Policy & ToS URLs (same as web).
  \* “Why we need your location” prompt text.
* Icons 1024×1024 & screenshots (5 per platform).
* HR/Legal: update employee notice + DPIA for precise location.

---

## 9 · Testing & rollout

1. Tag a test build: `git tag mobile-v0.1.0 && git push --tags`.
2. Install via TestFlight / Google Internal Testing.
3. Drive to the gate; confirm Supabase receives `/api/mark-drop`.
4. Fix edge cases, then submit to App Review & Production.

---

## 10 · Maintenance

* Bump version → new tag → CI builds & pushes.
* Keep permission text in sync with OS policy changes.
* Re‑submit when React/web deps change `ios`/`android` configs.

---

### Questions?

Open an issue or ping `@mobile-dev` on Slack.
