package com.applyflow.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("applyflow.auth")
public record AuthProperties(
        String jwtSecret,
        long accessTokenMinutes,
        long refreshInactivityDays,
        long refreshAbsoluteDays,
        boolean refreshCookieSecure,
        String publicOrigin
) {}
