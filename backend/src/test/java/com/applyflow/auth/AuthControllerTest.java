package com.applyflow.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired UserAccountRepository users;

    @Test
    void registrationNormalizesEmailHashesPasswordAndSetsRefreshCookie() throws Exception {
        MvcResult result = register("  Person@Example.COM  ", "a-secure-password");

        result.getResponse().getHeader("Set-Cookie");
        assertThat(result.getResponse().getHeader("Set-Cookie"))
                .contains("applyflow_refresh=").contains("HttpOnly").contains("SameSite=Strict")
                .doesNotContain("a-secure-password");
        UserAccount user = users.findByNormalizedEmail("person@example.com").orElseThrow();
        assertThat(user.getEmail()).isEqualTo("Person@Example.COM");
        assertThat(user.getPasswordHash()).startsWith("$2").doesNotContain("a-secure-password");
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
    void refreshRestoresIdentityAndLogoutRevokesTheSession() throws Exception {
        MvcResult registration = register("reload@example.com", "reload-password-123");
        Cookie cookie = registration.getResponse().getCookie(AuthController.REFRESH_COOKIE);

        mvc.perform(post("/api/v1/auth/refresh").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("reload@example.com"));

        mvc.perform(post("/api/v1/auth/logout").cookie(cookie))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", org.hamcrest.Matchers.containsString("Max-Age=0")));
        mvc.perform(post("/api/v1/auth/refresh").cookie(cookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_SESSION"));
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
