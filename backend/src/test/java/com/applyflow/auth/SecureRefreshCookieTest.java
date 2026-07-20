package com.applyflow.auth;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "applyflow.auth.refresh-cookie-secure=true")
@AutoConfigureMockMvc
class SecureRefreshCookieTest {
    @Autowired MockMvc mvc;

    @Test
    void productionCookieConfigurationAddsSecureHttpOnlyAndSameSite() throws Exception {
        MvcResult registration = mvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"secure-cookie@example.com\",\"password\":\"secure-cookie-password\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", containsString("Secure")))
                .andExpect(header().string("Set-Cookie", containsString("HttpOnly")))
                .andExpect(header().string("Set-Cookie", containsString("SameSite=Strict")))
                .andReturn();
        Cookie initial = registration.getResponse().getCookie(AuthController.REFRESH_COOKIE);
        Cookie rotated = mvc.perform(post("/api/v1/auth/refresh").cookie(initial))
                .andExpect(status().isOk())
                .andExpect(header().string("Set-Cookie", containsString("Secure")))
                .andReturn().getResponse().getCookie(AuthController.REFRESH_COOKIE);
        mvc.perform(post("/api/v1/auth/logout").cookie(rotated))
                .andExpect(status().isNoContent())
                .andExpect(header().string("Set-Cookie", containsString("Secure")));
    }
}
