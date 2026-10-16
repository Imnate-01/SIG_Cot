
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export const useRealtimeNotifications = () => {
    const router = useRouter();

    useEffect(() => {
        // Suscribirse a cambios en la tabla 'cotizaciones'
        const channel = supabase
            .channel('cotizaciones-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Escuchar INSERT y UPDATE
                    schema: 'public',
                    table: 'cotizaciones',
                },
                (payload) => {

                    if (payload.eventType === 'INSERT') {
                        const newCot = payload.new;
                        toast.info('Nueva Cotización Creada', {
                            description: `Se ha creado la cotización con ID: ${newCot.id}`,
                            action: {
                                label: 'Ver',
                                onClick: () => router.push(`/cotizaciones/${newCot.id}`)
                            }
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedCot = payload.new;
                        const oldCot = payload.old;

                        // Notificar cambios de estado importante
                        if (updatedCot.estado !== oldCot.estado) {

                            toast.success(`Estado Actualizado: ${updatedCot.numero_cotizacion || ('ID ' + updatedCot.id)}`, {
                                description: `La cotización ahora está en estado: ${updatedCot.estado.toUpperCase()}`,
                                action: {
                                    label: 'Ver detalles',
                                    onClick: () => router.push(`/cotizaciones/${updatedCot.id}`)
                                }
                            });
                        }
                    }
                }
            )
            .subscribe();

        // Limpiar suscripción al desmontar
        return () => {
            supabase.removeChannel(channel);
        };
    }, [router]);
};
