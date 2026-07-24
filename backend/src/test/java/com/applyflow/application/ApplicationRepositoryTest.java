package com.applyflow.application;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class ApplicationRepositoryTest {
    @Autowired ApplicationRepository applications;
    @Autowired JdbcTemplate jdbc;

    @AfterEach
    void cleanDatabase() {
        applications.deleteAll();
        jdbc.update("delete from company");
        jdbc.update("delete from refresh_session");
        jdbc.update("delete from app_user");
    }

    @Test
    void repositoryLookupAlwaysIncludesTheOwnerPredicate() {
        UUID firstOwner = user("application-repository-first@example.com");
        UUID secondOwner = user("application-repository-second@example.com");
        UUID companyId = company(firstOwner);
        Instant now = Instant.now();
        JobApplication application = applications.saveAndFlush(new JobApplication(
                UUID.randomUUID(), firstOwner, companyId, "Engineer", null, null, null, null, null,
                null, null, null, null, null, null, null, null, now));

        assertThat(applications.findByIdAndOwnerId(application.getId(), firstOwner)).isPresent();
        assertThat(applications.findByIdAndOwnerId(application.getId(), secondOwner)).isEmpty();
    }

    private UUID user(String email) {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into app_user(id, email, normalized_email, password_hash, created_at, time_zone, version) values (?, ?, ?, ?, ?, ?, ?)",
                id, email, email, "test-hash", Instant.now(), "UTC", 0);
        return id;
    }

    private UUID company(UUID ownerId) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into company(id, owner_id, name, normalized_name, created_at, updated_at, version)
                values (?, ?, ?, ?, ?, ?, ?)
                """, id, ownerId, "Acme", "acme", Instant.now(), Instant.now(), 0);
        return id;
    }
}
