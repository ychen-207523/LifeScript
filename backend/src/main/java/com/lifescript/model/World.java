package com.lifescript.model;

import java.time.Instant;
import java.util.Map;

public record World(
    String id,
    String ownerId,
    String name,
    String setting,
    String tone,
    String rules,
    Protagonist protagonist,
    Instant createdAt,
    int schemaVersion,
    String storyLanguage,
    String coverKey,
    String protagonistWish,
    String startingSituation,
    String openingScene,
    long setupRevision
) {
    public World {
        // Records saved before language preferences existed remain readable.
        storyLanguage = storyLanguage == null ? "en" : storyLanguage;
        protagonistWish = clean(protagonistWish);
        startingSituation = clean(startingSituation);
        openingScene = clean(openingScene);
    }

    public World withCover(String key) {
        return new World(
            id,
            ownerId,
            name,
            setting,
            tone,
            rules,
            protagonist,
            createdAt,
            schemaVersion,
            storyLanguage,
            key,
            protagonistWish,
            startingSituation,
            openingScene,
            setupRevision
        );
    }

    public World withSetup(StorySetupRequest request) {
        if (
            request.revision() != setupRevision
        ) throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.CONFLICT,
            "This world changed. Refresh and try again."
        );
        return new World(
            id,
            ownerId,
            name,
            setting,
            tone,
            rules,
            protagonist,
            createdAt,
            3,
            storyLanguage,
            coverKey,
            request.protagonistWish(),
            request.startingSituation(),
            request.openingScene(),
            setupRevision + 1
        );
    }

    private static String clean(String value) {
        return value == null ? "" : value.strip();
    }

    public record Protagonist(
        String id,
        String name,
        String background,
        Map<String, Integer> attributes,
        String portraitKey
    ) {}
}
