package com.applyflow.platform.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
class SpaController {
    @GetMapping({"/app", "/app/{*path}", "/sign-in", "/register"})
    String frontendRoutes() {
        return "forward:/index.html";
    }
}
