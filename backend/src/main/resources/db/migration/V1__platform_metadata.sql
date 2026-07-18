create table platform_metadata (
    metadata_key varchar(100) primary key,
    metadata_value varchar(255) not null
);

insert into platform_metadata (metadata_key, metadata_value) values ('schema_version', '0.1.0');
