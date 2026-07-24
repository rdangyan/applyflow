package com.applyflow.system;

import com.applyflow.ApplyFlowApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = ApplyFlowApplication.class)
@AutoConfigureMockMvc
class SystemStatusControllerTest {
    @Autowired
    MockMvc mockMvc;

    @Test
    void reportsTheMigratedDatabaseThroughTheVersionedApi() throws Exception {
        mockMvc.perform(get("/api/v1/system/status"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Trace-Id", matchesPattern("[0-9a-f-]{36}")))
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.version").value("0.1.0"))
                .andExpect(jsonPath("$.database").value("connected"));
    }

    @Test
    void missingApiResourcesUseProblemDetailsWithTraceCorrelation() throws Exception {
        mockMvc.perform(get("/api/v1/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(header().exists("X-Trace-Id"))
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.traceId", matchesPattern("[0-9a-f-]{36}")))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void nestedApplicationRoutesRefreshThroughTheSpaEntryPoint() throws Exception {
        mockMvc.perform(get("/app/applications/f672c646-16e4-4a78-a4b7-a2e1aab6cd2a"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }
}
