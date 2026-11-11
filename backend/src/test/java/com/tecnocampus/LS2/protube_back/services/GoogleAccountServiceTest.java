package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.exception.GoogleLoginException;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoogleAccountServiceTest {

    @Mock
    UserRepository userRepository;

    GoogleAccountService service;

    @BeforeEach
    void setUp() {
        service = new GoogleAccountService(userRepository);
    }

    @Test
    void returnsExistingUserFoundByGoogleSub() {
        User existing = new User("alice", "alice@gmail.com", null);
        existing.setGoogleSub("sub-1");
        when(userRepository.findByGoogleSub("sub-1")).thenReturn(Optional.of(existing));

        User result = service.findOrCreate("sub-1", "alice@gmail.com", true, "Alice");

        assertThat(result).isSameAs(existing);
        verify(userRepository, never()).save(any());
        verify(userRepository, never()).findByEmail(anyString());
    }

    @Test
    void createsNewUserWithoutPasswordOnFirstLogin() {
        when(userRepository.findByGoogleSub("sub-2")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("bob.smith@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("bob.smith")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = service.findOrCreate("sub-2", "  Bob.Smith@Gmail.com ", true, "  Bob Smith ");

        assertThat(result.getUsername()).isEqualTo("bob.smith");
        assertThat(result.getEmail()).isEqualTo("bob.smith@gmail.com");
        assertThat(result.getPassword()).isNull();
        assertThat(result.getGoogleSub()).isEqualTo("sub-2");
        assertThat(result.getDisplayName()).isEqualTo("Bob Smith");
    }

    @Test
    void rejectsGoogleLoginWhenEmailBelongsToExistingAccount() {
        // Never link by email: a local account may have been pre-registered by an attacker
        User local = new User("victim", "victim@gmail.com", "bcrypt-hash");
        when(userRepository.findByGoogleSub("sub-3")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("victim@gmail.com")).thenReturn(Optional.of(local));

        assertThatThrownBy(() -> service.findOrCreate("sub-3", "victim@gmail.com", true, "Victim"))
                .isInstanceOf(GoogleLoginException.class)
                .extracting(e -> ((GoogleLoginException) e).getErrorCode())
                .isEqualTo(GoogleLoginException.EMAIL_EXISTS);

        assertThat(local.getGoogleSub()).isNull();
        verify(userRepository, never()).save(any());
    }

    @Test
    void addsNumericSuffixWhenUsernameIsTaken() {
        when(userRepository.findByGoogleSub("sub-4")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("carol@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("carol")).thenReturn(true);
        when(userRepository.existsByUsername("carol2")).thenReturn(true);
        when(userRepository.existsByUsername("carol3")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.findOrCreate("sub-4", "carol@gmail.com", true, null).getUsername())
                .isEqualTo("carol3");
    }

    @Test
    void buildsValidUsernameFromShortOrLongLocalParts() {
        when(userRepository.findByGoogleSub(anyString())).thenReturn(Optional.empty());
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.findOrCreate("s1", "a+b@gmail.com", true, null).getUsername()).isEqualTo("userab");
        String longLocal = "x".repeat(60);
        assertThat(service.findOrCreate("s2", longLocal + "@gmail.com", true, null).getUsername())
                .hasSize(GoogleAccountService.MAX_USERNAME_BASE_LENGTH);
    }

    @Test
    void truncatesLongDisplayNameAndIgnoresBlankOne() {
        when(userRepository.findByGoogleSub(anyString())).thenReturn(Optional.empty());
        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThat(service.findOrCreate("s1", "dan@gmail.com", true, "n".repeat(150)).getDisplayName())
                .hasSize(100);
        assertThat(service.findOrCreate("s2", "eve@gmail.com", true, "  ").getDisplayName()).isNull();
    }

    @Test
    void failsWhenNoFreeUsernameIsFound() {
        when(userRepository.findByGoogleSub("sub-5")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("busy@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername(anyString())).thenReturn(true);

        assertThatThrownBy(() -> service.findOrCreate("sub-5", "busy@gmail.com", true, null))
                .isInstanceOf(GoogleLoginException.class)
                .extracting(e -> ((GoogleLoginException) e).getErrorCode())
                .isEqualTo(GoogleLoginException.GENERIC);
    }

    @Test
    void rejectsMissingSubject() {
        assertGeneric(null, "a@gmail.com", true);
        assertGeneric(" ", "a@gmail.com", true);
        verifyNoInteractions(userRepository);
    }

    @Test
    void rejectsMissingUnverifiedOrInvalidEmail() {
        when(userRepository.findByGoogleSub("sub")).thenReturn(Optional.empty());

        assertGeneric("sub", null, true);
        assertGeneric("sub", "unverified@gmail.com", false);
        assertGeneric("sub", "no-at-sign", true);
        assertGeneric("sub", "@gmail.com", true);
        assertGeneric("sub", "x".repeat(95) + "@gmail.com", true);
        verify(userRepository, never()).save(any());
    }

    private void assertGeneric(String sub, String email, boolean verified) {
        assertThatThrownBy(() -> service.findOrCreate(sub, email, verified, "Name"))
                .isInstanceOf(GoogleLoginException.class)
                .extracting(e -> ((GoogleLoginException) e).getErrorCode())
                .isEqualTo(GoogleLoginException.GENERIC);
    }

    @Test
    void savedUserCarriesGoogleSub() {
        when(userRepository.findByGoogleSub("sub-6")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("frank@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.existsByUsername("frank")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        service.findOrCreate("sub-6", "frank@gmail.com", true, "Frank");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getGoogleSub()).isEqualTo("sub-6");
    }
}
