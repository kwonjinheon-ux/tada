-- Earlier avatar uploads could complete before profiles.avatar_path existed.
-- Recover only the canonical per-user avatar file and let the profile trigger
-- copy the restored path to the public seller profile.
update public.profiles as profile
set avatar_path = object.name
from storage.objects as object
where object.bucket_id = 'profile-avatars'
  and object.name = profile.id::text || '/avatar.jpg'
  and profile.avatar_path is null;
