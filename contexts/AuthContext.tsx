
import React, { createContext, useContext, useState, useEffect } from 'react';
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
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const settingsList = useLiveQuery(() => db.settings.toArray(), []) || [];
    const settings = settingsList[0];

    // Sync Current User with Multi-User Mode
    useEffect(() => {
        if (!settings) return;
        if (!settings.multiUserMode) {
            setCurrentUser(VIRTUAL_ADMIN);
        } else if (currentUser && currentUser.id === 0) {
            setCurrentUser(null); // Logout virtual admin if switched to multi-user
        }
    }, [settings?.multiUserMode]);

    const login = (user: User) => setCurrentUser(user);
    const logout = () => setCurrentUser(null);

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
