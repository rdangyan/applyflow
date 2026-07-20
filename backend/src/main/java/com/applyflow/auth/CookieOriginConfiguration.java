package com.applyflow.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.net.URI;
import java.net.URISyntaxException;

@Configuration
class CookieOriginConfiguration implements WebMvcConfigurer {
    private final AuthProperties properties;

    CookieOriginConfiguration(AuthProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new CookieOriginInterceptor(properties))
                .addPathPatterns("/api/v1/auth/refresh", "/api/v1/auth/logout", "/api/v1/auth/logout-all");
    }

    private static final class CookieOriginInterceptor implements HandlerInterceptor {
        private final AuthProperties properties;

        private CookieOriginInterceptor(AuthProperties properties) {
            this.properties = properties;
        }

        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
            String origin = request.getHeader("Origin");
            if (origin == null || origin.isBlank()) return true;

            String configured = properties.publicOrigin();
            String expected = configured == null || configured.isBlank() ? requestOrigin(request) : configured;
            if (!normalizeOrigin(origin).equals(normalizeOrigin(expected))) {
                throw new AuthenticationException("Request origin is not allowed", "INVALID_ORIGIN");
            }
            return true;
        }

        private static String requestOrigin(HttpServletRequest request) {
            int port = request.getServerPort();
            boolean defaultPort = ("http".equalsIgnoreCase(request.getScheme()) && port == 80)
                    || ("https".equalsIgnoreCase(request.getScheme()) && port == 443);
            return request.getScheme() + "://" + request.getServerName() + (defaultPort ? "" : ":" + port);
        }

        private static String normalizeOrigin(String value) {
            try {
                URI uri = new URI(value);
                if (uri.getScheme() == null || uri.getHost() == null || uri.getUserInfo() != null
                        || (uri.getPath() != null && !uri.getPath().isEmpty() && !"/".equals(uri.getPath()))
                        || uri.getQuery() != null || uri.getFragment() != null) {
                    throw invalidOrigin();
                }
                int port = uri.getPort();
                boolean defaultPort = ("http".equalsIgnoreCase(uri.getScheme()) && port == 80)
                        || ("https".equalsIgnoreCase(uri.getScheme()) && port == 443);
                return uri.getScheme().toLowerCase() + "://" + uri.getHost().toLowerCase()
                        + (port == -1 || defaultPort ? "" : ":" + port);
            } catch (URISyntaxException exception) {
                throw invalidOrigin();
            }
        }

        private static AuthenticationException invalidOrigin() {
            return new AuthenticationException("Request origin is not allowed", "INVALID_ORIGIN");
        }
    }
}
