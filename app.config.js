import 'dotenv/config';

export default {
  expo: {
    name: "OneWord",
    slug: "oneword",
    owner: "jjdog711",
    orientation: "portrait",
    plugins: [
      "expo-router",
      "expo-notifications",
      "expo-secure-store",
      "expo-dev-client",
      "expo-asset"
    ],
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    android: {
      package: "com.jjdog711.oneword",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    ios: {
      bundleIdentifier: "com.jjdog711.oneword"
    },
    web: {
      bundler: "metro"
    },
    scheme: "oneword",
    extra: {
      router: {},
      eas: {
        projectId: "1b8b765a-7b0e-48c1-82bf-755dda73710c"
      },
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_EXPO_PUSH_URL: process.env.EXPO_PUBLIC_EXPO_PUSH_URL
    }
  }
};
