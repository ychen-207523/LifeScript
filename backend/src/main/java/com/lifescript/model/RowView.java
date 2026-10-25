package com.lifescript.model;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;

public record RowView(
    String id,
    String worldId,
    String tableId,
    Map<String, JsonNode> cells,
    String portraitUrl,
    long revision
) {}
