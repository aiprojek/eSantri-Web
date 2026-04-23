import { auth } from '../firebaseAuth';
import { liteDb as fdb, doc, setDoc, getDoc, deleteDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebaseLite';

const generateInviteId = () => (
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

export const createTenantInvite = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error('User must be logged in to join a tenant');
    }

    const inviteId = generateInviteId();
    const inviteRef = doc(fdb, 'tenantInvites', inviteId);

    try {
        await setDoc(inviteRef, {
            tenantId: currentUser.uid,
            ownerUid: currentUser.uid,
            createdAt: serverTimestamp(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        return inviteId;
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, inviteRef.path);
    }

    throw new Error('Gagal membuat pairing code.');
};

export const joinTenant = async (inviteId: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error('User must be logged in to join a tenant');
    }

    const inviteRef = doc(fdb, 'tenantInvites', inviteId);

    try {
        const inviteSnap = await getDoc(inviteRef);
        if (!inviteSnap.exists()) {
            throw new Error('Pairing code tidak ditemukan atau sudah tidak berlaku.');
        }

        const invite = inviteSnap.data() as { tenantId?: string; expiresAt?: { toDate?: () => Date } | Date };
        const expiresAt = invite.expiresAt instanceof Date
            ? invite.expiresAt
            : invite.expiresAt?.toDate?.();

        if (!invite.tenantId || !expiresAt || expiresAt.getTime() < Date.now()) {
            throw new Error('Pairing code sudah kedaluwarsa.');
        }

        const memberLinkRef = doc(fdb, `tenants/${invite.tenantId}/metadata/memberLinks`, currentUser.uid);
        await setDoc(memberLinkRef, {
            uid: currentUser.uid,
            inviteId,
            joinedAt: serverTimestamp(),
        }, { merge: true });

        await deleteDoc(inviteRef);
        return invite.tenantId;
    } catch (error) {
        if (error instanceof Error && !error.message.startsWith('{')) {
            throw error;
        }

        handleFirestoreError(error, OperationType.WRITE, inviteRef.path);
    }

    throw new Error('Gagal bergabung ke tenant.');
};
