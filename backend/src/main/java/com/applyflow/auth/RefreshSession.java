package com.applyflow.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_session")
class RefreshSession {
    @Id
    private UUID id;
    @Column(name = "family_id", nullable = false)
    private UUID familyId;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "session_created_at", nullable = false)
    private Instant sessionCreatedAt;
    @Column(name = "last_used_at", nullable = false)
    private Instant lastUsedAt;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "absolute_expires_at", nullable = false)
    private Instant absoluteExpiresAt;
    @Column(name = "rotated_at")
    private Instant rotatedAt;
    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected RefreshSession() {}

    RefreshSession(UUID id, UUID familyId, UserAccount user, String tokenHash, Instant createdAt,
                   Instant sessionCreatedAt, Instant lastUsedAt, Instant expiresAt, Instant absoluteExpiresAt) {
        this.id = id;
        this.familyId = familyId;
        this.user = user;
        this.tokenHash = tokenHash;
        this.createdAt = createdAt;
        this.sessionCreatedAt = sessionCreatedAt;
        this.lastUsedAt = lastUsedAt;
        this.expiresAt = expiresAt;
        this.absoluteExpiresAt = absoluteExpiresAt;
    }

    UUID getFamilyId() { return familyId; }
    UserAccount getUser() { return user; }
    Instant getSessionCreatedAt() { return sessionCreatedAt; }
    Instant getLastUsedAt() { return lastUsedAt; }
    Instant getEffectiveExpiresAt() { return expiresAt.isBefore(absoluteExpiresAt) ? expiresAt : absoluteExpiresAt; }
    Instant getAbsoluteExpiresAt() { return absoluteExpiresAt; }
    boolean isRotated() { return rotatedAt != null; }
    boolean isActiveAt(Instant now) {
        return revokedAt == null && rotatedAt == null && expiresAt.isAfter(now) && absoluteExpiresAt.isAfter(now);
    }
    void rotate(Instant now) { rotatedAt = now; }
    void revoke(Instant now) { revokedAt = now; }
}
