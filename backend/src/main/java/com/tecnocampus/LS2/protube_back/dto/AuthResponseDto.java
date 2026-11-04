package com.tecnocampus.LS2.protube_back.dto;

public record AuthResponseDto(
        String token,
        UserDto user
) {}
