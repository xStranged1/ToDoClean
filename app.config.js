export default {
  expo: {
    owner: "fedevalle",
    name: "appLimpieza",
    slug: "appLimpieza",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "com.fedevalle.appLimpieza",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    googleServicesFile: "./google-services.json",
    googleServiceInfoPlist: "./GoogleService-Info.plist",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      bundleIdentifier: "com.fedevalle.appLimpieza",
      googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST || "./GoogleService-Info.plist",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription:
          "appLimpieza necesita acceder a la cámara para que puedas subir tu foto de perfil y compartir imágenes.",
        NSPhotoLibraryUsageDescription:
          "appLimpieza necesita acceder a tus fotos para seleccionar imágenes y personalizar tu perfil.",
        NSPhotoLibraryAddUsageDescription:
          "appLimpieza necesita permiso para guardar imágenes en tu galería subir tu foto de perfil y crear posts..",
        NSMicrophoneUsageDescription:
          "appLimpieza necesita acceder al micrófono para grabar videos o audios dentro de la app.",
        NSUserNotificationUsageDescription:
          "appLimpieza usa notificaciones para informarte sobre entrenamientos, novedades y recordatorios.",
        NSFaceIDUsageDescription:
          "appLimpieza utiliza Face ID para proteger tu cuenta y facilitar el inicio de sesión.",
        NSDocumentsFolderUsageDescription:
          "appLimpieza necesita acceder a documentos para importar o compartir archivos.",
        NSDownloadsFolderUsageDescription:
          "appLimpieza necesita acceder a descargas para gestionar archivos seleccionados por el usuario."
      },
      "usesAppleSignIn": true
    },
    android: {
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.fedevalle.appLimpieza",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-asset",
      "expo-web-browser",
      "expo-secure-store",
      "expo-notifications",
      [
        "expo-navigation-bar",
        {
          "enforceContrast": true,
          "barStyle": "light",
          "visibility": "visible"
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "appLimpieza quiere acceder a tus imágenes para que puedas compartir una foto de perfil o crear un post",
          cameraPermission: "appLimpieza quiere acceder a la cámara para que puedas compartir una foto de perfil o crear un post"
        }
      ],
      ["expo-apple-authentication"]
    ],
    updates: {
      url: "https://u.expo.dev/6edb3003-f5b6-490d-afb8-fc29e2f4aeb7"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "6edb3003-f5b6-490d-afb8-fc29e2f4aeb7"
      },
      // Firebase
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,

      // API Config
      localApiUrl: process.env.EXPO_PUBLIC_LOCAL_API_URL || '172.28.64.1',
      localApiUrlNgrok: process.env.EXPO_PUBLIC_LOCAL_API_URL_NGROK || '',
      localApiPort: process.env.EXPO_PUBLIC_LOCAL_API_PORT || '8000',
      productionApiPort: process.env.EXPO_PUBLIC_PRODUCTION_API_PORT || '8000',
      environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development',
      productionApiUrl: process.env.EXPO_PUBLIC_PRODUCTION_API_URL || 'https://api.appLimpieza.com.ar',

      // Otros
      awsBucket: process.env.EXPO_PUBLIC_AWS_BUCKET || '',
      androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID || '',
      clientId: process.env.EXPO_PUBLIC_CLIENT_ID || '',
      iosId: process.env.EXPO_PUBLIC_IOS_ID || ''
    }
  }
}
