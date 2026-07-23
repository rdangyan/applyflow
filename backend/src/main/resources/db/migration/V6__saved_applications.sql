create table job_application (
    id uuid primary key,
    owner_id uuid not null references app_user(id) on delete cascade,
    company_id uuid not null references company(id),
    job_title varchar(300) not null,
    status varchar(30) not null,
    posting_url varchar(2048),
    location varchar(200),
    description varchar(20000),
    notes varchar(10000),
    employment_type varchar(30),
    workplace_arrangement varchar(20),
    salary_min numeric(19, 2),
    salary_max numeric(19, 2),
    salary_currency varchar(3),
    salary_pay_period varchar(20),
    source_category varchar(30),
    source_detail varchar(500),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    version bigint not null default 0,
    constraint job_application_salary_range_valid check (
        salary_min is null or salary_max is null or salary_min <= salary_max
    ),
    constraint job_application_employment_type_valid check (
        employment_type is null or employment_type in ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'OTHER')
    ),
    constraint job_application_workplace_valid check (
        workplace_arrangement is null or workplace_arrangement in ('REMOTE', 'HYBRID', 'ON_SITE')
    ),
    constraint job_application_pay_period_valid check (
        salary_pay_period is null or salary_pay_period in ('HOURLY', 'MONTHLY', 'YEARLY')
    ),
    constraint job_application_source_valid check (
        source_category is null or source_category in (
            'COMPANY_WEBSITE', 'LINKEDIN', 'INDEED', 'REFERRAL', 'RECRUITER',
            'OTHER_JOB_BOARD', 'CAREER_FAIR', 'OTHER'
        )
    ),
    constraint job_application_saved_status check (status = 'SAVED')
);

create index job_application_owner_id_idx on job_application(owner_id);
create index job_application_owner_company_idx on job_application(owner_id, company_id);
