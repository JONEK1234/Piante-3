import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, isFirebaseMock, handleFirestoreError, OperationType } from './firebase';
import { Plant, ProgressLog } from './types';

// Fallback in-memory/localStorage manager
const LOCAL_PLANTS_KEY = 'plant_tracker_plants';
const LOCAL_LOGS_PREFIX = 'plant_tracker_logs_';

// Helper to safely parse Firestore Timestamps, even when they are pending local serverTimestamps
function safeConvertTimestamp(field: any, fallback: string): string;
function safeConvertTimestamp(field: any, fallback: undefined): string | undefined;
function safeConvertTimestamp(field: any, fallback: any): any {
  if (field && typeof field.toDate === 'function') {
    try {
      return field.toDate().toISOString();
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
}

function getLocalPlants(): Plant[] {
  try {
    const data = localStorage.getItem(LOCAL_PLANTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalPlants(plants: Plant[]) {
  localStorage.setItem(LOCAL_PLANTS_KEY, JSON.stringify(plants));
}

function getLocalLogs(plantId: string): ProgressLog[] {
  try {
    const data = localStorage.getItem(`${LOCAL_LOGS_PREFIX}${plantId}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalLogs(plantId: string, logs: ProgressLog[]) {
  localStorage.setItem(`${LOCAL_LOGS_PREFIX}${plantId}`, JSON.stringify(logs));
}

// Global Registry of subscribers for offline mock simulation
const offlinePlantListeners = new Set<(plants: Plant[]) => void>();
const offlineLogListeners = new Map<string, Set<(logs: ProgressLog[]) => void>>();

function notifyOfflinePlants() {
  const plants = getLocalPlants();
  offlinePlantListeners.forEach(listener => listener(plants));
}

function notifyOfflineLogs(plantId: string) {
  const logs = getLocalLogs(plantId);
  const listeners = offlineLogListeners.get(plantId);
  if (listeners) {
    listeners.forEach(listener => listener(logs));
  }
}

/**
 * Sync plant list. Returns unsubscribe function.
 */
export function subscribeToPlants(callback: (plants: Plant[]) => void): () => void {
  if (isFirebaseMock || !db) {
    offlinePlantListeners.add(callback);
    // Initial emission
    callback(getLocalPlants());
    return () => {
      offlinePlantListeners.delete(callback);
    };
  }

  const plantsPath = 'plants';
  const q = query(collection(db, plantsPath), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const plants: Plant[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Handle timestamp safely
      const createdAt = safeConvertTimestamp(data.createdAt, new Date().toISOString());
      const updatedAt = safeConvertTimestamp(data.updatedAt, undefined);
      plants.push({
        id: docSnap.id,
        name: data.name,
        nickname: data.nickname,
        startDate: data.startDate,
        description: data.description,
        imageUrl: data.imageUrl,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        createdAt,
        updatedAt,
        category: data.category || undefined
      });
    });
    callback(plants);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, plantsPath);
  });
}

/**
 * Sync progress logs for a specific plant. Returns unsubscribe function.
 */
export function subscribeToLogs(plantId: string, callback: (logs: ProgressLog[]) => void): () => void {
  if (isFirebaseMock || !db) {
    if (!offlineLogListeners.has(plantId)) {
      offlineLogListeners.set(plantId, new Set());
    }
    const listeners = offlineLogListeners.get(plantId)!;
    listeners.add(callback);
    // Initial emission
    callback(getLocalLogs(plantId));
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        offlineLogListeners.delete(plantId);
      }
    };
  }

  const logsPath = `plants/${plantId}/logs`;
  const q = query(collection(db, logsPath), orderBy('date', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const logs: ProgressLog[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAt = safeConvertTimestamp(data.createdAt, new Date().toISOString());
      logs.push({
        id: docSnap.id,
        date: data.date,
        imageUrl: data.imageUrl,
        notes: data.notes,
        status: data.status,
        createdAt
      });
    });
    callback(logs);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, logsPath);
  });
}

/**
 * Fetch a single plant directly (important for share logs)
 */
export function getSinglePlant(plantId: string, callback: (plant: Plant | null) => void): () => void {
  if (isFirebaseMock || !db) {
    const match = getLocalPlants().find(p => p.id === plantId) || null;
    callback(match);
    return () => {};
  }

  const docPath = `plants/${plantId}`;
  return onSnapshot(doc(db, 'plants', plantId), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const data = snapshot.data()!;
    const createdAt = safeConvertTimestamp(data.createdAt, new Date().toISOString());
    callback({
      id: snapshot.id,
      name: data.name,
      nickname: data.nickname,
      startDate: data.startDate,
      description: data.description,
      imageUrl: data.imageUrl,
      ownerId: data.ownerId,
      ownerName: data.ownerName,
      createdAt,
      category: data.category || undefined
    });
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, docPath);
  });
}

// Helper to replace any undefined values with null for safe Firestore storage
function sanitizeFirestoreData<T extends object>(data: T): T {
  const sanitized = { ...data } as any;
  Object.keys(sanitized).forEach((key) => {
    if (sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
}

/**
 * Create a new plant log
 */
export async function createPlant(plant: Omit<Plant, 'id' | 'createdAt'>): Promise<string> {
  if (isFirebaseMock || !db) {
    const plants = getLocalPlants();
    const newId = 'offline_plant_' + Date.now();
    const newPlant: Plant = {
      ...plant,
      id: newId,
      createdAt: new Date().toISOString()
    };
    plants.unshift(newPlant);
    saveLocalPlants(plants);
    notifyOfflinePlants();
    return newId;
  }

  const colPath = 'plants';
  try {
    const docRef = await addDoc(collection(db, colPath), sanitizeFirestoreData({
      ...plant,
      createdAt: serverTimestamp()
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
    throw error;
  }
}

/**
 * Update general plant info
 */
export async function updatePlant(plantId: string, updates: Partial<Plant>): Promise<void> {
  if (isFirebaseMock || !db) {
    const plants = getLocalPlants();
    const updated = plants.map((p) => {
      if (p.id === plantId) {
        return { ...p, ...updates, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    saveLocalPlants(updated);
    notifyOfflinePlants();
    return;
  }

  const docPath = `plants/${plantId}`;
  try {
    const docRef = doc(db, 'plants', plantId);
    await updateDoc(docRef, sanitizeFirestoreData({
      ...updates,
      updatedAt: serverTimestamp()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
    throw error;
  }
}

/**
 * Delete plant
 */
export async function deletePlant(plantId: string): Promise<void> {
  if (isFirebaseMock || !db) {
    const plants = getLocalPlants().filter(p => p.id !== plantId);
    saveLocalPlants(plants);
    localStorage.removeItem(`${LOCAL_LOGS_PREFIX}${plantId}`);
    notifyOfflinePlants();
    return;
  }

  const docPath = `plants/${plantId}`;
  try {
    await deleteDoc(doc(db, 'plants', plantId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
    throw error;
  }
}

/**
 * Add a progress photograph update log
 */
export async function addProgressLog(
  plantId: string,
  log: Omit<ProgressLog, 'id' | 'createdAt'>
): Promise<string> {
  if (isFirebaseMock || !db) {
    const logs = getLocalLogs(plantId);
    const newLogId = 'offline_log_' + Date.now();
    const newLog: ProgressLog = {
      ...log,
      id: newLogId,
      createdAt: new Date().toISOString()
    };
    logs.unshift(newLog);
    saveLocalLogs(plantId, logs);
    notifyOfflineLogs(plantId);
    return newLogId;
  }

  const colPath = `plants/${plantId}/logs`;
  try {
    const docRef = await addDoc(collection(db, colPath), sanitizeFirestoreData({
      ...log,
      createdAt: serverTimestamp()
    }));
    // Update parent plant to trigger snapshot refresh if needed
    await updateDoc(doc(db, 'plants', plantId), sanitizeFirestoreData({
      updatedAt: serverTimestamp()
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
    throw error;
  }
}

/**
 * Delete a specific progress log entry
 */
export async function deleteProgressLog(plantId: string, logId: string): Promise<void> {
  if (isFirebaseMock || !db) {
    const logs = getLocalLogs(plantId).filter(l => l.id !== logId);
    saveLocalLogs(plantId, logs);
    notifyOfflineLogs(plantId);
    return;
  }

  const docPath = `plants/${plantId}/logs/${logId}`;
  try {
    await deleteDoc(doc(db, 'plants', plantId, 'logs', logId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
    throw error;
  }
}

/**
 * Update a specific progress log entry
 */
export async function updateProgressLog(
  plantId: string,
  logId: string,
  updates: Partial<Omit<ProgressLog, 'id' | 'createdAt'>>
): Promise<void> {
  if (isFirebaseMock || !db) {
    const logs = getLocalLogs(plantId);
    const updated = logs.map((l) => {
      if (l.id === logId) {
        return { ...l, ...updates, updatedAt: new Date().toISOString() };
      }
      return l;
    });
    saveLocalLogs(plantId, updated);
    notifyOfflineLogs(plantId);
    return;
  }

  const docPath = `plants/${plantId}/logs/${logId}`;
  try {
    const docRef = doc(db, 'plants', plantId, 'logs', logId);
    await updateDoc(docRef, sanitizeFirestoreData({
      ...updates,
      updatedAt: serverTimestamp()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
    throw error;
  }
}
