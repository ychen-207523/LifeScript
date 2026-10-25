package com.lifescript.world;

import com.lifescript.account.CurrentAccount;
import jakarta.validation.Valid;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/worlds")
public class WorldController {

    private final WorldService service;
    private final CurrentAccount account;

    public WorldController(WorldService service, CurrentAccount account) {
        this.service = service;
        this.account = account;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WorldView> create(
        @Valid @RequestPart("world") CreateWorldRequest request,
        @RequestPart(value = "portrait", required = false) MultipartFile portrait,
        @RequestPart(value = "cover", required = false) MultipartFile cover
    ) {
        World world = service.create(account.id(), request, portrait, cover);
        return ResponseEntity.created(URI.create("/api/v1/worlds/" + world.id())).body(view(world));
    }

    @GetMapping
    public List<WorldView> list() {
        return service.list(account.id()).stream().map(this::view).toList();
    }

    @GetMapping("/{worldId}")
    public WorldView get(@PathVariable String worldId) {
        return view(service.find(account.id(), worldId));
    }

    @PutMapping("/{worldId}/setup")
    public WorldView updateSetup(
        @PathVariable String worldId,
        @Valid @RequestBody StorySetupRequest request
    ) {
        return view(service.updateSetup(account.id(), worldId, request));
    }

    @PutMapping(value = "/{worldId}/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public WorldView updateCover(
        @PathVariable String worldId,
        @RequestPart("cover") MultipartFile cover
    ) {
        return view(service.updateCover(account.id(), worldId, cover));
    }

    @GetMapping(value = "/{worldId}/cover", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> cover(@PathVariable String worldId) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(service.cover(account.id(), worldId));
    }

    @GetMapping(value = "/{worldId}/protagonist/portrait", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> portrait(@PathVariable String worldId) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(service.portrait(account.id(), worldId));
    }

    private WorldView view(World world) {
        var character = world.protagonist();
        return new WorldView(
            world.id(),
            world.name(),
            world.setting(),
            world.tone(),
            world.rules(),
            new CharacterView(
                character.id(),
                character.name(),
                character.background(),
                character.attributes(),
                character.portraitKey() == null
                    ? null
                    : "/api/v1/worlds/" + world.id() + "/protagonist/portrait"
            ),
            world.createdAt(),
            world.storyLanguage(),
            world.coverKey() == null
                ? null
                : "/api/v1/worlds/" +
                      world.id() +
                      "/cover?v=" +
                      world.coverKey().substring(world.coverKey().lastIndexOf('/') + 1),
            world.protagonistWish(),
            world.startingSituation(),
            world.openingScene(),
            world.setupRevision()
        );
    }

    public record WorldView(
        String id,
        String name,
        String setting,
        String tone,
        String rules,
        CharacterView protagonist,
        Instant createdAt,
        String storyLanguage,
        String coverUrl,
        String protagonistWish,
        String startingSituation,
        String openingScene,
        long setupRevision
    ) {}

    public record CharacterView(
        String id,
        String name,
        String background,
        Map<String, Integer> attributes,
        String portraitUrl
    ) {}
}
