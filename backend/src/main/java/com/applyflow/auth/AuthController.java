package com.applyflow.auth;

import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.UUID;

import static com.applyflow.auth.AuthDtos.*;

@RestController
@RequestMapping("/api/v1/auth")
class AuthController {
    static final String REFRESH_COOKIE = "applyflow_refresh";
    private final AuthService authService;
    private final AuthProperties properties;

    AuthController(AuthService authService, AuthProperties properties) {
        this.authService = authService;
        this.properties = properties;
    }

    @PostMapping("/register")
    ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        IssuedAuthentication issued = authService.register(request);
        return withRefreshCookie(issued);
    }

    @PostMapping("/login")
    ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        IssuedAuthentication issued = authService.login(request);
        return withRefreshCookie(issued);
    }

    @PostMapping("/refresh")
    ResponseEntity<AuthResponse> refresh(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new AuthenticationException("Authentication is required", "INVALID_SESSION");
        }
        return withRefreshCookie(authService.refresh(refreshToken));
    }

    @GetMapping("/me")
    CurrentUser me(@AuthenticationPrincipal Jwt jwt) {
        return authService.currentUser(jwt.getSubject());
    }

    @PutMapping("/me")
    CurrentUser updateProfile(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(jwt.getSubject(), request);
    }

    @PostMapping("/logout")
    ResponseEntity<Void> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        authService.logout(refreshToken);
        ResponseCookie cleared = cookie("", Duration.ZERO);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cleared.toString()).build();
    }

    @GetMapping("/sessions")
    DeviceSessionsResponse sessions(@AuthenticationPrincipal Jwt jwt) {
        return authService.sessions(jwt.getSubject(), jwt.getClaimAsString("sid"));
    }

    @DeleteMapping("/sessions/{sessionId}")
    ResponseEntity<Void> revokeSession(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID sessionId) {
        authService.revokeSession(jwt.getSubject(), sessionId);
        ResponseEntity.HeadersBuilder<?> response = ResponseEntity.noContent();
        if (sessionId.toString().equals(jwt.getClaimAsString("sid"))) {
            response.header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString());
        }
        return response.build();
    }

    @PostMapping("/logout-all")
    ResponseEntity<Void> logoutEverywhere(@AuthenticationPrincipal Jwt jwt) {
        authService.logoutEverywhere(jwt.getSubject());
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .build();
    }

    private ResponseEntity<AuthResponse> withRefreshCookie(IssuedAuthentication issued) {
        ResponseCookie cookie = cookie(issued.refreshToken(), Duration.ofDays(properties.refreshInactivityDays()));
        return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookie.toString()).body(issued.response());
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(properties.refreshCookieSecure())
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(maxAge)
                .build();
    }
}
