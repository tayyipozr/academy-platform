package com.academy.platform.reporting;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@TestConfiguration
public class TestReportStorageConfiguration {

    @Bean
    @Primary
    ReportStorage testReportStorage() {
        return new InMemoryReportStorage();
    }

    static final class InMemoryReportStorage
            implements ReportStorage {

        private final Map<String, byte[]> storage =
                new ConcurrentHashMap<>();

        @Override
        public void store(
                String storageKey,
                byte[] content,
                String contentType
        ) {
            storage.put(storageKey, content);
        }

        @Override
        public SignedReportDownload createDownloadUrl(
                String storageKey,
                String filename,
                Duration duration
        ) {
            if (!storage.containsKey(storageKey)) {
                throw new IllegalStateException(
                        "Stored report was not found."
                );
            }

            return new SignedReportDownload(
                    "https://reports.test/"
                            + storageKey,
                    OffsetDateTime.now(
                            ZoneOffset.UTC
                    ).plus(duration)
            );
        }

        @Override
        public void delete(String storageKey) {
            storage.remove(storageKey);
        }

        @Override
        public String bucket() {
            return "test-report-bucket";
        }
    }
}
