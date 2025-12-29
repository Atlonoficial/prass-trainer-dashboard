import { useMemo } from 'react';
import { toBrasiliaTime, isSameDayBrasilia } from '@/lib/timezone';
import { ImprovedAppointment } from '@/hooks/useImprovedAppointments';

interface UseScheduleFiltersProps {
    appointments: ImprovedAppointment[];
    selectedDate: Date | undefined;
    today: Date;
}

export function useScheduleFilters({ appointments, selectedDate, today }: UseScheduleFiltersProps) {
    const selectedDateForFilter = selectedDate || today;
    const isToday = isSameDayBrasilia(selectedDateForFilter, today);

    const selectedDateAppointments = useMemo(() => {
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        currentMonthEnd.setHours(23, 59, 59, 999);

        return appointments.filter((a) => {
            const appointmentBrasilia = toBrasiliaTime(a.scheduled_time);
            const isDateMatch = isSameDayBrasilia(appointmentBrasilia, selectedDateForFilter);
            const isCurrentMonth = appointmentBrasilia >= currentMonthStart && appointmentBrasilia <= currentMonthEnd;
            const isActiveStatus = ['scheduled', 'confirmed'].includes(a.status || 'scheduled');

            return isDateMatch && isCurrentMonth && isActiveStatus;
        });
    }, [appointments, selectedDateForFilter, today]);

    const todaysAppointments = useMemo(() => {
        return appointments.filter((a) => {
            const appointmentBrasilia = toBrasiliaTime(a.scheduled_time);
            const isActiveStatus = ['scheduled', 'confirmed'].includes(a.status || 'scheduled');
            const isAppointmentToday = isSameDayBrasilia(appointmentBrasilia, today);

            return isAppointmentToday && isActiveStatus;
        });
    }, [appointments, today]);

    return {
        selectedDateForFilter,
        isToday,
        selectedDateAppointments,
        todaysAppointments
    };
}
