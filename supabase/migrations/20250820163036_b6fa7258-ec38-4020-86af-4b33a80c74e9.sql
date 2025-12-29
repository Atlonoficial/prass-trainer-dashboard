-- Add Google Maps link field to training_locations table
ALTER TABLE public.training_locations 
ADD COLUMN google_maps_link text;