package com.lifescript.knowledge;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

@Repository
@ConditionalOnProperty(name = "script.storage", havingValue = "aws")
public class DynamoKnowledgeRepository implements KnowledgeRepository {

    private final DynamoDbClient client;
    private final String tableName;
    private final ObjectMapper mapper;

    public DynamoKnowledgeRepository(
        ObjectMapper mapper,
        @Value("${script.aws.region}") String region,
        @Value("${script.aws.table}") String tableName
    ) {
        this.mapper = mapper;
        this.tableName = tableName;
        client = DynamoDbClient.builder().region(Region.of(region)).build();
    }

    private AttributeValue text(String value) {
        return AttributeValue.builder().s(value).build();
    }

    private Map<String, AttributeValue> key(String owner, String world, String sort) {
        return Map.of("pk", text("KNOWLEDGE#" + owner + "#" + world), "sk", text(sort));
    }

    private <T> T decode(Map<String, AttributeValue> item, Class<T> type) {
        try {
            return mapper.readValue(item.get("document").s(), type);
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("Could not read world records", error);
        }
    }

    private <T> Optional<T> get(String owner, String world, String sort, Class<T> type) {
        var item = client
            .getItem(request ->
                request
                    .tableName(tableName)
                    .key(key(owner, world, sort))
                    .consistentRead(true)
            )
            .item();
        return item.isEmpty() ? Optional.empty() : Optional.of(decode(item, type));
    }

    private <T> List<T> list(String owner, String world, String prefix, Class<T> type) {
        var pages = client.queryPaginator(request ->
            request
                .tableName(tableName)
                .consistentRead(true)
                .keyConditionExpression("pk = :pk AND begins_with(sk, :prefix)")
                .expressionAttributeValues(
                    Map.of(":pk", text("KNOWLEDGE#" + owner + "#" + world), ":prefix", text(prefix))
                )
        );
        List<T> values = new ArrayList<>();
        pages.items().forEach(item -> values.add(decode(item, type)));
        return values;
    }

    private void put(
        String owner,
        String world,
        String sort,
        Object document,
        long revision,
        long expected
    ) {
        try {
            var item = new HashMap<>(key(owner, world, sort));
            item.put("document", text(mapper.writeValueAsString(document)));
            item.put("revision", AttributeValue.builder().n(Long.toString(revision)).build());
            client.putItem(request -> {
                request.tableName(tableName).item(item);
                if (expected == 0) request.conditionExpression("attribute_not_exists(pk)");
                else request
                    .conditionExpression("#rev = :expected")
                    .expressionAttributeNames(Map.of("#rev", "revision"))
                    .expressionAttributeValues(
                        Map.of(
                            ":expected",
                            AttributeValue.builder().n(Long.toString(expected)).build()
                        )
                    );
            });
        } catch (
            software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException error
        ) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Records changed. Reload and try again."
            );
        } catch (JsonProcessingException error) {
            throw new IllegalStateException("Could not save world records", error);
        }
    }

    @Override
    public List<WorldTable> tables(String owner, String world) {
        return list(owner, world, "TABLE#", WorldTable.class);
    }

    @Override
    public Optional<WorldTable> table(String owner, String world, String table) {
        return get(owner, world, "TABLE#" + table, WorldTable.class);
    }

    @Override
    public void saveTable(String owner, WorldTable table, long expected) {
        put(owner, table.worldId(), "TABLE#" + table.id(), table, table.revision(), expected);
    }

    @Override
    public List<WorldRow> rows(String owner, String world, String table) {
        return list(owner, world, "ROW#" + table + "#", WorldRow.class);
    }

    @Override
    public Optional<WorldRow> row(String owner, String world, String table, String row) {
        return get(owner, world, "ROW#" + table + "#" + row, WorldRow.class);
    }

    @Override
    public void saveRow(String owner, WorldRow row, long expected) {
        put(
            owner,
            row.worldId(),
            "ROW#" + row.tableId() + "#" + row.id(),
            row,
            row.revision(),
            expected
        );
    }

    @PreDestroy
    public void close() {
        client.close();
    }
}
