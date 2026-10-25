package com.lifescript.model;

import java.util.List;

public record TableRequest(
    String name,
    List<WorldTable.Column> columns,
    boolean useInStory,
    long revision
) {}
