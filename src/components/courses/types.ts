// Types for course modules and lessons (temporary until database integration)
export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
  coverImage?: string;
}

export interface Lesson {
  id: string;
  title: string;
  videoUrl?: string;
  materials?: string[];
}