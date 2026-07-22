package com.applyflow.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "app_user")
class UserAccount {
    @Id
    private UUID id;
    @Column(nullable = false, length = 320)
    private String email;
    @Column(name = "normalized_email", nullable = false, unique = true, length = 320)
    private String normalizedEmail;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "time_zone", nullable = false)
    private String timeZone;
    @Version
    @Column(nullable = false)
    private long version;

    protected UserAccount() {}

    UserAccount(UUID id, String email, String normalizedEmail, String passwordHash, Instant createdAt, String timeZone) {
        this.id = id;
        this.email = email;
        this.normalizedEmail = normalizedEmail;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
        this.timeZone = timeZone;
    }

    UUID getId() { return id; }
    String getEmail() { return email; }
    String getNormalizedEmail() { return normalizedEmail; }
    String getPasswordHash() { return passwordHash; }
    Instant getCreatedAt() { return createdAt; }
    String getTimeZone() { return timeZone; }
    long getVersion() { return version; }
    void changeTimeZone(String timeZone) { this.timeZone = timeZone; }
}
