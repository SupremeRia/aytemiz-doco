create or replace function private.new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  designated_op constant text := 'emindeniz1881@gmail.com';
begin
  insert into public.profiles(id, first_name, last_name, email, status)
  values(
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    case when lower(new.email) = designated_op then 'active'::public.profile_status else 'pending'::public.profile_status end
  );

  if lower(new.email) = designated_op then
    insert into public.system_admins(user_id, is_op, created_by)
    values(new.id, true, new.id)
    on conflict(user_id) do update set is_op = true, updated_at = now();
  end if;

  return new;
end
$$;

update public.profiles
set status = 'active', updated_at = now()
where lower(email) = 'emindeniz1881@gmail.com';

insert into public.system_admins(user_id, is_op, created_by)
select id, true, id
from public.profiles
where lower(email) = 'emindeniz1881@gmail.com'
on conflict(user_id) do update set is_op = true, updated_at = now();
