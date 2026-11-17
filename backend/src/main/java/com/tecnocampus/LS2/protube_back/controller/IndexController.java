package com.tecnocampus.LS2.protube_back.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class IndexController {

    // React SPA client-side routes (/login, /videos/42...): any path without a dot outside /api serves index.html.
    // SpringDoc endpoints are explicitly forwarded so they are not treated as client-side routes.
    @GetMapping({"", "/", "/{path:[^.]+}", "/{path:[^.]+}/{subPath:[^.]+}"})
    public ModelAndView home(@PathVariable(required = false) String path,
                            @PathVariable(required = false) String subPath) {
        if ("swagger-ui".equals(path)) {
            return new ModelAndView("forward:/swagger-ui/index.html");
        }
        if ("v3".equals(path) && "api-docs".equals(subPath)) {
            return new ModelAndView("forward:/v3/api-docs");
        }
        return new ModelAndView("index");
    }

    @PostMapping("logout")
    public ModelAndView logout() {
        return new ModelAndView("logout");
    }

}
