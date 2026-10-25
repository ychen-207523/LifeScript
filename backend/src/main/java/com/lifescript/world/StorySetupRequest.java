package com.lifescript.world;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record StorySetupRequest(
    @Size(max = 2000) String protagonistWish,
    @Size(max = 5000) String startingSituation,
    @Size(max = 15000) String openingScene,
    @Min(0) long revision
) {}
