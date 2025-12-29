import { supabase } from '@/integrations/supabase/client'

// File upload utilities using Supabase Storage (public bucket: avatars)
export const uploadFile = async (file: File, path: string, fileName?: string): Promise<string> => {
  const finalFileName = fileName || file.name
  const key = `${path}/${finalFileName}`
  const { error } = await supabase.storage.from('avatars').upload(key, file, { upsert: true })
  if (error) {
    console.error('Error uploading file:', error)
    throw error
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(key)
  return data.publicUrl
}

export const deleteFile = async (url: string): Promise<void> => {
  try {
    // Convert public URL back to path by trimming bucket base URL
    const parts = url.split('/avatars/')
    const path = parts[1] || ''
    if (!path) return
    const { error } = await supabase.storage.from('avatars').remove([path])
    if (error) throw error
  } catch (error) {
    console.error('Error deleting file:', error)
    throw error
  }
}

export const generateFilePath = {
  profileImage: (userId: string) => `profile_images/${userId}`,
  exerciseVideo: (exerciseId: string) => `exercise_media/${exerciseId}`,
  exerciseImage: (exerciseId: string) => `exercise_media/${exerciseId}`,
  courseCover: (courseId: string) => `course_covers/${courseId}`,
  marketingBanner: (bannerId: string) => `marketing_banners/${bannerId}`,
  document: (type: string, id: string) => `documents/${type}/${id}`,
}

export const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
export const validatePhone = (phone: string): boolean => /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(phone)

export const formatPhone = (phone: string): string => {
  const numbers = phone.replace(/\D/g, '')
  if (numbers.length === 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  if (numbers.length === 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  return phone
}

export const formatDate = (date: string | Date): string => new Date(date).toLocaleDateString('pt-BR')
export const formatDateTime = (date: string | Date): string => new Date(date).toLocaleString('pt-BR')

export const calculateBMI = (weight: number, height: number): number => {
  const heightInMeters = height / 100
  return weight / (heightInMeters * heightInMeters)
}

export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Abaixo do peso'
  if (bmi < 25) return 'Peso normal'
  if (bmi < 30) return 'Sobrepeso'
  return 'Obesidade'
}

export const calculateAge = (birthDate: string | Date): number => {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export const calculateBasalMetabolicRate = (weight: number, height: number, age: number, gender: 'male' | 'female'): number => {
  return gender === 'male'
    ? 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age
    : 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age
}

export const calculateTotalDailyExpenditure = (bmr: number, activityLevel: 'sedentary' | 'light' | 'moderate' | 'heavy' | 'extra'): number => {
  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, heavy: 1.725, extra: 1.9 }
  return bmr * multipliers[activityLevel]
}

export const adjustCaloriesForGoal = (tdee: number, goal: 'lose' | 'maintain' | 'gain'): number => {
  switch (goal) {
    case 'lose':
      return tdee - 500
    case 'gain':
      return tdee + 500
    default:
      return tdee
  }
}
