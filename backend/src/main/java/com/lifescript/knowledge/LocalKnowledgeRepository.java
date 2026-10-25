package com.lifescript.knowledge;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
@ConditionalOnProperty(name = "script.storage", havingValue = "local", matchIfMissing = true)
public class LocalKnowledgeRepository implements KnowledgeRepository {

    private final Path root;
    private final ObjectMapper mapper;

    public LocalKnowledgeRepository(
        @Value("${script.data-directory}") String directory,
        ObjectMapper mapper
    ) {
        root = Path.of(directory).toAbsolutePath().normalize().resolve("knowledge");
        this.mapper = mapper;
    }

    private Path path(String owner, String world, String key) {
        Path result = root.resolve(owner).resolve(world).resolve(key).normalize();
        if (!result.startsWith(root)) throw new IllegalArgumentException("Invalid storage path");
        return result;
    }

    private <T> Optional<T> read(Path file, Class<T> type) {
        if (!Files.exists(file)) return Optional.empty();
        try {
            return Optional.of(mapper.readValue(file.toFile(), type));
        } catch (IOException error) {
            throw new IllegalStateException("Could not read world records", error);
        }
    }

    private <T> List<T> list(Path directory, Class<T> type) {
        if (!Files.exists(directory)) return List.of();
        try (var paths = Files.list(directory)) {
            return paths
                .filter(file -> file.toString().endsWith(".json"))
                .sorted()
                .map(file -> read(file, type).orElseThrow())
                .toList();
        } catch (IOException error) {
            throw new IllegalStateException("Could not list world records", error);
        }
    }

    private void write(Path file, Object value) {
        Path temporary = null;
        try {
            Files.createDirectories(file.getParent());
            temporary = Files.createTempFile(file.getParent(), "record-", ".tmp");
            mapper.writeValue(temporary.toFile(), value);
            Files.move(
                temporary,
                file,
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING
            );
        } catch (IOException error) {
            throw new IllegalStateException("Could not save world records", error);
        } finally {
            if (temporary != null) try {
                Files.deleteIfExists(temporary);
            } catch (IOException ignored) {}
        }
    }

    private void check(long actual, long expected) {
        if (actual != expected) throw new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Records changed. Reload and try again."
        );
    }

    @Override
    public List<WorldTable> tables(String owner, String world) {
        return list(path(owner, world, "tables"), WorldTable.class);
    }

    @Override
    public Optional<WorldTable> table(String owner, String world, String table) {
        return read(path(owner, world, "tables/" + table + ".json"), WorldTable.class);
    }

    @Override
    public synchronized void saveTable(String owner, WorldTable table, long expected) {
        check(
            table(owner, table.worldId(), table.id()).map(WorldTable::revision).orElse(0L),
            expected
        );
        write(path(owner, table.worldId(), "tables/" + table.id() + ".json"), table);
    }

    @Override
    public List<WorldRow> rows(String owner, String world, String table) {
        return list(path(owner, world, "rows/" + table), WorldRow.class);
    }

    @Override
    public Optional<WorldRow> row(String owner, String world, String table, String row) {
        return read(path(owner, world, "rows/" + table + "/" + row + ".json"), WorldRow.class);
    }

    @Override
    public synchronized void saveRow(String owner, WorldRow row, long expected) {
        check(
            row(owner, row.worldId(), row.tableId(), row.id()).map(WorldRow::revision).orElse(0L),
            expected
        );
        write(path(owner, row.worldId(), "rows/" + row.tableId() + "/" + row.id() + ".json"), row);
    }
}
