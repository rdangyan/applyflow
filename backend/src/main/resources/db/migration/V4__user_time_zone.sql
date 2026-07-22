alter table app_user add column time_zone varchar(255) not null default 'UTC';
alter table app_user add column version bigint not null default 0;
