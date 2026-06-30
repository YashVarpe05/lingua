export default {
  expo: {
    name: "Lingua",
    slug: "lingua",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "lingua",
    userInterfaceStyle: "automatic",
    ios: {
      icon: "./assets/images/icon.png",
    },
    android: {
      package: "com.yashvarpe.lingua",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: "metro",
      output: "server",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 220,
          backgroundColor: "#FFF7E6",
        },
      ],
      "@clerk/expo",
      "expo-secure-store",
      "expo-web-browser",
      "expo-localization",
      [
        "expo-audio",
        {
          microphonePermission: "Allow $(PRODUCT_NAME) to record your voice for pronunciation practice.",
          recordAudioAndroid: true
        }
      ],
      "@stream-io/video-react-native-sdk",
      [
        "@config-plugins/react-native-webrtc",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera for video lessons.",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone for audio lessons."
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 24
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
      posthogHost: process.env.POSTHOG_HOST,
      eas: {
        projectId: "2b64dd4c-81c8-4c87-8d7b-ed55271ee436",
      },
    },
  },
};
