package com.lifescript.storage;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifescript.world.World;
import com.lifescript.world.WorldRepository;
import java.io.IOException;
import java.nio.file.*;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@ConditionalOnProperty(name = "script.storage", havingValue = "local", matchIfMissing = true)
public class LocalStorage implements WorldRepository, PortraitStore {

    private final Path root;
    private final ObjectMapper mapper;

    public LocalStorage(@Value("${script.data-directory}") String directory, ObjectMapper mapper) {
        this.root = Path.of(directory).toAbsolutePath().normalize();
        this.mapper = mapper;
    }

    @Override
    public void create(World world) {
        write(world, false);
    }

    @Override
    public synchronized World updateCover(String ownerId, String worldId, String coverKey) {
        return update(ownerId, worldId, current -> current.withCover(coverKey));
    }

    @Override
    public synchronized World updateSetup(
        String ownerId,
        String worldId,
        com.lifescript.world.StorySetupRequest request
    ) {
        return update(ownerId, worldId, current -> current.withSetup(request));
    }

    private World update(
        String ownerId,
        String worldId,
        java.util.function.UnaryOperator<World> change
    ) {
        World current = find(ownerId, worldId).orElseThrow(() ->
            new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND,
                "World or portrait not found."
            )
        );
        World updated = change.apply(current);
        write(updated, true);
        return updated;
    }

    private void write(World world, boolean replace) {
        Path destination = resolve("worlds/" + world.ownerId() + "/" + world.id() + ".json");
        Path temporary = null;
        try {
            Files.createDirectories(destination.getParent());
            temporary = Files.createTempFile(destination.getParent(), "world-", ".tmp");
            mapper.writeValue(temporary.toFile(), world);
            // Atomic rename publishes the world and protagonist together.
            if (replace) Files.move(
                temporary,
                destination,
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING
            );
            else Files.move(temporary, destination, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not save the world", exception);
        } finally {
            if (temporary != null) try {
                Files.deleteIfExists(temporary);
            } catch (IOException ignored) {}
        }
    }

    @Override
    public Optional<World> find(String ownerId, String worldId) {
        Path file = resolve("worlds/" + ownerId + "/" + worldId + ".json");
        if (!Files.exists(file)) return Optional.empty();
        try {
            return Optional.of(mapper.readValue(file.toFile(), World.class));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read the world", exception);
        }
    }

    @Override
    public List<World> list(String ownerId) {
        Path directory = resolve("worlds/" + ownerId);
        if (!Files.exists(directory)) return List.of();
        try (var files = Files.list(directory)) {
            return files
                .filter(path -> path.toString().endsWith(".json"))
                .map(path -> {
                    try {
                        return mapper.readValue(path.toFile(), World.class);
                    } catch (IOException exception) {
                        throw new IllegalStateException("Could not read a world", exception);
                    }
                })
                .sorted(Comparator.comparing(World::createdAt).reversed())
                .toList();
        } catch (IOException exception) {
            throw new IllegalStateException("Could not list worlds", exception);
        }
    }

    @Override
    public void put(String key, byte[] png) {
        try {
            Path destination = resolve(key);
            Files.createDirectories(destination.getParent());
            Files.write(destination, png, StandardOpenOption.CREATE_NEW);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not save the portrait", exception);
        }
    }

    @Override
    public byte[] get(String key) {
        try {
            return Files.readAllBytes(resolve(key));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read the portrait", exception);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not remove the portrait", exception);
        }
    }

    private Path resolve(String key) {
        Path path = root.resolve(key).normalize();
        if (!path.startsWith(root)) throw new IllegalArgumentException("Invalid storage path");
        return path;
    }
}
