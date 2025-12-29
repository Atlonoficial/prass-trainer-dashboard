import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Workout {
  id: string;
  label: string;
  days: string[];
}

interface WeeklyScheduleViewProps {
  workouts: Workout[];
}

const DAYS_OF_WEEK = [
  { id: 'segunda', name: 'Segunda', short: 'SEG' },
  { id: 'terca', name: 'Terça', short: 'TER' },
  { id: 'quarta', name: 'Quarta', short: 'QUA' },
  { id: 'quinta', name: 'Quinta', short: 'QUI' },
  { id: 'sexta', name: 'Sexta', short: 'SEX' },
  { id: 'sabado', name: 'Sábado', short: 'SAB' },
  { id: 'domingo', name: 'Domingo', short: 'DOM' }
];

const generateWorkoutNumber = (workoutIndex: number): string => {
  if (workoutIndex < 3) {
    return (workoutIndex + 1).toString(); // 1, 2, 3
  } else {
    return String.fromCharCode(65 + (workoutIndex - 3)); // A, B, C, etc.
  }
};

export default function WeeklyScheduleView({ workouts }: WeeklyScheduleViewProps) {
  const getWorkoutsForDay = (dayId: string) => {
    return workouts
      .map((workout, index) => ({
        ...workout,
        workoutNumber: generateWorkoutNumber(index)
      }))
      .filter(workout => workout.days.includes(dayId));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Distribuição Semanal</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {DAYS_OF_WEEK.map((day) => {
          const dayWorkouts = getWorkoutsForDay(day.id);
          
          return (
            <Card key={day.id} className="p-3 bg-card border-border">
              <div className="text-center mb-2">
                <div className="font-medium text-foreground">{day.short}</div>
                <div className="text-xs text-muted-foreground">{day.name}</div>
              </div>
              
              <div className="space-y-1">
                {dayWorkouts.length > 0 ? (
                  dayWorkouts.map((workout) => (
                    <div key={workout.id} className="flex flex-col items-center space-y-1">
                      <Badge 
                        variant="secondary" 
                        className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center bg-primary text-primary-foreground"
                      >
                        {workout.workoutNumber}
                      </Badge>
                      <div className="text-xs text-center text-muted-foreground truncate w-full">
                        {workout.label}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mx-auto">
                      <div className="w-1 h-1 bg-muted-foreground/30 rounded-full"></div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">Descanso</div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      
      {workouts.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-foreground mb-2">Legenda dos Treinos</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {workouts.map((workout, index) => {
              const workoutNumber = generateWorkoutNumber(index);
              return (
                <div key={workout.id} className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center bg-primary text-primary-foreground flex-shrink-0"
                  >
                    {workoutNumber}
                  </Badge>
                  <span className="text-sm text-foreground truncate">{workout.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}