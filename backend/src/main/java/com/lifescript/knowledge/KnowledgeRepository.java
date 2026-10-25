package com.lifescript.knowledge;

import java.util.List;
import java.util.Optional;

public interface KnowledgeRepository {
    List<WorldTable> tables(String ownerId, String worldId);
    Optional<WorldTable> table(String ownerId, String worldId, String tableId);
    void saveTable(String ownerId, WorldTable table, long expectedRevision);
    List<WorldRow> rows(String ownerId, String worldId, String tableId);
    Optional<WorldRow> row(String ownerId, String worldId, String tableId, String rowId);
    void saveRow(String ownerId, WorldRow row, long expectedRevision);
}
