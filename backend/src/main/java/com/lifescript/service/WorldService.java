package com.lifescript.service;

import com.lifescript.model.CreateWorldRequest;
import com.lifescript.model.StorySetupRequest;
import com.lifescript.model.World;
import com.lifescript.repository.PortraitStore;
import com.lifescript.repository.WorldRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WorldService {

    private static final Logger log = LoggerFactory.getLogger(WorldService.class);
    private final WorldRepository repository;
    private final PortraitStore portraits;
    private final PortraitValidator validator;

    public WorldService(
        WorldRepository repository,
        PortraitStore portraits,
        PortraitValidator validator
    ) {
        this.repository = repository;
        this.portraits = portraits;
        this.validator = validator;
    }

    public World create(
        String ownerId,
        CreateWorldRequest request,
        MultipartFile portrait,
        MultipartFile cover
    ) {
        // Validate both images before writing either one.
        byte[] portraitPng =
            portrait == null || portrait.isEmpty() ? null : validator.normalize(portrait);
        byte[] coverPng = cover == null || cover.isEmpty() ? null : validator.normalize(cover);
        String worldId = UUID.randomUUID().toString();
        String characterId = UUID.randomUUID().toString();
        String portraitKey = null;
        if (portraitPng != null) {
            portraitKey = "portraits/" + ownerId + "/" + worldId + "/" + characterId + ".png";
            portraits.put(portraitKey, portraitPng);
        }
        String coverKey =
            coverPng == null
                ? null
                : "covers/" + ownerId + "/" + worldId + "/" + UUID.randomUUID() + ".png";
        World world = new World(
            worldId,
            ownerId,
            request.name().strip(),
            request.setting().strip(),
            request.tone().strip(),
            request.rules() == null ? "" : request.rules().strip(),
            new World.Protagonist(
                characterId,
                request.protagonistName().strip(),
                request.protagonistBackground().strip(),
                Map.of(
                    "Knowledge",
                    0,
                    "Vitality",
                    0,
                    "Creativity",
                    0,
                    "Connection",
                    0,
                    "Discipline",
                    0
                ),
                portraitKey
            ),
            Instant.now(),
            3,
            request.storyLanguage(),
            coverKey,
            request.protagonistWish(),
            request.startingSituation(),
            request.openingScene(),
            0
        );
        try {
            if (coverKey != null) portraits.put(coverKey, coverPng);
            repository.create(world);
        } catch (RuntimeException exception) {
            if (coverKey != null) cleanup(coverKey);
            if (portraitKey != null) {
                try {
                    portraits.delete(portraitKey);
                } catch (RuntimeException cleanup) {
                    log.warn("Could not clean up uncommitted portrait", cleanup);
                }
            }
            throw exception;
        }
        return world;
    }

    public World find(String ownerId, String worldId) {
        try {
            UUID.fromString(worldId);
        } catch (IllegalArgumentException exception) {
            throw missing();
        }
        return repository
            .find(ownerId, worldId)
            .filter(world -> world.ownerId().equals(ownerId))
            .orElseThrow(this::missing);
    }

    public List<World> list(String ownerId) {
        return repository.list(ownerId);
    }

    public World updateSetup(String ownerId, String worldId, StorySetupRequest request) {
        find(ownerId, worldId);
        return repository.updateSetup(ownerId, worldId, request);
    }

    public World updateCover(String ownerId, String worldId, MultipartFile file) {
        find(ownerId, worldId);
        if (file.isEmpty()) throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Choose a valid PNG or JPEG image."
        );
        byte[] png = validator.normalize(file);
        String key = "covers/" + ownerId + "/" + worldId + "/" + UUID.randomUUID() + ".png";
        portraits.put(key, png);
        try {
            return repository.updateCover(ownerId, worldId, key);
        } catch (RuntimeException exception) {
            cleanup(key);
            throw exception;
        }
    }

    public byte[] cover(String ownerId, String worldId) {
        String key = find(ownerId, worldId).coverKey();
        if (key == null) throw missing();
        return portraits.get(key);
    }

    private void cleanup(String key) {
        try {
            portraits.delete(key);
        } catch (RuntimeException exception) {
            log.warn("Could not clean up uncommitted image", exception);
        }
    }

    public byte[] portrait(String ownerId, String worldId) {
        String key = find(ownerId, worldId).protagonist().portraitKey();
        if (key == null) throw missing();
        return portraits.get(key);
    }

    private ResponseStatusException missing() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "World or portrait not found.");
    }
}
