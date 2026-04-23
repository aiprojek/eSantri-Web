import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { useSettingsContext } from './SettingsContext';
import { loadFirebasePairingRuntime, loadFirebaseRealtimeRuntime } from '../utils/lazyFirebaseRuntimes';

const FIREBASE_AUTH_HINT_KEY = 'esantri_firebase_auth_hint';

interface FirebaseContextType {
    fbUser: FirebaseUser | null;
    isFbLoading: boolean;
    initializeAuthState: () => Promise<void>;
    login: () => Promise<any>;
    logout: () => Promise<void>;
    createTenantInvite: () => Promise<string>;
    joinTenant: (inviteId: string) => Promise<string>;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
    const [isFbLoading, setIsFbLoading] = useState(true);
    const { settings } = useSettingsContext();
    const authInitRef = React.useRef<Promise<void> | null>(null);
    const authUnsubscribeRef = React.useRef<(() => void) | null>(null);

    const initializeAuthState = React.useCallback(async () => {
        if (settings.cloudSyncConfig?.provider !== 'firebase') {
            setFbUser(null);
            setIsFbLoading(false);
            return;
        }

        if (authInitRef.current) {
            return authInitRef.current;
        }

        setIsFbLoading(true);
        authInitRef.current = Promise.all([
            import('../firebaseAuth'),
            import('firebase/auth'),
        ]).then(([{ auth }, { onAuthStateChanged }]) => (
            new Promise<void>((resolve) => {
                let resolved = false;
                authUnsubscribeRef.current?.();
                authUnsubscribeRef.current = onAuthStateChanged(auth, (user) => {
                    setFbUser(user);
                    setIsFbLoading(false);
                    if (user) {
                        localStorage.setItem(FIREBASE_AUTH_HINT_KEY, 'true');
                    } else {
                        localStorage.removeItem(FIREBASE_AUTH_HINT_KEY);
                    }
                    if (!resolved) {
                        resolved = true;
                        resolve();
                    }
                });
            })
        )).finally(() => {
            authInitRef.current = null;
        });

        return authInitRef.current;
    }, [settings.cloudSyncConfig?.provider]);

    useEffect(() => {
        let stopSync: (() => void) | null = null;
        let cancelled = false;

        const syncIfNeeded = async () => {
            if (fbUser && settings.cloudSyncConfig?.provider === 'firebase') {
                const { startFirebaseSync, stopFirebaseSync } = await loadFirebaseRealtimeRuntime();
                stopSync = stopFirebaseSync;
                startFirebaseSync(fbUser.uid);
            } else if (stopSync) {
                stopSync();
            }
        };

        if (settings.cloudSyncConfig?.provider === 'firebase') {
            const hasAuthHint = localStorage.getItem(FIREBASE_AUTH_HINT_KEY) === 'true';
            if (hasAuthHint) {
                void initializeAuthState();
            } else {
                setIsFbLoading(false);
            }
        } else {
            setFbUser(null);
            setIsFbLoading(false);
        }

        void syncIfNeeded();

        return () => {
            cancelled = true;
            if (stopSync) {
                stopSync();
            }
            if (settings.cloudSyncConfig?.provider !== 'firebase') {
                authUnsubscribeRef.current?.();
                authUnsubscribeRef.current = null;
            }
        };
    }, [fbUser, initializeAuthState, settings.cloudSyncConfig?.provider, settings.cloudSyncConfig?.firebasePairedTenantId]);

    const login = async () => {
        try {
            await initializeAuthState();
            const { loginWithGoogle } = await import('../firebaseAuth');
            const result = await loginWithGoogle();
            return result;
        } catch (error) {
            console.error("Firebase Login Error:", error);
            throw error;
        }
    };

    const logout = async () => {
        const { logout: firebaseLogout } = await import('../firebaseAuth');
        await firebaseLogout();
        localStorage.removeItem(FIREBASE_AUTH_HINT_KEY);
        const { stopFirebaseSync } = await loadFirebaseRealtimeRuntime();
        stopFirebaseSync();
    };

    const createTenantInvite = async () => {
        if (!fbUser) throw new Error("User must be logged in to join a tenant");
        const pairingRuntime = await loadFirebasePairingRuntime();
        return pairingRuntime.createTenantInvite();
    };

    const joinTenant = async (inviteId: string) => {
        if (!fbUser) throw new Error("User must be logged in to join a tenant");
        const pairingRuntime = await loadFirebasePairingRuntime();
        return pairingRuntime.joinTenant(inviteId);
    };

    return (
        <FirebaseContext.Provider value={{ fbUser, isFbLoading, initializeAuthState, login, logout, createTenantInvite, joinTenant }}>
            {children}
        </FirebaseContext.Provider>
    );
};

export const useFirebase = () => {
    const context = useContext(FirebaseContext);
    if (!context) throw new Error('useFirebase must be used within a FirebaseProvider');
    return context;
};
