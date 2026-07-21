package com.academy.platform.reporting;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.reports")
public record ReportProperties(
        Duration retention,
        Duration downloadUrlDuration,
        ExecutorProperties executor
) {

    public record ExecutorProperties(
            int corePoolSize,
            int maximumPoolSize,
            int queueCapacity
    ) {
    }
}
