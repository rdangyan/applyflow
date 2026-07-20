package com.applyflow.auth;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static com.applyflow.auth.AuthDtos.*;

@Service
class AuthService {
    private final UserAccountRepository users;
    private final RefreshSessionService sessions;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    private final AuthProperties properties;
    private final Clock clock;

    AuthService(UserAccountRepository users, RefreshSessionService sessions, PasswordEncoder passwordEncoder,
                TokenService tokens, AuthProperties properties) {
        this.users = users;
        this.sessions = sessions;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.properties = properties;
        this.clock = Clock.systemUTC();
    }

    @Transactional
    IssuedAuthentication register(RegisterRequest request) {
        String email = request.email().trim();
        String normalized = normalizeEmail(email);
        if (users.existsByNormalizedEmail(normalized)) {
            throw new AuthenticationException("An account with this email already exists", "EMAIL_ALREADY_REGISTERED");
        }
        UserAccount user = new UserAccount(UUID.randomUUID(), email, normalized,
                passwordEncoder.encode(request.password()), clock.instant());
        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new AuthenticationException("An account with this email already exists", "EMAIL_ALREADY_REGISTERED");
        }
        return issue(user);
    }

    @Transactional
    IssuedAuthentication login(LoginRequest request) {
        UserAccount user = users.findByNormalizedEmail(normalizeEmail(request.email()))
                .orElseThrow(AuthService::invalidCredentials);
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return issue(user);
    }

    IssuedAuthentication refresh(String refreshToken) {
        RefreshSessionService.RotationResult result = sessions.rotate(refreshToken);
        if (result.status() == RefreshSessionService.RotationResult.Status.REPLAYED) {
            throw new AuthenticationException("Refresh token reuse was detected", "REFRESH_TOKEN_REUSED");
        }
        if (result.status() != RefreshSessionService.RotationResult.Status.SUCCESS) {
            throw new AuthenticationException("Authentication is required", "INVALID_SESSION");
        }
        RefreshSessionService.SessionToken session = result.sessionToken();
        return authentication(session);
    }

    @Transactional(readOnly = true)
    CurrentUser currentUser(String subject) {
        try {
            UUID id = UUID.fromString(subject);
            return users.findById(id).map(CurrentUser::from)
                    .orElseThrow(() -> new AuthenticationException("Authentication is required", "INVALID_ACCESS_TOKEN"));
        } catch (IllegalArgumentException exception) {
            throw new AuthenticationException("Authentication is required", "INVALID_ACCESS_TOKEN");
        }
    }

    @Transactional
    void logout(String refreshToken) {
        sessions.logout(refreshToken);
    }

    DeviceSessionsResponse sessions(String subject, String sessionId) {
        UUID userId = parseUuid(subject, "INVALID_ACCESS_TOKEN");
        UUID currentSessionId = parseUuid(sessionId, "INVALID_ACCESS_TOKEN");
        List<DeviceSession> active = sessions.activeSessions(userId, currentSessionId);
        return new DeviceSessionsResponse(active);
    }

    boolean revokeSession(String subject, UUID sessionId) {
        return sessions.revoke(parseUuid(subject, "INVALID_ACCESS_TOKEN"), sessionId);
    }

    void logoutEverywhere(String subject) {
        sessions.revokeAll(parseUuid(subject, "INVALID_ACCESS_TOKEN"));
    }

    private IssuedAuthentication issue(UserAccount user) {
        RefreshSessionService.SessionToken session = sessions.create(user);
        return authentication(session);
    }

    private IssuedAuthentication authentication(RefreshSessionService.SessionToken session) {
        CurrentUser user = new CurrentUser(session.userId(), session.email(), session.userCreatedAt());
        AuthResponse response = new AuthResponse(
                tokens.accessToken(session.userId(), session.email(), session.familyId(), session.issuedAt()),
                properties.accessTokenMinutes() * 60,
                user);
        return new IssuedAuthentication(response, session.rawToken());
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static UUID parseUuid(String value, String code) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new AuthenticationException("Authentication is required", code);
        }
    }

    private static AuthenticationException invalidCredentials() {
        return new AuthenticationException("Email or password is incorrect", "INVALID_CREDENTIALS");
    }
}
