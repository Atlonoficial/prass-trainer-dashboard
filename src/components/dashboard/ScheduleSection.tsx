import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Users,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingUp,
  Settings
} from 'lucide-react';
import NewAppointmentModal from '@/components/schedule/NewAppointmentModal';
import TeacherAvailabilityModal from '@/components/schedule/TeacherAvailabilityModal';
import CancelAppointmentModal from '@/components/schedule/CancelAppointmentModal';
import StudentAppointmentsModal from '@/components/students/StudentAppointmentsModal';
import AppointmentDetailsModal from '@/components/schedule/AppointmentDetailsModal';
import { useImprovedAppointments, type ImprovedAppointment } from '@/hooks/useImprovedAppointments';
import { useScheduleFilters } from '@/hooks/useScheduleFilters';
import { useTeacherAvailability } from '@/hooks/useTeacherAvailability';
// import { useStudents } from '@/hooks/useStudents';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRealTimeScheduleSync } from '@/hooks/useRealTimeScheduleSync';
import { supabase } from '@/integrations/supabase/client';
import { nowInBrasilia, formatDateTimeBrasilia, isSameDayBrasilia, toBrasiliaTime } from '@/lib/timezone';
import { ptBR } from 'date-fns/locale';
import { normalizeServiceForUI } from '@/lib/serviceMapping';

export default function ScheduleSection() {
  // Status padronizados do sistema - DEVE estar no topo para evitar temporal dead zone
  const APPOINTMENT_STATUS = {
    SCHEDULED: 'scheduled',    // Agendado pelo aluno, aguarda confirmação
    CONFIRMED: 'confirmed',    // Confirmado pelo professor
    CANCELLED: 'cancelled',    // Cancelado
    COMPLETED: 'completed'     // Finalizado
  } as const;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(nowInBrasilia());
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isStudentAppointmentsModalOpen, setIsStudentAppointmentsModalOpen] = useState(false);
  const [selectedAppointmentForCancel, setSelectedAppointmentForCancel] = useState<ImprovedAppointment | null>(null);
  const [selectedStudentForAppointments, setSelectedStudentForAppointments] = useState<{ id: string, name: string } | null>(null);
  const [studentProfiles, setStudentProfiles] = useState<Record<string, any>>({});
  const [dateRangeAppointments, setDateRangeAppointments] = useState<ImprovedAppointment[]>([]);
  const [viewMode, setViewMode] = useState<'today' | 'selected' | 'history'>('today');
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<ImprovedAppointment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const {
    appointments: dbAppointments,
    updateAppointment,
    createAppointmentWithValidation,
    fetchAppointmentsByDateRange,
    refetch: refetchAppointments,
    deleteAppointment,
    loading: appointmentsLoading
  } = useImprovedAppointments();
  const { availability, bookingSettings, saveAvailability } = useTeacherAvailability();
  // const { students } = useStudents(); // ❌ Removido: Hook não utilizado e causando loops
  const { addNotification } = useNotifications();
  const { user } = useAuth();
  const { toast } = useToast();

  // ✅ Callback memoizado para evitar recriação do listener
  const handleScheduleSync = useCallback(() => {
    refetchAppointments();
  }, [refetchAppointments]);

  // Real-time sync otimizado com debounce
  useRealTimeScheduleSync(handleScheduleSync);

  // Function to send notifications to specific users
  const sendNotificationToUser = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          title,
          message,
          type,
          target_users: [userId]
        }]);
      if (error) throw error;
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Fetch student profiles when needed (optimized to prevent loops)
  const fetchStudentProfilesCallback = useCallback(async () => {
    if (dbAppointments.length === 0) return;

    const uniqueStudentIds = [...new Set(dbAppointments.map(a => a.student_id).filter(Boolean))];
    if (uniqueStudentIds.length === 0) return;

    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', uniqueStudentIds);

      if (profiles) {
        const profileMap = profiles.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, any>);
        setStudentProfiles(profileMap);
      }
    } catch (error) {
      console.error('Error fetching student profiles:', error);
    }
  }, [dbAppointments.length]);

  useEffect(() => {
    fetchStudentProfilesCallback();
  }, [fetchStudentProfilesCallback]);

  // Auto-confirm new appointments if enabled (debounced to prevent loops)
  const autoConfirmAppointments = useCallback(async () => {
    if (!bookingSettings?.auto_confirm) return;

    const pendingAppointments = dbAppointments.filter(a => a.status === 'scheduled');
    if (pendingAppointments.length === 0) return;

    for (const appointment of pendingAppointments) {
      try {
        await updateAppointment(appointment.id, { status: 'confirmed' });

        // Send notification to student
        if (appointment.student_id) {
          await sendNotificationToUser(
            appointment.student_id,
            'Agendamento Confirmado',
            `Seu agendamento para ${formatDateTimeBrasilia(appointment.scheduled_time).dateTime} foi confirmado automaticamente.`,
            'success'
          );
        }
      } catch (error) {
        console.error('Error auto-confirming appointment:', error);
      }
    }
  }, [dbAppointments, bookingSettings?.auto_confirm, updateAppointment]);

  // ✅ Executar auto-confirm apenas uma vez após dados carregarem
  useEffect(() => {
    if (!appointmentsLoading && bookingSettings?.auto_confirm) {
      const timer = setTimeout(autoConfirmAppointments, 1000);
      return () => clearTimeout(timer);
    }
  }, [appointmentsLoading, bookingSettings?.auto_confirm]);

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  // ✅ Memoizar 'today' para evitar recálculos desnecessários a cada render
  const today = useMemo(() => nowInBrasilia(), []);

  // ✅ Usar hook customizado para filtros de agenda
  const {
    selectedDateForFilter,
    isToday,
    selectedDateAppointments,
    todaysAppointments
  } = useScheduleFilters({
    appointments: dateRangeAppointments.length > 0 ? dateRangeAppointments : dbAppointments,
    selectedDate,
    today
  });

  // Load appointments for selected date including history
  useEffect(() => {
    if (selectedDate && !isToday) {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      fetchAppointmentsByDateRange(startOfDay, endOfDay);
    } else {
      setDateRangeAppointments([]);
    }
  }, [selectedDate, isToday, fetchAppointmentsByDateRange]);



  // Calculate dynamic weekly statistics with proper filtering - USAR VARIÁVEL UNIFICADA
  const weeklyStats = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Filter appointments for current week only, excluding cancelled
    const weeklyAppointments = dbAppointments.filter(a => {
      const appointmentBrasilia = toBrasiliaTime(a.scheduled_time);
      // Incluir apenas agendamentos ativos usando status padronizados
      const isActiveStatus = ['scheduled', 'confirmed'].includes(a.status || 'scheduled');
      return appointmentBrasilia >= startOfWeek &&
        appointmentBrasilia <= endOfWeek &&
        isActiveStatus;
    });

    // Calculate total available slots for the week (75 minutes each)
    const totalAvailableSlots = availability.reduce((total, slot) => {
      const startTime = new Date(`1970-01-01T${slot.start_time}`);
      const endTime = new Date(`1970-01-01T${slot.end_time}`);
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      // Use real slot duration from database, default to 75 if not set
      const slotDuration = slot.slot_minutes || 75;
      const slotsPerDay = Math.floor(duration / slotDuration);

      // Count days this weekday occurs in current week (up to today) - USAR VARIÁVEL UNIFICADA
      const currentWeekStart = new Date(startOfWeek);
      let daysInWeek = 0;

      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(currentWeekStart);
        checkDate.setDate(checkDate.getDate() + i);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        if (checkDate.getDay() === slot.weekday && checkDate <= todayEnd) {
          daysInWeek++;
        }
      }

      return total + (slotsPerDay * daysInWeek);
    }, 0);

    const occupancyRate = totalAvailableSlots > 0
      ? Math.round((weeklyAppointments.length / totalAvailableSlots) * 100)
      : 0;

    const freeSlots = Math.max(0, totalAvailableSlots - weeklyAppointments.length);

    return {
      freeSlots,
      occupancyRate,
      weeklyAppointments: weeklyAppointments.length,
      totalSlots: totalAvailableSlots
    };
  }, [dbAppointments, availability, today]);

  const scheduleStats = useMemo(() => {
    // USAR MESMO FORMATO DE DATA DO RESTO DO COMPONENTE
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    currentMonthEnd.setHours(23, 59, 59, 999);

    console.log(`=== SCHEDULE STATS DEBUG ===`)
    console.log(`Today (unified): ${today.toISOString()}`)
    console.log(`Current month range: ${currentMonthStart.toISOString()} to ${currentMonthEnd.toISOString()}`)

    // Filter appointments for current month only - MESMA LÓGICA DO selectedDateAppointments
    const currentMonthAppointments = dbAppointments.filter(a => {
      const appointmentBrasilia = toBrasiliaTime(a.scheduled_time)
      const isActiveStatus = ['scheduled', 'confirmed'].includes(a.status || 'scheduled')
      const isInCurrentMonth = appointmentBrasilia >= currentMonthStart && appointmentBrasilia <= currentMonthEnd

      return isInCurrentMonth && isActiveStatus
    })

    // USAR DIRETO O todaysAppointments CALCULADO ACIMA - SEM RECALCULAR
    const todayAppointmentsCount = todaysAppointments.length;
    const confirmedTodayCount = todaysAppointments.filter((a) => a.status === 'confirmed').length;
    const pendingToday = todaysAppointments.filter(a => a.status === 'scheduled').length;

    // Count future scheduled appointments using current month data - USAR VARIÁVEL UNIFICADA
    const futurePendingCount = currentMonthAppointments.filter((a) => {
      const appointmentBrasilia = toBrasiliaTime(a.scheduled_time);
      return a.status === 'scheduled' && appointmentBrasilia > today; // Usar > em vez de >=
    }).length;

    return {
      todayAppointments: {
        total: todayAppointmentsCount,
        confirmed: confirmedTodayCount,
      },
      pending: {
        count: futurePendingCount,
        status: 'Aguardando confirmação',
      },
      freeSlots: {
        count: weeklyStats.freeSlots,
        period: 'Esta semana',
        total: weeklyStats.totalSlots
      },
      occupancyRate: {
        rate: `${weeklyStats.occupancyRate}%`,
        change: weeklyStats.occupancyRate > 70 ? 'Alta demanda' :
          weeklyStats.occupancyRate > 40 ? 'Moderada' : 'Disponível'
      },
    };
  }, [todaysAppointments, dbAppointments, weeklyStats, today]);

  const displayAppointments = selectedDateAppointments.map((a) => {
    const studentProfile = a.student_id ? studentProfiles[a.student_id] : null;
    const studentName = studentProfile?.name || studentProfile?.email || 'Aluno não identificado';

    return {
      id: a.id,
      student_id: a.student_id,
      time: formatDateTimeBrasilia(a.scheduled_time).time,
      student: studentName,
      service: a.type || a.title || 'Consulta',
      status: a.status || 'scheduled',
      appointment: a
    };
  });

  // Dynamic weekly view based on real data - USAR VARIÁVEL UNIFICADA
  const weeklyView = useMemo(() => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    return days.map((day, index) => {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(currentDate.getDate() + index);

      const dayAppointments = dbAppointments.filter(a => {
        const appointmentBrasilia = toBrasiliaTime(a.scheduled_time);
        // Incluir apenas agendamentos ativos usando status padronizados
        const isActiveStatus = ['scheduled', 'confirmed'].includes(a.status || 'scheduled');
        return isSameDayBrasilia(appointmentBrasilia, currentDate) && isActiveStatus;
      });

      const dayAvailability = availability.filter(slot => slot.weekday === index);
      const totalSlots = dayAvailability.reduce((total, slot) => {
        const startTime = new Date(`1970-01-01T${slot.start_time}`);
        const endTime = new Date(`1970-01-01T${slot.end_time}`);
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        // Use real slot duration from database, default to 75 if not set
        const slotDuration = slot.slot_minutes || 75;
        return total + Math.floor(duration / slotDuration);
      }, 0);

      const freeSlots = Math.max(0, totalSlots - dayAppointments.length);
      const percentage = totalSlots > 0 ? Math.round((dayAppointments.length / totalSlots) * 100) : 0;

      return {
        day,
        sessions: dayAppointments.length,
        hours: freeSlots,
        percentage,
        date: currentDate
      };
    });
  }, [dbAppointments, availability, today]);

  const handleConfirmAppointment = async (appointmentId: string, studentId?: string) => {
    try {
      await updateAppointment(appointmentId, { status: 'confirmed' });

      // Send notification to student
      if (studentId) {
        const appointment = dbAppointments.find(a => a.id === appointmentId);
        if (appointment) {
          await sendNotificationToUser(
            studentId,
            'Agendamento Confirmado',
            `Seu agendamento para ${formatDateTimeBrasilia(appointment.scheduled_time).dateTime} foi confirmado.`,
            'success'
          );
        }
      }
    } catch (error) {
      console.error('Error confirming appointment:', error);
    }
  };

  const handleRejectAppointment = async (appointmentId: string, studentId?: string, reason?: string, finalStatus: string = 'cancelled') => {
    try {
      const updates: any = { status: finalStatus };
      if (reason) {
        updates.notes = reason;
      }

      await updateAppointment(appointmentId, updates);

      // Send notification to student
      if (studentId) {
        const appointment = dbAppointments.find(a => a.id === appointmentId);
        if (appointment) {
          const message = reason
            ? `Seu agendamento para ${formatDateTimeBrasilia(appointment.scheduled_time).dateTime} foi cancelado pelo professor.\n\nMotivo: ${reason}`
            : `Seu agendamento para ${formatDateTimeBrasilia(appointment.scheduled_time).dateTime} foi cancelado pelo professor.`;

          await sendNotificationToUser(
            studentId,
            'Agendamento Cancelado',
            message,
            'error'
          );
        }
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
    }
  };

  const handleNewAppointment = async (appointmentData: any) => {
    try {
      await createAppointmentWithValidation(appointmentData, true);
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case APPOINTMENT_STATUS.CONFIRMED: return 'bg-green-400/10 text-green-400 border-green-400/20';
      case APPOINTMENT_STATUS.SCHEDULED: return 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
      case APPOINTMENT_STATUS.CANCELLED: return 'bg-red-400/10 text-red-400 border-red-400/20';
      case APPOINTMENT_STATUS.COMPLETED: return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
      default: return 'bg-gray-400/10 text-gray-400 border-gray-400/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case APPOINTMENT_STATUS.CONFIRMED: return 'Confirmado';
      case APPOINTMENT_STATUS.SCHEDULED: return 'Aguarda Confirmação';
      case APPOINTMENT_STATUS.CANCELLED: return 'Cancelado';
      case APPOINTMENT_STATUS.COMPLETED: return 'Finalizado';
      default: return status || 'Agendado';
    }
  };

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        {/* Header - Responsivo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-foreground truncate">Controle de Agenda</h1>
              <p className="text-xs text-muted-foreground truncate">Gerencie seus horários e sessões</p>
            </div>
          </div>
        </div>

        {/* Stats Cards - Grid Responsivo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 xl:gap-6 mb-4 sm:mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">Agendamentos</span>
                  <CalendarIcon className="w-4 h-4 text-primary flex-shrink-0" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{scheduleStats.todayAppointments.total}</p>
                  <p className="text-xs text-muted-foreground">Hoje</p>
                  <p className="text-xs text-green-400">{scheduleStats.todayAppointments.confirmed} confirmados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">Pendentes</span>
                  <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-400">{scheduleStats.pending.count}</p>
                  <p className="text-xs text-muted-foreground truncate">{scheduleStats.pending.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">Horários Livres</span>
                  <User className="w-4 h-4 text-blue-400 flex-shrink-0" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-400">{scheduleStats.freeSlots.count}</p>
                  <p className="text-xs text-muted-foreground">{scheduleStats.freeSlots.period}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground truncate">Taxa Ocupação</span>
                  <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />
                </div>
                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400">{scheduleStats.occupancyRate.rate}</p>
                  <p className="text-xs text-muted-foreground truncate">{scheduleStats.occupancyRate.change}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Layout de 3 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendário - Coluna 1 */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    Calendário
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAvailabilityModalOpen(true)}
                      className="text-sm"
                      size="sm"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Horários
                    </Button>
                    <Button
                      onClick={() => setIsNewAppointmentModalOpen(true)}
                      className="text-sm bg-yellow-500 hover:bg-yellow-600"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="w-full"
                  locale={ptBR}
                  classNames={{
                    months: "flex w-full flex-col space-y-4",
                    month: "space-y-4 w-full flex flex-col",
                    caption: "flex justify-center pt-1 relative items-center",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex w-full",
                    head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex-1 text-center",
                    row: "flex w-full mt-2",
                    cell: "relative text-center text-sm focus-within:relative focus-within:z-20 flex-1",
                    day: "h-8 w-8 p-0 font-normal text-center text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground mx-auto",
                    day_selected: "bg-yellow-500 text-black hover:bg-yellow-600 hover:text-black focus:bg-yellow-500 focus:text-black font-semibold relative z-10",
                    day_today: "bg-accent text-accent-foreground",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50",
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Agenda de Hoje - Coluna 2 */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {isToday ? 'Agenda de Hoje' : `Agenda de ${formatDateTimeBrasilia(selectedDateForFilter).date}`}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="autoConfirm"
                      checked={bookingSettings?.auto_confirm || false}
                      onCheckedChange={async (checked) => {
                        // Save auto_confirm setting directly
                        if (user?.id) {
                          try {
                            // Update the setting in the database
                            const { error } = await supabase
                              .from('teacher_booking_settings')
                              .update({ auto_confirm: checked })
                              .eq('teacher_id', user.id);

                            if (error) {
                              console.error('Error updating auto_confirm:', error);
                            } else {
                              console.log('Auto confirm setting updated:', checked);
                              // Optionally refresh the data
                              window.location.reload();
                            }
                          } catch (error) {
                            console.error('Error updating auto confirm setting:', error);
                          }
                        }
                      }}
                    />
                    <Label htmlFor="autoConfirm" className="text-sm text-muted-foreground">
                      Auto confirmar
                    </Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {selectedDateAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-foreground mb-2">
                      {isToday ? 'Nenhum agendamento para hoje' : 'Nenhum agendamento nesta data'}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {isToday ? 'Sua agenda está livre! Que tal criar um novo agendamento?' : 'Esta data não possui agendamentos.'}
                    </p>
                    <Button
                      onClick={() => setIsNewAppointmentModalOpen(true)}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Agendamento
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateAppointments.map((appointment) => {
                      const studentProfile = appointment.student_id ? studentProfiles[appointment.student_id] : null;
                      const studentName = studentProfile?.name || studentProfile?.email || 'Aluno não identificado';

                      return (
                        <div
                          key={appointment.id}
                          className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/50 cursor-pointer hover:bg-card/70 transition-colors"
                          onClick={() => {
                            setSelectedAppointmentForDetails(appointment);
                            setIsDetailsModalOpen(true);
                          }}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {formatDateTimeBrasilia(appointment.scheduled_time).time}
                              </span>
                              <Badge className={`text-xs px-2 py-1 ${getStatusColor(appointment.status || 'scheduled')}`}>
                                {getStatusText(appointment.status || 'scheduled')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{studentName}</p>
                            <p className="text-xs text-muted-foreground">{normalizeServiceForUI(appointment.type || appointment.title || 'Consulta')}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {appointment.status !== 'confirmed' && appointment.status !== 'cancelled' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs px-2 py-1 h-7 text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConfirmAppointment(appointment.id, appointment.student_id);
                                  }}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Confirmar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs px-2 py-1 h-7 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAppointmentForCancel(appointment);
                                    setIsCancelModalOpen(true);
                                  }}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Recusar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Visão Semanal - Coluna 3 */}
          <div className="lg:col-span-1">
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Visão Semanal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {weeklyView.map((dayData, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12">
                          <span className="text-sm font-medium text-yellow-500">
                            {dayData.day}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-xs text-muted-foreground">
                            {dayData.hours} livres
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-foreground">
                          {dayData.sessions} sessões
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dayData.percentage}% ocupado
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modals */}
        <NewAppointmentModal
          isOpen={isNewAppointmentModalOpen}
          onClose={() => setIsNewAppointmentModalOpen(false)}
          onSave={handleNewAppointment}
        />

        <TeacherAvailabilityModal
          isOpen={isAvailabilityModalOpen}
          onClose={() => setIsAvailabilityModalOpen(false)}
        />

        {selectedAppointmentForCancel && (
          <CancelAppointmentModal
            isOpen={isCancelModalOpen}
            onClose={() => {
              setIsCancelModalOpen(false);
              setSelectedAppointmentForCancel(null);
            }}
            appointment={selectedAppointmentForCancel}
            onConfirm={(reason, notifyStudent, releaseSlot) => {
              if (selectedAppointmentForCancel) {
                handleRejectAppointment(
                  selectedAppointmentForCancel.id,
                  selectedAppointmentForCancel.student_id,
                  reason,
                  'cancelled'
                );
              }
              setIsCancelModalOpen(false);
              setSelectedAppointmentForCancel(null);
            }}
          />
        )}

        {selectedStudentForAppointments && (
          <StudentAppointmentsModal
            isOpen={isStudentAppointmentsModalOpen}
            onClose={() => {
              setIsStudentAppointmentsModalOpen(false);
              setSelectedStudentForAppointments(null);
            }}
            studentId={selectedStudentForAppointments.id}
            studentName={selectedStudentForAppointments.name}
          />
        )}

        <AppointmentDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedAppointmentForDetails(null);
          }}
          appointment={selectedAppointmentForDetails}
          studentProfile={selectedAppointmentForDetails?.student_id ? studentProfiles[selectedAppointmentForDetails.student_id] : null}
          onConfirm={(appointmentId) => {
            const appointment = selectedDateAppointments.find(a => a.id === appointmentId);
            if (appointment) {
              handleConfirmAppointment(appointmentId, appointment.student_id);
            }
          }}
          onCancel={(appointmentId) => {
            const appointment = selectedDateAppointments.find(a => a.id === appointmentId);
            if (appointment) {
              setSelectedAppointmentForCancel(appointment);
              setIsCancelModalOpen(true);
              setIsDetailsModalOpen(false);
            }
          }}
        />
      </div>
    </div>
  );
}