import { isFirebaseClientConfigReady } from './firebaseApp';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // If Firebase BYOK is not configured, ignore silently
  if (!isFirebaseClientConfigReady) {
    return;
  }

  const rawMsg = error instanceof Error ? error.message : String(error);
  const isExpectedAuthOrPermIssue =
    rawMsg.includes('permission-denied') ||
    rawMsg.includes('unauthenticated') ||
    rawMsg.includes('insufficient permissions') ||
    rawMsg.includes('unavailable') ||
    rawMsg.includes('offline');

  if (isExpectedAuthOrPermIssue) {
    console.warn(`[Firebase BYOK Info] Operasi ${operationType} pada "${path || '-'}" dibatasi atau offline: ${rawMsg}`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: rawMsg,
    authInfo: {
      userId: undefined,
      email: undefined,
      emailVerified: undefined,
      isAnonymous: undefined,
      tenantId: undefined,
      providerInfo: []
    },
    operationType,
    path
  };

  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}
