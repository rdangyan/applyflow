create table company (
    id uuid primary key,
    owner_id uuid not null references app_user(id) on delete cascade,
    name varchar(200) not null,
    normalized_name varchar(200) not null,
    website varchar(2048),
    industry varchar(200),
    location varchar(200),
    notes varchar(10000),
    archived_at timestamp with time zone,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    version bigint not null default 0,
    constraint company_owner_normalized_name_unique unique (owner_id, normalized_name)
);

create index company_owner_archived_name_idx on company(owner_id, archived_at, normalized_name);
