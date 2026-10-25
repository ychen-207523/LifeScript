package com.lifescript.model;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;

public record RowRequest(Map<String, JsonNode> cells, long revision, long tableRevision) {}
