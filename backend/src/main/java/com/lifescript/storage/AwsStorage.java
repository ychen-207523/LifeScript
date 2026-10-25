package com.lifescript.storage;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifescript.world.World;
import com.lifescript.world.WorldRepository;
import jakarta.annotation.PreDestroy;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.s3.S3Client;

@Repository
@ConditionalOnProperty(name = "script.storage", havingValue = "aws")
public class AwsStorage implements WorldRepository, PortraitStore {

    private final DynamoDbClient dynamo;
    private final S3Client s3;
    private final ObjectMapper mapper;
    private final String table;
    private final String bucket;

    public AwsStorage(
        ObjectMapper mapper,
        @Value("${script.aws.region}") String region,
        @Value("${script.aws.table}") String table,
        @Value("${script.aws.bucket}") String bucket
    ) {
        if (bucket.isBlank()) throw new IllegalArgumentException(
            "SCRIPT_S3_BUCKET is required in AWS mode"
        );
        this.mapper = mapper;
        this.table = table;
        this.bucket = bucket;
        this.dynamo = DynamoDbClient.builder().region(Region.of(region)).build();
        this.s3 = S3Client.builder().region(Region.of(region)).build();
    }

    private static AttributeValue text(String value) {
        return AttributeValue.builder().s(value).build();
    }

    private Map<String, AttributeValue> key(String ownerId, String worldId) {
        return Map.of("pk", text("ACCOUNT#" + ownerId), "sk", text("WORLD#" + worldId));
    }

    @Override
    public void create(World world) {
        try {
            var item = new HashMap<>(key(world.ownerId(), world.id()));
            item.put("document", text(mapper.writeValueAsString(world)));
            // One item atomically stores this first world's aggregate, including its protagonist.
            dynamo.putItem(request ->
                request.tableName(table).item(item).conditionExpression("attribute_not_exists(pk)")
            );
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not encode the world", exception);
        }
    }

    @Override
    public Optional<World> find(String ownerId, String worldId) {
        var item = dynamo
            .getItem(request ->
                request.tableName(table).key(key(ownerId, worldId)).consistentRead(true)
            )
            .item();
        return item.isEmpty() ? Optional.empty() : Optional.of(decode(item));
    }

    @Override
    public World updateCover(String ownerId, String worldId, String coverKey) {
        return update(ownerId, worldId, current -> current.withCover(coverKey));
    }

    @Override
    public World updateSetup(
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
        var current = dynamo
            .getItem(request ->
                request.tableName(table).key(key(ownerId, worldId)).consistentRead(true)
            )
            .item();
        if (current.isEmpty()) throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.NOT_FOUND,
            "World or portrait not found."
        );
        World updated = change.apply(decode(current));
        try {
            var item = new HashMap<>(current);
            item.put("document", text(mapper.writeValueAsString(updated)));
            dynamo.putItem(request ->
                request
                    .tableName(table)
                    .item(item)
                    .conditionExpression("#doc = :previous")
                    .expressionAttributeNames(Map.of("#doc", "document"))
                    .expressionAttributeValues(Map.of(":previous", current.get("document")))
            );
            return updated;
        } catch (
            software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException exception
        ) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.CONFLICT,
                "This world changed. Refresh and try again."
            );
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not encode the world", exception);
        }
    }

    @Override
    public List<World> list(String ownerId) {
        var pages = dynamo.queryPaginator(request ->
            request
                .tableName(table)
                .consistentRead(true)
                .keyConditionExpression("pk = :owner AND begins_with(sk, :prefix)")
                .expressionAttributeValues(
                    Map.of(":owner", text("ACCOUNT#" + ownerId), ":prefix", text("WORLD#"))
                )
        );
        List<World> worlds = new ArrayList<>();
        pages.items().forEach(item -> worlds.add(decode(item)));
        worlds.sort(Comparator.comparing(World::createdAt).reversed());
        return worlds;
    }

    private World decode(Map<String, AttributeValue> item) {
        try {
            return mapper.readValue(item.get("document").s(), World.class);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not decode the world", exception);
        }
    }

    @Override
    public void put(String key, byte[] png) {
        s3.putObject(
            request -> request.bucket(bucket).key(key).contentType("image/png"),
            RequestBody.fromBytes(png)
        );
    }

    @Override
    public byte[] get(String key) {
        return s3.getObjectAsBytes(request -> request.bucket(bucket).key(key)).asByteArray();
    }

    @Override
    public void delete(String key) {
        s3.deleteObject(request -> request.bucket(bucket).key(key));
    }

    @PreDestroy
    public void close() {
        dynamo.close();
        s3.close();
    }
}
