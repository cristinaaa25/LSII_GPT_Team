package com.tecnocampus.LS2.protube_back.security;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.services.GoogleAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.oidc.OidcIdToken;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

// Google is never called: the authenticated Google user is built by hand, as Spring would after the code exchange
@ExtendWith(MockitoExtension.class)
class OAuth2LoginSuccessHandlerTest {

    private static final String FRONTEND = "http://localhost:5173";

    @Mock
    UserRepository userRepository;

    @Mock
    JwtService jwtService;

    OAuth2LoginSuccessHandler handler;
    MockHttpServletRequest request;
    MockHttpServletResponse response;
    MockHttpSession session;

    @BeforeEach
    void setUp() {
        handler = new OAuth2LoginSuccessHandler(new GoogleAccountService(userRepository), jwtService,
                new OAuth2LoginFailureHandler(FRONTEND + "/"));
        request = new MockHttpServletRequest();
        session = new MockHttpSession();
        request.setSession(session);
        response = new MockHttpServletResponse();
    }

    @Test
    void newGoogleUserIsCreatedAndRedirectedWithToken() throws Exception {
        when(userRepository.findByGoogleSub("sub-new")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("newbie@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("newbie")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt.for.newbie");

        handler.onAuthenticationSuccess(request, response, authentication("sub-new", "newbie@gmail.com", true));

        assertThat(response.getRedirectedUrl()).isEqualTo(FRONTEND + "/auth/callback#token=jwt.for.newbie");
        verify(userRepository).save(argThat(u -> "sub-new".equals(u.getGoogleSub()) && u.getPassword() == null));
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    void existingUserFoundByGoogleSubGetsToken() throws Exception {
        User existing = new User("alice", "alice@gmail.com", null);
        existing.setId(7L);
        existing.setGoogleSub("sub-alice");
        when(userRepository.findByGoogleSub("sub-alice")).thenReturn(Optional.of(existing));
        when(jwtService.generateToken(existing)).thenReturn("jwt.for.alice");

        handler.onAuthenticationSuccess(request, response, authentication("sub-alice", "alice@gmail.com", true));

        assertThat(response.getRedirectedUrl()).isEqualTo(FRONTEND + "/auth/callback#token=jwt.for.alice");
        verify(userRepository, never()).save(any());
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    void existingLocalAccountWithSameEmailIsNotLinked() throws Exception {
        User local = new User("victim", "victim@gmail.com", "bcrypt-hash");
        when(userRepository.findByGoogleSub("sub-victim")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("victim@gmail.com")).thenReturn(Optional.of(local));

        handler.onAuthenticationSuccess(request, response, authentication("sub-victim", "victim@gmail.com", true));

        assertThat(response.getRedirectedUrl()).isEqualTo(FRONTEND + "/login?error=google_email_exists");
        assertThat(local.getGoogleSub()).isNull();
        verify(userRepository, never()).save(any());
        verifyNoInteractions(jwtService);
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    void unverifiedEmailIsRejected() throws Exception {
        when(userRepository.findByGoogleSub("sub-x")).thenReturn(Optional.empty());

        handler.onAuthenticationSuccess(request, response, authentication("sub-x", "x@gmail.com", false));

        assertThat(response.getRedirectedUrl()).isEqualTo(FRONTEND + "/login?error=google");
        verifyNoInteractions(jwtService);
    }

    @Test
    void unexpectedErrorRedirectsWithGenericError() throws Exception {
        when(userRepository.findByGoogleSub("sub-race")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("race@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("race")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenThrow(new DataIntegrityViolationException("duplicate"));

        handler.onAuthenticationSuccess(request, response, authentication("sub-race", "race@gmail.com", true));

        assertThat(response.getRedirectedUrl()).isEqualTo(FRONTEND + "/login?error=google");
        verifyNoInteractions(jwtService);
    }

    @Test
    void emailVerifiedClaimSentAsStringIsAccepted() throws Exception {
        when(userRepository.findByGoogleSub("sub-str")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("str@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("str")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt");

        handler.onAuthenticationSuccess(request, response, authentication("sub-str", "str@gmail.com", "true"));

        assertThat(response.getRedirectedUrl()).isEqualTo(FRONTEND + "/auth/callback#token=jwt");
    }

    @Test
    void sameOriginFrontendUsesRelativeRedirect() throws Exception {
        OAuth2LoginSuccessHandler sameOrigin = new OAuth2LoginSuccessHandler(
                new GoogleAccountService(userRepository), jwtService, new OAuth2LoginFailureHandler(""));
        User existing = new User("alice", "alice@gmail.com", null);
        when(userRepository.findByGoogleSub("sub-alice")).thenReturn(Optional.of(existing));
        when(jwtService.generateToken(existing)).thenReturn("jwt");

        sameOrigin.onAuthenticationSuccess(request, response, authentication("sub-alice", "alice@gmail.com", true));

        assertThat(response.getRedirectedUrl()).isEqualTo("/auth/callback#token=jwt");
    }

    private static OAuth2AuthenticationToken authentication(String sub, String email, Object emailVerified) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", sub);
        claims.put("email", email);
        claims.put("email_verified", emailVerified);
        claims.put("name", "Test User");
        OidcIdToken idToken = new OidcIdToken("id-token", Instant.now(), Instant.now().plusSeconds(60), claims);
        OidcUser user = new DefaultOidcUser(AuthorityUtils.createAuthorityList("OIDC_USER"), idToken);
        return new OAuth2AuthenticationToken(user, user.getAuthorities(), "google");
    }
}
