package com.applyflow.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserAccountRepository users;
    @Autowired JdbcTemplate jdbc;
    @Autowired TokenService tokens;

    @AfterEach
    void cleanDatabase() {
        jdbc.update("delete from refresh_session");
        jdbc.update("delete from app_user");
    }

    @Test
    void registrationNormalizesEmailHashesPasswordAndPersistsOnlyARefreshTokenHash() throws Exception {
        MvcResult result = register("  Person@Example.COM  ", "a-secure-password");

        assertThat(result.getResponse().getHeader("Set-Cookie"))
                .contains("applyflow_refresh=").contains("HttpOnly").contains("SameSite=Strict")
                .doesNotContain("a-secure-password");
        UserAccount user = users.findByNormalizedEmail("person@example.com").orElseThrow();
        assertThat(user.getEmail()).isEqualTo("Person@Example.COM");
        assertThat(user.getPasswordHash()).startsWith("$2").doesNotContain("a-secure-password");

        String rawRefreshToken = result.getResponse().getCookie(AuthController.REFRESH_COOKIE).getValue();
        String persistedHash = jdbc.queryForObject("""
                select session.token_hash from refresh_session session
                join app_user account on account.id = session.user_id
                where account.normalized_email = 'person@example.com'
                """, String.class);
        assertThat(persistedHash).hasSize(64).isEqualTo(tokens.hashRefreshToken(rawRefreshToken));
        assertThat(persistedHash).doesNotContain(rawRefreshToken);
    }

    @Test
    void twoAccessTokensResolveOnlyTheirOwnCurrentUserContext() throws Exception {
        JsonNode first = body(register("first@example.com", "first-password-123"));
        JsonNode second = body(register("second@example.com", "second-password-123"));

        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + first.get("accessToken").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(first.at("/user/id").asText()))
                .andExpect(jsonPath("$.email").value("first@example.com"))
                .andExpect(jsonPath("$.email").value(org.hamcrest.Matchers.not("second@example.com")));
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + second.get("accessToken").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(second.at("/user/id").asText()));
    }

    @Test
    void refreshRotatesTheCookieAndLogoutRevokesTheSession() throws Exception {
        Cookie original = register("reload@example.com", "reload-password-123")
                .getResponse().getCookie(AuthController.REFRESH_COOKIE);

        MvcResult refreshed = mvc.perform(post("/api/v1/auth/refresh").cookie(original))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("reload@example.com"))
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("HttpOnly")))
                .andReturn();
        Cookie rotated = refreshed.getResponse().getCookie(AuthController.REFRESH_COOKIE);
        assertThat(rotated.getValue()).isNotEqualTo(original.getValue());

        mvc.perform(post("/api/v1/auth/logout").cookie(rotated))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
        mvc.perform(post("/api/v1/auth/refresh").cookie(rotated))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_SESSION"));
    }

    @Test
    void replayingARotatedTokenRevokesItsCompleteFamily() throws Exception {
        Cookie original = register("replay@example.com", "replay-password-123")
                .getResponse().getCookie(AuthController.REFRESH_COOKIE);
        Cookie replacement = mvc.perform(post("/api/v1/auth/refresh").cookie(original))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie(AuthController.REFRESH_COOKIE);

        mvc.perform(post("/api/v1/auth/refresh").cookie(original))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_REUSED"));
        mvc.perform(post("/api/v1/auth/refresh").cookie(replacement))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_SESSION"));
    }

    @Test
    void sessionsCanBeListedAndOneDeviceRevokedWithoutEndingAnother() throws Exception {
        MvcResult first = register("devices@example.com", "devices-password-123");
        MvcResult second = login("devices@example.com", "devices-password-123");
        String firstAccessToken = body(first).get("accessToken").asText();
        String secondAccessToken = body(second).get("accessToken").asText();

        JsonNode sessionList = body(mvc.perform(get("/api/v1/auth/sessions")
                        .header("Authorization", "Bearer " + secondAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions.length()").value(2))
                .andReturn());
        JsonNode other = null;
        int currentCount = 0;
        for (JsonNode session : sessionList.get("sessions")) {
            if (!session.get("current").asBoolean()) other = session;
            else currentCount++;
            assertThat(session.has("token")).isFalse();
        }
        assertThat(currentCount).isEqualTo(1);
        assertThat(other).isNotNull();

        mvc.perform(delete("/api/v1/auth/sessions/{sessionId}", other.get("id").asText())
                        .header("Authorization", "Bearer " + secondAccessToken))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + firstAccessToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
        mvc.perform(get("/api/v1/auth/sessions").header("Authorization", "Bearer " + firstAccessToken))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/sessions").header("Authorization", "Bearer " + secondAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessions.length()").value(1));
        mvc.perform(post("/api/v1/auth/refresh")
                        .cookie(first.getResponse().getCookie(AuthController.REFRESH_COOKIE)))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh")
                        .cookie(second.getResponse().getCookie(AuthController.REFRESH_COOKIE)))
                .andExpect(status().isOk());
    }

    @Test
    void logoutEverywhereRevokesAllDevicesForOnlyTheAuthenticatedUser() throws Exception {
        MvcResult first = register("everywhere@example.com", "everywhere-password-123");
        MvcResult second = login("everywhere@example.com", "everywhere-password-123");
        Cookie unrelated = register("other-device-owner@example.com", "other-password-123")
                .getResponse().getCookie(AuthController.REFRESH_COOKIE);

        mvc.perform(post("/api/v1/auth/logout-all")
                        .header("Authorization", "Bearer " + body(second).get("accessToken").asText()))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
        mvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + body(second).get("accessToken").asText()))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(first.getResponse().getCookie(AuthController.REFRESH_COOKIE)))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(second.getResponse().getCookie(AuthController.REFRESH_COOKIE)))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").cookie(unrelated)).andExpect(status().isOk());
    }

    @Test
    void inactivityAndAbsoluteExpirationAreBothEnforced() throws Exception {
        Cookie inactive = register("inactive@example.com", "inactive-password-123")
                .getResponse().getCookie(AuthController.REFRESH_COOKIE);
        jdbc.update("update refresh_session set expires_at = ? where token_hash = ?",
                Timestamp.from(Instant.now().minusSeconds(1)), tokens.hashRefreshToken(inactive.getValue()));
        mvc.perform(post("/api/v1/auth/refresh").cookie(inactive))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_SESSION"));

        Cookie absolute = register("absolute@example.com", "absolute-password-123")
                .getResponse().getCookie(AuthController.REFRESH_COOKIE);
        jdbc.update("update refresh_session set absolute_expires_at = ? where token_hash = ?",
                Timestamp.from(Instant.now().minusSeconds(1)), tokens.hashRefreshToken(absolute.getValue()));
        mvc.perform(post("/api/v1/auth/refresh").cookie(absolute))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_SESSION"));
    }

    @Test
    void cookieAuthenticatedOperationsRejectCrossOriginRequests() throws Exception {
        Cookie cookie = register("origin@example.com", "origin-password-123")
                .getResponse().getCookie(AuthController.REFRESH_COOKIE);
        mvc.perform(post("/api/v1/auth/refresh").header("Origin", "https://evil.example").cookie(cookie))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INVALID_ORIGIN"));
        Cookie rotated = mvc.perform(post("/api/v1/auth/refresh").header("Origin", "http://localhost").cookie(cookie))
                .andExpect(status().isOk()).andReturn().getResponse().getCookie(AuthController.REFRESH_COOKIE);
        mvc.perform(post("/api/v1/auth/logout").header("Origin", "https://evil.example").cookie(rotated))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("INVALID_ORIGIN"));
        mvc.perform(post("/api/v1/auth/logout").header("Origin", "http://localhost").cookie(rotated))
                .andExpect(status().isNoContent());
    }

    @Test
    void loginFailureIsIdenticalForUnknownEmailAndWrongPassword() throws Exception {
        register("known@example.com", "known-password-123");
        String unknown = loginFailure("unknown@example.com", "known-password-123");
        String wrong = loginFailure("known@example.com", "wrong-password-123");
        assertThat(unknown).isEqualTo(wrong).isEqualTo("Email or password is incorrect");
    }

    @Test
    void invalidRegistrationReturnsStructuredFieldErrors() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\",\"password\":\"short\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists())
                .andExpect(jsonPath("$.traceId").exists());
    }

    @Test
    void currentUserRequiresAValidAccessToken() throws Exception {
        mvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"))
                .andExpect(jsonPath("$.traceId").exists());
    }

    private MvcResult register(String email, String password) throws Exception {
        return mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AuthDtos.RegisterRequest(email, password))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andReturn();
    }

    private MvcResult login(String email, String password) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AuthDtos.LoginRequest(email, password))))
                .andExpect(status().isOk())
                .andReturn();
    }

    private String loginFailure(String email, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AuthDtos.LoginRequest(email, password))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andReturn();
        return body(result).get("detail").asText();
    }

    private JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
