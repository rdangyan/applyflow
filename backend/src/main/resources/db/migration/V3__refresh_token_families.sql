alter table refresh_session add column family_id uuid;
alter table refresh_session add column session_created_at timestamp with time zone;
alter table refresh_session add column last_used_at timestamp with time zone;
alter table refresh_session add column absolute_expires_at timestamp with time zone;
alter table refresh_session add column rotated_at timestamp with time zone;

update refresh_session
set family_id = id,
    session_created_at = created_at,
    last_used_at = created_at,
    absolute_expires_at = expires_at;

alter table refresh_session alter column family_id set not null;
alter table refresh_session alter column session_created_at set not null;
alter table refresh_session alter column last_used_at set not null;
alter table refresh_session alter column absolute_expires_at set not null;

create index refresh_session_family_id_idx on refresh_session(family_id);
create index refresh_session_active_user_idx on refresh_session(user_id, revoked_at, rotated_at);
