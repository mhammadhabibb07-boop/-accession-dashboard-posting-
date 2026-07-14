-- Run this AFTER you've created the two user accounts in
-- Authentication -> Users (Supabase dashboard).
-- Replace the two email addresses below with the real ones you used.

insert into public.profiles (id, name, role, initials)
select id, 'Maya Torres', 'manager', 'MT' from auth.users where email = 'YOUR_EMAIL_HERE';

insert into public.profiles (id, name, role, initials)
select id, 'Daniel Cho', 'client', 'DC' from auth.users where email = 'DANIEL_EMAIL_HERE';
