Boomer — Plain-English Internet Trends (Expo SDK 53)
Minimal Expo React Native app scaffolded from a Notion “Project” entry. Targets iOS with EAS Build, using only the requested packages.
Quick start
# 1) Install
npm i

# 2) Run locally (Expo Go / simulator)
npm start
# press 'i' to open iOS simulator, or scan the QR with Expo Go (iOS)

# Notes
# - Local (scheduled) notifications can be tested in Expo Go.
# - For push tokens / remote notifications and new-arch native modules,
#   use a Development Build via EAS Build (see below).
Build in the cloud with EAS
# Log in and init if needed
npx expo login
npx eas login
npx eas project:init   # get the EAS projectId and paste into app.json

# iOS build (preview)
npx eas build --platform ios --profile preview

# iOS build (production)
npx eas build --platform ios --profile production
TestFlight (manual submit)
Create your App Store Connect app (Bundle ID: com.{myname}.boomer-plain-english-trends).
Build with --profile production. After it finishes, upload the .ipa from the EAS web UI to App Store Connect (or use eas submit after adding ascAppId).
Add testers, fill compliance, and submit for review.
Optional auto-submit: add your ascAppId to eas.json under submit.production.ios.ascAppId and run npx eas submit -p ios --profile production.
Project notes
Expo SDK 53 pairs with React Native 0.79 and React 19. New Architecture is default. 
Expo
expo-notifications: push on Android is not supported in Expo Go in SDK 53; use a dev build. Local scheduling works. 
Expo Documentation
lucide-react-native requires react-native-svg (installed). 
Lucide
expo-web-browser opens external explainers in-app. 
Expo Documentation
What’s implemented
Tabs: Home • Search • Favorites • Settings
Screens: Onboarding (modal), Detail, About & Sources (from Settings)
High-contrast dark UI, accent #24D3A8
Favorites via AsyncStorage
Daily digest toggle (9:00 AM) using expo-notifications
Micro-haptics on saves/toggles
External links open with expo-web-browser
Fill these before production
extra.eas.projectId in app.json (TODO placeholder).
App icon/splash under ./assets/ (paths exist; add your files).
App Store metadata & privacy nutrition labels.
References
Expo SDK 53 changelog: React Native 0.79, React 19, New Arch default. 
Expo
Notifications docs & config plugin. 
Expo Documentation
WebBrowser docs. 
Expo Documentation
Lucide React Native + SVG requirement. 
Lucide
React Native 0.79 post. 
React Native
License: MIT (you may adapt freely)
