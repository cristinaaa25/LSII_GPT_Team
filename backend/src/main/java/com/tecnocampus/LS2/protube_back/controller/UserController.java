package com.tecnocampus.LS2.protube_back.controller;

import com.tecnocampus.LS2.protube_back.dto.UpdateProfileRequestDto;
import com.tecnocampus.LS2.protube_back.dto.UserDto;
import com.tecnocampus.LS2.protube_back.dto.UserProfileDto;
import com.tecnocampus.LS2.protube_back.services.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe(Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(userService.getOwnProfile(principal.getName()));
    }

    @PutMapping("/me")
    public ResponseEntity<UserDto> updateMe(
            @Valid @RequestBody UpdateProfileRequestDto request,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return ResponseEntity.ok(userService.updateOwnProfile(principal.getName(), request));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<UserDto> uploadAvatar(
            @RequestParam(value = "avatar", required = false) MultipartFile avatarPart,
            @RequestParam(value = "file", required = false) MultipartFile filePart,
            Principal principal) {
        if (principal == null) {
            throw new BadCredentialsException("Authentication required");
        }
        MultipartFile avatar = avatarPart != null ? avatarPart : filePart;
        return ResponseEntity.ok(userService.updateAvatar(principal.getName(), avatar));
    }

    @GetMapping("/{username}")
    public ResponseEntity<UserProfileDto> getPublicProfile(@PathVariable("username") String username) {
        return ResponseEntity.ok(userService.getPublicProfile(username));
    }
}
