package com.applyflow.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

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

    protected UserAccount() {}

    UserAccount(UUID id, String email, String normalizedEmail, String passwordHash, Instant createdAt) {
        this.id = id;
        this.email = email;
        this.normalizedEmail = normalizedEmail;
        this.passwordHash = passwordHash;
        this.createdAt = createdAt;
    }

    UUID getId() { return id; }
    String getEmail() { return email; }
    String getNormalizedEmail() { return normalizedEmail; }
    String getPasswordHash() { return passwordHash; }
    Instant getCreatedAt() { return createdAt; }
}
