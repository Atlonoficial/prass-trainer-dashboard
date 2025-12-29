// Firebase Security Rules Configuration
export const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Teachers can access all their data
    match /teachers/{teacherId} {
      allow read, write: if request.auth != null && request.auth.uid == teacherId;
    }
    
    // Students data - teachers can access all, students only their own
    match /students/{studentId} {
      allow read, write: if request.auth != null && 
        (resource.data.teacher_id == request.auth.uid || request.auth.uid == studentId);
    }
    
    // Training plans
    match /training_plans/{planId} {
      allow read, write: if request.auth != null;
    }
    
    // Diet plans
    match /diet_plans/{planId} {
      allow read, write: if request.auth != null;
    }
    
    // Exercises library
    match /exercises/{exerciseId} {
      allow read, write: if request.auth != null;
    }
    
    // Foods library
    match /foods/{foodId} {
      allow read, write: if request.auth != null;
    }
    
    // Courses
    match /courses/{courseId} {
      allow read, write: if request.auth != null;
    }
    
    // Payments
    match /payments/{paymentId} {
      allow read, write: if request.auth != null;
    }
    
    // Appointments
    match /appointments/{appointmentId} {
      allow read, write: if request.auth != null;
    }
    
    // Notifications
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null;
    }
    
    // Conversations
    match /conversations/{conversationId} {
      allow read, write: if request.auth != null;
    }
    
    // Messages
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }
  }
}
`

export const storageRules = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Profile images
    match /profile_images/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Exercise videos and images
    match /exercise_media/{exerciseId}/{fileName} {
      allow read, write: if request.auth != null;
    }
    
    // Course covers
    match /course_covers/{courseId}/{fileName} {
      allow read, write: if request.auth != null;
    }
    
    // Marketing banners
    match /marketing_banners/{bannerId}/{fileName} {
      allow read, write: if request.auth != null;
    }
    
    // Documents
    match /documents/{type}/{id}/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
`

// Firestore Collections Structure
export const firestoreCollections = {
  teachers: 'teachers',
  students: 'students',
  training_plans: 'training_plans',
  diet_plans: 'diet_plans',
  exercises: 'exercises',
  foods: 'foods',
  courses: 'courses',
  payments: 'payments',
  appointments: 'appointments',
  notifications: 'notifications',
  conversations: 'conversations',
  messages: 'messages',
  formulas: 'formulas',
  workouts: 'workouts',
  menus: 'menus',
  techniques: 'techniques',
  achievements: 'achievements',
  rewards: 'rewards',
  banners: 'banners',
  reports: 'reports'
}

// Composite Indexes needed for Firestore
export const requiredIndexes = [
  {
    collection: 'students',
    fields: ['teacher_id', 'created_at']
  },
  {
    collection: 'training_plans',
    fields: ['student_id', 'created_at']
  },
  {
    collection: 'diet_plans',
    fields: ['student_id', 'created_at']
  },
  {
    collection: 'payments',
    fields: ['student_id', 'due_date']
  },
  {
    collection: 'appointments',
    fields: ['student_id', 'date']
  },
  {
    collection: 'notifications',
    fields: ['student_id', 'read', 'created_at']
  },
  {
    collection: 'messages',
    fields: ['conversation_id', 'created_at']
  }
]