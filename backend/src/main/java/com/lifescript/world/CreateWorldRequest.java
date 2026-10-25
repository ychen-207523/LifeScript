package com.lifescript.world;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateWorldRequest(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Size(max = 5000) String setting,
    @NotBlank @Size(max = 100) String tone,
    @Size(max = 3000) String rules,
    @NotBlank @Size(max = 80) String protagonistName,
    @NotBlank @Size(max = 3000) String protagonistBackground,
    @Pattern(regexp = "en|zh-CN") String storyLanguage,
    @Size(max = 2000) String protagonistWish,
    @Size(max = 5000) String startingSituation,
    @Size(max = 15000) String openingScene
) {
    public CreateWorldRequest(
        String name,
        String setting,
        String tone,
        String rules,
        String protagonistName,
        String protagonistBackground,
        String storyLanguage
    ) {
        this(
            name,
            setting,
            tone,
            rules,
            protagonistName,
            protagonistBackground,
            storyLanguage,
            "",
            "",
            ""
        );
    }
}
