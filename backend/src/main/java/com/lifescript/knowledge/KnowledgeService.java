package com.lifescript.knowledge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifescript.storage.PortraitStore;
import com.lifescript.world.PortraitValidator;
import com.lifescript.world.WorldService;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class KnowledgeService {

    private final KnowledgeRepository repository;
    private final WorldService worlds;
    private final ObjectMapper mapper;
    private final PortraitStore portraits;
    private final PortraitValidator images;

    public KnowledgeService(
        KnowledgeRepository repository,
        WorldService worlds,
        ObjectMapper mapper,
        PortraitStore portraits,
        PortraitValidator images
    ) {
        this.repository = repository;
        this.worlds = worlds;
        this.mapper = mapper;
        this.portraits = portraits;
        this.images = images;
    }

    public record TableRequest(
        String name,
        List<WorldTable.Column> columns,
        boolean useInStory,
        long revision
    ) {}

    public record RowRequest(Map<String, JsonNode> cells, long revision, long tableRevision) {}

    private WorldTable.Column column(String id, String type) {
        return new WorldTable.Column(id, "", type, List.of(), false);
    }

    private WorldTable builtin(String world, String kind) {
        var columns = kind.equals("places")
            ? List.of(
                  column("name", "text"),
                  column("description", "text"),
                  column("connectedPlace", "place"),
                  column("discoveredDetails", "text")
              )
            : List.of(
                  column("name", "text"),
                  column("portrait", "image"),
                  column("appearance", "text"),
                  column("relationships", "text"),
                  column("currentLocation", "place"),
                  new WorldTable.Column(
                      "status",
                      "",
                      "choice",
                      List.of("Active", "Missing", "Unknown"),
                      false
                  ),
                  column("persistent", "checkbox"),
                  column("notes", "text")
              );
        return new WorldTable(kind, world, kind, "", columns, true, 0);
    }

    private void identifier(String id) {
        if (id == null || !id.matches("[a-zA-Z0-9_-]{1,80}")) throw missing();
    }

    public List<WorldTable> tables(String owner, String world) {
        worlds.find(owner, world);
        var saved = new LinkedHashMap<String, WorldTable>();
        saved.put("places", builtin(world, "places"));
        saved.put("characters", builtin(world, "characters"));
        repository.tables(owner, world).forEach(table -> saved.put(table.id(), table));
        return List.copyOf(saved.values());
    }

    public WorldTable table(String owner, String world, String table) {
        worlds.find(owner, world);
        identifier(table);
        return repository.table(owner, world, table).orElseGet(() -> {
            if (table.equals("places") || table.equals("characters")) return builtin(world, table);
            throw missing();
        });
    }

    public synchronized WorldTable createTable(String owner, String world, TableRequest request) {
        if (tables(owner, world).size() >= 30) throw invalid("A world can have at most 30 tables.");
        if (request.revision() != 0) throw conflict();
        String id = UUID.randomUUID().toString();
        return saveTable(
            owner,
            new WorldTable(id, world, "custom", "", List.of(), false, 0),
            request,
            List.of()
        );
    }

    public synchronized WorldTable updateTable(
        String owner,
        String world,
        String id,
        TableRequest request
    ) {
        WorldTable current = table(owner, world, id);
        if (current.revision() != request.revision()) throw conflict();
        return saveTable(owner, current, request, repository.rows(owner, world, id));
    }

    private WorldTable saveTable(
        String owner,
        WorldTable current,
        TableRequest request,
        List<WorldRow> rows
    ) {
        String name = request.name() == null ? "" : request.name().strip();
        if (
            name.length() > 80 || (current.kind().equals("custom") && name.isBlank())
        ) throw invalid("Give this table a name (up to 80 characters).");
        if (
            request.columns() == null ||
            request.columns().isEmpty() ||
            request.columns().size() > 30
        ) throw invalid("A table needs between 1 and 30 columns.");
        var columns = new ArrayList<WorldTable.Column>();
        var seen = new HashSet<String>();
        Map<String, WorldTable.Column> reserved = new HashMap<>();
        if (!current.kind().equals("custom")) builtin(current.worldId(), current.kind())
            .columns()
            .forEach(column -> reserved.put(column.id(), column));
        for (var column : request.columns()) {
            if (column == null) throw invalid("Check the column definitions.");
            identifier(column.id());
            if (!seen.add(column.id())) throw invalid("Column IDs must be unique.");
            var fixed = reserved.get(column.id());
            String label = column.label() == null ? "" : column.label().strip();
            if (label.length() > 80 || (fixed == null && label.isBlank())) throw invalid(
                "Give each custom column a label."
            );
            if (
                column.type() == null ||
                (!Set.of("text", "number", "checkbox", "choice", "place", "character").contains(
                    column.type()
                ) &&
                    !(
                        fixed != null &&
                        fixed.type().equals("image") &&
                        column.type().equals("image")
                    ))
            ) throw invalid("Choose a supported column type.");
            if (fixed != null && !fixed.type().equals(column.type())) throw invalid(
                "Built-in column types cannot be changed."
            );
            List<String> options = column.options() == null ? List.of() : column.options();
            if (
                options.size() > 30 ||
                options
                    .stream()
                    .anyMatch(
                        option -> option == null || option.isBlank() || option.length() > 80
                    ) ||
                new HashSet<>(options).size() != options.size()
            ) throw invalid("Choice options must be unique, nonempty, and at most 80 characters.");
            if (column.type().equals("choice") && options.isEmpty()) throw invalid(
                "Add at least one choice option."
            );
            columns.add(
                new WorldTable.Column(
                    column.id(),
                    label,
                    column.type(),
                    List.copyOf(options),
                    column.locked()
                )
            );
        }
        if (!seen.containsAll(reserved.keySet())) throw invalid(
            "Built-in columns must be kept. You can rename or extend them."
        );
        for (var old : current.columns()) {
            var replacement = columns
                .stream()
                .filter(column -> column.id().equals(old.id()))
                .findFirst();
            if (
                !rows.isEmpty() &&
                (replacement.isEmpty() || !replacement.get().type().equals(old.type()))
            ) throw invalid("Column types and columns with existing records must be kept.");
            if (
                replacement.isPresent() &&
                old.type().equals("choice") &&
                rows.stream().anyMatch(row -> {
                    JsonNode cell = row.cells().get(old.id());
                    return (
                        cell != null &&
                        !cell.isNull() &&
                        !cell.asText().isBlank() &&
                        !replacement.get().options().contains(cell.asText())
                    );
                })
            ) throw invalid("Keep choice options that are already used by records.");
        }
        var updated = new WorldTable(
            current.id(),
            current.worldId(),
            current.kind(),
            name,
            List.copyOf(columns),
            request.useInStory(),
            current.revision() + 1
        );
        size(updated);
        repository.saveTable(owner, updated, current.revision());
        return updated;
    }

    public List<WorldRow> rows(String owner, String world, String tableId) {
        table(owner, world, tableId);
        return repository
            .rows(owner, world, tableId)
            .stream()
            .sorted(Comparator.comparing(WorldRow::id))
            .toList();
    }

    public WorldRow row(String owner, String world, String tableId, String rowId) {
        table(owner, world, tableId);
        identifier(rowId);
        return repository.row(owner, world, tableId, rowId).orElseThrow(this::missing);
    }

    // Serialize schema validation and record edits in the current single-instance application.
    public synchronized WorldRow saveRow(
        String owner,
        String world,
        String tableId,
        String rowId,
        RowRequest request
    ) {
        WorldTable table = table(owner, world, tableId);
        identifier(rowId);
        if (request.tableRevision() != table.revision() || request.revision() < 0) throw conflict();
        var old = repository.row(owner, world, tableId, rowId);
        if (old.map(WorldRow::revision).orElse(0L) != request.revision()) throw conflict();
        if (old.isEmpty() && repository.rows(owner, world, tableId).size() >= 500) throw invalid(
            "A table can have at most 500 records."
        );
        if (request.cells() == null) throw invalid("Record values are required.");
        var defined = new HashSet<String>();
        var cells = new LinkedHashMap<String, JsonNode>();
        for (var column : table.columns()) {
            defined.add(column.id());
            JsonNode value = request.cells().get(column.id());
            if (column.type().equals("image")) {
                if (value != null && !value.isNull()) throw invalid(
                    "Use the portrait upload control for images."
                );
                continue;
            }
            if (
                old.isPresent() &&
                column.locked() &&
                !Objects.equals(empty(value), empty(old.get().cells().get(column.id())))
            ) throw invalid("Unlock the column before changing its value.");
            if (value == null || value.isNull()) continue;
            boolean valid = switch (column.type()) {
                case "text" -> value.isTextual() && value.asText().length() <= 6000;
                case "number" -> value.isNumber() && Double.isFinite(value.asDouble());
                case "checkbox" -> value.isBoolean();
                case "choice" -> value.isTextual() &&
                    (value.asText().isEmpty() || column.options().contains(value.asText()));
                case "place", "character" -> value.isTextual() &&
                    (value.asText().isEmpty() ||
                        validReference(owner, world, column.type(), value.asText()));
                default -> false;
            };
            if (!valid) throw invalid("A record value does not match its column type.");
            cells.put(column.id(), value.deepCopy());
        }
        if (!defined.containsAll(request.cells().keySet())) throw invalid(
            "A record contains an unknown column."
        );
        if (
            !table.kind().equals("custom") &&
            (!cells.containsKey("name") || cells.get("name").asText().isBlank())
        ) throw invalid("A name is required.");
        WorldRow result = new WorldRow(
            rowId,
            world,
            tableId,
            Collections.unmodifiableMap(cells),
            old.map(WorldRow::portraitKey).orElse(null),
            request.revision() + 1
        );
        size(result);
        repository.saveRow(owner, result, request.revision());
        return result;
    }

    private JsonNode empty(JsonNode value) {
        return value == null || value.isNull() || (value.isTextual() && value.asText().isEmpty())
            ? null
            : value;
    }

    private boolean validReference(String owner, String world, String kind, String id) {
        identifier(id);
        return repository
            .row(owner, world, kind.equals("place") ? "places" : "characters", id)
            .isPresent();
    }

    public synchronized WorldRow uploadPortrait(
        String owner,
        String world,
        String rowId,
        long revision,
        MultipartFile file
    ) {
        WorldRow current = row(owner, world, "characters", rowId);
        if (current.revision() != revision) throw conflict();
        if (
            table(owner, world, "characters")
                .columns()
                .stream()
                .anyMatch(column -> column.id().equals("portrait") && column.locked())
        ) throw invalid("Unlock the column before changing its value.");
        if (file.isEmpty()) throw invalid("Choose a valid PNG or JPEG image.");
        byte[] png = images.normalize(file);
        String key =
            "portraits/" +
            owner +
            "/" +
            world +
            "/characters/" +
            rowId +
            "/" +
            UUID.randomUUID() +
            ".png";
        portraits.put(key, png);
        var updated = new WorldRow(rowId, world, "characters", current.cells(), key, revision + 1);
        try {
            repository.saveRow(owner, updated, revision);
        } catch (RuntimeException error) {
            try {
                portraits.delete(key);
            } catch (RuntimeException ignored) {}
            throw error;
        }
        return updated;
    }

    public byte[] portrait(String owner, String world, String row) {
        String key = row(owner, world, "characters", row).portraitKey();
        if (key == null) throw missing();
        return portraits.get(key);
    }

    private void size(Object value) {
        try {
            if (mapper.writeValueAsBytes(value).length > 200_000) throw invalid(
                "This record is too large. Shorten some values."
            );
        } catch (com.fasterxml.jackson.core.JsonProcessingException error) {
            throw invalid("Check the record values.");
        }
    }

    private ResponseStatusException invalid(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException conflict() {
        return new ResponseStatusException(
            HttpStatus.CONFLICT,
            "Records changed. Reload and try again."
        );
    }

    private ResponseStatusException missing() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Table or record not found.");
    }
}
