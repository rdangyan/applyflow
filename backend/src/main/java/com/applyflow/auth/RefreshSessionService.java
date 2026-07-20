package com.applyflow.auth;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static com.applyflow.auth.AuthDtos.DeviceSession;

@Service
class RefreshSessionService {
    private final RefreshSessionRepository sessions;
    private final TokenService tokens;
    private final AuthProperties properties;
    private final Clock clock;

    RefreshSessionService(RefreshSessionRepository sessions, TokenService tokens, AuthProperties properties) {
        this.sessions = sessions;
        this.tokens = tokens;
        this.properties = properties;
        this.clock = Clock.systemUTC();
    }

    @Transactional
    SessionToken create(UserAccount user) {
        Instant now = clock.instant();
        UUID familyId = UUID.randomUUID();
        String rawToken = tokens.newRefreshToken();
        sessions.save(new RefreshSession(
                UUID.randomUUID(), familyId, user, tokens.hashRefreshToken(rawToken), now, now, now,
                now.plus(properties.refreshInactivityDays(), ChronoUnit.DAYS),
                now.plus(properties.refreshAbsoluteDays(), ChronoUnit.DAYS)));
        return sessionToken(user, familyId, rawToken, now);
    }

    @Transactional
    RotationResult rotate(String rawToken) {
        Instant now = clock.instant();
        RefreshSession presented = sessions.findByTokenHash(tokens.hashRefreshToken(rawToken)).orElse(null);
        if (presented == null) return RotationResult.invalid();
        if (presented.isRotated()) {
            sessions.revokeFamily(presented.getFamilyId(), now);
            return RotationResult.replayed();
        }
        if (!presented.isActiveAt(now)) return RotationResult.invalid();

        presented.rotate(now);
        String replacement = tokens.newRefreshToken();
        sessions.save(new RefreshSession(
                UUID.randomUUID(), presented.getFamilyId(), presented.getUser(), tokens.hashRefreshToken(replacement),
                now, presented.getSessionCreatedAt(), now,
                now.plus(properties.refreshInactivityDays(), ChronoUnit.DAYS), presented.getAbsoluteExpiresAt()));
        return RotationResult.success(sessionToken(presented.getUser(), presented.getFamilyId(), replacement, now));
    }

    @Transactional
    void logout(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) return;
        sessions.findByTokenHash(tokens.hashRefreshToken(rawToken))
                .ifPresent(session -> sessions.revokeFamily(session.getFamilyId(), clock.instant()));
    }

    @Transactional(readOnly = true)
    List<DeviceSession> activeSessions(UUID userId, UUID currentFamilyId) {
        Instant now = clock.instant();
        return sessions.findActiveByUserId(userId, now).stream()
                .map(session -> new DeviceSession(
                        session.getFamilyId(), session.getSessionCreatedAt(), session.getLastUsedAt(),
                        session.getEffectiveExpiresAt(), session.getFamilyId().equals(currentFamilyId)))
                .toList();
    }

    @Transactional(readOnly = true)
    boolean isActive(UUID userId, UUID familyId) {
        return sessions.existsActiveFamily(userId, familyId, clock.instant());
    }

    @Transactional
    boolean revoke(UUID userId, UUID familyId) {
        return sessions.revokeOwnedFamily(familyId, userId, clock.instant()) > 0;
    }

    @Transactional
    void revokeAll(UUID userId) {
        sessions.revokeAllForUser(userId, clock.instant());
    }

    private static SessionToken sessionToken(UserAccount user, UUID familyId, String rawToken, Instant issuedAt) {
        return new SessionToken(user.getId(), user.getEmail(), user.getCreatedAt(), familyId, rawToken, issuedAt);
    }

    record SessionToken(
            UUID userId,
            String email,
            Instant userCreatedAt,
            UUID familyId,
            String rawToken,
            Instant issuedAt
    ) {}

    record RotationResult(Status status, SessionToken sessionToken) {
        enum Status { SUCCESS, INVALID, REPLAYED }
        static RotationResult success(SessionToken token) { return new RotationResult(Status.SUCCESS, token); }
        static RotationResult invalid() { return new RotationResult(Status.INVALID, null); }
        static RotationResult replayed() { return new RotationResult(Status.REPLAYED, null); }
    }
}
