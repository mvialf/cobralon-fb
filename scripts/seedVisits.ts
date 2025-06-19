import { seedExampleVisits } from '../src/services/visitService';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from '../src/lib/firebase/config';

// Verificar la configuración de Firebase
if (!isFirebaseConfigured) {
  console.error('❌ Error: La configuración de Firebase no es válida. Por favor, verifica tus variables de entorno.');
  process.exit(1);
}

// Inicializar Firebase
console.log('🔌 Inicializando Firebase...');
try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log('✅ Firebase inicializado correctamente');
} catch (error) {
  console.error('❌ Error al inicializar Firebase:', error);
  process.exit(1);
}

// Función para sembrar datos de ejemplo
async function runSeed() {
  console.log('🌱 Iniciando siembra de datos de ejemplo para visitas...');
  
  try {
    console.log('⏳ Ejecutando seedExampleVisits...');
    const result = await seedExampleVisits();
    
    if (result.success) {
      console.log('✅ Datos de ejemplo procesados exitosamente');
      if (result.data && result.data.length > 0) {
        console.log(`✅ Se procesaron ${result.data.length} visitas de ejemplo`);
        result.data.forEach((visit, index) => {
          console.log(`   ${index + 1}. ${visit.name} (${visit.status})`);
        });
      }
    } else {
      console.log('ℹ️ ' + (result.message || 'No se agregaron nuevos datos de ejemplo'));
    }
  } catch (error) {
    console.error('❌ Error al sembrar datos de ejemplo:');
    if (error instanceof Error) {
      console.error(`   ${error.name}: ${error.message}`);
      if (error.stack) {
        console.error('   ' + error.stack.split('\n')[1]);
      }
    } else {
      console.error(error);
    }
  } finally {
    console.log('🏁 Proceso de siembra finalizado');
    process.exit(0);
  }
}

// Ejecutar el script
runSeed();
