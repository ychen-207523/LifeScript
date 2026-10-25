package com.lifescript.world;

import java.util.List;
import java.util.Optional;

public interface WorldRepository {
    void create(World world);
    Optional<World> find(String ownerId, String worldId);
    List<World> list(String ownerId);
    World updateCover(String ownerId, String worldId, String coverKey);
    World updateSetup(String ownerId, String worldId, StorySetupRequest request);
}
