package com.stockviewer.backend.valuation;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;

import jakarta.annotation.PostConstruct;

@Repository
public class CsvValuationMetricsRepository implements ValuationMetricsRepository {
    private static final String CSV_PATH = "data/valuation/valuation_metrics.csv";
    private static final List<Path> WORKSPACE_PROCESSED_PATHS = List.of(
            Path.of("etl", "processed"),
            Path.of("..", "etl", "processed"));

    private Map<String, ValuationMetrics> metricsBySymbol = Map.of();
    private Map<String, List<ValuationMetrics>> metricHistoryBySymbol = Map.of();

    @PostConstruct
    void load() throws IOException {
        Map<String, List<ValuationMetrics>> loadedHistory = new HashMap<>();

        for (InputStream inputStream : openCsvStreams()) {
            try (inputStream) {
                loadCsv(inputStream, loadedHistory);
            }
        }

        Map<String, ValuationMetrics> latestMetrics = new HashMap<>();
        Map<String, List<ValuationMetrics>> sortedHistory = new HashMap<>();
        for (Map.Entry<String, List<ValuationMetrics>> entry : loadedHistory.entrySet()) {
            List<ValuationMetrics> history = entry.getValue().stream()
                    .sorted(metricComparator())
                    .toList();
            sortedHistory.put(entry.getKey(), history);
            if (!history.isEmpty()) {
                latestMetrics.put(entry.getKey(), history.get(0));
            }
        }

        metricsBySymbol = Map.copyOf(latestMetrics);
        metricHistoryBySymbol = Map.copyOf(sortedHistory);
    }

    @Override
    public Optional<ValuationMetrics> findBySymbol(String symbol) {
        return Optional.ofNullable(metricsBySymbol.get(normalize(symbol)));
    }

    @Override
    public List<ValuationMetrics> findAllBySymbol(String symbol) {
        return metricHistoryBySymbol.getOrDefault(normalize(symbol), List.of());
    }

    private List<InputStream> openCsvStreams() throws IOException {
        List<InputStream> streams = new ArrayList<>();

        List<Path> workspacePaths = findWorkspaceCsvPaths();
        for (Path path : workspacePaths) {
            streams.add(Files.newInputStream(path));
        }

        if (!streams.isEmpty()) {
            return streams;
        }

        ClassPathResource resource = new ClassPathResource(CSV_PATH);
        if (resource.exists()) {
            streams.add(resource.getInputStream());
        }

        return streams;
    }

    private List<Path> findWorkspaceCsvPaths() throws IOException {
        for (Path processedPath : WORKSPACE_PROCESSED_PATHS) {
            if (!Files.exists(processedPath)) {
                continue;
            }

            try (Stream<Path> paths = Files.walk(processedPath)) {
                return paths
                        .filter(Files::isRegularFile)
                        .filter(path -> path.getFileName().toString().equals("valuation_metrics.csv"))
                        .sorted()
                        .toList();
            }
        }

        return List.of();
    }

    private void loadCsv(InputStream inputStream, Map<String, List<ValuationMetrics>> loadedHistory) throws IOException {
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
                loadedHistory.computeIfAbsent(normalize(metrics.symbol()), ignored -> new ArrayList<>()).add(metrics);
            }
        }
    }

    private Comparator<ValuationMetrics> metricComparator() {
        return Comparator.comparing(ValuationMetrics::year, Comparator.nullsLast(String::compareTo))
                .thenComparing(ValuationMetrics::priceDate, Comparator.nullsLast(String::compareTo))
                .reversed();
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
