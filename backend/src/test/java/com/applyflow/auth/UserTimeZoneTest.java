package com.applyflow.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class UserTimeZoneTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbc;

    @AfterEach
    void cleanDatabase() {
        jdbc.update("delete from refresh_session");
        jdbc.update("delete from app_user");
    }

    @Test
    void browserSuggestedZoneIsValidatedAndPersistsAcrossDeviceLogins() throws Exception {
        JsonNode registration = register("zones@example.com", "America/Vancouver");
        String firstToken = registration.get("accessToken").asText();
        assertThat(registration.at("/user/timeZone").asText()).isEqualTo("America/Vancouver");
        assertThat(registration.at("/user/version").asLong()).isZero();

        JsonNode updated = body(mvc.perform(put("/api/v1/auth/me")
                        .header("Authorization", bearer(firstToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"timeZone\":\"Asia/Tokyo\",\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timeZone").value("Asia/Tokyo"))
                .andExpect(jsonPath("$.version").value(1))
                .andReturn());

        JsonNode secondDevice = login("zones@example.com");
        mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer(secondDevice.get("accessToken").asText())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timeZone").value(updated.get("timeZone").asText()))
                .andExpect(jsonPath("$.version").value(1));
    }

    @Test
    void unsupportedZoneReturnsAFieldErrorAndDoesNotChangeTheProfile() throws Exception {
        JsonNode registration = register("invalid-zone@example.com", "UTC");
        String token = registration.get("accessToken").asText();

        mvc.perform(put("/api/v1/auth/me")
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"timeZone\":\"Mars/Olympus\",\"version\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors.timeZone").exists());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.timeZone").value("UTC"))
                .andExpect(jsonPath("$.version").value(0));
    }

    @Test
    void staleProfileUpdateReturnsConflictInsteadOfOverwriting() throws Exception {
        JsonNode registration = register("conflict@example.com", "UTC");
        String token = registration.get("accessToken").asText();

        update(token, "Europe/London", 0).andExpect(status().isOk());
        update(token, "Asia/Tokyo", 0)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("PROFILE_VERSION_CONFLICT"));
        mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.timeZone").value("Europe/London"));
    }

    @Test
    void utcInstantsRemainStableWhileDaylightSavingOffsetsChange() {
        ZoneId zone = ZoneId.of("America/Vancouver");
        Instant before = Instant.parse("2026-03-08T09:30:00Z");
        Instant after = Instant.parse("2026-03-08T10:30:00Z");

        assertThat(before.atZone(zone).getHour()).isEqualTo(1);
        assertThat(after.atZone(zone).getHour()).isEqualTo(3);
        assertThat(before.plusSeconds(3600)).isEqualTo(after);
    }

    private JsonNode register(String email, String timeZone) throws Exception {
        return body(mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AuthDtos.RegisterRequest(email, "secure-password-123", timeZone))))
                .andExpect(status().isOk()).andReturn());
    }

    private JsonNode login(String email) throws Exception {
        return body(mvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AuthDtos.LoginRequest(email, "secure-password-123"))))
                .andExpect(status().isOk()).andReturn());
    }

    private org.springframework.test.web.servlet.ResultActions update(String token, String zone, long version) throws Exception {
        return mvc.perform(put("/api/v1/auth/me")
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new AuthDtos.UpdateProfileRequest(zone, version))));
    }

    private JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private String bearer(String token) { return "Bearer " + token; }
}
