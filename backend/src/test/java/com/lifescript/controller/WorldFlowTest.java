package com.lifescript.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifescript.model.CreateWorldRequest;
import com.lifescript.model.World;
import com.lifescript.repository.LocalStorage;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class WorldFlowTest {

    @TempDir
    static Path directory;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("script.data-directory", () -> directory.toString());
        registry.add("script.storage", () -> "local");
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper mapper;

    private MockMultipartFile metadata(String name) throws Exception {
        var request = new CreateWorldRequest(
            name,
            "A city on a wandering creature.",
            "Cozy & hopeful",
            "Magic is rare.",
            "Ari",
            "An apprentice cartographer.",
            "en"
        );
        return new MockMultipartFile(
            "world",
            "world.json",
            "application/json",
            mapper.writeValueAsBytes(request)
        );
    }

    @Test
    void createsAndReloadsWorldAndPortraitFromDisk() throws Exception {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(16, 16, BufferedImage.TYPE_INT_RGB), "png", output);
        var result = mvc
            .perform(
                multipart("/api/v1/worlds")
                    .file(metadata(" Wandering Isles "))
                    .file(
                        new MockMultipartFile(
                            "portrait",
                            "portrait.png",
                            "image/png",
                            output.toByteArray()
                        )
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Wandering Isles"))
            .andExpect(jsonPath("$.protagonist.attributes.Knowledge").value(0))
            .andExpect(jsonPath("$.ownerId").doesNotExist())
            .andReturn();
        var body = mapper.readTree(result.getResponse().getContentAsString());
        String id = body.get("id").asText();
        mvc.perform(get("/api/v1/worlds/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.protagonist.name").value("Ari"));
        mvc.perform(get(body.at("/protagonist/portraitUrl").asText()))
            .andExpect(status().isOk())
            .andExpect(content().contentType(MediaType.IMAGE_PNG));
        // A fresh adapter has no in-memory state: simulates loading after a process restart.
        var reopened = new LocalStorage(directory.toString(), mapper);
        assertThat(reopened.find("local-development-account", id)).isPresent();
        assertThat(reopened.find("another-account", id)).isEmpty();
        assertThat(reopened.list("another-account")).isEmpty();
        assertThat(
            reopened.get(
                reopened
                    .find("local-development-account", id)
                    .orElseThrow()
                    .protagonist()
                    .portraitKey()
            )
        ).isEqualTo(output.toByteArray());
    }

    @Test
    void rejectsBlankRequiredDetailsAndInvalidImages() throws Exception {
        mvc.perform(multipart("/api/v1/worlds").file(metadata("   ")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fields.name").exists());
        mvc.perform(
            multipart("/api/v1/worlds")
                .file(metadata("Invalid portrait world"))
                .file(
                    new MockMultipartFile(
                        "portrait",
                        "fake.png",
                        "image/png",
                        "not an image".getBytes()
                    )
                )
        ).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/worlds/not-a-world-id")).andExpect(status().isNotFound());
    }

    @Test
    void listsSavedWorldsWithoutLeakingStorageKeys() throws Exception {
        mvc.perform(multipart("/api/v1/worlds").file(metadata("Second world"))).andExpect(
            status().isCreated()
        );
        mvc.perform(get("/api/v1/worlds"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").exists())
            .andExpect(jsonPath("$[0].protagonist.portraitKey").doesNotExist());
    }

    @Test
    void persistsChineseWorldAndCoverAndSafelyReplacesItsCover() throws Exception {
        var request = new CreateWorldRequest(
            "远方之城",
            "热闹的城市，新的同伴。",
            "Wonder & discovery",
            "保持希望感。",
            "小林",
            "一个寻找归属的旅人。",
            "zh-CN"
        );
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(8, 12, BufferedImage.TYPE_INT_RGB), "png", output);
        var result = mvc
            .perform(
                multipart("/api/v1/worlds")
                    .file(
                        new MockMultipartFile(
                            "world",
                            "world.json",
                            "application/json",
                            mapper.writeValueAsBytes(request)
                        )
                    )
                    .file(
                        new MockMultipartFile(
                            "cover",
                            "cover.png",
                            "image/png",
                            output.toByteArray()
                        )
                    )
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("远方之城"))
            .andExpect(jsonPath("$.storyLanguage").value("zh-CN"))
            .andExpect(jsonPath("$.coverKey").doesNotExist())
            .andReturn();
        var body = mapper.readTree(result.getResponse().getContentAsByteArray());
        String id = body.get("id").asText();
        mvc.perform(get(body.get("coverUrl").asText()))
            .andExpect(status().isOk())
            .andExpect(content().bytes(output.toByteArray()));
        var reopened = new LocalStorage(directory.toString(), mapper);
        assertThat(
            reopened.find("local-development-account", id).orElseThrow().storyLanguage()
        ).isEqualTo("zh-CN");
        mvc.perform(
            multipart("/api/v1/worlds/" + id + "/cover")
                .file(new MockMultipartFile("cover", "fake.png", "image/png", "invalid".getBytes()))
                .with(servletRequest -> {
                    servletRequest.setMethod("PUT");
                    return servletRequest;
                })
        ).andExpect(status().isBadRequest());
        mvc.perform(get(body.get("coverUrl").asText())).andExpect(
            content().bytes(output.toByteArray())
        );
        var changed = mvc
            .perform(
                multipart("/api/v1/worlds/" + id + "/cover")
                    .file(
                        new MockMultipartFile("cover", "new.png", "image/png", output.toByteArray())
                    )
                    .with(servletRequest -> {
                        servletRequest.setMethod("PUT");
                        return servletRequest;
                    })
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.protagonist.name").value("小林"))
            .andExpect(jsonPath("$.storyLanguage").value("zh-CN"))
            .andReturn();
        assertThat(
            mapper.readTree(changed.getResponse().getContentAsByteArray()).get("coverUrl").asText()
        ).isNotEqualTo(body.get("coverUrl").asText());
        assertThat(reopened.find("another-account", id)).isEmpty();
    }

    @Test
    void defaultsLegacyWorldsToEnglishAndRejectsUnsupportedLanguages() throws Exception {
        var legacy = mapper
            .createObjectNode()
            .put("id", "legacy")
            .put("ownerId", "owner")
            .put("schemaVersion", 1);
        assertThat(mapper.treeToValue(legacy, World.class).storyLanguage()).isEqualTo("en");
        var request = new CreateWorldRequest(
            "World",
            "Setting",
            "Tone",
            "",
            "Ari",
            "Background",
            "xx"
        );
        mvc.perform(
            multipart("/api/v1/worlds").file(
                new MockMultipartFile(
                    "world",
                    "world.json",
                    "application/json",
                    mapper.writeValueAsBytes(request)
                )
            )
        )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.fields.storyLanguage").exists());
    }
}
