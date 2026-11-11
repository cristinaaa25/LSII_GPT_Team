package com.tecnocampus.LS2.protube_back.configuration;

import com.tecnocampus.LS2.protube_back.controller.IndexController;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import com.tecnocampus.LS2.protube_back.security.OAuth2LoginFailureHandler;
import com.tecnocampus.LS2.protube_back.security.OAuth2LoginSuccessHandler;
import com.tecnocampus.LS2.protube_back.security.RestAuthenticationEntryPoint;
import com.tecnocampus.LS2.protube_back.services.GoogleAccountService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Google login wiring with the dummy credentials. Only redirects are checked: no request ever reaches Google.
@WebMvcTest(IndexController.class)
@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class,
        OAuth2LoginSuccessHandler.class, OAuth2LoginFailureHandler.class})
@ActiveProfiles("test")
@TestPropertySource(properties = "spring.thymeleaf.prefix=classpath:/templates/")
class GoogleLoginSecurityTest {

    @Autowired
    MockMvc mockMvc;

    @MockBean
    GoogleAccountService googleAccountService;

    @MockBean
    JwtService jwtService;

    @Test
    void authorizationEndpointRedirectsToGoogleWithRequiredScopes() throws Exception {
        MvcResult result = mockMvc.perform(get("/oauth2/authorization/google"))
                .andExpect(status().isFound())
                .andReturn();

        String location = result.getResponse().getRedirectedUrl();
        assertThat(location)
                .startsWith("https://accounts.google.com/o/oauth2/v2/auth?")
                .contains("client_id=dummy-client-id")
                .contains("scope=openid%20profile%20email")
                .contains("redirect_uri=http://localhost/login/oauth2/code/google")
                .contains("state=")
                .contains("nonce=");
    }

    @Test
    void callbackWithoutMatchingHandshakeFailsBackToSpaLogin() throws Exception {
        // No authorization request in the session: rejected before any token exchange with Google
        mockMvc.perform(get("/login/oauth2/code/google").param("code", "fake").param("state", "fake"))
                .andExpect(status().isFound())
                .andExpect(redirectedUrl("/login?error=google"));
        verifyNoInteractions(googleAccountService, jwtService);
    }

    @Test
    void spaLoginPageIsNotReplacedBySpringGeneratedPage() throws Exception {
        mockMvc.perform(get("/login"))
                .andExpect(status().isOk())
                .andExpect(view().name("index"));
    }

    @Test
    void apiStillAnswersJson401InsteadOfRedirectingToLogin() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().doesNotExist("Location"));
    }
}
