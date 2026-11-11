package com.tecnocampus.LS2.protube_back.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;

import static org.assertj.core.api.Assertions.assertThat;

class OAuth2LoginFailureHandlerTest {

    @Test
    void redirectsToSpaLoginWithGenericErrorAndDropsHandshakeSession() throws Exception {
        OAuth2LoginFailureHandler handler = new OAuth2LoginFailureHandler(" http://localhost:5173/ ");
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpSession session = new MockHttpSession();
        request.setSession(session);
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationFailure(request, response, new OAuth2AuthenticationException("access_denied"));

        assertThat(response.getRedirectedUrl()).isEqualTo("http://localhost:5173/login?error=google");
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    void usesRelativeUrlWhenFrontendIsSameOriginOrUnset() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();

        new OAuth2LoginFailureHandler(null)
                .onAuthenticationFailure(new MockHttpServletRequest(), response,
                        new OAuth2AuthenticationException("invalid_request"));

        assertThat(response.getRedirectedUrl()).isEqualTo("/login?error=google");
    }
}
