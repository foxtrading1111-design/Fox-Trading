-- Add country and phone fields to users table
-- These fields are optional for backward compatibility

ALTER TABLE users 
ADD COLUMN country VARCHAR(100),
ADD COLUMN phone VARCHAR(20);