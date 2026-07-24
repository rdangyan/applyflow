package com.applyflow.application;

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

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApplicationControllerTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JdbcTemplate jdbc;

    @AfterEach
    void cleanDatabase() {
        jdbc.update("delete from job_application");
        jdbc.update("delete from company");
        jdbc.update("delete from refresh_session");
        jdbc.update("delete from app_user");
    }

    @Test
    void applicationCaptureRequiresAuthentication() throws Exception {
        mvc.perform(post("/api/v1/applications").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyName\":\"Acme\",\"jobTitle\":\"Engineer\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createsSavedApplicationWithExistingActiveCompanyAndStructuredFields() throws Exception {
        String access = register("application-existing@example.com");
        JsonNode company = createCompany(access, "Acme");

        JsonNode application = body(mvc.perform(post("/api/v1/applications")
                        .header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.ofEntries(
                                Map.entry("companyId", company.get("id").asText()),
                                Map.entry("jobTitle", "  Senior   Engineer "),
                                Map.entry("postingUrl", "https://jobs.example/42"),
                                Map.entry("location", "Vancouver"),
                                Map.entry("description", "Build useful things"),
                                Map.entry("notes", "Ask about the team"),
                                Map.entry("employmentType", "FULL_TIME"),
                                Map.entry("workplaceArrangement", "HYBRID"),
                                Map.entry("salaryMin", 120000.25),
                                Map.entry("salaryMax", 150000.50),
                                Map.entry("salaryCurrency", "cad"),
                                Map.entry("salaryPayPeriod", "YEARLY"),
                                Map.entry("sourceCategory", "REFERRAL"),
                                Map.entry("sourceDetail", "Former colleague")
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SAVED"))
                .andExpect(jsonPath("$.jobTitle").value("Senior Engineer"))
                .andExpect(jsonPath("$.company.id").value(company.get("id").asText()))
                .andExpect(jsonPath("$.salaryCurrency").value("CAD"))
                .andExpect(jsonPath("$.employmentType").value("FULL_TIME"))
                .andReturn());

        assertThat(jdbc.queryForObject(
                "select count(*) from job_application where id = ? and owner_id = (select id from app_user where email = ?)",
                Integer.class, java.util.UUID.fromString(application.get("id").asText()), "application-existing@example.com"))
                .isEqualTo(1);
    }

    @Test
    void inlineCompanyAndApplicationAreCreatedTogether() throws Exception {
        String access = register("application-inline@example.com");

        JsonNode application = body(mvc.perform(post("/api/v1/applications")
                        .header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyName\":\"  New   Labs \",\"jobTitle\":\"Designer\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.company.name").value("New Labs"))
                .andReturn());

        assertThat(jdbc.queryForObject(
                "select count(*) from job_application a join company c on c.id = a.company_id where a.id = ? and a.owner_id = c.owner_id",
                Integer.class, java.util.UUID.fromString(application.get("id").asText()))).isEqualTo(1);
    }

    @Test
    void invalidCaptureDoesNotLeaveAnInlineCompanyBehind() throws Exception {
        String access = register("application-atomic@example.com");

        mvc.perform(post("/api/v1/applications").header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyName\":\"Should Roll Back\",\"jobTitle\":\"Engineer\",\"salaryMin\":20,\"salaryMax\":10}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors.salaryMax").exists());

        assertThat(jdbc.queryForObject("select count(*) from company", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from job_application", Integer.class)).isZero();
    }

    @Test
    void requiresExactlyOneCompanyChoiceAndAJobTitle() throws Exception {
        String access = register("application-required@example.com");
        JsonNode company = createCompany(access, "Acme");

        mvc.perform(post("/api/v1/applications").header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jobTitle\":\"Engineer\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.company").exists());
        mvc.perform(post("/api/v1/applications").header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":\"" + company.get("id").asText()
                                + "\",\"companyName\":\"Other\",\"jobTitle\":\"Engineer\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.company").exists());
        mvc.perform(post("/api/v1/applications").header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":\"" + company.get("id").asText() + "\",\"jobTitle\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.jobTitle").exists());
    }

    @Test
    void archivedAndOtherOwnersCompaniesCannotBeSelected() throws Exception {
        String owner = register("application-owner@example.com");
        String stranger = register("application-stranger@example.com");
        JsonNode archived = createCompany(owner, "Archived Co");
        mvc.perform(post("/api/v1/companies/{id}/archive", archived.get("id").asText())
                        .header("Authorization", bearer(owner))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0}"))
                .andExpect(status().isOk());

        for (String token : new String[] { owner, stranger }) {
            mvc.perform(post("/api/v1/applications").header("Authorization", bearer(token))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"companyId\":\"" + archived.get("id").asText()
                                    + "\",\"jobTitle\":\"Engineer\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("APPLICATION_COMPANY_UNAVAILABLE"));
        }
        assertThat(jdbc.queryForObject("select count(*) from job_application", Integer.class)).isZero();
    }

    @Test
    void ownerCanReadEveryFieldAndBackdateAnApplication() throws Exception {
        String access = register("application-details@example.com");
        JsonNode company = createCompany(access, "Acme");
        JsonNode created = createApplication(access, company.get("id").asText(), "Engineer");

        mvc.perform(get("/api/v1/applications/{id}", created.get("id").asText())
                        .header("Authorization", bearer(access)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.company.name").value("Acme"))
                .andExpect(jsonPath("$.jobTitle").value("Engineer"))
                .andExpect(jsonPath("$.status").value("SAVED"))
                .andExpect(jsonPath("$.applicationDate").doesNotExist())
                .andExpect(jsonPath("$.version").value(0));

        mvc.perform(put("/api/v1/applications/{id}", created.get("id").asText())
                        .header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.ofEntries(
                                Map.entry("companyId", company.get("id").asText()),
                                Map.entry("jobTitle", "Principal Engineer"),
                                Map.entry("applicationDate", "2024-01-15"),
                                Map.entry("postingUrl", "https://jobs.example/principal"),
                                Map.entry("location", "Remote"),
                                Map.entry("description", "Lead the platform"),
                                Map.entry("notes", "Backdated record"),
                                Map.entry("employmentType", "FULL_TIME"),
                                Map.entry("workplaceArrangement", "REMOTE"),
                                Map.entry("salaryMin", 150000),
                                Map.entry("salaryMax", 180000),
                                Map.entry("salaryCurrency", "usd"),
                                Map.entry("salaryPayPeriod", "YEARLY"),
                                Map.entry("sourceCategory", "LINKEDIN"),
                                Map.entry("sourceDetail", "Saved posting"),
                                Map.entry("version", 0)
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobTitle").value("Principal Engineer"))
                .andExpect(jsonPath("$.applicationDate").value("2024-01-15"))
                .andExpect(jsonPath("$.salaryCurrency").value("USD"))
                .andExpect(jsonPath("$.version").value(1));
    }

    @Test
    void crossUserReadsAndWritesAreIndistinguishableFromMissingApplications() throws Exception {
        String owner = register("application-private-owner@example.com");
        String stranger = register("application-private-stranger@example.com");
        JsonNode company = createCompany(owner, "Private Co");
        JsonNode application = createApplication(owner, company.get("id").asText(), "Engineer");

        mvc.perform(get("/api/v1/applications/{id}", application.get("id").asText())
                        .header("Authorization", bearer(stranger)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("APPLICATION_NOT_FOUND"));
        mvc.perform(put("/api/v1/applications/{id}", application.get("id").asText())
                        .header("Authorization", bearer(stranger))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":\"" + company.get("id").asText()
                                + "\",\"jobTitle\":\"Stolen\",\"version\":0}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("APPLICATION_NOT_FOUND"));

        assertThat(jdbc.queryForObject("select job_title from job_application where id = ?", String.class,
                java.util.UUID.fromString(application.get("id").asText()))).isEqualTo("Engineer");
    }

    @Test
    void staleUpdateReturnsARecoverableConflictAndPreservesNewerData() throws Exception {
        String access = register("application-conflict@example.com");
        JsonNode company = createCompany(access, "Acme");
        JsonNode application = createApplication(access, company.get("id").asText(), "Engineer");
        String id = application.get("id").asText();
        String companyId = company.get("id").asText();

        mvc.perform(put("/api/v1/applications/{id}", id)
                        .header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":\"" + companyId
                                + "\",\"jobTitle\":\"Newer title\",\"version\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1));

        mvc.perform(put("/api/v1/applications/{id}", id)
                        .header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":\"" + companyId
                                + "\",\"jobTitle\":\"Stale title\",\"version\":0}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("APPLICATION_VERSION_CONFLICT"));

        mvc.perform(get("/api/v1/applications/{id}", id).header("Authorization", bearer(access)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobTitle").value("Newer title"))
                .andExpect(jsonPath("$.version").value(1));
    }

    @Test
    void nonSavedApplicationRequiresAnApplicationDateOnUpdate() throws Exception {
        String access = register("application-date-required@example.com");
        JsonNode company = createCompany(access, "Acme");
        JsonNode application = createApplication(access, company.get("id").asText(), "Engineer");
        java.util.UUID id = java.util.UUID.fromString(application.get("id").asText());
        jdbc.update("update job_application set status = 'APPLIED', application_date = date '2024-05-01' where id = ?", id);

        mvc.perform(put("/api/v1/applications/{id}", id)
                        .header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":\"" + company.get("id").asText()
                                + "\",\"jobTitle\":\"Engineer\",\"version\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.applicationDate").exists());
    }

    private JsonNode createCompany(String access, String name) throws Exception {
        return body(mvc.perform(post("/api/v1/companies").header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("name", name))))
                .andExpect(status().isCreated()).andReturn());
    }

    private JsonNode createApplication(String access, String companyId, String jobTitle) throws Exception {
        return body(mvc.perform(post("/api/v1/applications").header("Authorization", bearer(access))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "companyId", companyId, "jobTitle", jobTitle))))
                .andExpect(status().isCreated()).andReturn());
    }

    private String register(String email) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email, "password", "secure-password-123", "timeZone", "UTC"))))
                .andExpect(status().isOk()).andReturn();
        return body(result).get("accessToken").asText();
    }

    private JsonNode body(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private static String bearer(String token) { return "Bearer " + token; }
}
