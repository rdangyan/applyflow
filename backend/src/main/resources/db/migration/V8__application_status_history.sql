create table application_status_history (
    id uuid primary key,
    application_id uuid not null references job_application(id) on delete cascade,
    owner_id uuid not null references app_user(id) on delete cascade,
    previous_status varchar(30) not null,
    new_status varchar(30) not null,
    changed_at timestamp with time zone not null,
    note varchar(2000),
    constraint application_status_history_statuses_differ check (previous_status <> new_status),
    constraint application_status_history_previous_status_valid check (
        previous_status in ('SAVED', 'APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')
    ),
    constraint application_status_history_new_status_valid check (
        new_status in ('SAVED', 'APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')
    )
);

create index application_status_history_owner_application_changed_idx
    on application_status_history(owner_id, application_id, changed_at, id);
