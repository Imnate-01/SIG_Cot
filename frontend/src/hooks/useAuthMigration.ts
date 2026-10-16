"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { validateAndParseUserData, UserData } from '../lib/userValidation';

export function useAuthMigration() {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isMigrated, setIsMigrated] = useState(false);

    useEffect(() => {
        // 1. Check for the standard key first
        const standardData = localStorage.getItem('user_data');
        const validStandard = validateAndParseUserData(standardData);

        if (validStandard) {
            setUserData(validStandard);
            setIsMigrated(true);
            return;
        }

        // 2. If standard key is missing/invalid, check for legacy key
        const legacyData = localStorage.getItem('user');

        if (legacyData) {
            const validLegacy = validateAndParseUserData(legacyData);

            if (validLegacy) {
                // MIGRATION SUCCESS
                try {
                    localStorage.setItem('user_data', JSON.stringify(validLegacy));
                    localStorage.removeItem('user'); // Clean up
                    setUserData(validLegacy);
                    setIsMigrated(true);
                    // Optional: toast.success("Sistema actualizado", { description: "Tus datos se han migrado correctamente." });
                } catch (e) {
                    console.error("Migration failed", e);
                    toast.error("Error de sistema", { description: "No se pudieron guardar tus datos locales." });
                }
            } else {
                // CORRUPT LEGACY DATA
                console.error("Found legacy 'user' data but it was invalid.");
                localStorage.removeItem('user'); // Clean up corrupt data
                // We don't set user data, so app effectively logs them out or treats as guest
            }
        } else {
            // No data at all
            setUserData(null);
        }
    }, []);

    return { userData, isMigrated };
}
