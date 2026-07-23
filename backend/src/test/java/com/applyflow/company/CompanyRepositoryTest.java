package com.applyflow.company;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class CompanyRepositoryTest {
    @Autowired CompanyRepository companies;
    @Autowired JdbcTemplate jdbc;

    @AfterEach
    void cleanDatabase() {
        companies.deleteAll();
        jdbc.update("delete from refresh_session");
        jdbc.update("delete from app_user");
    }

    @Test
    void repositoryPredicatesKeepOwnersAndArchiveViewsIsolated() {
        UUID firstOwner = user("first-repository@example.com");
        UUID secondOwner = user("second-repository@example.com");
        Instant now = Instant.now();
        Company active = companies.saveAndFlush(new Company(UUID.randomUUID(), firstOwner, "Acme", "acme", null, null, null, null, now));
        Company archived = companies.saveAndFlush(new Company(UUID.randomUUID(), firstOwner, "Beta", "beta", null, null, null, null, now));
        archived.archive(now);
        companies.saveAndFlush(archived);
        companies.saveAndFlush(new Company(UUID.randomUUID(), secondOwner, "Acme", "acme", null, null, null, null, now));

        assertThat(companies.findAllByOwnerIdAndArchivedAtIsNullOrderByNormalizedNameAsc(firstOwner))
                .extracting(Company::getId).containsExactly(active.getId());
        assertThat(companies.findAllByOwnerIdAndArchivedAtIsNotNullOrderByNormalizedNameAsc(firstOwner))
                .extracting(Company::getId).containsExactly(archived.getId());
        assertThat(companies.findByIdAndOwnerId(active.getId(), secondOwner)).isEmpty();
    }

    @Test
    void databaseEnforcesNormalizedNameUniquenessPerOwner() {
        UUID owner = user("unique-repository@example.com");
        Instant now = Instant.now();
        companies.saveAndFlush(new Company(UUID.randomUUID(), owner, "Acme", "acme", null, null, null, null, now));

        assertThatThrownBy(() -> companies.saveAndFlush(
                new Company(UUID.randomUUID(), owner, "ACME", "acme", null, null, null, null, now)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private UUID user(String email) {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into app_user(id, email, normalized_email, password_hash, created_at, time_zone, version) values (?, ?, ?, ?, ?, ?, ?)",
                id, email, email, "test-hash", Instant.now(), "UTC", 0);
        return id;
    }
}
