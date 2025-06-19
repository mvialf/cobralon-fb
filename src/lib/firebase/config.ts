// Configuración de Firebase
// Valores por defecto para desarrollo (reemplazar con los valores reales en producción)
const defaultConfig = {
  apiKey: 'your-api-key',
  authDomain: 'your-project-id.firebaseapp.com',
  projectId: 'your-project-id',
  storageBucket: 'your-project-id.appspot.com',
  messagingSenderId: 'your-messaging-sender-id',
  appId: 'your-app-id',
  measurementId: 'G-XXXXXXXXXX',
} as const;

// Usar variables de entorno si están disponibles, de lo contrario usar valores por defecto
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || defaultConfig.appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || defaultConfig.measurementId,
} as const;

// Validar configuración en tiempo de ejecución
const validateFirebaseConfig = () => {
  const requiredConfig = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ] as const;

  const missingConfigs = requiredConfig.filter(
    (key) => !firebaseConfig[key] || firebaseConfig[key].includes('your-')
  );

  if (missingConfigs.length > 0) {
    const errorMessage = `Error: Configuración de Firebase incompleta. Faltan: ${missingConfigs.join(', ')}`;
    if (typeof window !== 'undefined') {
      console.error(errorMessage);
    } else {
      console.error('\x1b[31m%s\x1b[0m', errorMessage); // Colorear el mensaje de error en la consola
    }
    return false;
  }
  return true;
};

// Validar la configuración al cargar el módulo
const isFirebaseConfigured = validateFirebaseConfig();

export { isFirebaseConfigured };
