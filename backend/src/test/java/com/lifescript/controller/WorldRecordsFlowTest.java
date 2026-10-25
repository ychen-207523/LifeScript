package com.lifescript.controller;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifescript.model.CreateWorldRequest;
import com.lifescript.model.StorySetupRequest;
import com.lifescript.model.TableRequest;
import com.lifescript.model.World;
import com.lifescript.model.WorldTable;
import com.lifescript.repository.LocalKnowledgeRepository;
import com.lifescript.repository.LocalStorage;
import com.lifescript.service.KnowledgeService;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import java.util.*;
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
class WorldRecordsFlowTest {

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

    @Autowired
    KnowledgeService knowledge;

    static final String OWNER = "local-development-account";

    String create(String language) throws Exception {
        var request = new CreateWorldRequest(
            "Test world",
            "A new beginning",
            "Hopeful",
            "",
            "Ari",
            "Traveler",
            language
        );
        return mapper
            .readTree(
                mvc
                    .perform(
                        multipart("/api/v1/worlds").file(
                            new MockMultipartFile(
                                "world",
                                "world.json",
                                "application/json",
                                mapper.writeValueAsBytes(request)
                            )
                        )
                    )
                    .andExpect(status().isCreated())
                    .andReturn()
                    .getResponse()
                    .getContentAsByteArray()
            )
            .get("id")
            .asText();
    }

    String base(String world) {
        return "/api/v1/worlds/" + world + "/tables";
    }

    JsonNode putJson(String path, Object body, int status) throws Exception {
        return mapper.readTree(
            mvc
                .perform(
                    put(path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(body))
                )
                .andExpect(status().is(status))
                .andReturn()
                .getResponse()
                .getContentAsByteArray()
        );
    }

    Map<String, Object> row(Object cells, long revision, long schema) {
        return Map.of("cells", cells, "revision", revision, "tableRevision", schema);
    }

    @Test
    void persistsOpeningAndRejectsStaleEdits() throws Exception {
        String world = create("zh-CN");
        var setup = new StorySetupRequest("找到归属", "初到远方之城", "你在车站醒来。", 0);
        putJson("/api/v1/worlds/" + world + "/setup", setup, 200);
        putJson("/api/v1/worlds/" + world + "/setup", setup, 409);
        var reopened = new LocalStorage(directory.toString(), mapper)
            .find(OWNER, world)
            .orElseThrow();
        assertThat(reopened.protagonistWish()).isEqualTo("找到归属");
        assertThat(reopened.openingScene()).isEqualTo("你在车站醒来。");
        assertThat(reopened.setupRevision()).isEqualTo(1);
        var legacy = mapper.treeToValue(mapper.createObjectNode().put("id", "legacy"), World.class);
        assertThat(legacy.openingScene()).isEmpty();
        assertThat(legacy.setupRevision()).isZero();
    }

    @Test
    void keepsWorldsSeparateAndRetainsLinksAfterRenamingAndLocking() throws Exception {
        String english = create("en"),
            chinese = create("zh-CN");
        mvc.perform(get(base(english))).andExpect(jsonPath("$[0].id").value("places"));
        String place = UUID.randomUUID().toString();
        putJson(base(english) + "/places/rows/" + place, row(Map.of("name", "Harbor"), 0, 0), 200);
        String person = UUID.randomUUID().toString();
        var cells = Map.of("name", "Mira", "currentLocation", place, "persistent", true);
        putJson(base(english) + "/characters/rows/" + person, row(cells, 0, 0), 200);
        putJson(base(chinese) + "/characters/rows/" + person, row(cells, 0, 0), 400);
        mvc.perform(get(base(chinese) + "/places/rows")).andExpect(content().json("[]"));
        var definition = knowledge.table(OWNER, english, "characters");
        var columns = definition
            .columns()
            .stream()
            .map(c ->
                new WorldTable.Column(
                    c.id(),
                    c.id().equals("name") ? "Companion" : c.label(),
                    c.type(),
                    c.options(),
                    c.id().equals("name")
                )
            )
            .toList();
        putJson(base(english) + "/characters", new TableRequest("", columns, true, 0), 200);
        putJson(
            base(english) + "/characters/rows/" + person,
            row(Map.of("name", "Changed"), 1, 1),
            400
        );
        putJson(base(english) + "/characters/rows/" + person, row(cells, 1, 0), 409);
        var reopened = new LocalKnowledgeRepository(directory.toString(), mapper);
        assertThat(
            reopened
                .row(OWNER, english, "characters", person)
                .orElseThrow()
                .cells()
                .get("currentLocation")
                .asText()
        ).isEqualTo(place);
        assertThat(
            reopened.table(OWNER, english, "characters").orElseThrow().columns().get(0).label()
        ).isEqualTo("Companion");
        assertThatThrownBy(() -> knowledge.tables("another-account", english)).hasMessageContaining(
            "404"
        );
        putJson(
            base(english) + "/characters",
            new TableRequest("", columns.subList(1, columns.size()), true, 1),
            400
        );
    }

    @Test
    void validatesCustomTypesAndKeepsNpcPortraitAcrossReloads() throws Exception {
        String world = create("en");
        var columns = List.of(
            new WorldTable.Column("title", "Title", "text", List.of(), false),
            new WorldTable.Column("count", "Count", "number", List.of(), false),
            new WorldTable.Column("state", "State", "choice", List.of("New", "Done"), false)
        );
        var table = knowledge.createTable(
            OWNER,
            world,
            new TableRequest("Quests", columns, true, 0)
        );
        String record = UUID.randomUUID().toString();
        putJson(
            base(world) + "/" + table.id() + "/rows/" + record,
            row(Map.of("count", "wrong"), 0, 1),
            400
        );
        putJson(
            base(world) + "/" + table.id() + "/rows/" + record,
            row(Map.of("count", 2, "state", "New"), 0, 1),
            200
        );
        var changed = List.of(
            columns.get(0),
            columns.get(1),
            new WorldTable.Column("state", "State", "choice", List.of("Done"), false)
        );
        putJson(base(world) + "/" + table.id(), new TableRequest("Quests", changed, true, 1), 400);
        String other = create("zh-CN");
        mvc.perform(get(base(other) + "/" + table.id() + "/rows")).andExpect(status().isNotFound());
        String person = UUID.randomUUID().toString();
        putJson(
            base(world) + "/characters/rows/" + person,
            row(Map.of("name", "Mira", "persistent", true), 0, 0),
            200
        );
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB), "png", bytes);
        String portraitPath = base(world) + "/characters/rows/" + person + "/portrait";
        var saved = mvc
            .perform(
                multipart(portraitPath)
                    .file(
                        new MockMultipartFile(
                            "portrait",
                            "npc.png",
                            "image/png",
                            bytes.toByteArray()
                        )
                    )
                    .param("revision", "1")
                    .with(request -> {
                        request.setMethod("PUT");
                        return request;
                    })
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.portraitKey").doesNotExist())
            .andReturn();
        String url = mapper
            .readTree(saved.getResponse().getContentAsByteArray())
            .get("portraitUrl")
            .asText();
        mvc.perform(get(url))
            .andExpect(status().isOk())
            .andExpect(content().bytes(bytes.toByteArray()));
        mvc.perform(
            multipart(portraitPath)
                .file(new MockMultipartFile("portrait", "fake.png", "image/png", new byte[] { 1 }))
                .param("revision", "2")
                .with(request -> {
                    request.setMethod("PUT");
                    return request;
                })
        ).andExpect(status().isBadRequest());
        assertThat(
            new LocalKnowledgeRepository(directory.toString(), mapper)
                .row(OWNER, world, "characters", person)
                .orElseThrow()
                .portraitKey()
        ).isNotBlank();
        mvc.perform(get(url)).andExpect(status().isOk());
    }
}
