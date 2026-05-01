
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { db } from '../db';
import { useLiveQuery } from "dexie-react-hooks";
import { ADMIN_PERMISSIONS } from '../services/authService';
import { CURRENT_PERMISSION_VERSION } from '../services/permissionMigrationService';

interface AuthContextType {
    currentUser: User | null;
    isAuthReady: boolean;
    login: (user: User) => void;
    logout: () => void;
}

interface StoredAuthSession {
    userId: number;
    username: string;
    sessionVersion: number;
    issuedAt: string;
}

const AUTH_STORAGE_KEY = 'eSantriCurrentUser';
const AUTH_SESSION_VERSION = 1;

const VIRTUAL_ADMIN: User = {
    id: 0,
    username: 'admin',
    passwordHash: '',
    fullName: 'Administrator Inti',
    role: 'admin',
    permissions: ADMIN_PERMISSIONS as any,
    permissionVersion: CURRENT_PERMISSION_VERSION,
    securityQuestion: '',
    securityAnswerHash: '',
};

const AuthContext = createContext<AuthContextType | null>(null);

const readStoredSession = (): StoredAuthSession | null => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!saved) return null;

    try {
        const parsed = JSON.parse(saved);

        // Backward compatibility: older versions stored the whole user object.
        if (typeof parsed?.id === 'number' && typeof parsed?.username === 'string') {
            return {
                userId: parsed.id,
                username: parsed.username,
                sessionVersion: AUTH_SESSION_VERSION,
                issuedAt: parsed.lastLogin || new Date().toISOString(),
            };
        }

        if (
            typeof parsed?.userId === 'number' &&
            typeof parsed?.username === 'string' &&
            typeof parsed?.sessionVersion === 'number'
        ) {
            return parsed as StoredAuthSession;
        }
    } catch (e) {
        console.warn('Failed to parse stored auth session:', e);
    }

    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
};

const writeStoredSession = (user: User) => {
    const session: StoredAuthSession = {
        userId: user.id,
        username: user.username,
        sessionVersion: AUTH_SESSION_VERSION,
        issuedAt: new Date().toISOString(),
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const settingsList = useLiveQuery(() => db.settings.toArray(), []) || [];
    const settings = settingsList[0];

    // Sync Current User with Multi-User Mode
    useEffect(() => {
        if (!settings) return;

        let isActive = true;

        const syncCurrentUser = async () => {
            setIsAuthReady(false);

            if (!settings.multiUserMode) {
                localStorage.removeItem(AUTH_STORAGE_KEY);
                if (isActive) {
                    setCurrentUser(VIRTUAL_ADMIN);
                    setIsAuthReady(true);
                }
                return;
            }

            const storedSession = readStoredSession();
            if (!storedSession) {
                if (isActive) {
                    setCurrentUser(null);
                    setIsAuthReady(true);
                }
                return;
            }

            const user = await db.users.get(storedSession.userId);
            const isValidSession = !!user && user.username === storedSession.username;

            if (!isActive) return;

            if (isValidSession) {
                setCurrentUser(user);
                writeStoredSession(user);
            } else {
                setCurrentUser(null);
                localStorage.removeItem(AUTH_STORAGE_KEY);
            }

            setIsAuthReady(true);
        };

        syncCurrentUser();

        return () => {
            isActive = false;
        };
    }, [settings?.multiUserMode, settings?.lastModified]);

    useEffect(() => {
        if (!settings?.multiUserMode || !currentUser || currentUser.id === 0) return;

        let isActive = true;
        const refreshCurrentUser = async () => {
            const latestUser = await db.users.get(currentUser.id);
            if (!isActive) return;

            if (!latestUser || latestUser.username !== currentUser.username) {
                setCurrentUser(null);
                localStorage.removeItem(AUTH_STORAGE_KEY);
                return;
            }

            setCurrentUser(latestUser);
            writeStoredSession(latestUser);
        };

        refreshCurrentUser();
        return () => {
            isActive = false;
        };
    }, [currentUser?.id, settings?.multiUserMode]);

    const login = (user: User) => {
        setCurrentUser(user);
        if (settings?.multiUserMode) {
            writeStoredSession(user);
        }
    };
    
    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
    };

    return (
        <AuthContext.Provider value={{ currentUser, isAuthReady, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuthContext must be used within an AuthProvider');
    return context;
};
