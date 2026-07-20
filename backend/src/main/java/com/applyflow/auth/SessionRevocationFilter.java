package com.applyflow.auth;

import com.applyflow.platform.web.ApiAuthenticationEntryPoint;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

class SessionRevocationFilter extends OncePerRequestFilter {
    private final RefreshSessionService sessions;
    private final ApiAuthenticationEntryPoint authenticationEntryPoint;

    SessionRevocationFilter(RefreshSessionService sessions, ApiAuthenticationEntryPoint authenticationEntryPoint) {
        this.sessions = sessions;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
            UUID userId = parseUuid(jwtAuthentication.getToken().getSubject());
            UUID familyId = parseUuid(jwtAuthentication.getToken().getClaimAsString("sid"));
            if (userId == null || familyId == null || !sessions.isActive(userId, familyId)) {
                SecurityContextHolder.clearContext();
                authenticationEntryPoint.commence(
                        request,
                        response,
                        new BadCredentialsException("The device session is no longer active"));
                return;
            }
        }
        filterChain.doFilter(request, response);
    }

    private static UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException | NullPointerException exception) {
            return null;
        }
    }
}
