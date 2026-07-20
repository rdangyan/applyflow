package com.applyflow.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

final class AuthDtos {
    private AuthDtos() {}

    record RegisterRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(min = 12, max = 128) String password
    ) {
        RegisterRequest { email = email == null ? null : email.trim(); }
    }

    record LoginRequest(
            @NotBlank @Email @Size(max = 320) String email,
            @NotBlank @Size(max = 128) String password
    ) {
        LoginRequest { email = email == null ? null : email.trim(); }
    }

    record CurrentUser(UUID id, String email, Instant createdAt) {
        static CurrentUser from(UserAccount user) {
            return new CurrentUser(user.getId(), user.getEmail(), user.getCreatedAt());
        }
    }

    record AuthResponse(String accessToken, long expiresIn, CurrentUser user) {}
    record IssuedAuthentication(AuthResponse response, String refreshToken) {}

    record DeviceSession(
            UUID id,
            Instant createdAt,
            Instant lastUsedAt,
            Instant expiresAt,
            boolean current
    ) {}

    record DeviceSessionsResponse(List<DeviceSession> sessions) {}
}
