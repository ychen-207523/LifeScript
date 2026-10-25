package com.lifescript.model;

import java.time.Instant;

public record WorldView(
    String id,
    String name,
    String setting,
    String tone,
    String rules,
    CharacterView protagonist,
    Instant createdAt,
    String storyLanguage,
    String coverUrl,
    String protagonistWish,
    String startingSituation,
    String openingScene,
    long setupRevision
) {}
