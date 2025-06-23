import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export type VisitStatus = 'Ingresada' | 'Agendada' | 'Reagendada' | 'Completada' | 'Cancelada';

export interface Visit {
  id?: string;
  name: string;
  phone: string;
  address?: string;
  municipality?: string;
  status: VisitStatus;
  scheduledDate: Date;
  notes?: string;
  fullAddress?: {
    textoCompleto?: string;
    coordenadas?: {
      latitude: number;
      longitude: number;
    };
    componentes?: {
      calle?: string;
      numero?: string;
      comuna?: string;
      ciudad?: string;
      region?: string;
      pais?: string;
      codigoPostal?: string;
    };
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const VISITS_COLLECTION = 'visits';

/**
 * Agrega una nueva visita a Firestore
 */
export const addVisit = async (visitData: Omit<Visit, 'id' | 'createdAt' | 'updatedAt'> & { address?: string; municipality?: string }) => {
  try {
    const docRef = await addDoc(collection(db, VISITS_COLLECTION), {
      ...visitData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, ...visitData };
  } catch (error) {
    console.error('Error al agregar visita:', error);
    throw new Error('No se pudo agregar la visita');
  }
};

/**
 * Obtiene todas las visitas de Firestore
 */
export const getVisits = async (): Promise<Visit[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, VISITS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convertir Firestore Timestamp a Date
      scheduledDate: doc.data().scheduledDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Visit[];
  } catch (error) {
    console.error('Error al obtener visitas:', error);
    throw new Error('No se pudieron cargar las visitas');
  }
};

/**
 * Elimina una visita de Firestore
 */
export const deleteVisit = async (visitId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, VISITS_COLLECTION, visitId));
  } catch (error) {
    console.error('Error al eliminar la visita:', error);
    throw new Error('No se pudo eliminar la visita');
  }
};

/**
 * Agrega visitas de ejemplo a Firestore
 * Solo se debe usar para desarrollo/pruebas
 */
export const seedExampleVisits = async () => {
  const exampleVisits: Omit<Visit, 'id'>[] = [
    {
      name: 'Juan Pérez',
      phone: '+56 9 1234 5678',
      address: 'Av. Principal 1234, Santiago',
      municipality: 'Santiago',
      status: 'Agendada',
      scheduledDate: new Date(2025, 5, 20, 10, 30),
      notes: 'Cliente interesado en departamento de 2 dormitorios',
      createdAt: new Date(2025, 5, 15),
      updatedAt: new Date(2025, 5, 15),
    },
    {
      name: 'María González',
      phone: '+56 9 8765 4321',
      address: 'Calle Falsa 123, Providencia',
      municipality: 'Providencia',
      status: 'Ingresada',
      scheduledDate: new Date(2025, 5, 22, 15, 0),
      notes: 'Desea información sobre créditos hipotecarios',
      createdAt: new Date(2025, 5, 16),
      updatedAt: new Date(2025, 5, 16),
    },
    {
      name: 'Carlos Muñoz',
      phone: '+56 9 5555 1234',
      address: 'Los Aromos 456, Ñuñoa',
      municipality: 'Ñuñoa',
      status: 'Completada',
      scheduledDate: new Date(2025, 5, 18, 11, 0),
      notes: 'Visita completada con éxito, interesado en financiamiento',
      createdAt: new Date(2025, 5, 10),
      updatedAt: new Date(2025, 5, 18),
    },
  ];

  try {
    // Verificar si ya existen visitas
    const existingVisits = await getVisits();
    if (existingVisits.length > 0) {
      console.log('Ya existen visitas en la base de datos. No se agregaron datos de ejemplo.');
      return { success: false, message: 'Ya existen visitas en la base de datos' };
    }

    // Agregar visitas de ejemplo
    const results = [];
    for (const visit of exampleVisits) {
      const result = await addVisit(visit);
      results.push(result);
    }

    console.log('Visitas de ejemplo agregadas correctamente:', results);
    return { success: true, data: results };
  } catch (error) {
    console.error('Error al agregar visitas de ejemplo:', error);
    return { success: false, error };
  }
};
