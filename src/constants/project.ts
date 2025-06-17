// src/constants/project.ts
// Constantes relacionadas con proyectos y su gestión

export const UNINSTALL_TYPE_OPTIONS = ["Aluminio", "Madera", "Fierro", "PVC", "Americano"];

export const PROJECT_STATUS_OPTIONS = [
  'ingresado',
  'programar',
  'fabricación',
  'montaje',
  'sello',
  'continuación',
  'complicación',
  'completado',
] as const;

export type ProjectStatusConstant = typeof PROJECT_STATUS_OPTIONS[number];
