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
import java.util.LinkedHashMap;
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
    private Map<String, List<ValuationMetrics>> historyBySymbol = Map.of();

    @PostConstruct
    void load() throws IOException {
        List<CsvSource> sources = findCsvSources();
        if (sources.isEmpty()) {
            metricsBySymbol = Map.of();
            historyBySymbol = Map.of();
            return;
        }

        Map<String, Map<String, ValuationMetrics>> loadedHistory = new HashMap<>();
        for (CsvSource source : sources) {
            try (InputStream inputStream = source.open()) {
                loadCsv(inputStream, loadedHistory);
            }
        }

        Map<String, ValuationMetrics> latestMetrics = new HashMap<>();
        Map<String, List<ValuationMetrics>> sortedHistory = new HashMap<>();
        Comparator<ValuationMetrics> latestFirst = Comparator
                .comparing(ValuationMetrics::year, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ValuationMetrics::fiscalDate, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ValuationMetrics::priceDate, Comparator.nullsLast(Comparator.reverseOrder()));

        for (Map.Entry<String, Map<String, ValuationMetrics>> entry : loadedHistory.entrySet()) {
            List<ValuationMetrics> history = entry.getValue().values().stream()
                    .sorted(latestFirst)
                    .toList();
            sortedHistory.put(entry.getKey(), history);
            if (!history.isEmpty()) {
                latestMetrics.put(entry.getKey(), history.get(0));
            }
        }

        metricsBySymbol = Map.copyOf(latestMetrics);
        historyBySymbol = Map.copyOf(sortedHistory);
    }

    @Override
    public Optional<ValuationMetrics> findBySymbol(String symbol) {
        return Optional.ofNullable(metricsBySymbol.get(normalize(symbol)));
    }

    @Override
    public List<ValuationMetrics> findAllBySymbol(String symbol) {
        return historyBySymbol.getOrDefault(normalize(symbol), List.of());
    }

    private void loadCsv(
            InputStream inputStream,
            Map<String, Map<String, ValuationMetrics>> loadedHistory) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                return;
            }

            Map<String, Integer> headerIndex = toHeaderIndex(parseCsvLine(headerLine));
            String line;
            while ((line = reader.readLine()) != null) {
                ValuationMetrics metrics = toMetrics(parseCsvLine(line), headerIndex);
                if (metrics == null) {
                    continue;
                }

                String symbol = normalize(metrics.symbol());
                loadedHistory.computeIfAbsent(symbol, ignored -> new LinkedHashMap<>())
                        .put(metricsKey(metrics), metrics);
            }
        }
    }

    private List<CsvSource> findCsvSources() throws IOException {
        List<CsvSource> sources = new ArrayList<>();
        ClassPathResource resource = new ClassPathResource(CSV_PATH);
        if (resource.exists()) {
            sources.add(new ClassPathCsvSource(resource));
        }

        for (Path processedPath : WORKSPACE_PROCESSED_PATHS) {
            if (Files.exists(processedPath)) {
                try (Stream<Path> paths = Files.walk(processedPath, 3)) {
                    paths.filter(path -> path.getFileName().toString().equals("valuation_metrics.csv"))
                            .sorted(Comparator
                                    .comparing((Path path) -> isGeneralPath(path) ? 0 : 1)
                                    .thenComparing(Path::toString))
                            .map(FileCsvSource::new)
                            .forEach(sources::add);
                }
            }
        }

        return sources;
    }

    private ValuationMetrics toMetrics(List<String> columns, Map<String, Integer> headerIndex) {
        String symbol = value(columns, headerIndex, "symbol");
        if (symbol == null || symbol.isBlank()) {
            return null;
        }

        return new ValuationMetrics(
                symbol,
                value(columns, headerIndex, "corpCode", "corp_code"),
                value(columns, headerIndex, "name"),
                value(columns, headerIndex, "year"),
                value(columns, headerIndex, "fiscal_date", "fiscalDate"),
                value(columns, headerIndex, "price_date", "priceDate"),
                toDouble(value(columns, headerIndex, "price")),
                toDouble(value(columns, headerIndex, "market_cap", "marketCap")),
                toDouble(value(columns, headerIndex, "total_assets", "totalAssets")),
                toDouble(value(columns, headerIndex, "total_liabilities", "totalLiabilities")),
                toDouble(value(columns, headerIndex, "total_equity", "totalEquity")),
                toDouble(value(columns, headerIndex, "net_income", "netIncome")),
                toDouble(value(columns, headerIndex, "operating_income", "operatingIncome")),
                toDouble(value(columns, headerIndex, "revenue")),
                toDouble(value(columns, headerIndex, "per")),
                toDouble(value(columns, headerIndex, "pbr")),
                toDouble(value(columns, headerIndex, "roe")),
                toDouble(value(columns, headerIndex, "debt_ratio", "debtRatio")),
                toDouble(value(columns, headerIndex, "per_score", "perScore")),
                toDouble(value(columns, headerIndex, "pbr_score", "pbrScore")),
                toDouble(value(columns, headerIndex, "roe_score", "roeScore")),
                toDouble(value(columns, headerIndex, "debt_score", "debtScore")),
                toDouble(value(columns, headerIndex, "valuation_score", "valuationScore")));
    }

    private Map<String, Integer> toHeaderIndex(List<String> headers) {
        Map<String, Integer> headerIndex = new HashMap<>();
        for (int index = 0; index < headers.size(); index++) {
            headerIndex.put(normalizeHeader(headers.get(index)), index);
        }

        return headerIndex;
    }

    private String value(List<String> columns, Map<String, Integer> headerIndex, String... names) {
        for (String name : names) {
            Integer index = headerIndex.get(normalizeHeader(name));
            if (index != null && index < columns.size()) {
                return columns.get(index).trim();
            }
        }

        return null;
    }

    private String normalizeHeader(String value) {
        return value == null ? "" : value.trim().replace("\uFEFF", "");
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

    private String metricsKey(ValuationMetrics metrics) {
        return String.join("|",
                normalize(metrics.symbol()),
                metrics.year() == null ? "" : metrics.year(),
                metrics.fiscalDate() == null ? "" : metrics.fiscalDate(),
                metrics.priceDate() == null ? "" : metrics.priceDate());
    }

    private boolean isGeneralPath(Path path) {
        return path.toString().replace('\\', '/').contains("/general/");
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

    private interface CsvSource {
        InputStream open() throws IOException;
    }

    private record ClassPathCsvSource(ClassPathResource resource) implements CsvSource {
        @Override
        public InputStream open() throws IOException {
            return resource.getInputStream();
        }
    }

    private record FileCsvSource(Path path) implements CsvSource {
        @Override
        public InputStream open() throws IOException {
            return Files.newInputStream(path);
        }
    }
}
