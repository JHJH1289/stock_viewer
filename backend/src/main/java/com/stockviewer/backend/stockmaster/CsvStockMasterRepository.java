package com.stockviewer.backend.stockmaster;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;

@Repository
public class CsvStockMasterRepository implements StockMasterRepository {
    private static final String CSV_PATH = "data/stock_master.csv";

    private List<StockMaster> stocks = List.of();

    @PostConstruct
    void load() throws IOException {
        ClassPathResource resource = new ClassPathResource(CSV_PATH);
        if (!resource.exists()) {
            stocks = List.of();
            return;
        }

        List<StockMaster> loadedStocks = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            reader.readLine();

            String line;
            while ((line = reader.readLine()) != null) {
                List<String> columns = parseCsvLine(line);
                if (columns.size() < 8) {
                    continue;
                }

                loadedStocks.add(new StockMaster(
                        columns.get(0),
                        columns.get(1),
                        columns.get(2),
                        columns.get(3),
                        columns.get(4),
                        columns.get(5),
                        columns.get(6),
                        columns.get(7)));
            }
        }

        stocks = Collections.unmodifiableList(loadedStocks);
    }

    @Override
    public List<StockMaster> search(String keyword, int limit) {
        String normalizedKeyword = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        if (normalizedKeyword.isBlank()) {
            return stocks.stream().limit(limit).toList();
        }

        return stocks.stream()
                .filter(stock -> contains(stock.symbol(), normalizedKeyword) || contains(stock.name(), normalizedKeyword))
                .sorted(Comparator.comparingInt(stock -> score(stock, normalizedKeyword)))
                .limit(limit)
                .toList();
    }

    @Override
    public int count() {
        return stocks.size();
    }

    private boolean contains(String value, String keyword) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(keyword);
    }

    private int score(StockMaster stock, String keyword) {
        String symbol = stock.symbol().toLowerCase(Locale.ROOT);
        String name = stock.name().toLowerCase(Locale.ROOT);

        if (symbol.equals(keyword)) {
            return 0;
        }
        if (symbol.startsWith(keyword)) {
            return 1;
        }
        if (name.equals(keyword)) {
            return 2;
        }
        if (name.startsWith(keyword)) {
            return 3;
        }
        if (symbol.contains(keyword)) {
            return 4;
        }
        return 5;
    }

    private List<String> parseCsvLine(String line) {
        List<String> columns = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;

        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);
            if (character == '"') {
                if (quoted && index + 1 < line.length() && line.charAt(index + 1) == '"') {
                    current.append('"');
                    index++;
                } else {
                    quoted = !quoted;
                }
            } else if (character == ',' && !quoted) {
                columns.add(current.toString());
                current.setLength(0);
            } else {
                current.append(character);
            }
        }

        columns.add(current.toString());
        return columns;
    }
}
