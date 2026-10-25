package com.lifescript.knowledge;

import java.util.List;

public record WorldTable(
    String id,
    String worldId,
    String kind,
    String name,
    List<Column> columns,
    boolean useInStory,
    long revision
) {
    public record Column(
        String id,
        String label,
        String type,
        List<String> options,
        boolean locked
    ) {}
}
