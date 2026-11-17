package com.tecnocampus.LS2.protube_back.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class IndexController {

    // React SPA client-side routes (/login, /videos/42...): any path without a dot outside /api, /v3, /swagger-ui serves index.html
    private static final String SPA_SEGMENT = "{path:^(?!api$)(?!v3$)(?!swagger-ui$)[^.]*}";

    @GetMapping({"", "/", "/" + SPA_SEGMENT, "/" + SPA_SEGMENT + "/{subPath:[^.]*}", "/users/{username:.+}"})
    public ModelAndView home() {
        return new ModelAndView("index");
    }
    @PostMapping("logout")
    public ModelAndView logout() {
        return new ModelAndView("logout");
    }

}
