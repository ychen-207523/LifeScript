package com.lifescript.model;

import java.util.Map;

public record CharacterView(
    String id,
    String name,
    String background,
    Map<String, Integer> attributes,
    String portraitUrl
) {}
