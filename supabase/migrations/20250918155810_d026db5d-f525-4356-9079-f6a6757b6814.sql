-- SECURITY FIX Phase 2: Add secure search_path to remaining database functions

-- Update award_points_enhanced_v3 function
CREATE OR REPLACE FUNCTION public.award_points_enhanced_v3(p_user_id uuid, p_activity_type text, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb, p_custom_points integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_points INTEGER;
  v_current_total INTEGER := 0;
  v_new_level INTEGER;
  v_old_level INTEGER;
  v_activity_id UUID;
  v_settings RECORD;
  v_existing_activity RECORD;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Verification of duplication based on activity type
  IF p_activity_type = 'daily_checkin' THEN
    -- Daily check-in: only 1 per day
    SELECT * INTO v_existing_activity
    FROM gamification_activities
    WHERE user_id = p_user_id
      AND activity_type = p_activity_type
      AND DATE(created_at) = v_today;
      
    IF FOUND THEN
      RAISE NOTICE 'Daily checkin already exists for user % today', p_user_id;
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Check-in diário já realizado hoje',
        'duplicate', true
      );
    END IF;
    
  ELSIF p_activity_type = 'meal_logged' AND p_metadata ? 'meal_id' THEN
    -- Meal: check by meal_id and specific date
    SELECT * INTO v_existing_activity
    FROM gamification_activities
    WHERE user_id = p_user_id
      AND activity_type = p_activity_type
      AND metadata->>'meal_id' = p_metadata->>'meal_id'
      AND DATE(created_at) = COALESCE((p_metadata->>'date')::date, v_today);
      
    IF FOUND THEN
      RAISE NOTICE 'Meal log already exists for user % with meal_id % and date %', 
        p_user_id, p_metadata->>'meal_id', COALESCE(p_metadata->>'date', v_today::text);
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Refeição já registrada',
        'duplicate', true
      );
    END IF;
    
  ELSE
    -- For other types, general time-based verification
    SELECT * INTO v_existing_activity
    FROM gamification_activities
    WHERE user_id = p_user_id
      AND activity_type = p_activity_type
      AND created_at > (NOW() - INTERVAL '1 minute');
      
    IF FOUND THEN
      RAISE NOTICE 'Recent activity found for user % with type %', p_user_id, p_activity_type;
      RETURN jsonb_build_object(
        'success', false,
        'message', 'Atividade registrada recentemente',
        'duplicate', true
      );
    END IF;
  END IF;

  -- Fetch teacher's scoring settings
  SELECT gs.* INTO v_settings
  FROM gamification_settings gs
  JOIN students s ON s.teacher_id = gs.teacher_id
  WHERE s.user_id = p_user_id
  LIMIT 1;

  IF NOT FOUND THEN
    -- Default settings if not found
    v_settings := ROW(
      NULL, NULL, 75, 10, 25, 100, 300, 150, 100, 5, 20, 1.5, 500, 50, NOW(), NOW()
    )::gamification_settings;
  END IF;

  -- Determine points based on activity type
  v_points := CASE p_activity_type
    WHEN 'training_completed' THEN COALESCE(p_custom_points, v_settings.points_workout)
    WHEN 'daily_checkin' THEN COALESCE(p_custom_points, v_settings.points_checkin)
    WHEN 'meal_logged' THEN COALESCE(p_custom_points, v_settings.points_meal_log)
    WHEN 'progress_logged' THEN COALESCE(p_custom_points, v_settings.points_progress_update)
    WHEN 'goal_achieved' THEN COALESCE(p_custom_points, v_settings.points_goal_achieved)
    WHEN 'physical_assessment' THEN COALESCE(p_custom_points, v_settings.points_assessment)
    WHEN 'medical_exam' THEN COALESCE(p_custom_points, v_settings.points_medical_exam)
    WHEN 'ai_interaction' THEN COALESCE(p_custom_points, v_settings.points_ai_interaction)
    WHEN 'teacher_message' THEN COALESCE(p_custom_points, v_settings.points_teacher_message)
    ELSE COALESCE(p_custom_points, 10)
  END;

  -- Check daily limit
  DECLARE
    v_daily_points INTEGER := 0;
  BEGIN
    SELECT COALESCE(SUM(points_earned), 0) INTO v_daily_points
    FROM gamification_activities
    WHERE user_id = p_user_id
      AND DATE(created_at) = v_today;
      
    IF v_daily_points + v_points > v_settings.max_daily_points THEN
      v_points := GREATEST(0, v_settings.max_daily_points - v_daily_points);
      
      IF v_points <= 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'message', 'Limite diário de pontos atingido',
          'daily_limit_reached', true
        );
      END IF;
    END IF;
  END;

  -- Insert gamification activity
  INSERT INTO gamification_activities (
    user_id, activity_type, points_earned, description, metadata
  ) VALUES (
    p_user_id, p_activity_type, v_points, 
    COALESCE(p_description, 'Atividade: ' || p_activity_type),
    p_metadata
  ) RETURNING id INTO v_activity_id;

  -- Update user points
  INSERT INTO user_points (user_id, total_points, last_activity_date)
  VALUES (p_user_id, v_points, v_today)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_points.total_points + v_points,
    last_activity_date = v_today,
    updated_at = NOW()
  RETURNING total_points, level INTO v_current_total, v_old_level;

  -- Calculate new level
  v_new_level := FLOOR(v_current_total / 100.0) + 1;

  -- Update level if changed
  IF v_new_level > v_old_level THEN
    UPDATE user_points 
    SET level = v_new_level 
    WHERE user_id = p_user_id;

    -- Insert level up activity (without duplicating)
    IF NOT EXISTS (
      SELECT 1 FROM gamification_activities 
      WHERE user_id = p_user_id 
        AND activity_type = 'level_up' 
        AND metadata->>'level' = v_new_level::text
        AND DATE(created_at) = v_today
    ) THEN
      INSERT INTO gamification_activities (
        user_id, activity_type, points_earned, description, metadata
      ) VALUES (
        p_user_id, 'level_up', v_settings.level_up_bonus,
        'Subiu para o nível ' || v_new_level,
        jsonb_build_object('level', v_new_level, 'previous_level', v_old_level)
      );

      UPDATE user_points 
      SET total_points = total_points + v_settings.level_up_bonus
      WHERE user_id = p_user_id;
      
      v_current_total := v_current_total + v_settings.level_up_bonus;
    END IF;
  END IF;

  RAISE NOTICE 'Points awarded successfully: % points for % to user %', v_points, p_activity_type, p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'total_points', v_current_total,
    'level', v_new_level,
    'level_up', v_new_level > v_old_level,
    'activity_id', v_activity_id
  );
END;
$function$;

-- Update get_teacher_chat_stats_optimized function
CREATE OR REPLACE FUNCTION public.get_teacher_chat_stats_optimized(teacher_id_param uuid)
 RETURNS TABLE(conversations_with_teacher_messages integer, conversations_with_student_messages integer, unread_teacher_messages integer, active_students_count integer, total_conversations_count integer, response_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  today_date DATE := CURRENT_DATE;
  result_record RECORD;
BEGIN
  -- Use a single optimized query with aggregations
  SELECT
    COUNT(DISTINCT CASE 
      WHEN cm.sender_type = 'teacher' AND DATE(cm.created_at) = today_date 
      THEN cm.conversation_id 
    END)::INTEGER as teacher_conversations_today,
    
    COUNT(DISTINCT CASE 
      WHEN cm.sender_type = 'student' AND DATE(cm.created_at) = today_date 
      THEN cm.conversation_id 
    END)::INTEGER as student_conversations_today,
    
    COALESCE(SUM(c.unread_count_teacher), 0)::INTEGER as unread_count,
    
    COUNT(DISTINCT c.student_id)::INTEGER as total_conversations,
    
    -- Active students (messages in the last 5 minutes)
    COUNT(DISTINCT CASE 
      WHEN cm.sender_type = 'student' 
        AND cm.created_at > (NOW() - INTERVAL '5 minutes')
      THEN c.student_id 
    END)::INTEGER as active_count
    
  INTO result_record
  FROM conversations c
  LEFT JOIN chat_messages cm ON cm.conversation_id = c.id
  WHERE c.teacher_id = teacher_id_param 
    AND c.is_active = true;

  -- Calculate response rate
  WITH response_stats AS (
    SELECT 
      COUNT(DISTINCT CASE 
        WHEN cm.sender_type = 'student' AND DATE(cm.created_at) = today_date 
        THEN cm.conversation_id 
      END) as student_convs,
      COUNT(DISTINCT CASE 
        WHEN cm.sender_type = 'teacher' AND DATE(cm.created_at) = today_date 
        THEN cm.conversation_id 
      END) as teacher_convs
    FROM conversations c
    LEFT JOIN chat_messages cm ON cm.conversation_id = c.id
    WHERE c.teacher_id = teacher_id_param AND c.is_active = true
  )
  SELECT 
    result_record.teacher_conversations_today,
    result_record.student_conversations_today,
    result_record.unread_count,
    result_record.active_count,
    result_record.total_conversations,
    CASE 
      WHEN rs.student_convs > 0 
      THEN ROUND((rs.teacher_convs::NUMERIC / rs.student_convs) * 100, 0)
      ELSE 0 
    END
  INTO 
    conversations_with_teacher_messages,
    conversations_with_student_messages, 
    unread_teacher_messages,
    active_students_count,
    total_conversations_count,
    response_rate
  FROM response_stats rs;

  RETURN QUERY SELECT 
    conversations_with_teacher_messages,
    conversations_with_student_messages,
    unread_teacher_messages,
    active_students_count,
    total_conversations_count,
    response_rate;
END;
$function$;

-- Update list_available_slots_improved function
CREATE OR REPLACE FUNCTION public.list_available_slots_improved(p_teacher_id uuid, p_start_date date, p_end_date date, p_slot_minutes integer DEFAULT NULL::integer)
 RETURNS TABLE(slot_date date, slot_start timestamp with time zone, slot_end timestamp with time zone, slot_minutes integer, slot_teacher_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare
  uid uuid := auth.uid();
  iter_date date;
  av record;
  exception record;
  step int;
  series_start timestamptz;
  series_end timestamptz;
  s timestamptz;
  slot_end_time timestamptz;
  wday int;
  is_exception boolean;
  has_special_hours boolean;
  booking_settings record;
  min_booking_time timestamptz;
  max_booking_date date;
  current_time_br timestamptz;
  teacher_timezone text := 'America/Sao_Paulo';
begin
  -- More flexible auth check - allow if user is teacher or student or null (for testing)
  if uid is not null and uid <> p_teacher_id then
    if not exists (
      select 1 from public.students st
      where st.user_id = uid and st.teacher_id = p_teacher_id
    ) then
      raise exception 'Not authorized to view this teacher''s availability';
    end if;
  end if;

  -- Get current time in Brazil timezone
  current_time_br := now() AT TIME ZONE teacher_timezone;

  -- Get booking settings with logging
  select * into booking_settings
  from public.teacher_booking_settings
  where teacher_booking_settings.teacher_id = p_teacher_id;

  -- Set defaults if no settings found
  if not found then
    booking_settings.minimum_advance_minutes := 5;
    booking_settings.visibility_days := 30;
    booking_settings.allow_same_day := true;
    raise notice 'Using default booking settings: min_advance=5min, same_day=true, visibility=30days';
  else
    raise notice 'Found booking settings: min_advance_minutes=%, same_day=%, visibility=%', 
      booking_settings.minimum_advance_minutes, 
      booking_settings.allow_same_day, 
      booking_settings.visibility_days;
  end if;

  -- Calculate minimum booking time based on advance minutes using Brazil timezone
  min_booking_time := current_time_br + make_interval(mins => booking_settings.minimum_advance_minutes);
  raise notice 'Current time BR: %, Min booking time BR: % (advance: % minutes)', current_time_br, min_booking_time, booking_settings.minimum_advance_minutes;
  
  -- Calculate maximum booking date based on visibility days  
  max_booking_date := current_time_br::date + make_interval(days => booking_settings.visibility_days);

  -- Restrict end date to visibility window
  if p_end_date > max_booking_date then
    p_end_date := max_booking_date;
  end if;

  -- Loop through each date in the range
  iter_date := p_start_date;
  
  while iter_date <= p_end_date loop
    wday := extract(dow from iter_date);
    is_exception := false;
    has_special_hours := false;
    
    raise notice 'Processing date: %, weekday: %', iter_date, wday;
    
    -- Skip dates that are too far in advance or don't allow same day booking
    if iter_date = current_time_br::date and not booking_settings.allow_same_day then
      raise notice 'Skipping same day booking for date: %', iter_date;
      iter_date := iter_date + 1;
      continue;
    end if;
    
    -- Check for exceptions on this date
    select * into exception
    from public.teacher_schedule_exceptions
    where teacher_schedule_exceptions.teacher_id = p_teacher_id and date = iter_date
    limit 1;
    
    if found then
      is_exception := true;
      if exception.type = 'blocked' or (exception.type = 'holiday' and not exception.is_available) then
        raise notice 'Date % is blocked or unavailable holiday', iter_date;
        iter_date := iter_date + 1;
        continue;
      elsif exception.type = 'special_hours' and exception.is_available then
        has_special_hours := true;
        raise notice 'Date % has special hours', iter_date;
      end if;
    end if;
    
    -- Get availability for this weekday (or use special hours)
    if has_special_hours then
      -- Use special hours from exception
      step := coalesce(p_slot_minutes, 60);
      -- Proper timezone conversion
      series_start := (iter_date + exception.special_start_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
      series_end := (iter_date + exception.special_end_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
      
      raise notice 'Special hours: start=%, end=%, step=%', series_start, series_end, step;
      
      -- Generate slots manually with proper end time calculation
      s := series_start;
      while s + make_interval(mins => step) <= series_end loop
        slot_end_time := s + make_interval(mins => step);
        
        raise notice 'Checking special slot: % to %', s, slot_end_time;
        
        -- Check if slot meets minimum advance time requirement
        if (s AT TIME ZONE teacher_timezone) < min_booking_time then
          raise notice 'Skipping slot % - before min booking time', s;
          s := s + make_interval(mins => step);
          continue;
        end if;
        
        -- Check for non-cancelled appointments
        if not exists (
          select 1 from public.appointments a
          where a.teacher_id = p_teacher_id
            and a.status != 'cancelled'
            and tstzrange(a.scheduled_time, a.scheduled_time + make_interval(mins => coalesce(a.duration, step)), '[)') &&
                tstzrange(s, slot_end_time, '[)')
        ) then
          slot_date := iter_date;
          slot_start := s;
          slot_end := slot_end_time;
          slot_minutes := step;
          slot_teacher_id := p_teacher_id;
          raise notice 'Returning special slot: % to %, duration: % minutes', s, slot_end_time, step;
          return next;
        else
          raise notice 'Special slot % is blocked by existing appointment', s;
        end if;
        
        s := s + make_interval(mins => step);
      end loop;
    else
      -- Use regular weekly availability
      for av in
        select *
        from public.teacher_availability ta
        where ta.teacher_id = p_teacher_id and ta.weekday = wday
      loop
        step := coalesce(p_slot_minutes, av.slot_minutes, 60);
        -- Proper timezone conversion
        series_start := (iter_date + av.start_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
        series_end := (iter_date + av.end_time) AT TIME ZONE teacher_timezone AT TIME ZONE 'UTC';
        
        raise notice 'Availability for weekday %: % to %, step=%', wday, series_start, series_end, step;
        
        -- Generate slots manually with proper end time calculation
        s := series_start;
        while s + make_interval(mins => step) <= series_end loop
          slot_end_time := s + make_interval(mins => step);
          
          raise notice 'Checking slot: % to %, min_booking_time=%', s, slot_end_time, min_booking_time;
          
          -- Check if slot meets minimum advance time requirement
          if (s AT TIME ZONE teacher_timezone) < min_booking_time then
            raise notice 'Skipping slot % - before min booking time %', s, min_booking_time;
            s := s + make_interval(mins => step);
            continue;
          end if;
          
          -- Check for non-cancelled appointments
          if not exists (
            select 1 from public.appointments a
            where a.teacher_id = p_teacher_id
              and a.status != 'cancelled'
              and tstzrange(a.scheduled_time, a.scheduled_time + make_interval(mins => coalesce(a.duration, step)), '[)') &&
                  tstzrange(s, slot_end_time, '[)')
          ) then
            slot_date := iter_date;
            slot_start := s;
            slot_end := slot_end_time;
            slot_minutes := step;
            slot_teacher_id := p_teacher_id;
            raise notice 'Returning slot: % to %, duration: % minutes', s, slot_end_time, step;
            return next;
          else
            raise notice 'Slot % is blocked by existing appointment', s;
          end if;
          
          s := s + make_interval(mins => step);
        end loop;
      end loop;
    end if;
    
    iter_date := iter_date + 1;
  end loop;
  
  return;
end;
$function$;