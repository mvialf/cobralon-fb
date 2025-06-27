// Mock para Firebase
// Esto permite probar componentes que dependen de Firebase sin conectarse a servicios reales

export const mockFirebaseUser = {
  uid: 'usuario-test-123',
  email: 'usuario-test@ejemplo.com',
  displayName: 'Usuario Test',
  photoURL: null,
  emailVerified: true,
};

// Mock para Firestore
export const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({
    docs: [],
    empty: true,
    forEach: jest.fn(),
  }),
  onSnapshot: jest.fn((callback) => {
    callback({
      docs: [],
      empty: true,
      forEach: jest.fn(),
    });
    return jest.fn(); // Función de desuscripción
  }),
  set: jest.fn().mockResolvedValue(true),
  update: jest.fn().mockResolvedValue(true),
  delete: jest.fn().mockResolvedValue(true),
  add: jest.fn().mockResolvedValue({ id: 'doc-test-123' }),
};

// Mock para Authentication
export const mockAuth = {
  currentUser: mockFirebaseUser,
  onAuthStateChanged: jest.fn((callback) => {
    callback(mockFirebaseUser);
    return jest.fn(); // Función de desuscripción
  }),
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockFirebaseUser }),
  createUserWithEmailAndPassword: jest.fn().mockResolvedValue({ user: mockFirebaseUser }),
  signOut: jest.fn().mockResolvedValue(true),
};
