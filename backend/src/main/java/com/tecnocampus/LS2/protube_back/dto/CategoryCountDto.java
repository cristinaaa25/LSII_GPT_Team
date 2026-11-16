package com.tecnocampus.LS2.protube_back.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record CategoryCountDto(
        @JsonProperty("name") String name,
        @JsonProperty("count") long count
) {
    @JsonProperty("category")
    public String category() {
        return name;
    }
}
