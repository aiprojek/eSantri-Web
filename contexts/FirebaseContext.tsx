import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout as firebaseLogout, db as fdb, handleFirestoreError, OperationType } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { startFirebaseSync, stopFirebaseSync } from '../services/firebaseSyncService';
import { useSettingsContext } from './SettingsContext';

interface FirebaseContextType {
    fbUser: FirebaseUser | null;
    isFbLoading: boolean;
    login: () => Promise<any>;
    logout: () => Promise<void>;
    joinTenant: (adminTenantId: string) => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
    const [isFbLoading, setIsFbLoading] = useState(true);
    const { settings } = useSettingsContext();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            setFbUser(user);
            setIsFbLoading(false);
            
            if (user && settings.cloudSyncConfig?.provider === 'firebase') {
                startFirebaseSync(user.uid);
            } else {
                stopFirebaseSync();
            }
        });

        return () => {
            unsub();
            stopFirebaseSync();
        };
    }, [settings.cloudSyncConfig?.provider, settings.cloudSyncConfig?.firebasePairedTenantId]);

    const login = async () => {
        try {
            const result = await loginWithGoogle();
            return result;
        } catch (error) {
            console.error("Firebase Login Error:", error);
            throw error;
        }
    };

    const logout = async () => {
        await firebaseLogout();
        stopFirebaseSync();
    };

    const joinTenant = async (adminTenantId: string) => {
        if (!fbUser) throw new Error("User must be logged in to join a tenant");
        
        const membersRef = doc(fdb, `tenants/${adminTenantId}/metadata/members`);
        try {
            const snap = await getDoc(membersRef);
            if (snap.exists()) {
                await updateDoc(membersRef, {
                    uids: arrayUnion(fbUser.uid)
                });
            } else {
                await setDoc(membersRef, {
                    uids: [fbUser.uid]
                });
            }
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, membersRef.path);
        }
    };

    return (
        <FirebaseContext.Provider value={{ fbUser, isFbLoading, login, logout, joinTenant }}>
            {children}
        </FirebaseContext.Provider>
    );
};

export const useFirebase = () => {
    const context = useContext(FirebaseContext);
    if (!context) throw new Error('useFirebase must be used within a FirebaseProvider');
    return context;
};
