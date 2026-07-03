-- Grant admin dashboard access by sign-in email
-- Run in Supabase → SQL Editor

insert into public.platform_admins (user_id)
select u.id
from auth.users u
where lower(u.email) = lower('olaniranfemi01@gmail.com')
on conflict (user_id) do nothing;

-- Confirm (should return 1 row with your @username)
select p.username, p.display_name, u.email, pa.granted_at
from public.platform_admins pa
join public.profiles p on p.id = pa.user_id
join auth.users u on u.id = pa.user_id
where lower(u.email) = lower('olaniranfemi01@gmail.com');
