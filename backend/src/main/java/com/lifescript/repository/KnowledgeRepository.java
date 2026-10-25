package com.lifescript.repository;

import com.lifescript.model.WorldRow;
import com.lifescript.model.WorldTable;
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
