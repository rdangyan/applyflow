package com.applyflow.auth;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;

import static com.applyflow.auth.AuthDtos.*;

@Service
class AuthService {
    private final UserAccountRepository users;
    private final RefreshSessionRepository sessions;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    private final AuthProperties properties;
    private final Clock clock;

    AuthService(UserAccountRepository users, RefreshSessionRepository sessions, PasswordEncoder passwordEncoder,
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

    @Transactional(readOnly = true)
    AuthResponse refresh(String refreshToken) {
        Instant now = clock.instant();
        RefreshSession session = sessions.findByTokenHash(tokens.hashRefreshToken(refreshToken))
                .filter(candidate -> candidate.isActiveAt(now))
                .orElseThrow(() -> new AuthenticationException("Authentication is required", "INVALID_SESSION"));
        return response(session.getUser(), now);
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
        if (refreshToken == null || refreshToken.isBlank()) return;
        sessions.findByTokenHash(tokens.hashRefreshToken(refreshToken))
                .filter(session -> session.isActiveAt(clock.instant()))
                .ifPresent(session -> session.revoke(clock.instant()));
    }

    private IssuedAuthentication issue(UserAccount user) {
        Instant now = clock.instant();
        String refreshToken = tokens.newRefreshToken();
        sessions.save(new RefreshSession(UUID.randomUUID(), user, tokens.hashRefreshToken(refreshToken), now,
                now.plus(properties.refreshTokenDays(), ChronoUnit.DAYS)));
        return new IssuedAuthentication(response(user, now), refreshToken);
    }

    private AuthResponse response(UserAccount user, Instant now) {
        return new AuthResponse(tokens.accessToken(user, now), properties.accessTokenMinutes() * 60, CurrentUser.from(user));
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static AuthenticationException invalidCredentials() {
        return new AuthenticationException("Email or password is incorrect", "INVALID_CREDENTIALS");
    }
}
