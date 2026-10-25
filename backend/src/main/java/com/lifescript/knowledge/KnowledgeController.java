package com.lifescript.knowledge;

import com.fasterxml.jackson.databind.JsonNode;
import com.lifescript.account.CurrentAccount;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/worlds/{worldId}/tables")
public class KnowledgeController {

    private final KnowledgeService service;
    private final CurrentAccount account;

    public KnowledgeController(KnowledgeService service, CurrentAccount account) {
        this.service = service;
        this.account = account;
    }

    @GetMapping
    public List<WorldTable> tables(@PathVariable String worldId) {
        return service.tables(account.id(), worldId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorldTable createTable(
        @PathVariable String worldId,
        @RequestBody KnowledgeService.TableRequest request
    ) {
        return service.createTable(account.id(), worldId, request);
    }

    @PutMapping("/{tableId}")
    public WorldTable updateTable(
        @PathVariable String worldId,
        @PathVariable String tableId,
        @RequestBody KnowledgeService.TableRequest request
    ) {
        return service.updateTable(account.id(), worldId, tableId, request);
    }

    @GetMapping("/{tableId}/rows")
    public List<RowView> rows(@PathVariable String worldId, @PathVariable String tableId) {
        return service.rows(account.id(), worldId, tableId).stream().map(this::view).toList();
    }

    @PutMapping("/{tableId}/rows/{rowId}")
    public RowView saveRow(
        @PathVariable String worldId,
        @PathVariable String tableId,
        @PathVariable String rowId,
        @RequestBody KnowledgeService.RowRequest request
    ) {
        return view(service.saveRow(account.id(), worldId, tableId, rowId, request));
    }

    @PutMapping(
        value = "/characters/rows/{rowId}/portrait",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public RowView upload(
        @PathVariable String worldId,
        @PathVariable String rowId,
        @RequestParam long revision,
        @RequestPart("portrait") MultipartFile file
    ) {
        return view(service.uploadPortrait(account.id(), worldId, rowId, revision, file));
    }

    @GetMapping(value = "/characters/rows/{rowId}/portrait", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> portrait(
        @PathVariable String worldId,
        @PathVariable String rowId
    ) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(service.portrait(account.id(), worldId, rowId));
    }

    private RowView view(WorldRow row) {
        String url =
            row.portraitKey() == null
                ? null
                : "/api/v1/worlds/" +
                  row.worldId() +
                  "/tables/characters/rows/" +
                  row.id() +
                  "/portrait?v=" +
                  row.portraitKey().substring(row.portraitKey().lastIndexOf('/') + 1);
        return new RowView(
            row.id(),
            row.worldId(),
            row.tableId(),
            row.cells(),
            url,
            row.revision()
        );
    }

    public record RowView(
        String id,
        String worldId,
        String tableId,
        Map<String, JsonNode> cells,
        String portraitUrl,
        long revision
    ) {}
}
