package com.tecnocampus.LS2.protube_back.services;

import com.tecnocampus.LS2.protube_back.domain.User;
import com.tecnocampus.LS2.protube_back.dto.AuthResponseDto;
import com.tecnocampus.LS2.protube_back.dto.LoginRequestDto;
import com.tecnocampus.LS2.protube_back.dto.RegisterRequestDto;
import com.tecnocampus.LS2.protube_back.dto.UserDto;
import com.tecnocampus.LS2.protube_back.exception.ConflictException;
import com.tecnocampus.LS2.protube_back.exception.InvalidRequestException;
import com.tecnocampus.LS2.protube_back.repository.UserRepository;
import com.tecnocampus.LS2.protube_back.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

@Service
@Transactional
public class AuthService {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponseDto register(RegisterRequestDto request) {
        if (request == null) {
            throw new InvalidRequestException("Registration data must not be null");
        }
        if (request.username() == null || request.username().trim().length() < 3) {
            throw new InvalidRequestException("Username must be at least 3 characters");
        }
        if (request.username().trim().length() > 50) {
            throw new InvalidRequestException("Username must not exceed 50 characters");
        }
        if (request.email() == null || !EMAIL_PATTERN.matcher(request.email().trim()).matches()) {
            throw new InvalidRequestException("Invalid email format");
        }
        if (request.password() == null || request.password().length() < 8) {
            throw new InvalidRequestException("Password must be at least 8 characters");
        }

        String normalizedEmail = request.email().trim().toLowerCase();
        String normalizedUsername = request.username().trim();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ConflictException("Email already in use");
        }
        if (userRepository.existsByUsername(normalizedUsername)) {
            throw new ConflictException("Username already in use");
        }

        String encodedPassword = passwordEncoder.encode(request.password());
        User user = new User(
                normalizedUsername,
                normalizedEmail,
                encodedPassword,
                request.avatarUrl(),
                request.description()
        );

        User savedUser = userRepository.save(user);
        String token = jwtService.generateToken(savedUser);
        return new AuthResponseDto(token, toDto(savedUser));
    }

    @Transactional(readOnly = true)
    public AuthResponseDto login(LoginRequestDto request) {
        if (request == null || request.email() == null || request.email().isBlank()
                || request.password() == null || request.password().isBlank()) {
            throw new InvalidRequestException("Email and password are required");
        }

        String identifier = request.email().trim();
        User user = userRepository.findByEmail(identifier.toLowerCase())
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        String token = jwtService.generateToken(user);
        return new AuthResponseDto(token, toDto(user));
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String usernameOrEmail) {
        if (usernameOrEmail == null || usernameOrEmail.isBlank()) {
            throw new BadCredentialsException("Authentication required");
        }
        User user = userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findByEmail(usernameOrEmail.toLowerCase()))
                .orElseThrow(() -> new BadCredentialsException("User not found"));

        return toDto(user);
    }

    public UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getDescription()
        );
    }
}
