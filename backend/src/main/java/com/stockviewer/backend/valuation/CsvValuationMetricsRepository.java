package com.stockviewer.backend.valuation;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;

@Repository
public class CsvValuationMetricsRepository implements ValuationMetricsRepository {
    private static final String CSV_PATH = "data/valuation/valuation_metrics.csv";
    private static final Path WORKSPACE_CSV_PATH = Path.of("..", "etl", "processed", "2025", "general", "valuation_metrics.csv");

    private Map<String, ValuationMetrics> metricsBySymbol = Map.of();

    @PostConstruct
    void load() throws IOException {
        try (InputStream inputStream = openCsv()) {
            if (inputStream == null) {
                metricsBySymbol = Map.of();
                return;
            }

            Map<String, ValuationMetrics> loadedMetrics = new HashMap<>();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
                reader.readLine();

                String line;
                while ((line = reader.readLine()) != null) {
                    List<String> columns = parseCsvLine(line);
                    if (columns.size() < 23) {
                        continue;
                    }

                    ValuationMetrics metrics = new ValuationMetrics(
                            columns.get(0),
                            columns.get(1),
                            columns.get(2),
                            columns.get(3),
                            columns.get(4),
                            columns.get(5),
                            toDouble(columns.get(6)),
                            toDouble(columns.get(7)),
                            toDouble(columns.get(8)),
                            toDouble(columns.get(9)),
                            toDouble(columns.get(10)),
                            toDouble(columns.get(11)),
                            toDouble(columns.get(12)),
                            toDouble(columns.get(13)),
                            toDouble(columns.get(14)),
                            toDouble(columns.get(15)),
                            toDouble(columns.get(16)),
                            toDouble(columns.get(17)),
                            toDouble(columns.get(18)),
                            toDouble(columns.get(19)),
                            toDouble(columns.get(20)),
                            toDouble(columns.get(21)),
                            toDouble(columns.get(22)));
                    loadedMetrics.put(normalize(metrics.symbol()), metrics);
                }
            }

            metricsBySymbol = Map.copyOf(loadedMetrics);
        }
    }

    @Override
    public Optional<ValuationMetrics> findBySymbol(String symbol) {
        return Optional.ofNullable(metricsBySymbol.get(normalize(symbol)));
    }

    private InputStream openCsv() throws IOException {
        ClassPathResource resource = new ClassPathResource(CSV_PATH);
        if (resource.exists()) {
            return resource.getInputStream();
        }

        if (Files.exists(WORKSPACE_CSV_PATH)) {
            return Files.newInputStream(WORKSPACE_CSV_PATH);
        }

        return null;
    }

    private Double toDouble(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT).replaceFirst("\\.0$", "");
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
