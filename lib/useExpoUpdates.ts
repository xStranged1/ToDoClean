import { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';
import { ENVIRONMENT } from '@/services/firebase';

export function useExpoUpdates() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [updateManifest, setUpdateManifest] = useState<Updates.Manifest | null>(null);

    useEffect(() => {
        const checkForUpdates = async () => {
            // Solo verificar actualizaciones en producción
            if (ENVIRONMENT !== 'production') {
                return;
            }

            // Verificar si las actualizaciones OTA están habilitadas
            // En desarrollo (Expo Go o dev client) esto será false
            if (!Updates.isEnabled) {
                return;
            }

            try {
                setIsChecking(true);
                const update = await Updates.checkForUpdateAsync();

                // Solo establecer updateAvailable si hay una actualización disponible
                if (update.isAvailable) {
                    setUpdateAvailable(true);
                    setUpdateManifest(update.manifest);
                }
            } catch (error) {
                console.error('Error checking for updates:', error);
            } finally {
                setIsChecking(false);
            }
        };

        // Esperar un pequeño delay para asegurar que la app esté completamente cargada
        const timeoutId = setTimeout(() => {
            checkForUpdates();
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, []);

    const downloadAndReload = async () => {
        try {
            const result = await Updates.fetchUpdateAsync();
            if (result.isNew) {
                await Updates.reloadAsync();
            }
        } catch (error) {
            console.error('Error downloading update:', error);
        }
    };

    return {
        updateAvailable,
        isChecking,
        updateManifest,
        downloadAndReload,
    };
}
