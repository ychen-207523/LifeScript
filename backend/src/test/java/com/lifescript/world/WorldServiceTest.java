package com.lifescript.world;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.lifescript.storage.PortraitStore;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Optional;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class WorldServiceTest {

    @Test
    void removesUploadedPortraitWhenWorldCannotBeSaved() throws Exception {
        var repository = mock(WorldRepository.class);
        var portraits = mock(PortraitStore.class);
        doThrow(new IllegalStateException("disk unavailable")).when(repository).create(any());
        var service = new WorldService(repository, portraits, new PortraitValidator());
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", output);
        var portrait = new MockMultipartFile(
            "portrait",
            "test.png",
            "image/png",
            output.toByteArray()
        );
        assertThatThrownBy(() ->
            service.create(
                "owner",
                new CreateWorldRequest("World", "Setting", "Tone", "", "Ari", "Background", "en"),
                portrait,
                null
            )
        ).isInstanceOf(IllegalStateException.class);
        verify(portraits).put(startsWith("portraits/owner/"), any());
        verify(portraits).delete(startsWith("portraits/owner/"));
    }

    @Test
    void neverLoadsAnotherAccountsWorld() {
        var repository = mock(WorldRepository.class);
        var service = new WorldService(
            repository,
            mock(PortraitStore.class),
            new PortraitValidator()
        );
        String worldId = java.util.UUID.randomUUID().toString();
        when(repository.find("owner", worldId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.find("owner", worldId)).isInstanceOf(
            org.springframework.web.server.ResponseStatusException.class
        );
        verify(repository).find("owner", worldId);
    }
}
