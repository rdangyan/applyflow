create table app_user (
    id uuid primary key,
    email varchar(320) not null,
    normalized_email varchar(320) not null unique,
    password_hash varchar(255) not null,
    created_at timestamp with time zone not null
);

create table refresh_session (
    id uuid primary key,
    user_id uuid not null references app_user(id) on delete cascade,
    token_hash varchar(64) not null unique,
    created_at timestamp with time zone not null,
    expires_at timestamp with time zone not null,
    revoked_at timestamp with time zone
);

create index refresh_session_user_id_idx on refresh_session(user_id);
