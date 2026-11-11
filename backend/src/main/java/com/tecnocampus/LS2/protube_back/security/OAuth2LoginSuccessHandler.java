package com.tecnocampus.LS2.protube_back.security;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.exception.GoogleLoginException;
import com.tecnocampus.LS2.protube_back.services.GoogleAccountService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * After Google authenticates the user: finds or creates the ProTube account, issues our own JWT and sends it to
 * the SPA in the URL fragment ({@code /auth/callback#token=...}). Browsers never send fragments to servers, so
 * the token does not reach access logs or the Referer header.
 */
@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2LoginSuccessHandler.class);

    private final GoogleAccountService googleAccountService;
    private final JwtService jwtService;
    private final OAuth2LoginFailureHandler failureHandler;

    public OAuth2LoginSuccessHandler(GoogleAccountService googleAccountService, JwtService jwtService,
                                     OAuth2LoginFailureHandler failureHandler) {
        this.googleAccountService = googleAccountService;
        this.jwtService = jwtService;
        this.failureHandler = failureHandler;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        String token;
        try {
            OAuth2User googleUser = (OAuth2User) authentication.getPrincipal();
            User user = googleAccountService.findOrCreate(
                    googleUser.getAttribute("sub"),
                    googleUser.getAttribute("email"),
                    isTrue(googleUser.getAttribute("email_verified")),
                    googleUser.getAttribute("name"));
            token = jwtService.generateToken(user);
        } catch (GoogleLoginException e) {
            log.warn("Google login rejected: {}", e.getErrorCode());
            failureHandler.redirectWithError(request, response, e.getErrorCode());
            return;
        } catch (RuntimeException e) {
            // Class name only: messages may contain personal data (e.g. the email in a constraint violation)
            log.warn("Google login failed: {}", e.getClass().getSimpleName());
            failureHandler.redirectWithError(request, response, GoogleLoginException.GENERIC);
            return;
        }

        OAuth2LoginFailureHandler.endHandshake(request);
        response.sendRedirect(failureHandler.getFrontendUrl() + "/auth/callback#token="
                + URLEncoder.encode(token, StandardCharsets.UTF_8));
    }

    private static boolean isTrue(Object value) {
        return value != null && "true".equalsIgnoreCase(value.toString());
    }
}
