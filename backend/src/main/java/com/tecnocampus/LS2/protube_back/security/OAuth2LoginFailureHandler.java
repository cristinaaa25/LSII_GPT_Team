package com.tecnocampus.LS2.protube_back.security;

import com.tecnocampus.LS2.protube_back.exception.GoogleLoginException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Sends the browser back to the SPA login page after a failed or rejected Google login.
 */
@Component
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

    private final String frontendUrl;

    public OAuth2LoginFailureHandler(@Value("${pro_tube.frontend.url:}") String frontendUrl) {
        this.frontendUrl = normalize(frontendUrl);
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException {
        redirectWithError(request, response, GoogleLoginException.GENERIC);
    }

    void redirectWithError(HttpServletRequest request, HttpServletResponse response, String errorCode)
            throws IOException {
        endHandshake(request);
        response.sendRedirect(frontendUrl + "/login?error=" + errorCode);
    }

    String getFrontendUrl() {
        return frontendUrl;
    }

    /**
     * The only server-side state of the login is the OAuth2 handshake (state/nonce), kept in the session while
     * the browser is at Google. The API stays stateless: drop it once the login is over.
     */
    static void endHandshake(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    private static String normalize(String url) {
        if (url == null) {
            return "";
        }
        String trimmed = url.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
