package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.exception.GoogleLoginException;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;

/**
 * Maps a Google account to a ProTube user.
 * <p>
 * A Google account is never linked to an existing local account by email: local registration does not verify
 * emails, so an attacker could pre-register the victim's email with a password and keep access to the account
 * the victim later reaches through Google (pre-account hijacking).
 */
@Service
@Transactional
public class GoogleAccountService {

    static final int MAX_USERNAME_BASE_LENGTH = 40;
    static final int MAX_USERNAME_ATTEMPTS = 1000;
    private static final int MAX_EMAIL_LENGTH = 100;
    private static final int MAX_DISPLAY_NAME_LENGTH = 100;

    private final UserRepository userRepository;

    public GoogleAccountService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Returns the user bound to this Google account, creating it on the first login.
     *
     * @throws GoogleLoginException if the Google data is incomplete, the email is not verified, or the email
     *                              already belongs to another ProTube account
     */
    public User findOrCreate(String googleSub, String email, boolean emailVerified, String name) {
        if (isBlank(googleSub)) {
            throw new GoogleLoginException(GoogleLoginException.GENERIC, "Google account without subject");
        }

        Optional<User> existing = userRepository.findByGoogleSub(googleSub);
        if (existing.isPresent()) {
            return existing.get();
        }

        if (isBlank(email) || !emailVerified) {
            throw new GoogleLoginException(GoogleLoginException.GENERIC, "Google email missing or not verified");
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (normalizedEmail.length() > MAX_EMAIL_LENGTH || normalizedEmail.indexOf('@') <= 0) {
            throw new GoogleLoginException(GoogleLoginException.GENERIC, "Unsupported Google email");
        }

        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new GoogleLoginException(GoogleLoginException.EMAIL_EXISTS,
                    "Email already used by another account");
        }

        User user = new User(uniqueUsername(normalizedEmail), normalizedEmail, null);
        user.setGoogleSub(googleSub);
        user.setDisplayName(displayName(name));
        return userRepository.save(user);
    }

    private String uniqueUsername(String email) {
        String base = email.substring(0, email.indexOf('@')).replaceAll("[^a-z0-9._-]", "");
        if (base.length() < 3) {
            base = "user" + base;
        }
        if (base.length() > MAX_USERNAME_BASE_LENGTH) {
            base = base.substring(0, MAX_USERNAME_BASE_LENGTH);
        }

        String candidate = base;
        for (int suffix = 2; userRepository.existsByUsername(candidate); suffix++) {
            if (suffix > MAX_USERNAME_ATTEMPTS) {
                throw new GoogleLoginException(GoogleLoginException.GENERIC, "No free username");
            }
            candidate = base + suffix;
        }
        return candidate;
    }

    private static String displayName(String name) {
        if (isBlank(name)) {
            return null;
        }
        String trimmed = name.trim();
        return trimmed.length() > MAX_DISPLAY_NAME_LENGTH ? trimmed.substring(0, MAX_DISPLAY_NAME_LENGTH) : trimmed;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
