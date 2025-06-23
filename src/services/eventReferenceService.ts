// src/services/eventReferenceService.ts

import { db } from '@/lib/firebase/client';
import { collection, getDocs, query, where, Firestore } from 'firebase/firestore';
import type { ProjectType } from '@/types/project';
import type { AfterSales } from '@/types/afterSales';
import type { Visit } from '@/services/visitService';

// Tipo para referencias disponibles
export type ReferenceItem = {
  id: string;
  name: string; // Nombre o título descriptivo
  status?: string; // Estado actual
  type: 'Proyecto' | 'Postventa' | 'Visita';
};

/**
 * Obtiene todos los proyectos disponibles para eventos
 */
export async function getProjectReferences(firestore: Firestore = db): Promise<ReferenceItem[]> {
  try {
    const projectsRef = collection(firestore, 'projects');
    const snapshot = await getDocs(projectsRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as ProjectType;
      return {
        id: doc.id,
        name: data.projectNumber || data.clientName || `Proyecto ${doc.id.substring(0, 5)}`,
        status: data.status,
        type: 'Proyecto' as const
      };
    });
  } catch (error) {
    console.error('Error al obtener referencias de proyectos:', error);
    return [];
  }
}

/**
 * Obtiene todos los servicios de postventa disponibles para eventos
 */
export async function getAfterSalesReferences(firestore: Firestore = db): Promise<ReferenceItem[]> {
  try {
    const afterSalesRef = collection(firestore, 'afterSales');
    const snapshot = await getDocs(afterSalesRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as AfterSales;
      return {
        id: doc.id,
        name: data.description || `Postventa ${doc.id.substring(0, 5)}`,
        status: data.afterSalesStatus,
        type: 'Postventa' as const
      };
    });
  } catch (error) {
    console.error('Error al obtener referencias de postventa:', error);
    return [];
  }
}

/**
 * Obtiene todas las visitas disponibles para eventos
 */
export async function getVisitReferences(firestore: Firestore = db): Promise<ReferenceItem[]> {
  try {
    const visitsRef = collection(firestore, 'visits');
    const snapshot = await getDocs(visitsRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as Visit;
      return {
        id: doc.id,
        name: data.name || `Visita ${doc.id.substring(0, 5)}`,
        status: data.status,
        type: 'Visita' as const
      };
    });
  } catch (error) {
    console.error('Error al obtener referencias de visitas:', error);
    return [];
  }
}

/**
 * Obtiene todas las referencias disponibles según el tipo seleccionado
 */
export async function getReferencesByType(
  type: 'Proyecto' | 'Postventa' | 'Visita',
  firestore: Firestore = db
): Promise<ReferenceItem[]> {
  switch (type) {
    case 'Proyecto':
      return getProjectReferences(firestore);
    case 'Postventa':
      return getAfterSalesReferences(firestore);
    case 'Visita':
      return getVisitReferences(firestore);
    default:
      return [];
  }
}

/**
 * Obtiene una referencia específica por su ID y tipo
 */
export async function getReferenceById(
  id: string,
  type: 'Proyecto' | 'Postventa' | 'Visita',
  firestore: Firestore = db
): Promise<ReferenceItem | null> {
  try {
    let collectionName: string;
    
    switch (type) {
      case 'Proyecto':
        collectionName = 'projects';
        break;
      case 'Postventa':
        collectionName = 'afterSales';
        break;
      case 'Visita':
        collectionName = 'visits';
        break;
      default:
        return null;
    }
    
    const references = await getReferencesByType(type, firestore);
    return references.find(ref => ref.id === id) || null;
  } catch (error) {
    console.error(`Error al obtener referencia por ID ${id}:`, error);
    return null;
  }
}
