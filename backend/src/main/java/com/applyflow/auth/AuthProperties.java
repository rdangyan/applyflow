package com.applyflow.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("applyflow.auth")
public record AuthProperties(
        String jwtSecret,
        long accessTokenMinutes,
        long refreshTokenDays,
        boolean refreshCookieSecure
) {}
