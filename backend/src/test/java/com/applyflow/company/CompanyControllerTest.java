package com.applyflow.company;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class CompanyControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbc;

    @AfterEach
    void cleanDatabase() {
        jdbc.update("delete from company");
        jdbc.update("delete from refresh_session");
        jdbc.update("delete from app_user");
    }

    @Test
    void companyEndpointsRequireAuthentication() throws Exception {
        mvc.perform(get("/api/v1/companies")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/companies").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Acme\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void namesAreWhitespaceNormalizedAndUniqueOnlyWithinAnOwner() throws Exception {
        String first = register("company-first@example.com");
        String second = register("company-second@example.com");

        mvc.perform(post("/api/v1/companies").header("Authorization", bearer(first))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"  Acme   Labs  \"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Acme Labs"));
        mvc.perform(post("/api/v1/companies").header("Authorization", bearer(first))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"acme labs\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COMPANY_NAME_CONFLICT"))
                .andExpect(jsonPath("$.fieldErrors.name").exists());
        mvc.perform(post("/api/v1/companies").header("Authorization", bearer(first))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Straße\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/companies").header("Authorization", bearer(first))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"STRASSE\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/v1/companies").header("Authorization", bearer(second))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"ACME LABS\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void everyReadAndMutationIsScopedToTheAuthenticatedOwner() throws Exception {
        String owner = register("company-owner@example.com");
        String stranger = register("company-stranger@example.com");
        JsonNode company = body(mvc.perform(post("/api/v1/companies").header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Private Co\"}"))
                .andExpect(status().isCreated()).andReturn());
        String id = company.get("id").asText();

        mvc.perform(get("/api/v1/companies/{id}", id).header("Authorization", bearer(stranger)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));
        mvc.perform(put("/api/v1/companies/{id}", id).header("Authorization", bearer(stranger))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Stolen\",\"version\":0}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/companies/{id}/archive", id).header("Authorization", bearer(stranger))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0}"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/companies").header("Authorization", bearer(stranger)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.companies").isEmpty());
    }

    @Test
    void editArchiveAndRestoreUseVersionsAndSeparateListViews() throws Exception {
        String access = register("company-lifecycle@example.com");
        JsonNode created = body(mvc.perform(post("/api/v1/companies").header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Acme\"}"))
                .andExpect(status().isCreated()).andReturn());
        String id = created.get("id").asText();

        JsonNode updated = body(mvc.perform(put("/api/v1/companies/{id}", id).header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Acme\",\"website\":\"https://acme.example\",\"industry\":\"Software\",\"location\":\"Vancouver\",\"notes\":\"Hiring\",\"version\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1)).andReturn());
        mvc.perform(put("/api/v1/companies/{id}", id).header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Stale\",\"version\":0}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("COMPANY_VERSION_CONFLICT"));

        JsonNode archived = body(mvc.perform(post("/api/v1/companies/{id}/archive", id).header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"version\":" + updated.get("version").asLong() + "}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(true)).andReturn());
        mvc.perform(get("/api/v1/companies").header("Authorization", bearer(access)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.companies").isEmpty());
        mvc.perform(get("/api/v1/companies?archived=true").header("Authorization", bearer(access)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.companies[0].id").value(id));

        mvc.perform(post("/api/v1/companies/{id}/restore", id).header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"version\":" + archived.get("version").asLong() + "}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(false));
        assertThat(jdbc.queryForObject("select archived_at from company where id = ?", Object.class, java.util.UUID.fromString(id))).isNull();
    }

    private String register(String email) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of("email", email, "password", "secure-password-123", "timeZone", "UTC"))))
                .andExpect(status().isOk()).andReturn();
        return body(result).get("accessToken").asText();
    }

    private JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private static String bearer(String token) { return "Bearer " + token; }
}
