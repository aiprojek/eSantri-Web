
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, PondokSettings } from '../types';
import { db } from '../db';
import { useLiveQuery } from "dexie-react-hooks";
import { ADMIN_PERMISSIONS } from '../services/authService';

interface AuthContextType {
    currentUser: User | null;
    login: (user: User) => void;
    logout: () => void;
}

const VIRTUAL_ADMIN: User = {
    id: 0,
    username: 'admin',
    passwordHash: '',
    fullName: 'Administrator Inti',
    role: 'admin',
    permissions: ADMIN_PERMISSIONS as any,
    securityQuestion: '',
    securityAnswerHash: '',
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('eSantriCurrentUser');
        try {
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            return null;
        }
    });
    const settingsList = useLiveQuery(() => db.settings.toArray(), []) || [];
    const settings = settingsList[0];

    const prevMultiUserModeRef = useRef<boolean | undefined>(undefined);
    const prevUserIdRef = useRef<number | undefined>(undefined);

    // Sync Current User with Multi-User Mode
    useEffect(() => {
        if (!settings) return;

        // Prevent redundant checks if values haven't actually changed
        if (prevMultiUserModeRef.current === settings.multiUserMode && prevUserIdRef.current === currentUser?.id) {
            return;
        }

        if (!settings.multiUserMode) {
            // In single user mode, always use virtual admin
            if (currentUser?.id !== 0) {
                console.log("Switching to virtual admin mode");
                setCurrentUser(VIRTUAL_ADMIN);
            }
        } else if (currentUser && currentUser.id === 0) {
            // In multi-user mode, if current user is virtual admin (ID 0), they MUST log out to login screen
            // But ONLY if we are sure multiUserMode is correctly set
            console.log("Multi-user mode detected, logging out virtual admin");
            logout(); 
        }

        prevMultiUserModeRef.current = settings.multiUserMode;
        prevUserIdRef.current = currentUser?.id;
    }, [settings?.multiUserMode, currentUser?.id]);

    const login = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('eSantriCurrentUser', JSON.stringify(user));
    };
    
    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('eSantriCurrentUser');
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuthContext must be used within an AuthProvider');
    return context;
};
