alter table job_application add column application_date date;

alter table job_application drop constraint job_application_saved_status;
alter table job_application add constraint job_application_status_valid check (
    status in ('SAVED', 'APPLIED', 'SCREENING', 'INTERVIEWING', 'OFFER', 'ACCEPTED', 'REJECTED', 'WITHDRAWN')
);

alter table job_application add constraint job_application_date_required check (
    status = 'SAVED' or application_date is not null
);
